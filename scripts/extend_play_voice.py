"""Append only new play dialogue using the project's existing Sulafat generator.
Never rewrites an elevator, number, English or other existing recording.
"""
import json, os, time
from pathlib import Path
import generate_gemini31_voice_pack as voice

ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'audio/play-dialogue.json').read_text())
mapping={}
items=[]
for id,row in rows.items():
    path=voice.relpath(row['lang'],row['text'])
    mapping['play-'+id]=path
    if not (ROOT/path).exists():
        items.append(dict(row,path=path,ids=['play-'+id],style='warm'))
report={'voice':voice.VOICE,'model':voice.MODEL,'scope':'new play dialogue only','clips':[]}
report_path=ROOT/'audio/play-voice-report.json'
if report_path.exists(): report=json.loads(report_path.read_text())
if items:
    client=voice.genai.Client(api_key=os.environ['GEMINI_API_KEY'])
    # Bounded groups; the existing source assets are preserved byte for byte.
    for start in range(0,len(items),12):
        batch={'id':f'play-{start//12+1}','style':'warm','items':items[start:start+12]}
        encoded,durations,kind,attempts,total=voice.synthesize_and_split(client,batch)
        voice.write_batch(batch,encoded)
        report['clips'].extend({'ids':x['ids'],'text':x['text'],'path':x['path'],'seconds':round(d,3)} for x,d in zip(batch['items'],durations))
        report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(f"Completed {min(start+12,len(items))}/{len(items)} new clips",flush=True)
        time.sleep(3)
missing=[p for p in mapping.values() if not (ROOT/p).exists()]
if missing: raise RuntimeError(f'Missing {len(missing)} clips')
(ROOT/'audio/play-files.js').write_text('/* New Sulafat clips; existing files.js is unchanged. */\nObject.assign(window.SEOWOO_AUDIO_FILES,'+json.dumps(mapping,ensure_ascii=False,separators=(',',':'))+');\n')
report['status']='complete'
report['catalog_entries']=len(mapping)
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
