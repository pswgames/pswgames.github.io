const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");
const dom = new JSDOM(
  '<div id="shell"><strong id="elevatorFloor"></strong><i id="elevatorArrow"></i><p id="elevatorMsg"></p><div class="door-l"></div><div class="door-r"></div><div class="outside-view"></div><div class="floor-panel">' +
    Array.from(
      { length: 20 },
      (_, i) => `<button data-floor="${i + 1}">${i + 1}</button>`,
    ).join("") +
    "</div></div>",
  {
    url: "https://test.local",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  },
);
const w = dom.window;
let now = 0,
  frames = new Map(),
  id = 0,
  hidden = false,
  destroyed = 0,
  positions = [];
w.performance.now = () => now;
w.requestAnimationFrame = (fn) => {
  frames.set(++id, fn);
  return id;
};
w.cancelAnimationFrame = (i) => frames.delete(i);
Object.defineProperty(w.document, "hidden", { get: () => hidden });
w.matchMedia = () => ({ matches: false });
w.SeowooCore = { audio: new Proxy({}, { get: () => () => {} }) };
w.SeowooPanorama = {
  mount() {
    return {
      setFloor: (n) => positions.push(n),
      resize() {},
      destroy() {
        destroyed++;
      },
    };
  },
};
w.eval(fs.readFileSync(path.join(root, "js/elevator.js"), "utf8"));
const e = w.SeowooElevator,
  shell = w.document.querySelector("#shell");
function advance(ms) {
  const end = now + ms;
  while (now < end) {
    now = Math.min(now + 16, end);
    const run = [...frames.values()];
    frames.clear();
    run.forEach((fn) => fn(now));
  }
}
try {
  e.mount(shell);
  assert.equal(e.current, 1);
  e.select(4);
  assert.equal(e.phase, "preclose");
  advance(1200);
  assert.equal(e.phase, "travel");
  assert.equal(e.openDoor(), false);
  assert.equal(shell.querySelector('[data-door-action="open"]').disabled, true);
  e.select(6);
  assert(shell.querySelector('[data-floor="6"]').classList.contains("queued"));
  advance(16000);
  assert.equal(e.current, 6);
  assert.equal(e.phase, "idle");
  assert(
    positions.some((n) => n > 1 && n < 2),
    "background receives continuous positions",
  );
  e.closeDoor();
  assert.equal(shell.querySelector("#elevatorArrow").textContent, "•");
  assert.equal(shell.querySelectorAll("[data-floor].selected").length, 0);
  advance(700);
  assert.equal(e.phase, "closed");
  e.openDoor();
  advance(2000);
  assert.equal(e.phase, "idle");
  e.select(20);
  advance(2000);
  const before = e.position;
  hidden = true;
  w.document.dispatchEvent(new w.Event("visibilitychange"));
  advance(10000);
  assert.equal(e.position, before);
  hidden = false;
  w.document.dispatchEvent(new w.Event("visibilitychange"));
  advance(30000);
  assert.equal(e.current, 20);
  assert.equal(e.phase, "idle");
  // Use actual delegated button clicks for every floor, including all two-digit labels.
  for (let floor = 1; floor <= 20; floor++) {
    const distance = Math.abs(e.current - floor);
    const key = shell.querySelector('[data-floor="' + floor + '"]');
    key.click();
    assert.equal(key.getAttribute("aria-pressed"), "true");
    assert(key.classList.contains("selected"));
    advance(distance * 1200 + 5000);
    assert.equal(e.current, floor);
    assert.equal(e.phase, "idle");
    assert.equal(key.getAttribute("aria-current"), "true");
    assert.equal(key.getAttribute("aria-pressed"), "false");
    assert.equal(shell.querySelectorAll("[aria-current=true]").length, 1);
  }
  e.select(1);
  advance(1500);
  e.unmount();
  assert.equal(frames.size, 0);
  assert.equal(destroyed, 1);
  assert.equal(e.phase, "idle");
  console.log(
    "PASS elevator: queued floors, continuous panorama, door safety, pause/resume, 1–20 limits, cleanup",
  );
} finally {
  dom.window.close();
}

const elevatorSource = fs.readFileSync(path.join(root, "js/elevator.js"), "utf8");
assert(elevatorSource.includes('queueVoice("closing")'), "Closing announcement must use the elevator voice queue");
assert(elevatorSource.includes('queueVoice(state.target > state.start ? "up" : "down")'), "Direction announcement must use the elevator voice queue");
assert(elevatorSource.includes('queueVoice("arrival-" + floor)'), "Floor arrival announcement must use the elevator voice queue");
assert(elevatorSource.includes('queueVoice("opening")'), "Opening announcement must use the elevator voice queue");
const cssSource = fs.readFileSync(path.join(root, "css/app.css"), "utf8");
assert(/\.elevator-panorama-image\s*\{[\s\S]*?filter:\s*brightness\(1\.05\)/.test(cssSource), "Elevator panorama should be slightly brighter");
console.log("PASS elevator regression: Elevator announcements must be serialized; panorama brightness +5%");
