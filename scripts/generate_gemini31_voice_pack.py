#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import tempfile
import time
import wave
from pathlib import Path

from google import genai

ROOT = Path(__file__).resolve().parents[1]
CATALOGS = [ROOT / "audio" / "catalog.js", ROOT / "audio" / "extra-catalog.js"]
VOICE_ROOT = ROOT / "audio" / "voice" / "ko"
STATE_PATH = ROOT / "audio" / "gemini31-generation-state.json"
REPORT_PATH = ROOT / "audio" / "voice-report.json"

MODEL = "gemini-3.1-flash-tts-preview"
VOICE = "Sulafat"
VERSION = "gemini-3.1-flash-tts-preview-Sulafat-v1"
SAMPLE_RATE = 24000

ENTRY_RE = re.compile(
    r'(?P<id>"(?:\\.|[^"\\])*")\\s*:\\s*\\{\\s*"text"\\s*:\\s*(?P<text>"(?:\\.|[^"\\])*")\\s*,\\s*"lang"\\s*:\\s*(?P<lang>"(?:\\.|[^"\\])*")',
    re.S,
)

WARM_PREFIXES = ("common-", "extra-", "potty-", "rhythm-", "quiz-", "mission-")
NAV_IDS = {"up", "down", "closing", "opening", "arrived"}
NAV_PREFIXES = ("floor-", "arrival-")
EDU_PREFIXES = ("native-", "sino-", "both-")

BASE_RULE = (
    "TTS synthesis task. Output audio only. Read only the exact Korean transcript below. "
    "Do not add, omit, explain, repeat, translate, or paraphrase any word. "
    "Use natural Standard Seoul Korean pronunciation."
)

WARM_DIRECTION = (
    "Use the Sulafat voice as a warm, natural Korean female smart assistant. "
    "Prioritize believable human prosody over textbook-perfect diction. "
    "Use gentle conversational timing, soft phrase endings, and small realistic pauses. "
    "Sound caring and relaxed, but not childish, theatrical, overly cheerful, synthetic, or commercial. "
    "For praise and child-facing prompts, be subtly affectionate without becoming sing-song."
)

NAV_DIRECTION = (
    "Use the Sulafat voice in a calm premium navigation style. "
    "Keep the delivery concise, composed, smooth, and low-fatigue, with restrained pitch movement. "
    "Avoid robotic cadence, identical sentence endings, exaggerated articulation, and advertisement narration."
)

EDU_DIRECTION = (
    "Use the Sulafat voice as a friendly Korean learning guide. "
    "Make each number or short learning item clear and natural with a human rhythm. "
    "Do not over-pronounce, chant, sing, or use a mechanical teaching cadence. "
    "Keep it warm, simple, and easy for a young child to understand."
)

DEFAULT_DIRECTION = (
    "Use the Sulafat voice as a warm, natural Korean female assistant. "
    "Keep the delivery conversational, clear, calm, and human. "
    "Avoid robotic rhythm, exaggerated pitch, commercial narration, and sing-song delivery."
)


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
    h = hashlib.sha1(f"{lang}\\0{text}".encode()).hexdigest()[:16]
    return f"audio/voice/ko/{h}.mp3"


def classify(ids: list[str]) -> str:
    if any(i in NAV_IDS or i.startswith(NAV_PREFIXES) for i in ids):
        return "navigation"
    if any(i.startswith(EDU_PREFIXES) for i in ids):
        return "education"
    if any(i.startswith(WARM_PREFIXES) for i in ids):
        return "warm"
    return "default"


def direction_for(style: str) -> str:
    return {
        "navigation": NAV_DIRECTION,
        "education": EDU_DIRECTION,
        "warm": WARM_DIRECTION,
        "default": DEFAULT_DIRECTION,
    }[style]


def build_items(rows):
    by_key = {}
    for row in rows:
        if row["lang"] != "ko-KR":
            continue
        key = (row["lang"], row["text"])
        entry = by_key.setdefault(
            key,
            {
                "lang": row["lang"],
                "text": row["text"],
                "ids": [],
                "path": relpath(row["lang"], row["text"]),
            },
        )
        entry["ids"].append(row["id"])
    items = list(by_key.values())
    for item in items:
        item["style"] = classify(item["ids"])
    items.sort(key=lambda x: x["path"])
    return items


def load_state(total: int):
    if STATE_PATH.exists():
        data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        if data.get("version") == VERSION:
            data.setdefault("completed", [])
            data.setdefault("failures", [])
            data["total"] = total
            return data
    return {
        "version": VERSION,
        "model": MODEL,
        "voice": VOICE,
        "total": total,
        "completed": [],
        "failures": [],
        "started_at_epoch": int(time.time()),
    }


