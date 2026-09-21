/* Separate voice, effects and music channels. No runtime credentials or remote TTS. */
(() => {
  "use strict";
  const clamp = (n) => Math.max(0, Math.min(1, Number(n) || 0));
  const normalize = (s) => String(s).replace(/[.!? ,\s]/g, "");
  class AudioManager {
    constructor(settings) {
      this.settings = settings;
      this.ctx = null;
      this.voice = null;
      this.music = null;
      this.serial = 0;
      this.voiceVolume = clamp(settings.voiceVolume ?? 1);
      this.sfxVolume = clamp(settings.sfxVolume ?? 0.9);
      this.buffers = new Map();
      this.effects = new Set();
      const files = window.SEOWOO_AUDIO_FILES || {};
      this.manifest = Object.fromEntries(
        Object.entries(window.SEOWOO_AUDIO || {}).map(([id, entry]) => [
          id,
          files[id] ? { ...entry, src: files[id] } : { ...entry },
        ]),
      );
      this.sfxManifest = window.SEOWOO_SFX || {};
      this.voices = [];
      this.refreshVoices = () => {
        this.voices = window.speechSynthesis?.getVoices() || [];
      };
      this.refreshVoices();
      window.speechSynthesis?.addEventListener(
        "voiceschanged",
        this.refreshVoices,
      );
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.stopAll();
      });
    }
    unlock() {
      try {
        this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      } catch {}
    }
    pickVoice(lang) {
      this.refreshVoices();
      return this.voices
        .filter((v) =>
          v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()),
        )
        .sort((a, b) => this.voiceScore(b) - this.voiceScore(a))[0];
    }
    voiceScore(v) {
      return (
        (/natural|premium|enhanced|neural|wavenet|studio|online/i.test(v.name)
          ? 50
          : 0) +
        (/yuna|sunhi|jenny|seoyeon|jiwoo|heami/i.test(v.name) ? 25 : 0) +
        (v.default ? 5 : 0)
      );
    }
    stopVoice() {
      this.serial++;
      this.voice?.pause?.();
      this.voice = null;
      window.speechSynthesis?.cancel();
      this.finishVoice?.(false);
      this.finishVoice = null;
      clearTimeout(this.voiceTimeout);
    }
    stopSfx() {
      for (const s of this.effects) {
        try {
          s.stop?.();
        } catch {}
        try {
          s.pause?.();
        } catch {}
      }
      this.effects.clear();
      this.motor = null;
    }
    stopAll() {
      this.stopVoice();
      this.stopSfx();
      this.music?.pause();
      this.music = null;
    }
    stop() {
      this.stopAll();
    }
    setVoiceVolume(n) {
      this.voiceVolume = clamp(n);
      this.settings.voiceVolume = this.voiceVolume;
      if (this.voice) this.voice.volume = this.voiceVolume;
    }
    setSfxVolume(n) {
      this.sfxVolume = clamp(n);
      this.settings.sfxVolume = this.sfxVolume;
    }
    preload(ids) {
      for (const id of ids) {
        const src = this.manifest[id]?.src;
        if (src && !this.buffers.has(src)) {
          const a = new Audio(src);
          a.preload = "auto";
          a.load();
          this.buffers.set(src, a);
        }
      }
    }
    playVoice(id) {
      const entry = this.manifest[id];
      return entry
        ? this.speak(
            entry.text,
            entry.lang || "ko-KR",
            entry.rate || 0.9,
            entry,
          )
        : Promise.resolve(false);
    }
    speak(text, lang = "ko-KR", rate = 0.94, entry) {
      this.stopVoice();
      if (
        !this.settings.voice ||
        (!this.settings.englishVoice && lang.startsWith("en"))
      )
        return Promise.resolve(false);
      const token = this.serial;
      entry ??= Object.values(this.manifest).find(
        (x) =>
          (x.lang || "ko-KR") === lang && normalize(x.text) === normalize(text),
      );
      return new Promise((resolve) => {
        const finish = (ok) => {
          if (token !== this.serial) return;
          clearTimeout(this.voiceTimeout);
          this.finishVoice = null;
          this.voice = null;
          resolve(ok);
        };
        this.finishVoice = resolve;
        let fallbackStarted = false;
        const fallback = () => {
          if (token !== this.serial || fallbackStarted) return;
          fallbackStarted = true;
          this.voice?.pause();
          if (!window.speechSynthesis) {
            finish(false);
            return;
          }
          const u = new SpeechSynthesisUtterance(text);
          u.lang = lang;
          u.rate = rate;
          u.pitch = 1;
          u.volume = this.voiceVolume;
          const v = this.pickVoice(lang);
          if (v) u.voice = v;
          u.onend = () => finish(true);
          u.onerror = () => finish(false);
          window.speechSynthesis.speak(u);
        };
        this.voiceTimeout = setTimeout(() => {
          if (token === this.serial) {
            this.voice?.pause();
            window.speechSynthesis?.cancel();
            finish(false);
          }
        }, 20000);
        if (entry?.src) {
          const a = this.buffers.get(entry.src) || new Audio(entry.src);
          this.voice = a;
          a.currentTime = 0;
          a.volume = this.voiceVolume;
          a.onended = () => finish(true);
          a.onerror = fallback;
          a.play().catch(fallback);
        } else fallback();
      });
    }
    async playFile(src) {
      this.stopVoice();
      if (!src || !this.settings.voice) return false;
      const token = this.serial;
      const a = new Audio(src);
      this.voice = a;
      a.volume = this.voiceVolume;
      try {
        await a.play();
        if (token !== this.serial) {
          a.pause();
          return false;
        }
        return true;
      } catch {
        return false;
      }
    }
    async playMusic(src) {
      this.music?.pause();
      this.music = null;
      if (!src || !this.settings.sound) return false;
      const a = new Audio(src);
      this.music = a;
      a.volume = 0.45;
      try {
        await a.play();
        return this.music === a;
      } catch {
        return false;
      }
    }
    tone(freq = 660, dur = 0.1, type = "sine", vol = 0.05, delay = 0) {
      if (!this.settings.sound) return;
      this.unlock();
      if (!this.ctx) return;
      const t = this.ctx.currentTime + delay,
        o = this.ctx.createOscillator(),
        g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(
        Math.max(0.0002, vol * this.sfxVolume),
        t + 0.012,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      this.effects.add(o);
      o.onended = () => {
        this.effects.delete(o);
        o.disconnect();
        g.disconnect();
      };
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    // Filtered air/friction, intentionally synthesized; replaceable by licensed recordings.
    noise(duration, frequency, volume, loop = false) {
      if (!this.settings.sound) return;
      this.unlock();
      if (!this.ctx) return;
      const c = this.ctx,
        t = c.currentTime,
        s = c.createBufferSource(),
        f = c.createBiquadFilter(),
        g = c.createGain();
      const b =
          this.noiseBuffer || c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
        d = b.getChannelData(0);
      let last = 0;
      if (!this.noiseBuffer) {
        for (let i = 0; i < d.length; i++) {
          last = (last + 0.025 * (Math.random() * 2 - 1)) / 1.025;
          d[i] = last * 8;
        }
        this.noiseBuffer = b;
      }
      s.buffer = b;
      s.loop = loop;
      f.type = "lowpass";
      f.frequency.value = frequency;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(volume * this.sfxVolume, t + 0.12);
      if (!loop) {
        g.gain.setValueAtTime(volume * this.sfxVolume, t + duration * 0.6);
        g.gain.linearRampToValueAtTime(0, t + duration);
      }
      s.connect(f);
      f.connect(g);
      g.connect(c.destination);
      this.effects.add(s);
      s.onended = () => {
        this.effects.delete(s);
        s.disconnect();
        f.disconnect();
        g.disconnect();
      };
      s.start();
      if (!loop) s.stop(t + duration + 0.02);
      return s;
    }
    stopMotor() {
      if (!this.motor) return;
      try {
        this.motor.stop?.();
      } catch {}
      try {
        this.motor.pause?.();
      } catch {}
      this.effects.delete(this.motor);
      this.motor = null;
    }
    playLocalSfx(id, spec) {
      if (!this.settings.sound || !spec?.src) return false;
      if (id === "motorStart") this.stopMotor();
      if (id === "motorStop") this.stopMotor();
      const a = new Audio(spec.src);
      a.preload = "auto";
      a.loop = !!spec.loop;
      a.volume = clamp(this.sfxVolume * (spec.gain ?? 1));
      this.effects.add(a);
      const cleanup = () => {
        if (!a.loop) this.effects.delete(a);
        if (this.motor === a && !a.loop) this.motor = null;
      };
      a.onended = cleanup;
      a.onerror = () => {
        cleanup();
        this.playSyntheticSfx(id);
      };
      a.play().catch(() => {
        cleanup();
        this.playSyntheticSfx(id);
      });
      if (id === "motorStart" && a.loop) this.motor = a;
      return true;
    }
    playSyntheticSfx(id) {
      switch (id) {
        case "button":
          this.noise(0.08, 1800, 0.12);
          break;
        case "doorClose":
        case "doorOpen":
          this.noise(1.25, 650, 0.16);
          break;
        case "motorStart":
          this.stopMotor();
          this.motor = this.noise(2, 180, 0.16, true);
          break;
        case "motorStop":
          this.stopMotor();
          this.noise(0.45, 120, 0.1);
          break;
        case "arrival":
          this.tone(784, 0.5, "sine", 0.08);
          this.tone(659, 0.72, "sine", 0.07, 0.24);
          break;
        case "success":
          this.tone(660, 0.18, "sine", 0.06);
          this.tone(880, 0.3, "sine", 0.055, 0.15);
          break;
        case "flush":
          this.noise(1.0, 520, 0.2);
          break;
      }
    }
    playSfx(id) {
      if (!this.settings.sound) return;
      if (id === "motorStop") this.stopMotor();
      const spec = this.sfxManifest[id];
      if (spec?.src && this.playLocalSfx(id, spec)) return;
      this.playSyntheticSfx(id);
    }
    success() {
      this.playSfx("success");
    }
    button() {
      this.playSfx("button");
    }
    doorClose() {
      this.playSfx("doorClose");
    }
    doorOpen() {
      this.playSfx("doorOpen");
    }
    motorStart() {
      this.playSfx("motorStart");
    }
    motorStop() {
      this.playSfx("motorStop");
    }
    ding() {
      this.playSfx("arrival");
    }
    flush() {
      this.playSfx("flush");
    }
  }
  window.SeowooAudioManager = AudioManager;
})();
