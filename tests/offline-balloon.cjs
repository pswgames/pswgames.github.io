const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { spawn } = require("node:child_process");
const server = spawn(process.execPath, ["scripts/serve.cjs"], {
  stdio: "pipe",
  env: { ...process.env, PORT: "4177" },
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
    viewport: { width: 844, height: 390 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () =>
        Promise.reject(
          new DOMException("Test camera blocked", "NotAllowedError"),
        ),
    });
  });
  const installing = await context.newPage();
  await installing.goto("http://127.0.0.1:4177/");
  await installing.waitForFunction(
    () => navigator.serviceWorker.controller,
    null,
    { timeout: 90000 },
  );
  await installing.close();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4177/#balloon");
  await page.locator("[data-balloon-touch]").waitFor();
  await context.setOffline(true);
  await page.reload();
  await page.locator("[data-balloon-touch]").click();
  await page.locator("[data-balloon]").first().click();
  assert.equal(await page.evaluate(() => SeowooBalloon.snapshot().score), 1);
  const cache = await page.evaluate(async () => ({
    keys: await caches.keys(),
    balloon: !!(await caches.match("js/balloon.js")),
    model: (await (await caches.open("seowoo-v7.5.1")).keys()).some((r) =>
      /mediapipe|\.task/.test(r.url),
    ),
  }));
  assert(cache.keys.includes("seowoo-v7.5.1"));
  assert(cache.balloon);
  assert(!cache.model);
  await page.evaluate(() => SeowooApp.go("elevator"));
  assert(await page.locator('[data-floor="20"]').isVisible());
  await page.evaluate(() => SeowooApp.go("puzzle"));
  assert(await page.locator(".v2-puzzle-board").isVisible());
  fs.mkdirSync(".test-results/balloon", { recursive: true });
  fs.writeFileSync(
    ".test-results/balloon/offline.json",
    JSON.stringify(
      { offlineTouch: true, existingGames: true, ...cache },
      null,
      2,
    ),
  );
  console.log(
    "PASS actual service worker: offline reload, balloon touch scoring, existing elevator/puzzle, optional model excluded",
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
