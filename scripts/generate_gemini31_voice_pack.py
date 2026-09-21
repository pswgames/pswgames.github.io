#!/usr/bin/env python3
from __future__ import annotations

import argparse
import array
import base64
import hashlib
import json
import math
import os
import re
import sys
import time
from pathlib import Path

from google import genai
import lameenc

ROOT = Path(__file__).resolve().parents[1]
CATALOGS = [ROOT / "audio" / "catalog.js", ROOT / "audio" / "extra-catalog.js"]
STATE_PATH = ROOT / "audio" / "gemini31-generation-state.json"
REPORT_PATH = ROOT / "audio" / "voice-report.json"

MODEL = "gemini-3.1-flash-tts-preview"
VOICE = "Sulafat"
VERSION = "gemini31-sulafat-grouped-v2"
SAMPLE_RATE = 24000
SAMPLE_WIDTH = 2
FRAME_MS = 10
FRAME_SAMPLES = SAMPLE_RATE * FRAME_MS // 1000

ENTRY_RE = re.compile(
    r'(?P<id>"(?:\\.|[^"\\])*")\s*:\s*\{\s*"text"\s*:\s*(?P<text>"(?:\\.|[^"\\])*")\s*,\s*"lang"\s*:\s*(?P<lang>"(?:\\.|[^"\\])*")',
    re.S,
)

NAV_IDS = {"up", "down", "closing", "opening", "arrived"}
NAV_PREFIXES = ("floor-", "arrival-")
EDU_PREFIXES = ("native-", "sino-", "both-")
WARM_PREFIXES = ("common-", "extra-", "potty-", "rhythm-", "quiz-", "mission-")

BASE_DIRECTION = (
    "Warm, natural Korean female smart-assistant voice with standard Seoul Korean. "
    "This is the same Sulafat character throughout the recording. "
    "Prioritize believable human prosody over textbook-perfect diction. "
    "Use gentle conversational timing, soft phrase endings, and small realistic timing variation. "
    "Never sound theatrical, synthetic, overly cheerful, childish, sing-song, or like a commercial."
)
STYLE_DIRECTION = {
    "navigation": (
        BASE_DIRECTION
        + " For these navigation and elevator prompts, stay composed, concise, smooth, and low-fatigue. "
          "Keep pitch movement restrained while preserving a human cadence."
    ),
    "education": (
        BASE_DIRECTION
        + " For these learning items, make each short number or phrase clear, friendly, and easy for a young child "
          "to understand without chanting or over-pronouncing."
    ),
    "warm": (
        BASE_DIRECTION
        + " For these child-facing prompts and praise phrases, be subtly affectionate, relaxed, and conversational."
    ),
}


def parse_catalog():
    rows = []
    seen = set()
    for catalog in CATALOGS:
        src = catalog.read_text(encoding="utf-8")
        for m in ENTRY_RE.finditer(src):
            row = {
                "id": json.loads(m.group("id")),
                "text": json.loads(m.group("text")),
                "lang": json.loads(m.group("lang")),
            }
            if row["id"] in seen:
                raise RuntimeError(f"duplicate catalog id: {row['id']}")
            seen.add(row["id"])
            rows.append(row)
    if len(rows) < 650:
        raise RuntimeError(f"catalog parse incomplete: {len(rows)}")
    return rows


def relpath(lang: str, text: str) -> str:
    h = hashlib.sha1(f"{lang}\0{text}".encode()).hexdigest()[:16]
    return f"audio/voice/ko/{h}.mp3"


def classify(ids: list[str]) -> str:
    if any(i in NAV_IDS or i.startswith(NAV_PREFIXES) for i in ids):
        return "navigation"
    if any(i.startswith(EDU_PREFIXES) for i in ids):
        return "education"
    return "warm"


