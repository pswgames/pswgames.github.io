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
      this.decodedVoices = new Map();
      this.voiceGain = null;
      this.effects = new Set();
      this.mediaRoutes = new WeakMap();
      this.media = new Set();
      this.recentSfx = new Map();
      this.sfxEpoch = 0;
      this.musicSerial = 0;
      this.ducked = false;
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
        this.ensureMixer();
        const prime = () => {
          if (!this.ctx || this.ctx.state !== "running") return;
          try {
            // Starting a zero-buffer source during a real user gesture keeps
            // iOS/Safari/PWA Web Audio unlocked without producing sound.
            const source = this.ctx.createBufferSource();
            source.connect(this.ctx.destination);
            source.onended = () => {
              try {
                source.disconnect();
              } catch {}
            };
            source.start(0);
          } catch {}
        };
        if (this.ctx.state === "suspended") {
          const resumed = this.ctx.resume();
          if (resumed?.then) resumed.then(prime).catch(() => {});
          else prime();
        } else prime();
      } catch {}
    }
    // One graph for every local/synthetic path. Voice gain remains unchanged.
    ensureMixer() {
      if (this.channels || !this.ctx?.createDynamicsCompressor) return;
      const c = this.ctx;
      const limiter = c.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      // DynamicsCompressor includes automatic makeup gain. Cancel its ~1.7 dB
      // boost so the existing guide voice retains its original standalone level.
      const output = c.createGain();
      output.gain.value = 0.82;
      limiter.connect(output);
      output.connect(c.destination);
      this.channels = {};
      for (const name of ["voice", "sfx", "music"]) {
        const g = c.createGain();
        g.gain.value = name === "voice" ? 1 : this.channelLevel(name);
        g.connect(limiter);
        this.channels[name] = g;
      }
      this.limiter = limiter;
      this.syncSettings();
    }
    ramp(param, value, seconds = 0.08) {
      if (!param) return;
      const now = this.ctx?.currentTime || 0;
      if (param.setTargetAtTime) {
        if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
        else {
          param.cancelScheduledValues(now);
          param.setValueAtTime(param.value, now);
        }
        param.setTargetAtTime(value, now, seconds / 3);
      } else param.value = value;
    }
    channelLevel(channel) {
      if (channel === "voice")
        return this.settings.voice ? this.voiceVolume : 0;
      if (!this.settings.sound) return 0;
      return (
        this.sfxVolume *
        (channel === "music" ? 0.28 : 1) *
        (this.ducked ? (channel === "music" ? 0.18 : 0.3) : 1)
      );
    }
    syncSettings() {
      if (this.channels) {
        // Per-voice volume stays on its source, as before.
        this.ramp(this.channels.voice.gain, 1);
        this.ramp(this.channels.sfx.gain, this.channelLevel("sfx"));
        this.ramp(this.channels.music.gain, this.channelLevel("music"));
      }
      this.refreshMedia();
      if (!this.settings.voice || this.voiceVolume === 0) this.stopVoice();
      if (!this.settings.sound || this.sfxVolume === 0) {
        this.stopSfx();
        this.stopMusic();
      }
    }
    duck(active) {
      this.ducked = active;
      for (const name of ["sfx", "music"])
        this.ramp(
          this.channels?.[name].gain,
          this.channelLevel(name),
          active ? 0.09 : 0.3,
        );
      this.refreshMedia();
    }
    output(name) {
      return this.channels?.[name] || this.ctx.destination;
    }
    routeMedia(a, channel, gain = 1) {
      const route = { a, channel, gain, graph: false };
      this.unlock();
      if (this.channels && this.ctx.createMediaElementSource) {
        try {
          const source = this.ctx.createMediaElementSource(a);
          const level = this.ctx.createGain();
          level.gain.value =
            gain * (channel === "voice" ? this.voiceVolume : 1);
          source.connect(level);
          level.connect(this.output(channel));
          Object.assign(route, { source, level, graph: true });
        } catch {}
      }
      this.mediaRoutes.set(a, route);
      this.media.add(route);
      a.volume = route.graph ? 1 : clamp(gain * this.channelLevel(channel));
      return a;
    }
    releaseMedia(a) {
      if (!a) return;
      const route = this.mediaRoutes.get(a);
      if (!route) return;
      clearInterval(route.fade);
      route.source?.disconnect();
      route.level?.disconnect();
      this.media.delete(route);
      this.mediaRoutes.delete(a);
    }
    refreshMedia() {
      for (const route of this.media) {
        const target = route.graph
          ? 1
          : clamp(route.gain * this.channelLevel(route.channel));
        if (route.graph && route.channel === "voice")
          this.ramp(route.level.gain, this.voiceVolume);
        clearInterval(route.fade);
        if (route.graph || target === 0) {
          route.a.volume = target;
          continue;
        }
        const start = route.a.volume,
          time = Date.now();
        route.fade = setInterval(() => {
          const fraction = Math.min(1, (Date.now() - time) / 180);
          route.a.volume = start + (target - start) * fraction;
          if (fraction === 1) clearInterval(route.fade);
        }, 20);
      }
    }
    effectGain(src, fallback = 1) {
      return (
        window.SEOWOO_AUDIO_PROFILE?.files?.[String(src).split("?")[0]] ??
        fallback
      );
    }
    stopMusic() {
      this.musicSerial++;
      this.music?.pause();
      this.releaseMedia(this.music);
      this.music = null;
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
      try {
        this.voice?.stop?.();
      } catch {}
      try {
        this.voice?.pause?.();
      } catch {}
      this.releaseMedia(this.voice);
      this.voice = null;
      this.voiceGain = null;
      this.duck(false);
      window.speechSynthesis?.cancel();
      this.finishVoice?.(false);
      this.finishVoice = null;
      clearTimeout(this.voiceTimeout);
    }
    stopSfx() {
      this.sfxEpoch++;
      for (const s of this.effects) {
        try {
          s.stop?.();
        } catch {}
        try {
          s.pause?.();
        } catch {}
        this.releaseMedia(s);
      }
      this.effects.clear();
      this.motor = null;
    }
    stopAll() {
      this.stopVoice();
      this.stopSfx();
      this.stopMusic();
    }
    stop() {
      this.stopAll();
    }
    setVoiceVolume(n) {
      this.voiceVolume = clamp(n);
      this.settings.voiceVolume = this.voiceVolume;
      if (
        this.voice &&
        "volume" in this.voice &&
        !this.mediaRoutes.get(this.voice)?.graph
      )
        this.voice.volume = this.voiceVolume;
      if (this.voiceGain) this.voiceGain.gain.value = this.voiceVolume;
      if (this.voice instanceof SpeechSynthesisUtterance)
        this.voice.volume = this.voiceVolume;
      this.syncSettings();
    }
    setSfxVolume(n) {
      this.sfxVolume = clamp(n);
      this.settings.sfxVolume = this.sfxVolume;
      this.syncSettings();
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
        this.voiceVolume === 0 ||
        (!this.settings.englishVoice && lang.startsWith("en"))
      )
        return Promise.resolve(false);
      const token = this.serial;
      this.duck(true);
      entry ??= Object.values(this.manifest).find(
        (x) =>
          (x.lang || "ko-KR") === lang && normalize(x.text) === normalize(text),
      );
      return new Promise((resolve) => {
        const finish = (ok) => {
          if (token !== this.serial) return;
          clearTimeout(this.voiceTimeout);
          this.finishVoice = null;
          this.releaseMedia(this.voice);
          this.duck(false);
          this.voice = null;
          this.voiceGain = null;
          resolve(ok);
        };
        this.finishVoice = resolve;

        let deviceFallbackStarted = false;
        const deviceFallback = () => {
          if (token !== this.serial || deviceFallbackStarted) return;
          deviceFallbackStarted = true;
          try {
            this.voice?.pause?.();
          } catch {}
          this.releaseMedia(this.voice);
          if (!window.speechSynthesis) {
            finish(false);
            return;
          }
          try {
            window.speechSynthesis.resume?.();
          } catch {}
          const u = new SpeechSynthesisUtterance(text);
          u.lang = lang;
          u.rate = rate;
          u.pitch = 1;
          u.volume = this.voiceVolume;
          const v = this.pickVoice(lang);
          if (v) u.voice = v;
          u.onend = () => finish(true);
          u.onerror = () => finish(false);
          this.voice = u;
          window.speechSynthesis.speak(u);
        };

        const versionedSrc = (src) => {
          const version = encodeURIComponent(
            window.__SEOWOO_VERSION__ || "current",
          );
          const separator = src.includes("?") ? "&" : "?";
          return `${src}${separator}v=${version}`;
        };

        const playLocalMediaFallback = () => {
          if (token !== this.serial) return;
          if (!entry?.src) {
            deviceFallback();
            return;
          }
          try {
            const a = new Audio(versionedSrc(entry.src));
            a.preload = "auto";
            a.currentTime = 0;
            this.routeMedia(a, "voice");
            this.voice = a;
            a.onended = () => finish(true);
            a.onerror = deviceFallback;
            a.play().catch(deviceFallback);
          } catch (error) {
            console.warn("Local voice media fallback failed", error);
            deviceFallback();
          }
        };

        const playKoreanLocal = async () => {
          try {
            if (!entry?.src) {
              deviceFallback();
              return;
            }
            this.unlock();
            if (!this.ctx) throw new Error("AudioContext unavailable");
            if (this.ctx.state === "suspended") await this.ctx.resume();

            let buffer = this.decodedVoices.get(entry.src);
            if (!buffer) {
              const response = await fetch(versionedSrc(entry.src), {
                cache: "reload",
              });
              if (!response.ok)
                throw new Error(`voice asset HTTP ${response.status}`);
              const bytes = await response.arrayBuffer();
              buffer = await new Promise((res, rej) => {
                const result = this.ctx.decodeAudioData(
                  bytes.slice(0),
                  res,
                  rej,
                );
                result?.then?.(res, rej);
              });
              this.decodedVoices.set(entry.src, buffer);
            }

            if (token !== this.serial) return;
            const source = this.ctx.createBufferSource();
            const gain = this.ctx.createGain();
            source.buffer = buffer;
            gain.gain.value = this.voiceVolume;
            source.connect(gain);
            gain.connect(this.output("voice"));
            this.voice = source;
            this.voiceGain = gain;
            source.onended = () => {
              try {
                source.disconnect();
                gain.disconnect();
              } catch {}
              finish(true);
            };
            source.start(0);
          } catch (error) {
            console.warn(
              "Korean Web Audio playback failed; retrying local media",
              error,
            );
            playLocalMediaFallback();
          }
        };

        this.voiceTimeout = setTimeout(() => {
          if (token === this.serial) {
            try {
              this.voice?.stop?.();
            } catch {}
            try {
              this.voice?.pause?.();
            } catch {}
            window.speechSynthesis?.cancel();
            finish(false);
          }
        }, 20000);

        if (lang.startsWith("ko")) {
          playKoreanLocal();
          return;
        }

        if (entry?.src) {
          const a = new Audio(entry.src);
          this.voice = a;
          a.currentTime = 0;
          this.routeMedia(a, "voice");
          a.onended = () => finish(true);
          a.onerror = deviceFallback;
          a.play().catch(deviceFallback);
        } else deviceFallback();
      });
    }
    async playFile(src) {
      this.stopVoice();
      if (!src || !this.settings.voice || this.voiceVolume === 0) return false;
      this.duck(true);
      const token = this.serial;
      const a = new Audio(src);
      this.voice = a;
      this.routeMedia(a, "voice");
      const finish = () => {
        if (token === this.serial) {
          this.releaseMedia(a);
          this.voice = null;
          this.duck(false);
        }
      };
      a.onended = finish;
      a.onerror = finish;
      try {
        await a.play();
        if (token !== this.serial) {
          a.pause();
          return false;
        }
        return true;
      } catch {
        finish();
        return false;
      }
    }
    async playMusic(src) {
      this.stopMusic();
      if (!src || !this.settings.sound || this.sfxVolume === 0) return false;
      const token = this.musicSerial;
      const a = this.routeMedia(new Audio(src), "music", this.effectGain(src));
      this.music = a;
      const finish = () => {
        this.releaseMedia(a);
        if (this.music === a) this.music = null;
      };
      a.onended = finish;
      a.onerror = finish;
      try {
        await a.play();
        if (token !== this.musicSerial) {
          a.pause();
          finish();
          return false;
        }
        return this.music === a;
      } catch {
        finish();
        return false;
      }
    }
    musicTone(freq, dur = 0.45) {
      this.tone(freq, dur, "sine", 0.05, 0, "music");
    }
    tone(
      freq = 660,
      dur = 0.1,
      type = "sine",
      vol = 0.05,
      delay = 0,
      channel = "sfx",
    ) {
      if (!this.settings.sound || this.sfxVolume === 0) return;
      this.unlock();
      if (!this.ctx || vol <= 0 || this.effects.size >= 6) return;
      const t = this.ctx.currentTime + delay,
        o = this.ctx.createOscillator(),
        g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      const peak =
        Math.min(0.36, 0.3 * Math.pow(vol / 0.05, 0.25)) *
        (type === "square" ? 0.7 : 1) *
        (this.channels ? 1 : this.channelLevel(channel));
      g.gain.linearRampToValueAtTime(peak, t + Math.min(0.012, dur / 4));
      g.gain.setValueAtTime(peak, t + dur * 0.55);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.output(channel));
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
      if (!this.settings.sound || this.sfxVolume === 0) return;
      this.unlock();
      if (!this.ctx || volume <= 0 || this.effects.size >= 6) return;
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
      g.gain.linearRampToValueAtTime(
        Math.min(volume, 0.2) *
          (frequency <= 180 ? 0.42 : 1) *
          (this.channels ? 1 : this.channelLevel("sfx")),
        t + 0.12,
      );
      if (!loop) {
        g.gain.setValueAtTime(
          Math.min(volume, 0.2) *
            (frequency <= 180 ? 0.42 : 1) *
            (this.channels ? 1 : this.channelLevel("sfx")),
          t + duration * 0.6,
        );
        g.gain.linearRampToValueAtTime(0, t + duration);
      }
      s.connect(f);
      f.connect(g);
      g.connect(this.output("sfx"));
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
      this.releaseMedia(this.motor);
      this.effects.delete(this.motor);
      this.motor = null;
    }
    playLocalSfx(id, spec) {
      if (!this.settings.sound || this.sfxVolume === 0 || !spec?.src)
        return false;
      if (id === "motorStart") this.stopMotor();
      if (id === "motorStop") this.stopMotor();
      const epoch = this.sfxEpoch;
      const a = this.routeMedia(
        new Audio(spec.src),
        "sfx",
        this.effectGain(spec.src, spec.gain ?? 1),
      );
      a.preload = "auto";
      a.loop = !!spec.loop;
      this.effects.add(a);
      let failed = false;
      const cleanup = () => {
        this.effects.delete(a);
        this.releaseMedia(a);
        if (this.motor === a) this.motor = null;
      };
      const fallback = () => {
        if (failed) return;
        failed = true;
        a.pause();
        cleanup();
        if (
          epoch === this.sfxEpoch &&
          this.settings.sound &&
          this.sfxVolume > 0
        )
          this.playSyntheticSfx(id);
      };
      a.onended = cleanup;
      a.onerror = fallback;
      a.play()
        .then(() => {
          if (epoch !== this.sfxEpoch) {
            a.pause();
            cleanup();
          }
        })
        .catch(fallback);
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
      if (!this.settings.sound || this.sfxVolume === 0) return;
      if (id === "motorStop") this.stopMotor();
      const now = Date.now(),
        previous = this.recentSfx.get(id);
      if (previous != null && now - previous < 75) return;
      this.recentSfx.set(id, now);
      if (this.effects.size >= 6) return;
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
