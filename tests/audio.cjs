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
      if (this.src === "bad" || String(this.src).startsWith("ko-dead")) {
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
    resume() {},
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
        koMedia: { text: "문이 열립니다", lang: "ko-KR", src: "ko-media" },
        koDead: { text: "음성 복구 테스트", lang: "ko-KR", src: "ko-dead" },
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
    fetch: async (src) => {
      const fail =
        src === "ko-media?v=current" || src === "ko-dead?v=current";
      return {
        ok: !fail,
        status: fail ? 404 : 200,
        arrayBuffer: async () => new ArrayBuffer(8),
      };
    },
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
  assert(
    await a.playVoice("ko"),
    "Korean Sulafat should play through Web Audio when available",
  );
  assert.equal(
    spoken.length,
    beforeKorean,
    "healthy Korean local playback should not invoke device TTS",
  );

  const mediaFallback = a.playVoice("koMedia");
  await new Promise((r) => setTimeout(r, 5));
  const mediaInstance = instances.find((x) =>
    String(x.src).startsWith("ko-media?v=current"),
  );
  assert(mediaInstance, "Korean Web Audio failure must retry the same local MP3");
  mediaInstance.onended();
  assert(
    await mediaFallback,
    "Korean local media fallback should preserve premium local voice playback",
  );
  assert.equal(
    spoken.length,
    beforeKorean,
    "successful local MP3 fallback should not invoke device TTS",
  );

  const deviceFallback = a.playVoice("koDead");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(
    spoken.length,
    beforeKorean + 1,
    "Korean playback must fall back to device TTS instead of becoming silent",
  );
  spoken.at(-1).onend();
  assert(await deviceFallback, "device TTS fallback should settle successfully");

  const dynamicFallback = a.speak("카탈로그에 없는 안내");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(
    spoken.length,
    beforeKorean + 2,
    "uncatalogued Korean speech must still have a last-resort voice path",
  );
  spoken.at(-1).onend();
  assert(await dynamicFallback);
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
    "Audio tests passed: premium Korean Web Audio, local MP3 retry, device TTS last resort, cancel, stop, mute, volume clamp",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
