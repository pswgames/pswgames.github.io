const fs=require("fs"),path=require("path"),vm=require("vm"),assert=require("assert/strict");
const root=path.resolve(__dirname,".."),sandbox={window:{}};
for(const file of ["audio/catalog.js","audio/extra-catalog.js","audio/files.js","audio/sfx.js"])
  vm.runInNewContext(fs.readFileSync(path.join(root,file),"utf8"),sandbox,{filename:file});
const catalog=sandbox.window.SEOWOO_AUDIO||{}, files=sandbox.window.SEOWOO_AUDIO_FILES||{}, sfx=sandbox.window.SEOWOO_SFX||{};
const ids=Object.keys(catalog);
assert(ids.length>=650,`Expected full voice catalog, got ${ids.length}`);
assert.equal(Object.keys(files).length,ids.length,"Every catalog entry must have a fixed local audio asset");
for(const id of ids){
  const rel=files[id];
  assert(rel&&typeof rel==="string",`Missing voice mapping: ${id}`);
  const full=path.join(root,rel);
  assert(fs.existsSync(full),`Missing voice file: ${id} -> ${rel}`);
  assert(fs.statSync(full).size>1200,`Voice file too small: ${rel}`);
}
for(const id of ["button","doorOpen","doorClose","motorStart","motorStop","arrival","success","flush"]){
  const spec=sfx[id];
  assert(spec?.src,`Missing SFX mapping: ${id}`);
  const full=path.join(root,spec.src);
  assert(fs.existsSync(full),`Missing SFX file: ${spec.src}`);
  assert(fs.statSync(full).size>1000,`SFX file too small: ${spec.src}`);
}
const critical=["closing","opening","up","down",...Array.from({length:20},(_,i)=>`arrival-${i+1}`),...Array.from({length:9},(_,i)=>`common-${i}`)];
for(const id of critical)
  assert(files[id],`Missing critical local voice: ${id}`);
const sw=fs.readFileSync(path.join(root,"sw.js"),"utf8");
for(const id of critical)
  assert(sw.includes(JSON.stringify(files[id]).slice(1,-1)),`Critical voice not precached: ${id}`);
const elevator=fs.readFileSync(path.join(root,"js/elevator.js"),"utf8");
assert(elevator.includes('playVoice("opening")'),"Elevator opening announcement is not wired");
assert(elevator.includes("announceArrivalAndOpen"),"Arrival voice sequence is not wired");
console.log(`Voice assets passed: ${ids.length} catalog mappings, ${new Set(Object.values(files)).size} unique clips, ${Object.keys(sfx).length} SFX`);
