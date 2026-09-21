const fs=require("fs"),path=require("path"),vm=require("vm"),assert=require("assert/strict");
const root=path.resolve(__dirname,".."),sandbox={window:{}};
for(const file of ["data/content.js","audio/catalog.js","audio/extra-catalog.js","audio/files.js"])
  vm.runInNewContext(fs.readFileSync(path.join(root,file),"utf8"),sandbox,{filename:file});
const C=sandbox.window.SEOWOO_CONTENT, catalog=sandbox.window.SEOWOO_AUDIO, files=sandbox.window.SEOWOO_AUDIO_FILES;
const normalize=s=>String(s).replace(/[.!? ,\s]/g,"");
const lookup=new Map();
for(const [id,e] of Object.entries(catalog)){
  const k=(e.lang||"ko-KR")+"|"+normalize(e.text);
  if(!lookup.has(k)) lookup.set(k,{id,...e});
}
const missing=[];
function need(text,lang="ko-KR",why=""){
  const e=lookup.get(lang+"|"+normalize(text));
  if(!e || !files[e.id] || !fs.existsSync(path.join(root,files[e.id]))) missing.push({text,lang,why,entry:e?.id||null});
}
[
 ["잘했어!","common feedback"],["다시 찾아볼까?","wrong answer"],["몇 개일까?","quantity/finger prompt"],
 ["다음 숫자는?","order prompt"],["같은 순서로 눌러봐","memory prompt"],["다시 해볼까?","memory retry"],
 ["엄마아빠랑 화장실에 다녀오자","real potty prompt"],
].forEach(([t,w])=>need(t,"ko-KR",w));
const potty=["화장실로 가볼까?","천천히 내려봐","편안하게 앉아봐","안 나와도 괜찮아","휴지로 깨끗하게","이제 물을 내려볼까?","바지를 다시 올려봐","비누로 뽀득뽀득","혼자서도 잘했어!"];
potty.forEach(t=>need(t,"ko-KR","potty step"));
for(const [letter,word] of C.alphabet){
  need(letter,"en-US","English quiz/ABC sequence");
  need(`${letter}, ${word}`,"en-US","ABC card");
}
for(const w of C.words){
  need(w.en,"en-US","English word card");
  need(w.ko,"ko-KR","Korean word card/word quiz");
}
for(const s of C.hangulRhythm){
  need(s,"ko-KR","Hangul rhythm");
  need(`${s}, 찾아볼까?`,"ko-KR","Hangul quiz");
}
for(const [,say] of C.consonants) need(`${say}, 찾아볼까?`,"ko-KR","consonant quiz");
for(const say of ["아","야","어","여","오","요","우","유","으","이"]) need(`${say}, 찾아볼까?`,"ko-KR","vowel quiz");
for(const [say] of C.shapes) need(`${say}, 찾아볼까?`,"ko-KR","shape quiz");
for(const [say] of C.colors) need(`${say}, 찾아볼까?`,"ko-KR","color quiz");
for(const m of C.missions) need(m.say,"ko-KR","family mission");
for(let n=1;n<=100;n++){
  for(const prefix of ["native","sino","both"]){
    const id=`${prefix}-${n}`;
    assert(catalog[id],`Missing number speech catalog entry: ${id}`);
    assert(files[id],`Missing number speech asset mapping: ${id}`);
    assert(fs.existsSync(path.join(root,files[id])),`Missing number speech file: ${id}`);
  }
}
assert.deepEqual(missing,[],`Finite app speech paths without local audio:\n${JSON.stringify(missing,null,2)}`);
console.log(`Voice coverage passed: all finite app speech paths resolve to local audio (${Object.keys(catalog).length} catalog entries)`);
