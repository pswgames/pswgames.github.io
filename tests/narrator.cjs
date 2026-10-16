const vm = require("vm"),
  fs = require("fs"),
  assert = require("node:assert/strict");
const events = {},
  plays = [],
  finishes = [],
  audio = {
    settings: { voice: true },
    manifest: {},
    playVoice(id) {
      plays.push(id);
      return new Promise((r) => finishes.push(r));
    },
    unlock() {},
    stopVoice() {
      finishes.shift()?.(false);
    },
  };
for (const id of ["a", "b", "c", "d"])
  audio.manifest["play-" + id] = { text: id };
const box = {
  setTimeout, clearTimeout,
  window: {
    SeowooCore: { audio },
    addEventListener: (k, f) => (events[k] = f),
  },
  document: {
    querySelector: () => null,
    addEventListener: (k, f) => (events[k] = f),
  },
};
vm.runInNewContext(fs.readFileSync("js/narrator.js", "utf8"), box);
const n = box.window.SeowooNarrator,
  tick = () => new Promise((r) => setImmediate(r));
(async () => {
  n.say("a");
  n.say("b");
  n.say("c");
  assert.deepEqual(plays, ["play-a"]);
  finishes.shift()(true);
  await tick();
  assert.deepEqual(plays, ["play-a", "play-c"]);
  n.reset();
  finishes.shift()(false);
  await tick();
  n.say("a", "b");
  assert.equal(plays.at(-1), "play-a");
  n.reset();
  finishes.shift()(false);
  await tick();
  assert.equal(plays.at(-1), "play-a");
  audio.settings.voice = false;
  n.say("d");
  assert.equal(plays.at(-1), "play-a");
  audio.settings.voice = true;
  n.say("d");
  assert.equal(plays.at(-1), "play-d");
  n.repeat();
  await tick();
  assert.equal(plays.at(-1), "play-d");
  n.reset();
  finishes.shift()?.(false);
  const before=plays.length;
  n.event("a"); n.event("b");
  await new Promise(r=>setTimeout(r,65));
  assert.equal(plays.length,before+1,"rapid state changes only narrate the latest event");
  assert.equal(plays.at(-1),"play-b");
  n.invalidate(); finishes.shift()?.(true); await tick();
  n.event("c"); n.reset();
  await new Promise(r=>setTimeout(r,65));
  assert.equal(plays.at(-1),"play-b","route reset cancels delayed state narration");
  console.log(
    "PASS narration: serialized playback, latest pending event only, navigation cancellation, mute and replay",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
