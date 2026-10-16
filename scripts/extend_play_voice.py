"""Append new Sulafat dialogue, preserving every existing recording.
Requests are bounded and each successful batch is checkpointed independently.
"""
import json, os, signal, subprocess, time
from pathlib import Path
import generate_gemini31_voice_pack as voice

ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'audio/play-dialogue.json').read_text())
mapping={'play-'+id:voice.relpath(row['lang'],row['text']) for id,row in rows.items()}
report_path=ROOT/'audio/play-voice-report.json'
report=json.loads(report_path.read_text()) if report_path.exists() else {'voice':voice.VOICE,'model':voice.MODEL,'scope':'new play dialogue only','clips':[]}
known={c['path'] for c in report['clips']}
for id,row in rows.items():
    path=mapping['play-'+id]
    if (ROOT/path).exists() and path not in known:
        report['clips'].append({'ids':['play-'+id],'text':row['text'],'path':path,'recovered_checkpoint':True})
        known.add(path)

def checkpoint():
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if os.environ.get('SEOWOO_VOICE_CHECKPOINT')!='1': return
    paths=['audio/voice/ko','audio/play-voice-report.json']
    if (ROOT/'audio/play-files.js').exists(): paths.append('audio/play-files.js')
    subprocess.run(['git','add',*paths],cwd=ROOT,check=True)
    if subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT).returncode:
        subprocess.run(['git','commit','-m','feat: checkpoint new Sulafat play recordings'],cwd=ROOT,check=True)
        subprocess.run(['git','push','origin','HEAD:feat/playground-art-voice-20261016'],cwd=ROOT,check=True)

def alarm(signum,frame): raise TimeoutError('Voice batch exceeded 240 seconds')
signal.signal(signal.SIGALRM,alarm)
items=[dict(row,path=mapping['play-'+id],ids=['play-'+id],style='warm') for id,row in rows.items() if not (ROOT/mapping['play-'+id]).exists()]
report['status']='in_progress';report['remaining']=len(items);checkpoint()
if items:
    client=voice.genai.Client(api_key=os.environ['GEMINI_API_KEY'],http_options={'timeout':90000,'retry_options':{'attempts':1}})
    # Smaller groups reduce ambiguous internal phrase/sentence pauses.
    for start in range(0,len(items),4):
        batch={'id':f'play-resume-{start//4+1}','style':'warm','items':items[start:start+4]}
        print(f"Starting bounded batch {batch['id']}",flush=True)
        signal.alarm(240)
        try: encoded,durations,kind,attempts,total=voice.synthesize_and_split(client,batch)
        finally: signal.alarm(0)
        voice.write_batch(batch,encoded)
        report['clips'].extend({'ids':x['ids'],'text':x['text'],'path':x['path'],'seconds':round(d,3)} for x,d in zip(batch['items'],durations))
        report['remaining']=len(items)-min(start+4,len(items));checkpoint()
        print(f"Completed {min(start+4,len(items))}/{len(items)} remaining clips",flush=True)
        time.sleep(2)
missing=[p for p in mapping.values() if not (ROOT/p).exists()]
if missing: raise RuntimeError(f'Missing {len(missing)} clips')
(ROOT/'audio/play-files.js').write_text('/* New Sulafat clips; existing files.js is unchanged. */\nObject.assign(window.SEOWOO_AUDIO_FILES,'+json.dumps(mapping,ensure_ascii=False,separators=(',',':'))+');\n')
report['status']='complete';report['catalog_entries']=len(mapping);report['remaining']=0;checkpoint()
