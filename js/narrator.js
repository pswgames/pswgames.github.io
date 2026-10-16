/* Bounded event narration using the same local MP3 player as the elevator. */
(() => {
  "use strict";
  let generation = 0,
    running = false,
    pending = null,
    last = [],
    shown = "",
    eventTimer = 0;
  const audio = () => window.SeowooCore.audio;
  const paint = () => {
    const n = document.querySelector("[data-narration]");
    if (n) n.textContent = shown;
  };
  async function drain(keys, token) {
    running = true;
    for (const key of keys) {
      if (token !== generation) return;
      const id = key.startsWith("play-") ? key : "play-" + key;
      const entry = audio().manifest?.[id] || window.SEOWOO_AUDIO?.[id];
      if (!entry) continue;
      shown = entry.text;
      paint();
      await audio().playVoice(id);
      // A newer event makes the remaining old instructions obsolete.
      if (pending) break;
    }
    if (token !== generation) return;
    running = false;
    if (pending) {
      const next = pending;
      pending = null;
      drain(next, token);
    }
  }
  function say(...keys) {
    keys = keys.flat().filter(Boolean);
    if (!keys.length) return;
    last = keys;
    if (!audio().settings.voice) {
      pending = null;
      return;
    }
    if (running) {
      pending = keys;
      return;
    }
    drain(keys, generation);
  }
  function reset() {
    clearTimeout(eventTimer);
    generation++;
    running = false;
    pending = null;
    last = [];
    shown = "";
  }
  // Dragging invalidates queued next-step guidance. A committed new state owns
  // narration immediately; fade the previous clip before replacing it.
  function invalidate() {
    pending = null;
    generation++;
    running = false;
    clearTimeout(eventTimer);
  }
  function event(...keys) {
    invalidate();
    const a = audio(), token = generation;
    if (a.voiceGain && a.ctx) {
      const gain=a.voiceGain.gain, now=a.ctx.currentTime;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value,now);
      gain.linearRampToValueAtTime(0,now+.04);
    }
    eventTimer=setTimeout(() => {
      if (token !== generation) return;
      a.stopVoice();
      say(...keys);
    }, 45);
  }
  function repeat() {
    if (last.length) {
      const keys = last;
      audio().unlock();
      audio().stopVoice();
      reset();
      say(keys);
    }
  }
  window.SeowooNarrator = {
    say,
    event,
    invalidate,
    repeat,
    reset,
    paint,
    get text() {
      return shown;
    },
  };
  window.addEventListener("seowoo:route", reset);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
})();
