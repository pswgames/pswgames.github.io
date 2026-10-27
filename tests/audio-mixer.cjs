/* Mixer invariants with deterministic media failures and suspended playback. */
const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
(async () => {
  const nodes = [],
    media = [],
    utterances = [];
  const param = () => ({
    value: 1,
    events: [],
    cancelAndHoldAtTime() {},
    setTargetAtTime(v, t, s) {
      this.value = v;
      this.events.push({ v, t, s });
    },
    setValueAtTime(v) {
      this.value = v;
    },
    linearRampToValueAtTime(v) {
      this.value = v;
    },
    exponentialRampToValueAtTime(v) {
      this.value = v;
    },
  });
  const node = (extra = {}) => {
    const n = {
      connections: [],
      connect(to) {
        this.connections.push(to);
      },
      disconnect() {
        this.disconnected = true;
      },
      start() {},
      stop() {
        this.stopped = true;
      },
      ...extra,
    };
    nodes.push(n);
    return n;
  };
  class Context {
    constructor() {
      this.currentTime = 1;
      this.sampleRate = 48000;
      this.state = "running";
      this.destination = {};
    }
    createDynamicsCompressor() {
      return node(
        Object.fromEntries(
          ["threshold", "knee", "ratio", "attack", "release"].map((k) => [
            k,
            param(),
          ]),
        ),
      );
    }
    createGain() {
      return node({ gain: param() });
    }
    createMediaElementSource(a) {
      return node({ a });
    }
    createBufferSource() {
      return node();
    }
    createOscillator() {
      return node({ frequency: param() });
    }
    createBiquadFilter() {
      return node({ frequency: param() });
    }
    createBuffer(c, len) {
      const data = new Float32Array(len);
      return { getChannelData: () => data };
    }
    decodeAudioData(b, resolve) {
      const buffer = {};
      resolve?.(buffer);
      return Promise.resolve(buffer);
    }
  }
  class Audio {
    constructor(src) {
      this.src = src;
      this.volume = 1;
      media.push(this);
    }
    play() {
      return this.pending || Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
    load() {}
  }
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  const sandbox = {
    window: {
      AudioContext: Context,
      speechSynthesis: {
        getVoices: () => [],
        addEventListener() {},
        cancel() {},
        speak(u) {
          utterances.push(u);
        },
      },
      SEOWOO_AUDIO: {
        hello: { text: "안내", src: "voice.mp3", lang: "ko-KR" },
      },
    },
    Audio,
    SpeechSynthesisUtterance: Utterance,
    document: { addEventListener() {} },
    fetch: async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,
  };
  for (const f of ["js/audio-profile.js", "audio/sfx.js", "js/audio.js"])
    vm.runInNewContext(fs.readFileSync(f, "utf8"), sandbox);
  const settings = {
    voice: true,
    sound: true,
    englishVoice: true,
    voiceVolume: 0.8,
    sfxVolume: 0.7,
  };
  const a = new sandbox.window.SeowooAudioManager(settings);
  a.unlock();
  assert.equal(a.voiceVolume, 0.8);
  assert.equal(a.sfxVolume, 0.7);
  assert(a.limiter);
  assert.equal(a.channels.voice.gain.value, 1);
  for (const id of Object.keys(a.sfxManifest)) {
    a.stopSfx();
    a.recentSfx.clear();
    a.playSfx(id);
    assert.equal(a.effects.size, 1, id);
    const m = media.at(-1),
      r = a.mediaRoutes.get(m);
    assert.equal(r.channel, "sfx");
    assert.equal(r.level.gain.value, a.effectGain(m.src));
  }
  a.stopSfx();
  a.recentSfx.clear();
  a.button();
  a.button();
  assert.equal(a.effects.size, 1, "rapid duplicate click coalesced");
  const voice = a.playVoice("hello");
  await new Promise((r) => setTimeout(r, 0));
  assert(a.ducked);
  assert.equal(a.channels.sfx.gain.value, 0.7 * 0.3);
  assert(
    a.channels.sfx.gain.events.at(-1).s > 0,
    "duck uses smooth automation",
  );
  assert.equal(a.voiceGain.gain.value, 0.8, "voice unchanged");
  a.setVoiceVolume(0.6);
  assert.equal(a.voiceGain.gain.value, 0.6);
  a.voice.onended();
  assert(await voice);
  assert(!a.ducked);
  assert.equal(a.channels.sfx.gain.value, 0.7);
  await a.playMusic("music.wav");
  assert.equal(a.mediaRoutes.get(a.music).channel, "music");
  a.musicTone(523);
  assert(
    nodes.some((n) => n.connections.includes(a.channels.music)),
    "synthetic music routed",
  );
  a.tone(660);
  a.noise(0.1, 520, 0.1);
  assert(a.effects.size <= 6);
  a.setSfxVolume(0);
  assert.equal(a.effects.size, 0);
  assert.equal(a.music, null);
  const count = media.length;
  a.playSfx("flush");
  a.tone(660);
  assert.equal(media.length, count);
  assert.equal(a.effects.size, 0);
  a.setVoiceVolume(0);
  assert.equal(await a.playVoice("hello"), false);
  assert.equal(utterances.length, 0, "zero voice never invokes TTS");
  a.setSfxVolume(0.7);
  a.setVoiceVolume(0.8);
  settings.sound = false;
  a.syncSettings();
  assert.equal(a.effects.size, 0);
  assert.equal(await a.playMusic("x"), false);
  settings.sound = true;
  settings.voice = false;
  a.syncSettings();
  assert.equal(await a.playVoice("hello"), false);
  settings.voice = true;
  a.recentSfx.clear();
  a.playSfx("success");
  const late = media.at(-1),
    before = nodes.length;
  a.stopAll();
  late.onerror();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(a.effects.size, 0);
  assert.equal(
    nodes.length,
    before,
    "late error cannot resurrect synthetic effect after navigation",
  );
  assert.equal(a.media.size, 0, "all media graph nodes disconnected");
  // No Web Audio is a supported degraded path, including volume=0 and duck/restore.
  sandbox.window.AudioContext = undefined;
  const b = new sandbox.window.SeowooAudioManager({
    voice: true,
    sound: true,
    voiceVolume: 0.5,
    sfxVolume: 0.6,
  });
  await b.playMusic("fallback.wav");
  assert.equal(b.music.volume, 0.6 * 0.28);
  b.duck(true);
  await new Promise((r) => setTimeout(r, 210));
  assert(Math.abs(b.music.volume - 0.6 * 0.28 * 0.18) < 1e-6);
  b.setSfxVolume(0);
  assert.equal(b.music, null);
  b.stopAll();
  // WebViews may have no device speech API; local audio/volume must still work.
  delete sandbox.SpeechSynthesisUtterance;
  sandbox.window.speechSynthesis = undefined;
  const noDeviceSpeech = new sandbox.window.SeowooAudioManager({
    voice: true,
    sound: true,
  });
  assert.doesNotThrow(() => noDeviceSpeech.setVoiceVolume(0.4));
  noDeviceSpeech.stopAll();
  a.stopAll();
  console.log(
    "PASS mixer: all SFX/music routes, calibrated gains, unchanged voice, duck/restore, caps, zero/OFF, late failure, media cleanup and degraded fallback",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