def build_items(rows):
    by_key = {}
    for row in rows:
        if row["lang"] != "ko-KR":
            continue
        key = (row["lang"], row["text"])
        item = by_key.setdefault(
            key,
            {
                "lang": row["lang"],
                "text": row["text"],
                "ids": [],
                "path": relpath(row["lang"], row["text"]),
            },
        )
        item["ids"].append(row["id"])

    items = list(by_key.values())
    for item in items:
        item["style"] = classify(item["ids"])
    items.sort(key=lambda x: (x["style"], x["path"]))
    if len(items) != 523:
        raise RuntimeError(f"expected 523 unique Korean clips, found {len(items)}")
    return items


def split_even(items, n):
    if n <= 0:
        raise ValueError("n must be positive")
    if len(items) < n:
        raise RuntimeError(f"cannot split {len(items)} items into {n} nonempty groups")
    q, r = divmod(len(items), n)
    out = []
    start = 0
    for i in range(n):
        size = q + (1 if i < r else 0)
        out.append(items[start:start + size])
        start += size
    return out


def build_batches(items):
    nav = [x for x in items if x["style"] == "navigation"]
    edu = [x for x in items if x["style"] == "education"]
    warm = [x for x in items if x["style"] == "warm"]

    batches = []
    for idx, chunk in enumerate(split_even(nav, 1), 1):
        batches.append({"id": f"navigation-{idx}", "style": "navigation", "items": chunk})
    for idx, chunk in enumerate(split_even(edu, 4), 1):
        batches.append({"id": f"education-{idx}", "style": "education", "items": chunk})
    for idx, chunk in enumerate(split_even(warm, 3), 1):
        batches.append({"id": f"warm-{idx}", "style": "warm", "items": chunk})

    if len(batches) != 8:
        raise RuntimeError(f"expected 8 grouped requests, got {len(batches)}")
    if sum(len(b["items"]) for b in batches) != len(items):
        raise RuntimeError("batch partition lost items")
    return batches


def initial_state(batches):
    return {
        "version": VERSION,
        "model": MODEL,
        "voice": VOICE,
        "strategy": "8 grouped TTS requests; split locally on long silence; preserves existing asset paths",
        "total_batches": len(batches),
        "completed_batches": [],
        "remaining_batches": len(batches),
        "total_clips": sum(len(b["items"]) for b in batches),
        "completed_clips": 0,
        "failures": [],
        "layout": [
            {
                "id": b["id"],
                "style": b["style"],
                "clip_count": len(b["items"]),
                "paths": [x["path"] for x in b["items"]],
            }
            for b in batches
        ],
    }


def load_state(batches):
    if STATE_PATH.exists():
        data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        if data.get("version") == VERSION:
            return data
    return initial_state(batches)


