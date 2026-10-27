const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const scope = { window: {} };
vm.runInNewContext(fs.readFileSync("js/balloon-engine.js", "utf8"), scope);
const E = scope.window.SeowooBalloonEngine;
const game = E.create(() => 0.5);
assert.equal(game.state.remaining, 30);
game.step(1, false);
assert.equal(game.state.remaining, 30, "no hands must not consume time");
const landmarks = Array.from({ length: 33 }, () => ({
  x: 0.25,
  y: 0.5,
  visibility: 0,
}));
landmarks[15].visibility = landmarks[19].visibility = 0.9;
assert.equal(E.hands(landmarks)[0].x, 0.75, "mirrored wrist/index average");
assert.equal(E.hands(landmarks)[1], null, "low confidence excluded");
assert.equal(E.hands(landmarks, [{ x: 0.5, y: 0.5 }])[0].x, 0.625, "smoothing");
assert.equal(
  E.project({ x: 0, y: 0 }, 800, 300, 640, 480).x,
  200,
  "contain horizontal letterboxing",
);
assert.equal(
  E.project({ x: 1, y: 1 }, 300, 800, 640, 480).y,
  512.5,
  "contain vertical letterboxing",
);
const b = game.state.balloons[0];
assert(game.hit({ x: b.x * 800 + 25, y: b.y * 300 }, 800, 300).includes(b.id));
assert(game.pop(b.id));
assert(!game.pop(b.id), "one reward per balloon");
for (let i = 0; i < 10; i++) game.step(0.1, true, [{ x: 0.2, y: 0.6 }]);
assert(
  !game.state.balloons.some((x) => x.id === b.id),
  "popped balloon replaced near reachable hand",
);
for (let i = 0; i < 301; i++) game.step(0.1, true);
assert.equal(game.state.remaining, 0);
assert.equal(game.state.score, 1);
assert(!game.pop(game.state.balloons[0].id), "finished session cannot score");

// Replace only the external import with a fake module: same production camera
// lifecycle, no physical camera, network requests, or real images.
function cameraHarness({ permission, create, timeout = 25000 } = {}) {
  const counters = {
    stops: 0,
    closes: 0,
    delegates: [],
    constraints: [],
    imports: 0,
  };
  const stream = {
    getTracks: () => [
      {
        stop() {
          counters.stops++;
        },
      },
    ],
    getVideoTracks: () => [{ readyState: "live" }],
  };
  const video = { srcObject: null, play: async () => {}, pause() {} };
  const scope = {
    window: { isSecureContext: true },
    DOMException,
    AbortController,
    clearTimeout,
    setTimeout: (fn, ms) => setTimeout(fn, ms === 25000 ? timeout : ms),
    navigator: {
      mediaDevices: {
        getUserMedia: async (c) => {
          counters.constraints.push(c);
          return permission ? permission(stream) : stream;
        },
      },
    },
    loadModule: async () => {
      counters.imports++;
      return {
        FilesetResolver: { forVisionTasks: async () => ({}) },
        PoseLandmarker: {
          createFromOptions: async (_, opts) => {
            counters.delegates.push(opts.baseOptions.delegate);
            if (create) await create(opts.baseOptions.delegate);
            return {
              close() {
                counters.closes++;
              },
              detectForVideo: () => ({ landmarks: [[]] }),
            };
          },
        },
      };
    },
  };
  vm.runInNewContext(
    fs
      .readFileSync("js/balloon-camera.js", "utf8")
      .replace("await import(", "await loadModule("),
    scope,
  );
  return {
    open: (signal) => scope.window.SeowooBalloonCamera.open(video, signal),
    counters,
    video,
  };
}
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
(async () => {
  let h = cameraHarness({
      create: async (delegate) => {
        if (delegate === "GPU") throw Error("GPU unavailable");
      },
    }),
    a = new AbortController();
  const session = await h.open(a.signal);
  assert.deepEqual(h.counters.delegates, ["GPU", "CPU"]);
  assert.equal(h.counters.constraints[0].audio, false);
  assert(session.alive());
  a.abort();
  session.close();
  assert.equal(h.counters.stops, 1);
  assert.equal(h.counters.closes, 1);
  assert.equal(h.video.srcObject, null);
  const permission = deferred();
  h = cameraHarness({
    permission: async (stream) => {
      await permission.promise;
      return stream;
    },
  });
  a = new AbortController();
  const loading = h.open(a.signal);
  a.abort();
  await assert.rejects(loading, { name: "AbortError" });
  permission.resolve();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(h.counters.stops, 1, "late permission stream must stop");
  assert.equal(h.counters.imports, 0);
  const model = deferred();
  h = cameraHarness({ create: () => model.promise });
  a = new AbortController();
  const pending = h.open(a.signal);
  await new Promise((r) => setTimeout(r, 0));
  a.abort();
  await assert.rejects(pending, { name: "AbortError" });
  model.resolve();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(h.counters.closes, 1, "late model must close");
  h = cameraHarness({ permission: () => new Promise(() => {}), timeout: 10 });
  await assert.rejects(h.open(new AbortController().signal), /TIMEOUT/);
  h = cameraHarness({
    permission: () => {
      throw new DOMException("Denied", "NotAllowedError");
    },
  });
  await assert.rejects(h.open(new AbortController().signal), {
    name: "NotAllowedError",
  });
  assert.equal(h.counters.imports, 0);
  h = cameraHarness({
    create: () => {
      throw Error("Model failed");
    },
  });
  await assert.rejects(h.open(new AbortController().signal), /Model failed/);
  assert.equal(h.counters.stops, 1);
  const sw = fs.readFileSync("sw.js", "utf8");
  assert(
    !sw.includes("mediapipe"),
    "external model never blocks offline install",
  );
  console.log(
    "PASS balloon: mirrored/smoothed hands, confidence, contain/rotation coordinates, timer pause, forgiving hit, duplicates, finish, GPU/CPU, rejection, timeout, late permission/model cleanup, offline isolation",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
