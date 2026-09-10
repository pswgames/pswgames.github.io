/* Separate voice, effects and music channels. No runtime credentials or remote TTS. */
(()=>{
  'use strict';
  const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
  const normalize=s=>String(s).replace(/[.!? ,\s]/g,'');
  class AudioManager{
    constructor(settings){
      this.settings=settings;this.ctx=null;this.voice=null;this.music=null;this.serial=0;
      this.voiceVolume=clamp(settings.voiceVolume??1);this.sfxVolume=clamp(settings.sfxVolume??.65);
      this.buffers=new Map();this.effects=new Set();this.manifest=window.SEOWOO_AUDIO||{};
      this.voices=[];this.refreshVoices=()=>{this.voices=window.speechSynthesis?.getVoices()||[]};
      this.refreshVoices();window.speechSynthesis?.addEventListener('voiceschanged',this.refreshVoices);
      document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopAll()});
    }
    unlock(){try{this.ctx??=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{})}catch{}}
    pickVoice(lang){this.refreshVoices();return this.voices.filter(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase())).sort((a,b)=>this.voiceScore(b)-this.voiceScore(a))[0]}
    voiceScore(v){return (/natural|premium|enhanced|neural/i.test(v.name)?50:0)+(/yuna|sunhi|jenny/i.test(v.name)?25:0)+(v.default?5:0)}
    stopVoice(){this.serial++;this.voice?.pause?.();this.voice=null;window.speechSynthesis?.cancel();this.finishVoice?.(false);this.finishVoice=null;clearTimeout(this.voiceTimeout)}
    stopSfx(){for(const s of this.effects){try{s.stop()}catch{}}this.effects.clear();this.motor=null}
    stopAll(){this.stopVoice();this.stopSfx();this.music?.pause();this.music=null}
    stop(){this.stopAll()}
    setVoiceVolume(n){this.voiceVolume=clamp(n);this.settings.voiceVolume=this.voiceVolume;if(this.voice)this.voice.volume=this.voiceVolume}
    setSfxVolume(n){this.sfxVolume=clamp(n);this.settings.sfxVolume=this.sfxVolume}
    preload(ids){for(const id of ids){const src=this.manifest[id]?.src;if(src&&!this.buffers.has(src)){const a=new Audio(src);a.preload='auto';a.load();this.buffers.set(src,a)}}}
    playVoice(id){const entry=this.manifest[id];return entry?this.speak(entry.text,entry.lang||'ko-KR',entry.rate||.9,entry):Promise.resolve(false)}
    speak(text,lang='ko-KR',rate=.9,entry){
      this.stopVoice();if(!this.settings.voice||(!this.settings.englishVoice&&lang.startsWith('en')))return Promise.resolve(false);
      const token=this.serial;
      entry??=Object.values(this.manifest).find(x=>(x.lang||'ko-KR')===lang&&normalize(x.text)===normalize(text));
      return new Promise(resolve=>{
        const finish=ok=>{if(token!==this.serial)return;clearTimeout(this.voiceTimeout);this.finishVoice=null;this.voice=null;resolve(ok)};
        this.finishVoice=resolve;
        let fallbackStarted=false;
        const fallback=()=>{
          if(token!==this.serial||fallbackStarted)return;fallbackStarted=true;this.voice?.pause();
          if(!window.speechSynthesis){finish(false);return}
          const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=rate;u.pitch=1;u.volume=this.voiceVolume;
          const v=this.pickVoice(lang);if(v)u.voice=v;u.onend=()=>finish(true);u.onerror=()=>finish(false);window.speechSynthesis.speak(u);
        };
        this.voiceTimeout=setTimeout(()=>{if(token===this.serial){this.voice?.pause();window.speechSynthesis?.cancel();finish(false)}},20000);
        if(entry?.src){const a=this.buffers.get(entry.src)||new Audio(entry.src);this.voice=a;a.currentTime=0;a.volume=this.voiceVolume;a.onended=()=>finish(true);a.onerror=fallback;a.play().catch(fallback)}else fallback();
      });
    }
    async playFile(src){this.stopVoice();if(!src||!this.settings.voice)return false;const token=this.serial;const a=new Audio(src);this.voice=a;a.volume=this.voiceVolume;try{await a.play();if(token!==this.serial){a.pause();return false}return true}catch{return false}}
    async playMusic(src){this.music?.pause();this.music=null;if(!src||!this.settings.sound)return false;const a=new Audio(src);this.music=a;a.volume=.45;try{await a.play();return this.music===a}catch{return false}}
    tone(freq=660,dur=.1,type='sine',vol=.05,delay=0){
      if(!this.settings.sound)return;this.unlock();if(!this.ctx)return;
      const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol*this.sfxVolume),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g);g.connect(this.ctx.destination);this.effects.add(o);o.onended=()=>{this.effects.delete(o);o.disconnect();g.disconnect()};o.start(t);o.stop(t+dur+.02);
    }
    // Filtered air/friction, intentionally synthesized; replaceable by licensed recordings.
    noise(duration,frequency,volume,loop=false){
      if(!this.settings.sound)return;this.unlock();if(!this.ctx)return;
      const c=this.ctx,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
      const b=this.noiseBuffer||c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);let last=0;
      if(!this.noiseBuffer){for(let i=0;i<d.length;i++){last=(last+.025*(Math.random()*2-1))/1.025;d[i]=last*8}this.noiseBuffer=b}
      s.buffer=b;s.loop=loop;f.type='lowpass';f.frequency.value=frequency;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume*this.sfxVolume,t+.12);
      if(!loop){g.gain.setValueAtTime(volume*this.sfxVolume,t+duration*.6);g.gain.linearRampToValueAtTime(0,t+duration)}
      s.connect(f);f.connect(g);g.connect(c.destination);this.effects.add(s);s.onended=()=>{this.effects.delete(s);s.disconnect();f.disconnect();g.disconnect()};s.start();if(!loop)s.stop(t+duration+.02);return s;
    }
    playSfx(id){switch(id){case'button':this.noise(.08,1800,.1);break;case'doorClose':case'doorOpen':this.noise(1.25,650,.12);break;case'motorStart':this.motor?.stop();this.motor=this.noise(2,180,.12,true);break;case'motorStop':try{this.motor?.stop()}catch{}this.motor=null;this.noise(.45,120,.07);break;case'arrival':this.tone(659,.6,'sine',.05);this.tone(523,.8,'sine',.04,.22);break;case'success':this.tone(660,.18,'sine',.04);this.tone(880,.3,'sine',.035,.15);break}}
    success(){this.playSfx('success')}button(){this.playSfx('button')}doorClose(){this.playSfx('doorClose')}doorOpen(){this.playSfx('doorOpen')}motorStart(){this.playSfx('motorStart')}motorStop(){this.playSfx('motorStop')}ding(){this.playSfx('arrival')}
  }
  window.SeowooAudioManager=AudioManager;
})();
