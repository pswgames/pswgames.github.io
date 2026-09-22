const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert");
(async () => {
  const instances = [],
    spoken = [];
  let finishes = [];
  class Audio {
    constructor(src) {
      this.src = src;
      instances.push(this);
    }
    pause() {
      this.paused = true;
    }
    load() {}
    play() {
      if (this.src === "bad") {
        queueMicrotask(() => this.onerror?.());
        return Promise.reject(Error("missing"));
      }
      return Promise.resolve();
    }
  }
  const synth = {
    getVoices: () => [],
    addEventListener() {},
    cancel() {},
    speak(u) {
      spoken.push(u);
    },
  };
  const sandbox = {
    window: {
      speechSynthesis: synth,
      SEOWOO_AUDIO: {
        hello: { text: "hello", lang: "en-US", src: "hello" },
        bad: { text: "missing", lang: "en-US", src: "bad" },
        ko: { text: "문이 닫힙니다", lang: "ko-KR", src: "ko-local" },
        koBad: { text: "문이 열립니다", lang: "ko-KR", src: "ko-bad" },
      },
      AudioContext: class {
        constructor() {
          this.state = "running";
          this.destination = {};
        }
        resume() {
          return Promise.resolve();
        }
        decodeAudioData(bytes, resolve) {
          const buffer = { bytes };
          resolve?.(buffer);
          return Promise.resolve(buffer);
        }
        createBufferSource() {
          return {
            connect() {},
            disconnect() {},
            stop() {},
            start() {
              queueMicrotask(() => this.onended?.());
            },
          };
        }
        createGain() {
          return {
            gain: { value: 1 },
            connect() {},
            disconnect() {},
          };
        }
      },
    },
    document: { addEventListener() {} },
    Audio,
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
    fetch: async (src) => ({
      ok: src !== "ko-bad?v=current",
      status: src === "ko-bad?v=current" ? 404 : 200,
      arrayBuffer: async () => new ArrayBuffer(8),
    }),
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(fs.readFileSync("js/audio.js", "utf8"), sandbox);
  const a = new sandbox.window.SeowooAudioManager({
    voice: true,
    sound: true,
    englishVoice: true,
  });
  a.preload(["hello"]);
  assert.equal(instances.length, 1);
  const first = a.playVoice("hello");
  const second = a.playVoice("bad");
  assert.equal(await first, false);
  assert(instances[0].paused);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(
    spoken.length,
    1,
    "network error and rejection must fallback once",
  );
  spoken[0].onend();
  assert(await second);

  const beforeKorean = spoken.length;
  assert(await a.playVoice("ko"), "Korean local Sulafat path should play through Web Audio");
  assert.equal(
    spoken.length,
    beforeKorean,
    "Korean local playback must never invoke device speechSynthesis",
  );
  assert.equal(
    await a.playVoice("koBad"),
    false,
    "missing Korean local asset should fail closed instead of using device TTS",
  );
  assert.equal(
    spoken.length,
    beforeKorean,
    "failed Korean local playback must still not invoke device speechSynthesis",
  );
  const p = a.speak("one");
  const q = a.speak("two");
  assert.equal(await p, false);
  a.stopAll();
  assert.equal(await q, false);
  a.settings.voice = false;
  assert.equal(await a.playVoice("hello"), false);
  a.setVoiceVolume(2);
  assert.equal(a.voiceVolume, 1);
  a.setSfxVolume(-1);
  assert.equal(a.sfxVolume, 0);
  console.log(
    "Audio tests passed: English fallback, Korean local-only Web Audio, cancel, stop, mute, volume clamp",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
