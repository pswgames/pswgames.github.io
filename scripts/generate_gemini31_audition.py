#!/usr/bin/env python3
import base64, json, os, time, wave
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
        "fallback_voice": "Schedar",
        "label": "Smooth Navigation",
        "direction": """TTS synthesis task. Output audio only. Read only the transcript below, exactly as written.
Voice direction: Natural adult Korean female voice for a premium car navigation system. Standard Seoul Korean. Calm, smooth, confident and low-fatigue. Use restrained pitch movement, subtle human timing variation and small natural pauses. Avoid robotic cadence, sing-song TTS intonation, exaggerated articulation, advertisement narration, and an overly bright AI-assistant tone. Keep the first four lines concise and neutral; make the last two lines slightly warmer without becoming cute or childish.""",
    },
    {
        "id": "navigation-mature",
        "voice": "Gacrux",
        "fallback_voice": "Charon",
        "label": "Mature Navigation",
        "direction": """TTS synthesis task. Output audio only. Read only the transcript below, exactly as written.
Voice direction: Natural Korean female professional narrator with a mature, stable mid-low register and clear standard Seoul pronunciation. Sound like a real studio voice actor recording short luxury vehicle navigation prompts. Use realistic micro-pauses and slight timing variation. Avoid mechanical rhythm, identical sentence endings, excessive pitch rise, radio-DJ delivery, commercial narration, or over-pronunciation. Keep the navigation lines calm and matter-of-fact; make the final two lines gently warm.""",
    },
    {
        "id": "assistant-warm",
        "voice": "Sulafat",
        "fallback_voice": "Vindemiatrix",
        "label": "Warm Human Assistant",
        "direction": """TTS synthesis task. Output audio only. Read only the transcript below, exactly as written.
Voice direction: Warm, natural Korean female smart-assistant voice with a standard Seoul accent. Prioritize believable human prosody over perfect textbook diction. Use gentle conversational timing, soft phrase endings and small realistic pauses. Avoid sounding theatrical, synthetic, overly cheerful, childish, or like a commercial. Keep the first four navigation lines composed and concise; make the final two lines subtly affectionate while preserving the exact wording.""",
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
    detailed_prompt = f"""{item['direction']}

TRANSCRIPT BEGINS:
{TRANSCRIPT}
TRANSCRIPT ENDS.
"""
    simple_prompt = f"""TTS synthesis task. Output audio only. Read the following Korean transcript exactly as written, in a calm, natural, human premium navigation voice. Do not read this instruction aloud.

TRANSCRIPT:
{TRANSCRIPT}
"""
    interaction = None
    last_error = None
    used = None

    attempts = [
        ("gemini-3.1-flash-tts-preview", item["voice"], detailed_prompt),
        ("gemini-3.1-flash-tts-preview", item["fallback_voice"], simple_prompt),
        ("gemini-2.5-flash-preview-tts", item["voice"], detailed_prompt),
        ("gemini-2.5-flash-preview-tts", item["fallback_voice"], simple_prompt),
    ]

    for model_name, voice_name, prompt in attempts:
        for retry in range(1, 3):
            try:
                interaction = client.interactions.create(
                    model=model_name,
                    input=prompt,
                    response_format={"type": "audio"},
                    generation_config={
                        "speech_config": [
                            {"voice": voice_name}
                        ]
                    },
                )
                used = {"model": model_name, "voice": voice_name, "prompt": "detailed" if prompt == detailed_prompt else "simple"}
                break
            except Exception as exc:
                last_error = exc
                print(f"{model_name} / {voice_name} / attempt {retry} failed for {item['id']}: {exc}")
                time.sleep(retry * 2)
        if interaction is not None:
            break

    if interaction is None:
        raise RuntimeError(f"Gemini TTS failed all model/voice fallbacks for {item['id']}: {last_error}")

    data = interaction.output_audio.data
    pcm = base64.b64decode(data) if isinstance(data, str) else bytes(data)
    if len(pcm) < 4000:
        raise RuntimeError(f"Generated audio too small for {item['id']}: {len(pcm)} bytes")
    out = OUT / f"{item['id']}.wav"
    save_wave(out, pcm)
    report["samples"].append({
        "id": item["id"],
        "label": item["label"],
        "requested_voice": item["voice"],
        "used": used,
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
