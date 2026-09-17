const fs=require('node:fs'),assert=require('node:assert/strict'),{webcrypto,createHash}=require('node:crypto'),{JSDOM}=require('jsdom');
const fixture={version:3,settings:{voice:false,sound:true,difficulty:'2',countMode:'native',breakMinutes:20,englishVoice:false,voiceVolume:.7,sfxVolume:.3,character:'puppy'},stats:{totalChoices:81,correct:67,rounds:9,firstTry:50,byGame:{potty:4,hangulFind:5},lastPlayed:'2026-09-16T00:00:00Z',sessionStarts:12},stickers:['star','dino'],recent:[{game:'potty',at:10}],music:{repeat:true,current:'spring'}};
const credential={v:2,salt:'disposable-migration-fixture',hash:createHash('sha256').update('seowoo-parent-pin-v2:disposable-migration-fixture:2468').digest('hex')};
async function run(locked){
 const dom=new JSDOM('<!doctype html><body><div id="toast"></div></body>',{url:'https://pswgames.github.io/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.matchMedia=()=>({matches:false});w.SeowooAudioManager=class{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 const calls=[];w.SeowooNativeKiosk={strictReady:()=>true,policyRole:()=> 'profile-owner',lock:()=>calls.push('lock'),unlock:()=>calls.push('unlock')};
 w.localStorage.setItem('seowoo-play-v3',JSON.stringify(fixture));w.localStorage.setItem('seowoo-screen-lock-pin-v2',JSON.stringify(credential));w.localStorage.setItem('seowoo-screen-lock-v1',locked?'1':'0');
 for(const file of ['data/content.js','js/core.js','js/screen-lock.js'])w.eval(fs.readFileSync(file,'utf8'));
 await new Promise(r=>setTimeout(r,20));
 assert.deepEqual(JSON.parse(JSON.stringify(w.SeowooCore.state)),fixture);assert.equal(w.localStorage.getItem('seowoo-screen-lock-pin-v2'),JSON.stringify(credential));assert(await w.SeowooScreenLock.verifyPin('2468'));assert(!(await w.SeowooScreenLock.verifyPin('0000')));assert.equal(w.SeowooScreenLock.locked,locked);assert.equal(w.document.documentElement.dataset.screenLock,locked?'on':'off');
 w.SeowooScreenLock.setFromParent(true);assert.equal(w.localStorage.getItem('seowoo-screen-lock-v1'),'1');assert.equal(w.open('https://example.com'),null);assert(calls.includes('lock'));
 w.SeowooScreenLock.open();assert.equal(w.document.getElementById('screenLockDialog').open,true);assert.equal(w.document.getElementById('screenLockConfirmWrap').hidden,true);
 w.SeowooScreenLock.setFromParent(false);assert.equal(w.localStorage.getItem('seowoo-screen-lock-v1'),'0');assert(calls.includes('unlock'));
 w.SeowooCore.save();const saved=JSON.parse(w.localStorage.getItem('seowoo-play-v3'));assert.deepEqual(saved.settings,fixture.settings);assert.deepEqual(saved.stickers,fixture.stickers);assert.deepEqual(saved.stats.byGame,fixture.stats.byGame);assert.equal(saved.stats.rounds,9);dom.window.close();
}
(async()=>{await run(false);await run(true);console.log('PASS upgrade: existing settings, records, stickers, music, salted PIN and locked/unlocked state preserved; lock guards and native bridge');})().catch(e=>{console.error(e);process.exitCode=1});
