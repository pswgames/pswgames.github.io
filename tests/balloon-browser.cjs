const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { spawn } = require("node:child_process");
const out = ".test-results/balloon";
const tablet = process.env.QA_TABLET === "1";
fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ["scripts/serve.cjs"], {
  stdio: "pipe",
  env: { ...process.env, PORT: "4176" },
});
const ready = new Promise((resolve, reject) => {
  server.stdout.on("data", (d) => {
    if (String(d).includes("Preview ready")) resolve();
  });
  server.on("error", reject);
});
let browser;
(async () => {
  await ready;
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: tablet
      ? { width: 1280, height: 800 }
      : { width: 844, height: 390 },
    hasTouch: true,
    serviceWorkers: "block",
  });
  const page = await context.newPage(),
    errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1")) external.push(r.url());
  });
  await page.addInitScript(() => {
    window.__cameraCalls = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => {
        window.__cameraCalls++;
        return Promise.reject(
          new DOMException("Fixture denial", "NotAllowedError"),
        );
      },
    });
  });
  await page.goto("http://127.0.0.1:4176/#balloon");
  await page.evaluate(() => {
    SeowooCore.setting("voice", false);
    SeowooCore.setting("sound", false);
  });
  await page.clock.install();
  const snap = () => page.evaluate(() => SeowooBalloon.snapshot());
  await page.locator("[data-balloon-touch]").tap();
  await page.locator("[data-balloon]").first().tap();
  assert.equal((await snap()).score, 1);
  await page.setViewportSize(
    tablet ? { width: 800, height: 1280 } : { width: 390, height: 844 },
  );
  await page.clock.runFor(100);
  assert.equal((await snap()).score, 1, "rotation preserves score");
  assert.equal(
    await page.locator(".balloon-hands").evaluate((el) => el.width),
    await page.locator(".balloon-stage").evaluate((el) => el.clientWidth),
    "canvas follows portrait resize",
  );
  await page.setViewportSize(
    tablet ? { width: 1024, height: 640 } : { width: 667, height: 375 },
  );
  await page.clock.runFor(100);
  await page.locator("[data-balloon-pause]").tap();
  const remaining = (await snap()).remaining;
  await page.clock.runFor(10000);
  assert.equal((await snap()).remaining, remaining);
  assert(!(await snap()).running);
  await page.locator("[data-balloon-resume]").tap();
  await page.clock.runFor(31000);
  assert.equal((await snap()).phase, "done");
  assert.equal(
    await page.evaluate(() => SeowooCore.state.stats.byGame.balloon),
    1,
  );
  await page.clock.runFor(1000);
  assert.equal(
    await page.evaluate(() => SeowooCore.state.stats.byGame.balloon),
    1,
    "one completion record",
  );
  await page.screenshot({ path: `${out}/completed.png`, fullPage: true });
  await page.locator("[data-balloon-restart]").tap();
  assert.equal((await snap()).score, 0);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  assert.equal((await snap()).phase, "paused");
  await page.locator("[data-balloon-resume]").tap();
  await page.evaluate(() => document.querySelector("#breakDialog").showModal());
  await page.clock.runFor(1);
  assert.equal((await snap()).phase, "paused");
  await page.locator("#breakDone").tap();
  await page.locator("[data-balloon-resume]").tap();
  await page.evaluate(() => {
    const dialog = document.createElement("dialog");
    dialog.id = "fixtureDialog";
    document.body.append(dialog);
    dialog.showModal();
  });
  await page.clock.runFor(1);
  assert.equal(
    (await snap()).phase,
    "paused",
    "a newly mounted lock dialog pauses play",
  );
  await page.evaluate(() => document.querySelector("#fixtureDialog").remove());
  await page.evaluate(() => SeowooApp.go("home"));
  assert.equal(await snap(), null);
  await page.clock.runFor(5000);
  assert.equal(await page.locator(".balloon-stage").count(), 0);
  assert.equal(
    await page.evaluate(() => __cameraCalls),
    0,
    "touch and entry never access camera",
  );
  assert.deepEqual(external, [], "touch mode never downloads MediaPipe");
  await page.evaluate(() => SeowooApp.go("balloon"));
  await page.locator("[data-balloon-camera]").tap();
  await page.waitForFunction(() => SeowooBalloon.snapshot().phase === "error");
  assert.match(
    await page.locator("[data-balloon-status]").textContent(),
    /허용/,
  );
  assert.equal(await page.evaluate(() => __cameraCalls), 1);
  assert.deepEqual(external, [], "rejected permission never downloads model");
  await page.screenshot({
    path: `${out}/permission-denied.png`,
    fullPage: true,
  });
  await page.locator("[data-balloon-touch]").tap();
  assert.equal((await snap()).phase, "playing");
  // Synthetic normalized hand coordinates exercise the real game controller.
  // The camera provider is replaced; no physical media request is possible.
  await page.evaluate(() => {
    window.__fixture = { closed: 0, detected: 0, visible: true, alive: true };
    SeowooBalloonCamera.open = async (video, signal) => {
      for (const [name, value] of Object.entries({
        readyState: 2,
        videoWidth: 640,
        videoHeight: 480,
      }))
        Object.defineProperty(video, name, {
          configurable: true,
          get: () => value,
        });
      Object.defineProperty(video, "currentTime", {
        configurable: true,
        get: () => performance.now() / 1000,
      });
      let closed = false;
      const close = () => {
        if (!closed) {
          closed = true;
          __fixture.closed++;
        }
      };
      signal.addEventListener("abort", close, { once: true });
      return {
        close,
        alive: () => __fixture.alive,
        detect: () => {
          __fixture.detected++;
          if (!__fixture.visible) return [];
          const el =
            document.querySelector("[data-balloon]:not([hidden])") ||
            document.querySelector("[data-balloon]");
          if (!el) return [];
          const stage = document.querySelector(".balloon-stage"),
            w = stage.clientWidth,
            h = stage.clientHeight,
            scale = Math.min(w / 640, h / 480);
          const x =
              ((parseFloat(el.style.left) / 100) * w - (w - 640 * scale) / 2) /
              (640 * scale),
            y =
              ((parseFloat(el.style.top) / 100) * h - (h - 480 * scale) / 2) /
              (480 * scale);
          const list = Array.from({ length: 33 }, () => ({
            x: 0,
            y: 0,
            visibility: 0,
          }));
          list[15] = list[19] = { x: 1 - x, y, visibility: 0.99 };
          return list;
        },
      };
    };
    SeowooApp.go("balloon");
  });
  await page.locator("[data-balloon-camera]").tap();
  await page.clock.runFor(1100);
  assert((await snap()).score > 0, "synthetic hands pop balloons");
  await page.evaluate(() => (__fixture.visible = false));
  await page.clock.runFor(500);
  const lost = (await snap()).remaining;
  await page.clock.runFor(5000);
  assert.equal((await snap()).remaining, lost, "lost tracking pauses timer");
  await page.evaluate(() => (__fixture.visible = true));
  await page.clock.runFor(300);
  assert((await snap()).remaining < lost, "tracking recovers");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal((await snap()).phase, "paused");
  assert.equal(await page.evaluate(() => __fixture.closed), 1);
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    }),
  );
  await page.locator("[data-balloon-resume]").tap();
  await page.clock.runFor(100);
  await page.locator("[data-balloon-restart]").tap();
  assert.equal(await page.evaluate(() => __fixture.closed), 2);
  await page.evaluate(() => (__fixture.alive = false));
  await page.clock.runFor(100);
  assert.equal((await snap()).phase, "error");
  assert.equal(await page.evaluate(() => __fixture.closed), 3);
  await page.evaluate(() => SeowooApp.go("home"));
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    `${out}/results.json`,
    JSON.stringify(
      {
        touch: true,
        rotation: true,
        completion: true,
        permissionDenial: true,
        syntheticHands: true,
        trackingLoss: true,
        visibilityCleanup: true,
        restartCleanup: true,
        cameraEnded: true,
        realCameraUsed: false,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS balloon browser: touch, rotation, timer, completion, restart, home, hidden/pagehide/dialog pause, denial, synthetic hands, tracking loss/recovery, camera-end cleanup; no real camera",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.kill();
  });
