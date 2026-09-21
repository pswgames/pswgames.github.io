#!/usr/bin/env python3
from pathlib import Path
import json
from google.cloud import texttospeech

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "audio" / "chirp3-audition"
OUT.mkdir(parents=True, exist_ok=True)

VOICES = [
    ("Kore", "ko-KR-Chirp3-HD-Kore"),
    ("Aoede", "ko-KR-Chirp3-HD-Aoede"),
    ("Despina", "ko-KR-Chirp3-HD-Despina"),
]

TEXT = """문이 닫힙니다.
올라갑니다.
8층입니다.
문이 열립니다.
잘했어.
다시 찾아볼까?"""

client = texttospeech.TextToSpeechClient()
report = {
    "engine": "Google Cloud Text-to-Speech Chirp 3 HD",
    "language": "ko-KR",
    "script": TEXT,
    "samples": [],
}

for label, voice_name in VOICES:
    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(text=TEXT),
        voice=texttospeech.VoiceSelectionParams(
            language_code="ko-KR",
            name=voice_name,
        ),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
        ),
    )
    filename = f"{label.lower()}.mp3"
    path = OUT / filename
    path.write_bytes(response.audio_content)
    if path.stat().st_size < 2000:
        raise RuntimeError(f"Generated sample too small: {path}")
    report["samples"].append({
        "label": label,
        "voice_name": voice_name,
        "file": f"audio/chirp3-audition/{filename}",
        "bytes": path.stat().st_size,
    })

(ROOT / "audio" / "chirp3-audition-report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(json.dumps(report, ensure_ascii=False, indent=2))