def save_state(state, batches):
    completed = set(state.get("completed_batches", []))
    state["completed_batches"] = sorted(completed)
    state["remaining_batches"] = len(batches) - len(completed)
    done_paths = {
        x["path"]
        for b in batches
        if b["id"] in completed
        for x in b["items"]
    }
    state["completed_clips"] = len(done_paths)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_report(rows, items, state):
    unique_all = {(r["lang"], r["text"]) for r in rows}
    en_unique = len({(r["lang"], r["text"]) for r in rows if r["lang"] == "en-US"})
    complete = state.get("remaining_batches") == 0

    report = {
        "generator": "hybrid fixed local voice pack",
        "purpose": "fixed local voice assets for Seowoo Playground",
        "catalog_entries": len(rows),
        "unique_clips": len(unique_all),
        "selected_voices": {
            "ko-KR": f"{MODEL} / {VOICE}",
            "en-US": "en-US-JennyNeural",
        },
        "providers": {
            "ko-KR": "Google Gemini Developer API",
            "en-US": "edge-tts",
        },
        "ko_generation": {
            "status": "complete" if complete else "in_progress",
            "model": MODEL,
            "voice": VOICE,
            "unique_clips": len(items),
            "completed_clips": state.get("completed_clips", 0),
            "remaining_clips": len(items) - state.get("completed_clips", 0),
            "grouped_requests": 8,
            "completed_groups": len(state.get("completed_batches", [])),
            "style_profiles": ["warm", "navigation", "education"],
            "asset_format": "MP3 24kHz mono 96kbps",
        },
        "en_generation": {
            "status": "preserved",
            "unique_clips": en_unique,
            "voice": "en-US-JennyNeural",
        },
        "mapping_entries": len(rows),
        "sfx_count": 8,
        "runtime_fallback": "device speechSynthesis only if local media playback fails",
        "licensing_note": (
            "Korean fixed local assets were generated with Google Gemini 3.1 Flash TTS Preview "
            "using the Sulafat preset voice. English assets remain Edge TTS JennyNeural. "
            "Provider terms and preview-model availability apply."
        ),
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def make_prompt(batch, simple=False):
    transcript = "\n".join(x["text"] for x in batch["items"])
    if simple:
        direction = (
            "Output audio only. Read every non-empty Korean line below exactly once, in exact order, using the Sulafat voice. "
            "Use a warm, natural Korean female smart-assistant delivery. "
            "Treat every newline as a separate utterance. After every line except the last, leave about 1.2 seconds of silence. "
            "Do not read instructions, line numbers, labels, or blank lines. Do not add, omit, repeat, explain, translate, or paraphrase."
        )
    else:
        direction = (
            "TTS synthesis task. Output audio only. "
            + STYLE_DIRECTION[batch["style"]]
            + " Read every non-empty line in the SCRIPT exactly once and in exact order. "
              "Each newline is a separate utterance that will later become its own audio file. "
              "After every line except the last, leave a clear quiet pause of about 1.2 seconds. "
              "Do not merge adjacent lines. Do not read instructions, labels, or pause directions aloud. "
              "Do not add, omit, repeat, explain, translate, or paraphrase any word."
        )
    return f"{direction}\n\nSCRIPT BEGINS:\n{transcript}\nSCRIPT ENDS."


def pcm_samples(pcm: bytes):
    if len(pcm) % 2:
        pcm = pcm[:-1]
    samples = array.array("h")
    samples.frombytes(pcm)
    if sys.byteorder != "little":
        samples.byteswap()
    return samples


def frame_rms(samples):
    energies = []
    for start in range(0, len(samples), FRAME_SAMPLES):
        frame = samples[start:start + FRAME_SAMPLES]
        if not frame:
            break
        sq = sum(int(v) * int(v) for v in frame)
        energies.append(math.sqrt(sq / len(frame)))
    return energies


def quiet_runs(energies, threshold, min_frames):
    runs = []
    start = None
    for i, e in enumerate(energies):
        quiet = e <= threshold
        if quiet and start is None:
            start = i
        elif not quiet and start is not None:
            if i - start >= min_frames:
                runs.append((start, i))
            start = None
    if start is not None and len(energies) - start >= min_frames:
        runs.append((start, len(energies)))
    return runs


def choose_boundaries(energies, expected):
    if expected == 1:
        return [0, len(energies)]

    peak = max(energies or [0.0])
    if peak <= 0:
        raise RuntimeError("generated audio is silent")

    needed = expected - 1
    total = len(energies)
    search = []
    for frac in (0.012, 0.018, 0.025, 0.035, 0.05, 0.07, 0.10):
        for min_ms in (700, 550, 400, 300, 220):
            threshold = max(45.0, peak * frac)
            min_frames = max(1, min_ms // FRAME_MS)
            runs = quiet_runs(energies, threshold, min_frames)
            interior = [
                (a, b)
                for a, b in runs
                if a > 4 and b < total - 4
            ]
            if len(interior) < needed:
                continue

            ranked = sorted(
                interior,
                key=lambda ab: (ab[1] - ab[0], -ab[0]),
                reverse=True,
            )[:needed]
            mids = sorted((a + b) // 2 for a, b in ranked)
            boundaries = [0] + mids + [total]

            frame_lengths = [
                boundaries[i + 1] - boundaries[i]
                for i in range(len(boundaries) - 1)
            ]
            min_len = min(frame_lengths)
            max_len = max(frame_lengths)
            score = (
                min(ab[1] - ab[0] for ab in ranked),
                -max_len,
                min_len,
            )
            search.append((score, threshold, boundaries))

    if not search:
        raise RuntimeError(
            f"could not find {needed} clear separator silences for {expected} clips"
        )

    search.sort(key=lambda x: x[0], reverse=True)
    return search[0][2]


def trim_segment(samples, start_frame, end_frame, threshold):
    start = start_frame * FRAME_SAMPLES
    end = min(len(samples), end_frame * FRAME_SAMPLES)
    if end <= start:
        raise RuntimeError("invalid segment bounds")

    local = samples[start:end]
    energies = frame_rms(local)
    active = [i for i, e in enumerate(energies) if e > threshold]
    if not active:
        raise RuntimeError("segment contains no audible speech")

    pad_frames = max(2, 80 // FRAME_MS)
    first = max(0, active[0] - pad_frames)
    last = min(len(energies), active[-1] + 1 + pad_frames)
    a = start + first * FRAME_SAMPLES
    b = min(end, start + last * FRAME_SAMPLES)
    return samples[a:b]


def split_batch_pcm(pcm: bytes, expected: int):
    samples = pcm_samples(pcm)
    energies = frame_rms(samples)
    boundaries = choose_boundaries(energies, expected)
    peak = max(energies or [0.0])
    trim_threshold = max(38.0, peak * 0.009)

    segments = []
    durations = []
    for i in range(expected):
        seg = trim_segment(samples, boundaries[i], boundaries[i + 1], trim_threshold)
        duration = len(seg) / SAMPLE_RATE
        if duration < 0.12 or duration > 8.5:
            raise RuntimeError(
                f"segment {i + 1}/{expected} has implausible duration {duration:.3f}s"
            )
        segments.append(seg)
        durations.append(duration)

    if len(segments) != expected:
        raise RuntimeError(f"split produced {len(segments)} clips, expected {expected}")
    return segments, durations


def encode_mp3(samples) -> bytes:
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(96)
    encoder.set_in_sample_rate(SAMPLE_RATE)
    encoder.set_channels(1)
    encoder.set_quality(2)
    pcm = array.array("h", samples)
    if sys.byteorder != "little":
        pcm.byteswap()
    data = encoder.encode(pcm.tobytes()) + encoder.flush()
    if len(data) < 1200:
        raise RuntimeError(f"encoded MP3 too small: {len(data)} bytes")
    return data


def is_rate_limit(exc: Exception) -> bool:
    text = str(exc).lower()
    return "429" in text or "rate limit" in text or "too_many_requests" in text


def synthesize_and_split(client, batch):
    attempts = [("detailed", False), ("simple", True)]
    last_error = None

    for attempt_no, (kind, simple) in enumerate(attempts, 1):
        try:
            prompt = make_prompt(batch, simple=simple)
            interaction = client.interactions.create(
                model=MODEL,
                input=prompt,
                response_format={"type": "audio"},
                generation_config={"speech_config": [{"voice": VOICE}]},
            )
            data = interaction.output_audio.data
            pcm = base64.b64decode(data) if isinstance(data, str) else bytes(data)
            duration = len(pcm) / float(SAMPLE_RATE * SAMPLE_WIDTH)
            if duration < 3.0 or duration > 240.0:
                raise RuntimeError(f"batch audio duration looks wrong: {duration:.2f}s")

            segments, durations = split_batch_pcm(pcm, len(batch["items"]))
            encoded = [encode_mp3(seg) for seg in segments]
            return encoded, durations, kind, attempt_no, duration
        except Exception as exc:
            last_error = exc
            print(
                f"Attempt {attempt_no}/2 failed for {batch['id']}: {exc}",
                flush=True,
            )
            if is_rate_limit(exc):
                raise
            if attempt_no < len(attempts):
                time.sleep(4)

    raise RuntimeError(f"batch {batch['id']} failed after fallback: {last_error}")


def write_batch(batch, encoded):
    if len(encoded) != len(batch["items"]):
        raise RuntimeError("encoded clip count mismatch")
    for item, data in zip(batch["items"], encoded):
        out = ROOT / item["path"]
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_suffix(".mp3.tmp")
        tmp.write_bytes(data)
        if tmp.stat().st_size < 1200:
            tmp.unlink(missing_ok=True)
            raise RuntimeError(f"temporary MP3 too small: {tmp}")
        tmp.replace(out)


def run_next_batch(rows, items, batches):
    state = load_state(batches)
    completed = set(state.get("completed_batches", []))
    pending = [b for b in batches if b["id"] not in completed]

    save_state(state, batches)
    update_report(rows, items, state)

    if not pending:
        print("ALL_COMPLETE", flush=True)
        return 0

    batch = pending[0]
    print(
        f"Generating {batch['id']} style={batch['style']} clips={len(batch['items'])}; "
        f"completed_groups={len(completed)}/{len(batches)}",
        flush=True,
    )

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    try:
        encoded, durations, prompt_kind, attempts, source_duration = synthesize_and_split(client, batch)
        write_batch(batch, encoded)

        completed.add(batch["id"])
        state["completed_batches"] = sorted(completed)
        state["last_success"] = {
            "batch": batch["id"],
            "style": batch["style"],
            "clip_count": len(batch["items"]),
            "prompt_kind": prompt_kind,
            "api_attempt": attempts,
            "source_duration_seconds": round(source_duration, 3),
            "min_clip_seconds": round(min(durations), 3),
            "max_clip_seconds": round(max(durations), 3),
        }
        state.pop("last_failure", None)
        save_state(state, batches)
        update_report(rows, items, state)
        print(
            f"BATCH_COMPLETE {batch['id']} clips={len(batch['items'])} "
            f"remaining_groups={state['remaining_batches']}",
            flush=True,
        )
        return 0
    except Exception as exc:
        failure = {
            "batch": batch["id"],
            "style": batch["style"],
            "clip_count": len(batch["items"]),
            "error": repr(exc),
            "rate_limited": is_rate_limit(exc),
            "epoch": int(time.time()),
        }
        state["last_failure"] = failure
        state.setdefault("failures", []).append(failure)
        save_state(state, batches)
        update_report(rows, items, state)
        print(f"BATCH_FAILED {json.dumps(failure, ensure_ascii=False)}", flush=True)
        return 2


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--next-batch", action="store_true")
    parser.add_argument("--plan", action="store_true")
    args = parser.parse_args()

    rows = parse_catalog()
    items = build_items(rows)
    batches = build_batches(items)

    counts = {
        "navigation": sum(1 for x in items if x["style"] == "navigation"),
        "education": sum(1 for x in items if x["style"] == "education"),
        "warm": sum(1 for x in items if x["style"] == "warm"),
    }
    print(
        json.dumps(
            {
                "unique_ko": len(items),
                "style_counts": counts,
                "batches": [
                    {"id": b["id"], "style": b["style"], "clips": len(b["items"])}
                    for b in batches
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        flush=True,
    )

    if args.plan:
        return
    if not args.next_batch:
        raise SystemExit("Use --next-batch or --plan")
    if not os.environ.get("GEMINI_API_KEY"):
        raise RuntimeError("GEMINI_API_KEY is missing")
    raise SystemExit(run_next_batch(rows, items, batches))


if __name__ == "__main__":
    main()
