#!/usr/bin/env python3
import base64, json, os, wave
from pathlib import Path
from google import genai

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "audio" / "gemini31-audition"
OUT.mkdir(parents=True, exist_ok=True)

TRANSCRIPT = """문이 닫힙니다.
올라갑니다.
8층입니다.
문이 열립니다.
잘했어.
다시 찾아볼까?"""

CANDIDATES = [
    {
        "id": "navigation-smooth",
        "voice": "Algieba",
        "label": "Smooth Navigation",
        "direction": """Audio Profile: A Korean woman in her early 30s with a polished, natural speaking voice for a premium car navigation system. Standard Seoul Korean accent. Calm, confident, refined and human.
Scene: Quiet recording booth for a high-end in-car navigation product. The listener will hear short prompts repeatedly, so the voice must feel effortless and low-fatigue.
Director's Notes: Speak naturally, not like a TTS engine. Avoid sing-song intonation, robotic rhythm, exaggerated articulation, ad-announcer energy, and overly bright AI-assistant tone. Use subtle human micro-pauses and restrained pitch movement. Keep the first four lines concise and neutral like real navigation guidance. Make the last two lines just a little warmer, as if speaking gently to a child. Do not add or omit words."""
    },
    {
        "id": "navigation-mature",
        "voice": "Gacrux",
        "label": "Mature Navigation",
        "direction": """Audio Profile: A Korean female professional voice actor in her 30s, mature but not old, with a stable mid-low register and clear standard Seoul pronunciation.
Scene: Recording short prompts for a luxury vehicle navigation system in a dry studio.
Director's Notes: Make it sound like a real Korean voice actor recorded each line, not synthesized speech. Slight natural breath and tiny timing variations are welcome, but no audible sighs. Avoid mechanical cadence, identical sentence endings, excessive pitch rise, over-pronunciation, radio-DJ style, or commercial narration. Keep navigation lines calm and matter-of-fact. Make the final two child-facing lines warm and relaxed. Do not add or omit words."""
    },
    {
        "id": "assistant-warm",
        "voice": "Sulafat",
        "label": "Warm Human Assistant",
        "direction": """Audio Profile: A warm Korean woman in her late 20s to early 30s, natural and trustworthy, like a premium smart assistant voiced by a real actor. Standard Seoul accent.
Scene: A quiet home and car assistant that speaks to both adults and a young child.
Director's Notes: Prioritize natural human prosody over perfect textbook diction. Use gentle conversational timing, soft phrase endings and small realistic pauses. Do not sound cute, childish, theatrical, synthetic, overly cheerful, or like a commercial. The navigation lines should remain concise and composed; the final two lines should become subtly more affectionate without changing the text. Do not add or omit words."""
    },
]

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
report = {
    "engine": "Gemini 3.1 Flash TTS Preview",
    "model": "gemini-3.1-flash-tts-preview",
    "language": "ko-KR",
    "script": TRANSCRIPT,
    "samples": [],
}

def save_wave(path: Path, pcm: bytes):
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(pcm)

for item in CANDIDATES:
    prompt = f"""Synthesize speech for the exact TRANSCRIPT below. Do not read these instructions aloud.

{item['direction']}

TRANSCRIPT:
{TRANSCRIPT}
"""
    interaction = client.interactions.create(
        model="gemini-3.1-flash-tts-preview",
        input=prompt,
        response_format={"type": "audio"},
        generation_config={
            "speech_config": [
                {"voice": item["voice"]}
            ]
        },
    )
    data = interaction.output_audio.data
    pcm = base64.b64decode(data) if isinstance(data, str) else bytes(data)
    if len(pcm) < 4000:
        raise RuntimeError(f"Generated audio too small for {item['id']}: {len(pcm)} bytes")
    out = OUT / f"{item['id']}.wav"
    save_wave(out, pcm)
    report["samples"].append({
        "id": item["id"],
        "label": item["label"],
        "voice": item["voice"],
        "file": f"audio/gemini31-audition/{out.name}",
        "pcm_bytes": len(pcm),
        "wav_bytes": out.stat().st_size,
        "direction": item["direction"],
    })

(ROOT / "audio" / "gemini31-audition-report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(json.dumps(report, ensure_ascii=False, indent=2))
