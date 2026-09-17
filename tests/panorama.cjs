const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { JSDOM } = require("jsdom");
const dom = new JSDOM('<div class="outside-view"></div>', {
  runScripts: "outside-only",
  url: "https://test.local/",
});
const w = dom.window,
  view = w.document.querySelector(".outside-view");
let width = 900,
  height = 600,
  observer,
  disconnected = false;
Object.defineProperty(view, "clientWidth", { get: () => width });
Object.defineProperty(view, "clientHeight", { get: () => height });
w.matchMedia = () => ({ matches: false });
w.ResizeObserver = class {
  constructor(fn) {
    observer = fn;
  }
  observe() {}
  disconnect() {
    disconnected = true;
  }
};
w.eval(fs.readFileSync("js/panorama.js", "utf8"));
const P = w.SeowooPanorama,
  first = P.selected,
  instance = P.mount(view),
  img = view.querySelector("img");
Object.defineProperty(img, "naturalWidth", { value: 1600 });
Object.defineProperty(img, "naturalHeight", { value: 1200 });
const y = () => Number(img.style.transform.split(",")[1].replace("px", ""));
try {
  assert.notEqual(P.selected, first, "entry chooses another scene");
  img.onload();
  instance.setFloor(1);
  const low = y();
  instance.setFloor(2);
  const next = y();
  assert(next > low, "ascending moves city downward");
  assert(
    Math.abs((next - low) / ((height * 0.48) / 19) - 1.2) < 1e-9,
    "background speed is exactly 20% faster, independently of floor timing",
  );
  instance.setFloor(1);
  assert.equal(y(), low, "descending reverses the background");
  for (let floor = 1; floor <= 20; floor += 0.125) {
    instance.setFloor(floor);
    assert(y() <= 0.001);
    assert(y() + parseFloat(img.style.height) >= height - 0.001);
  }
  for (let n = 0; n < 30; n++) {
    const previous = P.selected;
    assert.notEqual(P.random(), previous);
    assert(img.src.endsWith(P.scenes.find((s) => s.id === P.selected).file));
  }
  width = 768;
  height = 950;
  observer();
  instance.setFloor(20);
  assert(y() <= 0.001);
  assert(y() + parseFloat(img.style.height) >= height - 0.001);
  assert.equal(
    w.document.querySelectorAll("style").length,
    0,
    "panorama must not inject presentation CSS",
  );
  instance.destroy();
  assert(disconnected);
  assert.equal(view.children.length, 0);
  console.log(
    "PASS panorama: +20% travel, correct directions, no exposed edges, portrait resize, random scenes, cleanup",
  );
} finally {
  dom.window.close();
}
