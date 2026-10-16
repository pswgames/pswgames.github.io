"""Append only new Sulafat dialogue with a hard per-request process timeout.
Each sentence is generated independently; existing recordings are never rewritten.
"""
import base64, json, os, subprocess, sys, time
from pathlib import Path
import generate_gemini31_voice_pack as voice

ROOT=Path(__file__).resolve().parents[1]
ROWS=json.loads((ROOT/'audio/play-dialogue.json').read_text())
MAPPING={'play-'+id:voice.relpath(row['lang'],row['text']) for id,row in ROWS.items()}
REPORT=ROOT/'audio/play-voice-report.json'
RESULTS=ROOT/'.test-results/voice-generation'

def one(id,attempt):
    row=ROWS[id];client=voice.genai.Client(api_key=os.environ['GEMINI_API_KEY'],http_options={'timeout':60000,'retry_options':{'attempts':1}})
    direction=voice.STYLE_DIRECTION['warm']
    prompt=direction+' Read the following Korean sentence exactly once. Output only speech. Do not read instructions or add any words.\n\n'+row['text']
    if attempt: prompt='Say exactly this in warm, natural standard Korean, with the Sulafat voice. Audio only:\n'+row['text']
    response=client.interactions.create(model=voice.MODEL,input=prompt,response_format={'type':'audio'},generation_config={'speech_config':[{'voice':voice.VOICE}]},timeout=60)
    data=response.output_audio.data
    pcm=base64.b64decode(data) if isinstance(data,str) else bytes(data)
    samples=voice.pcm_samples(pcm);energies=voice.frame_rms(samples)
    if not energies or max(energies)<=0: raise RuntimeError('Silent recording')
    segment=voice.trim_segment(samples,0,len(energies),max(38,max(energies)*.009))
    duration=len(segment)/voice.SAMPLE_RATE
    if not .2<duration<18: raise RuntimeError(f'Implausible single-utterance length {duration}')
    path=MAPPING['play-'+id];(ROOT/path).write_bytes(voice.encode_mp3(segment))
    RESULTS.mkdir(parents=True,exist_ok=True)
    (RESULTS/(id+'.json')).write_text(json.dumps({'ids':['play-'+id],'text':row['text'],'path':path,'seconds':round(duration,3),'model':voice.MODEL,'voice':voice.VOICE,'single_utterance':True},ensure_ascii=False))

def checkpoint(report):
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if os.environ.get('SEOWOO_VOICE_CHECKPOINT')!='1':return
    paths=['audio/voice/ko','audio/play-voice-report.json']
    if (ROOT/'audio/play-files.js').exists():paths.append('audio/play-files.js')
    subprocess.run(['git','add',*paths],cwd=ROOT,check=True)
    if subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT).returncode:
        subprocess.run(['git','commit','-m','feat: checkpoint new Sulafat play recordings'],cwd=ROOT,check=True)
        subprocess.run(['git','push','origin','HEAD:feat/playground-art-voice-20261016'],cwd=ROOT,check=True)

def main():
    report=json.loads(REPORT.read_text()) if REPORT.exists() else {'voice':voice.VOICE,'model':voice.MODEL,'scope':'new play dialogue only','clips':[]}
    known={c['path'] for c in report['clips']}
    for id,row in ROWS.items():
        path=MAPPING['play-'+id]
        if (ROOT/path).exists() and path not in known:
            report['clips'].append({'ids':['play-'+id],'text':row['text'],'path':path,'recovered_checkpoint':True});known.add(path)
    pending=[id for id in ROWS if not (ROOT/MAPPING['play-'+id]).exists()]
    report['status']='in_progress';report['remaining']=len(pending);checkpoint(report)
    try:
        for n,id in enumerate(pending):
            print(f'Generating sentence {n+1}/{len(pending)}: {id}',flush=True)
            for attempt in range(2):
                try:
                    subprocess.run([sys.executable,__file__,'--one',id,str(attempt)],cwd=ROOT,timeout=65,check=True)
                    break
                except (subprocess.TimeoutExpired,subprocess.CalledProcessError):
                    if attempt: raise
                    print(f'Retrying one bounded request: {id}',flush=True);time.sleep(3)
            report['clips'].append(json.loads((RESULTS/(id+'.json')).read_text()))
            report['remaining']=len(pending)-n-1
            # Keep successful clips safe even when a later provider request stalls.
            checkpoint(report)
            time.sleep(2)
        missing=[p for p in MAPPING.values() if not (ROOT/p).exists()]
        if missing:raise RuntimeError(f'Missing {len(missing)} clips')
        (ROOT/'audio/play-files.js').write_text('/* New Sulafat clips; existing files.js is unchanged. */\nObject.assign(window.SEOWOO_AUDIO_FILES,'+json.dumps(MAPPING,ensure_ascii=False,separators=(',',':'))+');\n')
        report['status']='complete';report['catalog_entries']=len(MAPPING);report['remaining']=0
    finally:checkpoint(report)

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='--one':one(sys.argv[2],int(sys.argv[3]))
    else:main()
