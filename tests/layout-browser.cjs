/* Local, isolated browser contexts. Never opens a real camera or user profile. */
const { chromium, webkit } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const out = ".test-results/landscape";
fs.mkdirSync(out, { recursive: true });
const variantsOnly = process.env.QA_SCOPE === "variants";
const results = [],
  failures = [];
const routes = [
  ...fs
    .readFileSync("js/app.js", "utf8")
    .match(/const titles = \{([\s\S]*?)\n  \};/)[1]
    .matchAll(/^    (\w+):/gm),
].map((m) => m[1]);
const server = spawn(process.execPath, ["scripts/serve.cjs"], {
  stdio: "pipe",
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
  for (const engine of process.env.QA_ENGINE
    ? [process.env.QA_ENGINE]
    : ["chromium", "webkit"]) {
    browser = await { chromium, webkit }[engine].launch({ headless: true });
    const sizes = process.env.QA_SIZE
      ? [process.env.QA_SIZE.split("x").map(Number)]
      : [
          [844, 390],
          [667, 375],
          [1024, 768],
          [1180, 820],
          [390, 844],
          [768, 1024],
        ];
    for (const [width, height] of sizes) {
      assert(width > 0 && height > 0, "QA_SIZE must be WIDTHxHEIGHT");
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      // Fail closed before app scripts can ever reach physical camera hardware.
      await page.addInitScript(() => {
        if (navigator.mediaDevices)
          Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
            configurable: true,
            value: () =>
              Promise.reject(
                new DOMException(
                  "QA does not use real cameras",
                  "NotAllowedError",
                ),
              ),
          });
      });
      await page.goto("http://127.0.0.1:4173/");
      await page.evaluate(() => {
        SeowooCore.setting("voice", false);
        SeowooCore.setting("sound", false);
      });
      await page.addStyleTag({
        content:
          "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}",
      });
      const go = async (r) => {
        await page.evaluate((r) => SeowooApp.go(r), r);
        await page.waitForTimeout(60);
      };
      async function check(screen) {
        await page
          .locator("img")
          .evaluateAll((es) => es.forEach((e) => (e.loading = "eager")));
        await page.waitForFunction(() =>
          [...document.images].every((i) => i.complete),
        );
        const layout = await page.evaluate(() => {
          const outside = [
            ...document.querySelectorAll("main button, dialog[open] button"),
          ]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              if (!r.width || !r.height) return false;
              let parent = el.parentElement;
              while (parent && parent !== document.body) {
                if (
                  ["auto", "scroll"].includes(
                    getComputedStyle(parent).overflowX,
                  ) &&
                  parent.scrollWidth > parent.clientWidth
                )
                  return false;
                parent = parent.parentElement;
              }
              return r.left < -2 || r.right > innerWidth + 2;
            })
            .map((el) => el.outerHTML.slice(0, 160));
          return {
            overflow: document.documentElement.scrollWidth > innerWidth + 2,
            outside,
            broken: [...document.images]
              .filter((i) => !i.naturalWidth)
              .map((i) => i.src),
            height: document.documentElement.scrollHeight,
          };
        });
        const name = `${engine}-${width}x${height}-${screen}`;
        if (layout.overflow || layout.outside.length || layout.broken.length)
          failures.push({ name, ...layout });
        results.push({ name, ...layout });
        await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
      }
      if (!variantsOnly) {
        for (const route of routes) {
          await go(route);
          await check(route);
        }
        await go("language");
        for (const mode of ["consonant", "vowel", "word"]) {
          await page.locator(`[data-mode="${mode}"]`).click();
          await check(`language-${mode}`);
        }
        for (const lang of ["englishWords", "koreanWords"]) {
          await go(lang);
          const cats = await page
            .locator("[data-word-cat]")
            .evaluateAll((es) => es.map((e) => e.dataset.wordCat));
          for (let i = 0; i < cats.length; i++) {
            await page.locator("[data-word-cat]").nth(i).click();
            await check(`${lang}-category-${i}`);
          }
        }
        for (const place of ["market", "kitchen", "clinic"]) {
          await go("village");
          await page.locator(`[data-place="${place}"]`).click();
          await check(`village-${place}`);
        }
        await go("feelings");
        await page.locator("[data-feeling-start]").click();
        await check("feelings-situation");
        for (let i = 1; i < 12; i++) {
          await page.locator("[data-feeling-next]").click();
          await check(`feelings-situation-${i}`);
        }
        await go("puzzle");
        for (let i = 0; i < 12; i++) {
          await check(`puzzle-case-${i}`);
          await page.locator("[data-puzzle-next]").click();
        }
        await go("feelings");
        await page.locator("[data-calm-start]").click();
        await check("feelings-calm");
        await go("blockpang");
        await page.locator("[data-block-pause]").click();
        await check("blockpang-paused");
        await go("balloon");
        await page.locator("[data-balloon-touch]").click();
        await check("balloon-playing");
        await page.locator("[data-balloon-pause]").click();
        await check("balloon-paused");
        await page.locator("[data-balloon-camera]").count();
        await go("home");
        await page.evaluate(() => SeowooApp.go("parent"));
        await check("parent-gate");
        await page.locator("#parentPin").fill("2468");
        await page.locator("#parentGate button").click();
        await page.locator(".parent-content").waitFor();
        await check("parent-settings");
        for (const [selector, name] of [
          ["[data-app-info]", "parent-info"],
          ["[data-change-pin]", "parent-change-pin"],
        ]) {
          await page.locator(selector).click();
          await check(name);
          await page.locator("[data-parent-back]").click();
        }
        await page.locator("[data-records]").click();
        await check("parent-records");
        await page.locator("[data-reset-ask]").click();
        await check("parent-reset-confirmation");
        await page.locator("[data-records]").click();
        await page.locator("[data-parent-back]").click();
        await page.locator("[data-parent-close]").click();
        await page.evaluate(() =>
          document.querySelector("#breakDialog").showModal(),
        );
        await check("break-dialog");
        await page.locator("#breakDone").click();
      }
      if (variantsOnly || !process.env.QA_SCOPE) {
        await go("home");
        await check("home");
        for (const [place, count] of [
          ["market", 8],
          ["kitchen", 3],
          ["clinic", 3],
        ]) {
          for (let i = 0; i < count; i++) {
            await go("village");
            await page.evaluate(
              ({ place, i, count }) => {
                const original = Math.random;
                try {
                  Math.random = () => (i + 0.5) / count;
                  document.querySelector(`[data-place="${place}"]`).click();
                } finally {
                  Math.random = original;
                }
              },
              { place, i, count },
            );
            await check(`${place}-variant-${i}`);
          }
        }
        for (let i = 0; i < 3; i++) {
          await go("feelings");
          await page.evaluate((i) => {
            const original = Math.random;
            try {
              Math.random = () => (i + 0.5) / 3;
              document.querySelector("[data-calm-start]").click();
            } finally {
              Math.random = original;
            }
          }, i);
          await check(`calm-variant-${i}`);
          for (let n = 0; n < 3; n++)
            await page.locator("[data-calm-tap]").click();
          await check(`calm-finished-${i}`);
        }
        await go("balloon");
        await page.locator("[data-balloon-touch]").click();
        await check("balloon-playing");
      }
      failures.push(
        ...errors.map((error) => ({
          name: `${engine}-${width}x${height}`,
          error,
        })),
      );
      await context.close();
      console.log(`Checked ${engine} ${width}x${height}`);
    }
    await browser.close();
    browser = null;
  }
  fs.writeFileSync(
    `${out}/results${variantsOnly ? "-variants" : ""}${process.env.QA_SIZE ? "-" + process.env.QA_SIZE : ""}.json`,
    JSON.stringify({ routes, results, failures }, null, 2),
  );
  console.log(`${results.length} screen checks, ${failures.length} failures`);
  assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 5)));
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.kill();
  });
