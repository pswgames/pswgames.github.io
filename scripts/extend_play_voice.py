"""Append fixed Sulafat clips; never rewrite an existing recording.
The 3.1 free daily quota was exhausted. Remaining clips use the documented
successor 3.8 Flash TTS with the same Sulafat preset, in bounded grouped calls.
No generation API is used by the deployed application.
"""
import base64, io, json, os, subprocess, sys, time, wave
from pathlib import Path
import generate_gemini31_voice_pack as voice

ROOT=Path(__file__).resolve().parents[1]
ROWS=json.loads((ROOT/'audio/play-dialogue.json').read_text())
MAPPING={'play-'+id:voice.relpath(row['lang'],row['text']) for id,row in ROWS.items()}
REPORT=ROOT/'audio/play-voice-report.json'
RESULTS=ROOT/'.test-results/voice-generation'
MODEL='gemini-3.8-flash-tts'
STYLE='Warm, relaxed, subtly affectionate conversational delivery. Clear and gently paced for a three-year-old, without singing or exaggeration.'

def batch(name):
    ids=json.loads((RESULTS/(name+'.input.json')).read_text())
    transcript=' <long pause>\n'.join(ROWS[id]['text'] for id in ids)
    client=voice.genai.Client(api_key=os.environ['GEMINI_API_KEY'],http_options={'timeout':110000,'retry_options':{'attempts':1}})
    try:
        response=client.models.generate_content(model=MODEL,contents=[{'role':'user','parts':[{'text':transcript,'speech_metadata':{'style':STYLE}}]}],config={'response_modalities':['AUDIO'],'speech_config':{'voice_config':{'prebuilt_voice_config':{'voice_name':voice.VOICE}}}})
    except Exception as e:
        print(type(e).__name__+': '+str(e),flush=True)
        if '429' in str(e):sys.exit(75)
        raise
    data=next(p.inline_data.data for p in response.candidates[0].content.parts if p.inline_data)
    data=base64.b64decode(data) if isinstance(data,str) else bytes(data)
    if data[:4]==b'RIFF':
        with wave.open(io.BytesIO(data),'rb') as wav:
            assert (wav.getframerate(),wav.getnchannels(),wav.getsampwidth())==(24000,1,2)
            data=wav.readframes(wav.getnframes())
    samples=voice.pcm_samples(data);energies=voice.frame_rms(samples)
    boundaries=voice.choose_boundaries(energies,len(ids));threshold=max(38,max(energies)*.009)
    clips=[];encoded=[]
    for i,id in enumerate(ids):
        segment=voice.trim_segment(samples,boundaries[i],boundaries[i+1],threshold)
        duration=len(segment)/voice.SAMPLE_RATE
        if not max(.4,len(ROWS[id]['text'])*.045)<duration<18:raise RuntimeError(f'Invalid utterance length {id}: {duration}')
        path=MAPPING['play-'+id]
        encoded.append((path,voice.encode_mp3(segment)))
        clips.append({'ids':['play-'+id],'text':ROWS[id]['text'],'path':path,'seconds':round(duration,3),'model':MODEL,'voice':voice.VOICE,'group':name})
    for path,data in encoded:(ROOT/path).write_bytes(data)
    (RESULTS/(name+'.json')).write_text(json.dumps(clips,ensure_ascii=False))

def checkpoint(report):
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

def main():
    report=json.loads(REPORT.read_text()) if REPORT.exists() else {'voice':voice.VOICE,'scope':'new play dialogue only','clips':[]}
    known={c['path'] for c in report['clips']}
    for c in report['clips']:c.setdefault('model',voice.MODEL);c.setdefault('voice',voice.VOICE)
    for id,row in ROWS.items():
        path=MAPPING['play-'+id]
        if (ROOT/path).exists() and path not in known:
            report['clips'].append({'ids':['play-'+id],'text':row['text'],'path':path,'recovered_checkpoint':True,'model':voice.MODEL,'voice':voice.VOICE});known.add(path)
    pending=[id for id in ROWS if not (ROOT/MAPPING['play-'+id]).exists()]
    report.update(status='in_progress',remaining=len(pending),failed=[],model='mixed: original 3.1 and successor 3.8 / Sulafat',fallback_reason='Gemini 3.1 free per-model daily quota exhausted; original recordings preserved')
    checkpoint(report);RESULTS.mkdir(parents=True,exist_ok=True)
    try:
        for offset in range(0,len(pending),14):
            ids=pending[offset:offset+14];name=f'gemini38-{offset//14+1}'
            print(f'Generating {name}: {len(ids)} remaining Sulafat utterances',flush=True)
            (RESULTS/(name+'.input.json')).write_text(json.dumps(ids))
            subprocess.run([sys.executable,__file__,'--batch',name],cwd=ROOT,timeout=120,check=True)
            report['clips'].extend(json.loads((RESULTS/(name+'.json')).read_text()))
            report['remaining']=sum(not (ROOT/p).exists() for p in MAPPING.values())
            checkpoint(report)
            if report['remaining']:time.sleep(20)
        missing=[p for p in MAPPING.values() if not (ROOT/p).exists()]
        if missing:raise RuntimeError(f'Missing {len(missing)} clips')
        (ROOT/'audio/play-files.js').write_text('/* New fixed Sulafat clips; existing files.js is unchanged. */\nObject.assign(window.SEOWOO_AUDIO_FILES,'+json.dumps(MAPPING,ensure_ascii=False,separators=(',',':'))+');\n')
        report.update(status='complete',catalog_entries=len(MAPPING),remaining=0)
    finally:checkpoint(report)

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='--batch':batch(sys.argv[2])
    else:main()