def save_state(state):
    state["completed_count"] = len(state["completed"])
    state["remaining_count"] = max(0, state["total"] - len(state["completed"]))
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def encode_mp3(pcm: bytes, out: Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(96)
    encoder.set_in_sample_rate(SAMPLE_RATE)
    encoder.set_channels(1)
    encoder.set_quality(2)
    data = encoder.encode(pcm) + encoder.flush()
    if len(data) < 1500:
        raise RuntimeError(f"encoded MP3 is too small: {len(data)} bytes")
    out.write_bytes(data)


def pcm_duration_seconds(pcm: bytes) -> float:
    return len(pcm) / float(SAMPLE_RATE * 2)


def synthesize(client, item):
    style = item["style"]
    direction = direction_for(style)
    transcript = item["text"]

    detailed = (
        f"{BASE_RULE}\n"
        f"Voice direction: {direction}\n"
        f"TRANSCRIPT BEGINS:\n{transcript}\nTRANSCRIPT ENDS."
    )
    simple = (
        "TTS synthesis task. Output audio only. "
        "Read the exact Korean transcript below once, naturally, in the Sulafat voice. "
        "Do not add any words.\n"
        f"TRANSCRIPT:\n{transcript}"
    )

    attempts = [
        ("detailed", detailed),
        ("detailed", detailed),
        ("simple", simple),
        ("simple", simple),
        ("simple", simple),
    ]
    last_error = None
    for idx, (prompt_kind, prompt) in enumerate(attempts, 1):
        try:
            interaction = client.interactions.create(
                model=MODEL,
                input=prompt,
                response_format={"type": "audio"},
                generation_config={"speech_config": [{"voice": VOICE}]},
            )
            data = interaction.output_audio.data
            pcm = base64.b64decode(data) if isinstance(data, str) else bytes(data)
            if len(pcm) < 3500:
                raise RuntimeError(f"audio payload too small: {len(pcm)} bytes")
            return pcm, prompt_kind, idx
        except Exception as exc:
            last_error = repr(exc)
            print(f"Attempt {idx}/5 failed for {item['path']} {transcript!r}: {exc}", flush=True)
            time.sleep([3, 6, 12, 20, 30][idx - 1])
    raise RuntimeError(last_error or "unknown Gemini TTS failure")


def update_report(rows, items, state):
    all_rows = rows
    unique_all = {}
    for r in all_rows:
        unique_all.setdefault((r["lang"], r["text"]), True)
    en_unique = len({(r["lang"], r["text"]) for r in all_rows if r["lang"] == "en-US"})
    ko_unique = len(items)
    complete = len(state["completed"]) == ko_unique

    report = {
        "generator": "hybrid fixed local voice pack",
        "purpose": "fixed local voice assets for Seowoo Playground",
        "catalog_entries": len(all_rows),
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
            "unique_clips": ko_unique,
            "completed_clips": len(state["completed"]),
            "remaining_clips": ko_unique - len(state["completed"]),
            "style_profiles": ["warm", "navigation", "education", "default"],
            "asset_format": "MP3 24kHz mono 96kbps",
        },
        "en_generation": {
            "status": "preserved",
            "unique_clips": en_unique,
            "voice": "en-US-JennyNeural",
        },
        "mapping_entries": len(all_rows),
        "sfx_count": 8,
        "runtime_fallback": "device speechSynthesis only if local media playback fails",
        "licensing_note": (
            "Korean fixed local assets were generated with Google Gemini 3.1 Flash TTS Preview "
            "using the Sulafat preset voice. English assets remain Edge TTS JennyNeural. "
            "Provider terms and preview-model availability apply."
        ),
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    if not os.environ.get("GEMINI_API_KEY"):
        raise RuntimeError("GEMINI_API_KEY is missing")

    rows = parse_catalog()
    items = build_items(rows)
    state = load_state(len(items))
    completed = set(state["completed"])
    pending = [item for item in items if item["path"] not in completed]

    print(f"Korean unique clips: {len(items)}; completed: {len(completed)}; pending: {len(pending)}", flush=True)

    if not pending:
        update_report(rows, items, state)
        save_state(state)
        print("ALL_COMPLETE", flush=True)
        return

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    batch = pending[: max(1, args.limit)]

    for index, item in enumerate(batch, 1):
        out = ROOT / item["path"]
        try:
            pcm, prompt_kind, attempts = synthesize(client, item)
            convert_to_mp3(pcm, out)
            dur = duration_seconds(out)
            if dur < 0.12 or dur > 12.0:
                out.unlink(missing_ok=True)
                raise RuntimeError(f"unexpected duration: {dur:.2f}s")

            completed.add(item["path"])
            state["completed"] = sorted(completed)
            state["last_success"] = {
                "path": item["path"],
                "text": item["text"],
                "ids": item["ids"],
                "style": item["style"],
                "duration_seconds": round(dur, 3),
                "prompt_kind": prompt_kind,
                "attempts": attempts,
            }
            state.pop("last_failure", None)
            save_state(state)
            update_report(rows, items, state)
            print(
                f"[{index}/{len(batch)}] OK {len(completed)}/{len(items)} "
                f"{item['style']} {dur:.2f}s {item['text']!r}",
                flush=True,
            )
        except Exception as exc:
            state["last_failure"] = {
                "path": item["path"],
                "text": item["text"],
                "ids": item["ids"],
                "style": item["style"],
                "error": repr(exc),
            }
            state["failures"].append(state["last_failure"])
            save_state(state)
            update_report(rows, items, state)
            raise

    remaining = len(items) - len(completed)
    print(f"BATCH_COMPLETE generated={len(batch)} remaining={remaining}", flush=True)
    if remaining == 0:
        print("ALL_COMPLETE", flush=True)


if __name__ == "__main__":
    main()
