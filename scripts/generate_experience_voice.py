"""Generate only the additional play-world clips; preserve the existing voice pack."""
import base64, hashlib, json, os, time
from pathlib import Path
import generate_gemini31_voice_pack as voice
ROOT=Path(__file__).resolve().parents[1]
def main():
    rows=json.loads((ROOT/'audio/experience-phrases.json').read_text())
    client=voice.genai.Client(api_key=os.environ['GEMINI_API_KEY'])
    mapping={}
    for key,row in rows.items():
        path=voice.relpath(row['lang'],row['text'])
        target=ROOT/path
        if not target.exists():
            prompt=voice.STYLE_DIRECTION['warm']+' Read only this Korean sentence exactly once. Do not add any words: '+row['text']
            result=client.interactions.create(model=voice.MODEL,input=prompt,response_format={'type':'audio'},generation_config={'speech_config':[{'voice':voice.VOICE}]})
            raw=result.output_audio.data
            pcm=base64.b64decode(raw) if isinstance(raw,str) else bytes(raw)
            samples=voice.pcm_samples(pcm)
            duration=len(samples)/voice.SAMPLE_RATE
            if not .3<=duration<=18: raise RuntimeError(f'Invalid clip duration: {key} {duration}')
            if max(voice.frame_rms(samples),default=0)<50: raise RuntimeError(f'Silent clip: {key}')
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(voice.encode_mp3(samples))
            time.sleep(1)
        mapping[key]=path
        print(key, target.stat().st_size, flush=True)
    (ROOT/'audio/experience-files.js').write_text('/* Gemini 3.1 Sulafat, MP3 24kHz mono 96kbps. */\nObject.assign(window.SEOWOO_AUDIO_FILES, '+json.dumps(mapping,sort_keys=True)+');\n')
    (ROOT/'audio/experience-voice-report.json').write_text(json.dumps({'model':voice.MODEL,'voice':voice.VOICE,'clips':len(mapping),'status':'complete'},indent=2)+'\n')
if __name__=='__main__': main()
