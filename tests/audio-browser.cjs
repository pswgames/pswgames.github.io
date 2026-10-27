/* Real decoding, Web Audio renders and playback cleanup. No hardware capture. */
const { chromium, webkit } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { spawn } = require("node:child_process");
const origin = process.env.QA_ORIGIN || "http://127.0.0.1:4181";
const server = process.env.QA_ORIGIN
  ? null
  : spawn(process.execPath, ["scripts/serve.cjs"], {
      stdio: "pipe",
      env: { ...process.env, PORT: "4181" },
    });
const ready = server
  ? new Promise((resolve, reject) => {
      server.stdout.on("data", (d) => {
        if (String(d).includes("Preview ready")) resolve();
      });
      server.on("error", reject);
    })
  : Promise.resolve();
let browser;
(async () => {
  await ready;
  const engine = process.env.QA_ENGINE || "chromium";
  browser = await { chromium, webkit }[engine].launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block",
  });
  await context.addInitScript(() => {
    if (navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new Error("Camera disabled in QA"));
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page.locator('[data-go="music"]').first().click();
  const measurement = await page.evaluate(async () => {
    const Offline =
      window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const measure = (b) => {
      const x = b.getChannelData(0),
        r = [];
      let peak = 0,
        sum = 0;
      for (let i = 0; i < x.length; i++) {
        sum += x[i] * x[i];
        peak = Math.max(peak, Math.abs(x[i]));
      }
      for (let n = 0; n + 960 <= x.length; n += 960) {
        let s = 0;
        for (let i = n; i < n + 960; i++) s += x[i] * x[i];
        r.push(Math.sqrt(s / 960));
      }
      const max = Math.max(...r),
        active = r.filter((v) => v > max * 0.1);
      const db = (x) => 20 * Math.log10(Math.max(x, 1e-12));
      return {
        rmsDb: db(Math.sqrt(sum / x.length)),
        activeRmsDb: db(
          Math.sqrt(active.reduce((s, x) => s + x * x, 0) / active.length),
        ),
        peakDb: db(peak),
        peak,
      };
    };
    const settings = {
      voice: true,
      sound: true,
      englishVoice: true,
      voiceVolume: 1,
      sfxVolume: 0.9,
    };
    const windowDb = (buffer, start, end) => {
      const samples = buffer
        .getChannelData(0)
        .slice(
          Math.floor(start * buffer.sampleRate),
          Math.floor(end * buffer.sampleRate),
        );
      return (
        20 *
        Math.log10(
          Math.sqrt(samples.reduce((s, x) => s + x * x, 0) / samples.length),
        )
      );
    };
    const render = async (kind, old = false) => {
      const c = new Offline(1, 48000 * 3, 48000),
        a = new SeowooAudioManager({ ...settings });
      a.ctx = c;
      let resumeDuck;
      if (kind.startsWith("channel-")) {
        const [, mode, channel] = kind.split("-");
        a.ensureMixer();
        const oscillator = c.createOscillator(),
          gain = c.createGain();
        oscillator.frequency.value = 440;
        gain.gain.value = 0.1;
        oscillator.connect(gain);
        gain.connect(a.output(channel));
        oscillator.start(0);
        oscillator.stop(2);
        if (mode !== "normal") a.duck(true);
        if (mode === "recover") {
          resumeDuck = c.suspend(0.5).then(() => {
            a.duck(false);
            return c.resume();
          });
        }
      } else if (kind === "voice") {
        const bytes = await (
          await fetch(SEOWOO_AUDIO_FILES["common-0"])
        ).arrayBuffer();
        const source = c.createBufferSource();
        source.buffer = await c.decodeAudioData(bytes);
        if (!old) a.ensureMixer();
        source.connect(old ? c.destination : a.output("voice"));
        source.start(0.08);
      } else if (kind === "overlap" || kind === "sequence") {
        a.ensureMixer();
        const src = SEOWOO_AUDIO_FILES["common-0"],
          bytes = await (await fetch(src)).arrayBuffer();
        const voice = await c.decodeAudioData(bytes);
        const v = c.createBufferSource();
        v.buffer = voice;
        v.connect(a.output("voice"));
        v.start(0.08);
        const names =
          kind === "overlap"
            ? Object.keys(SEOWOO_SFX).slice(0, 6)
            : ["button", "arrival", "flush"];
        for (let i = 0; i < names.length; i++) {
          const spec = SEOWOO_SFX[names[i]],
            buf = await c.decodeAudioData(
              await (await fetch(spec.src)).arrayBuffer(),
            );
          const s = c.createBufferSource(),
            g = c.createGain();
          s.buffer = buf;
          g.gain.value = a.effectGain(spec.src);
          s.connect(g);
          g.connect(a.output("sfx"));
          s.start(kind === "overlap" ? 0.08 : i * 0.65);
        }
        if (kind === "overlap") {
          a.duck(true);
          a.musicTone(523);
          a.tone(880, 0.3, "square", 0.045);
        }
      } else if (kind.startsWith("noise")) {
        a.noise(
          0.8,
          kind === "noise-motor" ? 180 : 520,
          kind === "noise-motor" ? 0.16 : 0.2,
        );
      } else {
        const isMusic = kind === "music",
          type = kind === "block" ? "square" : "sine",
          vol = isMusic ? 0.09 : kind === "pop" ? 0.035 : 0.045,
          dur = isMusic ? 0.45 : 0.12;
        if (old) {
          const o = c.createOscillator(),
            g = c.createGain(),
            t = 0;
          o.type = type;
          o.frequency.value = 660;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(vol * 0.9, t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g);
          g.connect(c.destination);
          o.start();
          o.stop(dur + 0.02);
        } else if (isMusic) a.musicTone(660, dur);
        else a.tone(660, dur, type, vol);
      }
      const rendered = c.startRendering();
      if (resumeDuck) await resumeDuck;
      const buffer = await rendered;
      a.stopAll();
      return {
        ...measure(buffer),
        earlyDb: windowDb(buffer, 0.3, 0.4),
        afterReleaseDb: windowDb(buffer, 1.4, 1.6),
        releaseStartDb: windowDb(buffer, 0.5, 0.51),
      };
    };
    const result = {};
    for (const k of ["pop", "block", "music", "voice"])
      result[k] = { before: await render(k, true), after: await render(k) };
    for (const k of ["noise-flush", "noise-motor", "sequence", "overlap"])
      result[k] = await render(k);
    for (const channel of ["sfx", "music"])
      for (const mode of ["normal", "duck", "recover"])
        result[`channel-${mode}-${channel}`] = await render(
          `channel-${mode}-${channel}`,
        );
    return result;
  });
  for (const [name, row] of Object.entries(measurement)) {
    const value = row.after || row;
    assert(value.peak < 1, `${name} clips`);
    assert(Number.isFinite(value.activeRmsDb), name);
  }
  assert(
    measurement.pop.after.activeRmsDb > measurement.music.after.activeRmsDb + 5,
    "music remains lower than effects",
  );
  assert(
    Math.abs(
      measurement.voice.after.activeRmsDb -
        measurement.voice.before.activeRmsDb,
    ) < 0.2,
    "solo guide voice level preserved",
  );
  for (const channel of ["sfx", "music"]) {
    const normal = measurement[`channel-normal-${channel}`],
      duck = measurement[`channel-duck-${channel}`],
      recover = measurement[`channel-recover-${channel}`];
    const expected = 20 * Math.log10(channel === "music" ? 0.18 : 0.3);
    assert(
      Math.abs(duck.earlyDb - normal.earlyDb - expected) < 0.2,
      `${channel}: rendered duck level`,
    );
    assert(
      Math.abs(recover.afterReleaseDb - normal.afterReleaseDb) < 0.2,
      `${channel}: rendered restoration`,
    );
    assert(
      recover.releaseStartDb < normal.releaseStartDb - 3,
      `${channel}: release must fade rather than jump`,
    );
  }
  // Start media through a genuine click, as the app does. WebKit does not
  // treat evaluate() after offline renders as a user activation.
  await page.evaluate(() => {
    window.__audioMediaErrors = [];
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      return original.apply(this, args).catch((error) => {
        window.__audioMediaErrors.push({ src: this.src, name: error.name });
        throw error;
      });
    };
    const button = document.createElement("button");
    button.id = "audio-qa-start";
    button.textContent = "Start audio QA";
    button.onclick = () => {
      const a = SeowooCore.audio;
      a.stopAll();
      a.settings.voice = true;
      a.settings.sound = true;
      a.setVoiceVolume(1);
      a.setSfxVolume(0.9);
      a.unlock();
      a.playSfx("arrival");
      window.__audioQAMedia = [...a.effects][0];
      window.__audioQAMusic = a.playMusic(SEOWOO_SFX.success.src);
      window.__audioQAMusicElement = a.music;
    };
    document.body.append(button);
  });
  await page.locator("#audio-qa-start").click();
  try {
    await page.waitForFunction(
      () => {
        const media = window.__audioQAMedia;
        return (
          media &&
          media.currentTime > 0 &&
          window.__audioQAMusicElement?.currentTime > 0
        );
      },
      null,
      { timeout: 5000 },
    );
  } catch (error) {
    console.error(
      "Media start diagnostics",
      await page.evaluate(() => ({
        failures: window.__audioMediaErrors,
        effectTime: window.__audioQAMedia?.currentTime,
        effectEnded: window.__audioQAMedia?.ended,
        musicTime: window.__audioQAMusicElement?.currentTime,
        musicEnded: window.__audioQAMusicElement?.ended,
        state: SeowooCore.audio.ctx?.state,
        paused: window.__audioQAMedia?.paused,
        ready: window.__audioQAMedia?.readyState,
        error: window.__audioQAMedia?.error?.message,
      })),
    );
    throw error;
  }
  const playback = await page.evaluate(async () => {
    const a = SeowooCore.audio;
    // Short clips may already have ended and been released by the mixer;
    // retain their element handles and require actual timeline progress.
    if (!(await window.__audioQAMusic)) throw Error("HTML music did not play");
    const voice = a.playVoice("play-drag-help");
    const duck = a.ducked;
    const voicePlayed = await voice;
    const restored = !a.ducked;
    if (!a.decodedVoices.has(a.manifest["play-drag-help"].src))
      throw Error("Guide voice not decoded locally");
    a.stopVoice();
    a.playSfx("motorStart");
    // HTMLAudio music is separately covered by the mixer contract. Current
    // music-menu tracks are generated on the music channel, rendered above.
    await a.playMusic(SEOWOO_SFX.arrival.src);
    a.setSfxVolume(0);
    if (a.effects.size || a.music)
      throw Error("Volume zero leaves audio running");
    a.setVoiceVolume(0);
    if (await a.playVoice("common-0")) throw Error("Zero voice accepted");
    a.setSfxVolume(0.9);
    a.setVoiceVolume(1);
    a.playSfx("motorStart");
    return {
      duck,
      voicePlayed,
      restored,
      mediaPlayed: true,
      htmlMusicPlayed: true,
    };
  });
  assert(playback.duck);
  assert(playback.voicePlayed);
  assert(playback.restored);
  await page.locator('[data-go="home"]').first().click();
  assert.deepEqual(
    await page.evaluate(() => ({
      effects: SeowooCore.audio.effects.size,
      media: SeowooCore.audio.media.size,
      music: SeowooCore.audio.music,
      ducked: SeowooCore.audio.ducked,
    })),
    { effects: 0, media: 0, music: null, ducked: false },
  );
  assert.deepEqual(errors, []);
  fs.mkdirSync(".test-results/audio", { recursive: true });
  fs.writeFileSync(
    `.test-results/audio/${engine}.json`,
    JSON.stringify(
      {
        origin,
        engine,
        measurement,
        playback,
        realListeningPerformed: false,
        realCameraUsed: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS audio browser: real decode/play, rendered sequence/overlap peak, calibrated synthesis, duck/restore, zero and navigation cleanup",
    JSON.stringify({
      engine,
      playback,
      overlapPeakDb: measurement.overlap.peakDb,
    }),
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server?.kill();
  });
