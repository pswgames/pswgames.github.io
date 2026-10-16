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
  console.log(
    "PASS narration: serialized playback, latest pending event only, navigation cancellation, mute and replay",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
