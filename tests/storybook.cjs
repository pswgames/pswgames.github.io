const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict"),
  { webcrypto } = require("crypto"),
  { JSDOM } = require("jsdom");
const dom = new JSDOM(fs.readFileSync("index.html", "utf8"), {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const w = dom.window,
  doc = w.document,
  spoken = [];
w.scrollTo = () => {};
w.matchMedia = () => ({ matches: false, addEventListener() {} });
w.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
Object.defineProperty(w, "crypto", { value: webcrypto });
w.TextEncoder = TextEncoder;
w.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
w.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
class Audio {
  constructor(settings) {
    this.settings = settings;
  }
  speak(t) {
    spoken.push(t);
    return Promise.resolve(true);
  }
  playVoice(id) {
    assert(w.SEOWOO_AUDIO[id], "unknown dialogue " + id);
    spoken.push(id);
    return Promise.resolve(true);
  }
  syncSettings() {}
  musicTone() {}
  unlock() {}
  stop() {}
  stopAll() {}
  stopVoice() {}
  button() {}
  success() {}
  tone() {}
  noise() {}
  flush() {}
  preload() {}
}
w.SeowooAudioManager = Audio;
w.SeowooElevator = { mount() {}, unmount() {}, current: 1 };
w.SeowooPanorama = { scenes: [], choose() {} };
for (const p of [
  "data/content.js",
  "data/experience-v2.js",
  "data/art-v3.js",
  "audio/catalog.js",
  "audio/extra-catalog.js",
  "audio/play-catalog.js",
  "js/core.js",
  "js/narrator.js",
  "js/screen-lock.js",
  "js/experience-icons.js",
  "data/interactions.js",
  "js/pointer-drag.js",
  "js/potty-drag.js",
  "js/block-engine.js",
  "js/block-pang.js",
  "js/experiences-v2.js",
  "js/app.js",
])
  w.eval(fs.readFileSync(p, "utf8"));
const $ = (s) => doc.querySelector(s),
  click = (s) => {
    const b = $(s);
    assert(b, "Missing " + s);
    assert(!b.disabled, "Disabled " + s);
    b.click();
  },
  go = (r) => w.SeowooApp.go(r),
  S = w.SeowooExperiencesV2.state,
  D = w.SEOWOO_EXPERIENCE_V2;
const tick = () => new Promise((r) => setImmediate(r));
(async () => {
  const dragTo=(s,z)=>require("./drag-helper.cjs")(w,s,z);
  const missions = [...D.village.market.missions];
  for (const mission of missions) {
    D.village.market.missions = [mission];
    go("village");
    click('[data-place="market"]');
    assert($("[data-market-checkout]").disabled);
    const wrong = D.village.market.products.find(
      (p) => !mission.includes(p[0]),
    )[0];
    await dragTo(`[data-drag="${wrong}"]`,S.village.place === "market" ? '[data-zone="market-cart"]' : '[data-zone="patient"]');
    assert.equal(S.market.cart.length, 0);
    for (const id of mission) {
      click(`[data-drag="${id}"]`);
      assert(!S.market.cart.includes(id), "tap cannot move products");
      await dragTo(`[data-drag="${id}"]`, '[data-zone="market-cart"]');
      await dragTo(`[data-drag="${id}"]`, '[data-zone="market-cart"]');
    }
    assert.equal(S.market.cart.length, 3);
    click("[data-market-checkout]");
    assert(S.market.checked);
    click("[data-market-checkout]");
    assert.equal(S.market.cart.length, 0);
    await tick();
  }
  D.village.market.missions = missions;
  const recipes = [...D.village.kitchen.recipes];
  for (const recipe of recipes) {
    D.village.kitchen.recipes = [recipe];
    go("village");
    click('[data-place="kitchen"]');
    assert($("[data-cook]").disabled);
    assert($("[data-serve]").disabled);
    for (const id of recipe.need) {
      for (const kind of ["raw", "washed", "chopped"])
        await dragTo(`[data-drag="${id}"][data-kind="${kind}"]`, `[data-zone="${{raw:"sink",washed:"board",chopped:"pot"}[kind]}"]`);
    }
    assert.equal(S.kitchen.pot.size, 3);
    click("[data-cook]");
    click("[data-serve]");
    assert(S.kitchen.served);
    click("[data-kitchen-next]");
    assert.equal(S.kitchen.pot.size, 0);
    await tick();
  }
  D.village.kitchen.recipes = recipes;
  for (const patient of [...D.village.clinic.patients]) {
    const orig = D.village.clinic.patients;
    D.village.clinic.patients = [patient];
    go("village");
    click('[data-place="clinic"]');
    const wrong = D.village.clinic.tools.find(
      (p) => !S.clinic.required.includes(p[0]),
    )[0];
    await dragTo(`[data-drag="${wrong}"]`,S.village.place === "market" ? '[data-zone="market-cart"]' : '[data-zone="patient"]');
    assert.equal(S.clinic.done.size, 0);
    for (const id of S.clinic.required) await dragTo(`[data-drag="${id}"]`, '[data-zone="patient"]');
    assert.equal(S.clinic.done.size, 4);
    assert($("[data-clinic-next]"));
    assert([...doc.querySelectorAll(".clinic-tool")].every((b) => b.disabled));
    click("[data-clinic-next]");
    assert.equal(S.clinic.done.size, 0);
    D.village.clinic.patients = orig;
    await tick();
  }
  const puzzles = [...D.puzzles];
  for (const puzzle of puzzles) {
    S.puzzle.recent = [];
    D.puzzles = [puzzle];
    go("puzzle");
    for (const [id, , target] of puzzle.pieces) {
      click(`[data-drag="${id}"]`);
      assert(!S.puzzle.placed.has(id), "tap must not auto-solve");
      const wrong = puzzle.slots.find((x) => x[0] !== target)?.[0];
      if (wrong) {
        click(`[data-zone="p-${wrong}"]`);
        assert(!S.puzzle.placed.has(id));
      }
      click(`[data-zone="p-${target}"]`);
      assert(S.puzzle.placed.has(id));
    }
    assert($(".puzzle-status.complete"));
    await tick();
  }
  D.puzzles = puzzles;
  const feelings = [...D.feelings];
  for (const story of feelings) {
    S.feelings.recent = [];
    D.feelings = [story];
    go("feelings");
    click("[data-feeling-start]");
    const wrong = D.moods.find((m) => m.id !== story.mood).id;
    click(`[data-story-mood="${wrong}"]`);
    assert(!S.feelings.answered);
    const before = S.feelings.completed;
    click(`[data-story-mood="${story.mood}"]`);
    click(`[data-story-mood="${story.mood}"]`);
    assert.equal(S.feelings.completed, before + 1);
    assert($(".case-scene img").src.endsWith("story-" + story.id + ".webp"));
    await tick();
  }
  D.feelings = feelings;
  go("feelings");
  click("[data-calm-start]");
  for (let i = 0; i < 3; i++) click("[data-calm-tap]");
  assert.equal(S.feelings.calm, 3);
  assert($(".calm-finish"));
  go("home");
  await tick();
  assert.equal(doc.querySelectorAll(".v2-drag-ghost").length, 0);
  // All current finite picture keys produce actual images or exact geometric/color teaching visuals.
  for (const puzzle of puzzles)
    for (const [, icon] of puzzle.pieces)
      assert(
        !w.SeowooV2Icon(icon).includes("art-label"),
        "Missing puzzle art " + icon,
      );
  for (const item of w.SEOWOO_CONTENT.words)
    assert(
      !w.SeowooArt.picture(item.pic).includes("art-label"),
      "Missing word art " + item.en,
    );
  for (const [, , pic] of w.SEOWOO_CONTENT.alphabet)
    assert(
      !w.SeowooArt.picture(pic).includes("art-label"),
      "Missing ABC art " + pic,
    );
  for (const [key, asset] of Object.entries(w.SEOWOO_ART))
    assert(fs.existsSync(asset), "Missing art " + key);
  // Baseline SHA-256s also work in a shallow CI checkout.
  const preserved = {
    "js/elevator.js": "1de5da475f94c2eae77272ec84867a5270bde6fabb74e25d18756e44d4b834d7",
    "js/panorama.js": "202de9d9cf267fea31db9c776dd9832b48566c1eda075d1be7220fc38d522405",
    // 7.5.1 intentionally changes the mixer; behavioral audio suites cover it.
    "js/audio.js": "b7bfa761f2dc74036648a0ec89d6acf5c45cbc7c13668bf20aeccee1285c7910",
    "audio/files.js": "78495e9cfb874e695d4416f6c31ea6b548cd6039811cabfe8aac442ed4152774"
};
  for (const [file, digest] of Object.entries(preserved)) {
    assert.equal(require('crypto').createHash('sha256').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex'), digest, file + ' must remain unchanged');
  }
  console.log(
    "PASS storybook: 8 shopping lists, 3 recipes, 3 patients, 12 puzzles, 12 emotion stories, retry/duplicates/wrong choices, all illustrations, elevator source preservation",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  dom.window.close();
  process.exitCode = 1;
});
