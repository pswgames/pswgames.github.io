const { chromium, webkit } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { spawn } = require("node:child_process");
const server = spawn(process.execPath, ["scripts/serve.cjs"], {
  stdio: "pipe",
  env: { ...process.env, PORT: "4178" },
});
const ready = new Promise((resolve, reject) => {
  server.stdout.on("data", (d) => {
    if (String(d).includes("Preview ready")) resolve();
  });
  server.on("error", reject);
});
let browser;
const results = [];
const tablet = process.env.QA_TABLET === "1";
(async () => {
  await ready;
  for (const type of process.env.QA_ENGINE
    ? [{ chromium, webkit }[process.env.QA_ENGINE]]
    : [chromium, webkit]) {
    browser = await type.launch();
    const context = await browser.newContext({
      viewport: tablet
        ? { width: 1280, height: 800 }
        : { width: 667, height: 375 },
      hasTouch: true,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4178/");
    await page.evaluate(() => {
      SeowooCore.setting("voice", false);
      SeowooCore.setting("sound", false);
    });
    for (const [route, selector, ghost] of [
      ["blockpang", "[data-block-piece]", ".block-ghost"],
      ["puzzle", ".v2-piece", ".pointer-ghost"],
      ["potty", ".potty-child", ".pointer-ghost"],
    ]) {
      await page.setViewportSize(
        tablet ? { width: 1280, height: 800 } : { width: 667, height: 375 },
      );
      await page.evaluate((r) => SeowooApp.go(r), route);
      await page.waitForTimeout(400);
      const before = await page.evaluate(() => ({
        score: SeowooBlockPang.snapshot()?.score,
        rounds: SeowooCore.state.stats.rounds,
        choices: SeowooCore.state.stats.totalChoices,
      }));
      const item = page.locator(selector).first();
      await item.scrollIntoViewIfNeeded();
      const r = await item.boundingBox();
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await page.mouse.down();
      await page.mouse.move(r.x + r.width / 2 + 12, r.y + r.height / 2 - 12);
      assert.equal(await page.locator(ghost).count(), 1);
      await page.evaluate(() => {
        window.__rotationEvents = [];
        window.addEventListener(
          "resize",
          () => window.__rotationEvents.push([innerWidth, innerHeight]),
          { once: true },
        );
      });
      await page.setViewportSize(
        tablet ? { width: 800, height: 1280 } : { width: 390, height: 844 },
      );
      // WebKit can deliver resize after setViewportSize resolves. Assert the
      // cancelled drag while the pointer is still held, rather than racing a
      // fixed delay or letting pointerup hide a missing resize cancellation.
      try {
        await page.waitForFunction(
          (selector) => !document.querySelector(selector),
          ghost,
          { timeout: 5000 },
        );
      } catch (error) {
        console.error(
          route,
          await page.evaluate(() => ({
            width: innerWidth,
            height: innerHeight,
            resizeEvents: window.__rotationEvents,
          })),
        );
        throw error;
      }
      await page.mouse.up();
      assert.equal(
        await page.locator(ghost).count(),
        0,
        `${route}: rotation removes held toy`,
      );
      const after = await page.evaluate(() => ({
        score: SeowooBlockPang.snapshot()?.score,
        rounds: SeowooCore.state.stats.rounds,
        choices: SeowooCore.state.stats.totalChoices,
      }));
      assert.deepEqual(after, before, "rotation does not commit a move");
      await page.setViewportSize(
        tablet ? { width: 1024, height: 640 } : { width: 844, height: 390 },
      );
      await page.waitForTimeout(100);
      assert(await item.isVisible());
      results.push(
        `${type.name()} ${route}: in-flight drag cancelled and state preserved`,
      );
    }
    await browser.close();
    browser = null;
  }
  fs.mkdirSync(".test-results/balloon", { recursive: true });
  fs.writeFileSync(
    ".test-results/balloon/rotation.json",
    JSON.stringify(results, null, 2),
  );
  console.log("PASS", results);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.kill();
  });
