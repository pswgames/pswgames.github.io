const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 const instances=[],spoken=[];let finishes=[];
 class Audio{constructor(src){this.src=src;instances.push(this)}pause(){this.paused=true}load(){}play(){if(this.src==='bad'){queueMicrotask(()=>this.onerror?.());return Promise.reject(Error('missing'))}return Promise.resolve()}}
 const synth={getVoices:()=>[],addEventListener(){},cancel(){},speak(u){spoken.push(u)}};
 const sandbox={window:{speechSynthesis:synth,SEOWOO_AUDIO:{hello:{text:'잘했어',src:'hello'},bad:{text:'괜찮아',src:'bad'}}},document:{addEventListener(){}},Audio,SpeechSynthesisUtterance:class{constructor(text){this.text=text}},setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync('js/audio.js','utf8'),sandbox);
 const a=new sandbox.window.SeowooAudioManager({voice:true,sound:true,englishVoice:true});
 a.preload(['hello']);assert.equal(instances.length,1);
 const first=a.playVoice('hello');const second=a.playVoice('bad');assert.equal(await first,false);assert(instances[0].paused);
 await new Promise(r=>setTimeout(r,10));assert.equal(spoken.length,1,'network error and rejection must fallback once');spoken[0].onend();assert(await second);
 const p=a.speak('one');const q=a.speak('two');assert.equal(await p,false);a.stopAll();assert.equal(await q,false);
 a.settings.voice=false;assert.equal(await a.playVoice('hello'),false);a.setVoiceVolume(2);assert.equal(a.voiceVolume,1);a.setSfxVolume(-1);assert.equal(a.sfxVolume,0);
 console.log('Audio tests passed: preload reuse, cancel settles promises, fallback once, stop, mute, volume clamp');
})().catch(e=>{console.error(e);process.exit(1)});
