/* Real browser regression in isolated temporary browser contexts. */
const { chromium, webkit } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  { spawn } = require("child_process");
const visualOnly = process.argv.includes("--visual-only");
const profileOnly = process.env.QA_PROFILE;
const out = ".test-results/storybook";
fs.mkdirSync(out, { recursive: true });
const browsers = [];
let currentPage;
const results = [],
  failures = [];
const server = spawn(process.execPath, ["scripts/serve.cjs"], {
  stdio: "pipe", env: {...process.env,PORT:"4175"},
});
const ready = new Promise((resolve, reject) => {
  server.stdout.on("data", (d) => {
    if (String(d).includes("Preview ready")) resolve();
  });
  server.on("error", reject);
});
const routes = [
  "home",
  "blockpang",
  "balloon",
  "think",
  "village",
  "puzzle",
  "feelings",
  "elevator",
  "potty",
  "language",
  "numbers",
  "shape",
  "english",
  "treasure",
  "music",
  "more",
  "numberBoard",
  "quantity",
  "numberOrder",
  "finger",
  "alphabet",
  "englishWords",
  "koreanWords",
  "hangul",
  "memory",
  "color",
  "together",
];
(async () => {
  await ready;
  for (const spec of [
    { id: "phone-landscape-small", type: chromium, width:667, height:375, touch:true },
    { id: "phone-landscape", type: chromium, width:844, height:390, touch:true },
    { id: "tablet-landscape", type: chromium, width:1024, height:768, touch:true },
    { id: "android-chromium", type: chromium, width:412, height:915, touch:true },
    {
      id: "desktop-chromium",
      type: chromium,
      width: 1440,
      height: 1000,
      touch: false,
    },
    { id: "tablet-landscape-webkit", type: webkit, width:1180, height:820, touch:true },
    { id: "iphone-webkit", type: webkit, width: 390, height: 844, touch: true },
    {
      id: "tablet-webkit",
      type: webkit,
      width: 820,
      height: 1180,
      touch: true,
    },
  ].filter(spec=>!profileOnly||spec.id===profileOnly)) {
    const browser = await spec.type.launch({ headless: true });
    browsers.push(browser);
    const context = await browser.newContext({
        viewport: { width: spec.width, height: spec.height },
        isMobile: spec.touch,
        hasTouch: spec.touch,
        deviceScaleFactor: 1,
        serviceWorkers: "block",
      }),
      page = await context.newPage();
    currentPage = page;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push("HTTP " + r.status() + " " + r.url());
    });
    await page.addInitScript(() => {
      window.__voiceQA = { starts: 0, fallbacks: [], urls: [] };
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) {
        const create = Context.prototype.createBufferSource;
        Context.prototype.createBufferSource = function (...args) {
          const source = create.apply(this, args), start = source.start;
          source.start = function (...a) {
            if (this.buffer?.duration > 0.2) window.__voiceQA.starts++;
            return start.apply(this, a);
          };
          return source;
        };
      }
      if (window.speechSynthesis) {
        const speak = speechSynthesis.speak.bind(speechSynthesis);
        speechSynthesis.speak = (u) => {
          window.__voiceQA.fallbacks.push(u.text);
          speak(u);
        };
      }
    });
    await page.goto("http://127.0.0.1:4175/");
    await page.locator(".home-featured-card").first().waitFor();
    const {dragTo,block}=require("./browser-drag.cjs")(page,spec,context);
    const tap = async (sel) => {
      const el = page.locator(sel).first();
      await el.scrollIntoViewIfNeeded();
      if (spec.touch) await el.tap();
      else await el.click();
    };
    await tap("[data-sound]");
    await tap("[data-sound]");
    await page.evaluate(() => {
      const a = window.SeowooCore.audio,
        original = a.playVoice.bind(a);
      window.__voiceQA.completed = [];
      a.playVoice = async (id) => {
        const ok = await original(id);
        if (ok) window.__voiceQA.completed.push(id);
        return ok;
      };
    });
    const go = async (r) => {
      await page.evaluate((r) => window.SeowooApp.go(r), r);
      await page.waitForTimeout(100);
    };
    const layout = async (name) => {
      await page
        .locator("img")
        .evaluateAll((es) => es.forEach((e) => (e.loading = "eager")));
      await page.waitForFunction(
        () => [...document.images].every((i) => i.complete),
        null,
        { timeout: 10000 },
      );
      const check = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 2,
        broken: [...document.images]
          .filter((i) => !i.naturalWidth)
          .map((i) => i.getAttribute("src")),
        outside: [...document.querySelectorAll("main button")]
          .filter((b) => {
            const r = b.getBoundingClientRect();
            return r.width > 0 && (r.x < -2 || r.right > innerWidth + 2);
          })
          .map((b) => b.textContent.trim().slice(0, 25)),
      }));
      assert(!check.overflow, name + " horizontal overflow");
      assert.deepEqual(check.broken, [], name + " broken art");
      assert.deepEqual(check.outside, [], name + " buttons outside viewport");
      results.push({ profile: spec.id, screen: name, layout: "pass" });
    };
    for (const r of routes) {
      await go(r);
      await layout(r);
      if (["home", "more", "feelings", "puzzle"].includes(r))
        await page.screenshot({
          path: out + "/" + spec.id + "-" + r + ".png",
          fullPage: true,
        });
    }
    await go("village");
    await dragTo('[data-kind="town-child"]', '.v2-world-title');
    assert.equal(await page.evaluate(()=>SeowooExperiencesV2.state.village.place),null,"village wrong destination returns");
    await dragTo('[data-kind="town-child"]', '[data-zone="visit-market"]');
    assert.equal(await page.evaluate(()=>SeowooExperiencesV2.state.village.place),"market","village character must enter the dropped building");
    await layout("market");
    await page.screenshot({
      path: out + "/" + spec.id + "-market.png",
      fullPage: true,
    });
    const mission = await page.evaluate(
      () => window.SeowooExperiencesV2.state.market.mission,
    );
    const wrong = await page.evaluate(
      () =>
        window.SEOWOO_EXPERIENCE_V2.village.market.products.find(
          (p) =>
            !window.SeowooExperiencesV2.state.market.mission.includes(p[0]),
        )[0],
    );
    await dragTo(`[data-drag="${wrong}"]`, '[data-zone="market-cart"]');
    assert.equal(
      await page.evaluate(
        () => window.SeowooExperiencesV2.state.market.cart.length,
      ),
      0,
    );
    await tap(`[data-drag="${mission[0]}"]`);
    assert.equal(await page.evaluate(()=>SeowooExperiencesV2.state.market.cart.length),0,"tap cannot move product");
    await dragTo(`[data-drag="${mission[0]}"]`, '[data-zone="market-cart"]', {cancel:true});
    assert.equal(await page.evaluate(()=>SeowooExperiencesV2.state.market.cart.length),0,"cancel cannot commit");
    for (const id of mission) await dragTo(`[data-drag="${id}"]`, '[data-zone="market-cart"]');
    assert.equal(
      await page.evaluate(
        () => window.SeowooExperiencesV2.state.market.cart.length,
      ),
      3,
    );
    await tap("[data-market-checkout]");
    assert.equal(
      await page.locator("[data-market-checkout]").textContent(),
      "또 장보기",
    );
    await tap("[data-market-checkout]");
    assert.equal(
      await page.evaluate(
        () => window.SeowooExperiencesV2.state.market.cart.length,
      ),
      0,
    );
    await tap("[data-village-home]");
    await tap('[data-place="kitchen"]');
    await layout("kitchen");
    await page.screenshot({
      path: out + "/" + spec.id + "-kitchen.png",
      fullPage: true,
    });
    const need = await page.evaluate(
      () => window.SeowooExperiencesV2.state.kitchen.recipe.need,
    );
    await dragTo(`[data-drag="${need[0]}"][data-kind="raw"]`, '[data-zone="board"]');
    assert.equal(await page.evaluate(()=>SeowooExperiencesV2.state.kitchen.washed.size),0,"raw ingredient cannot skip washing");
    for (const id of need)
      for (const kind of ["raw", "washed", "chopped"])
        await dragTo(`[data-drag="${id}"][data-kind="${kind}"]`, `[data-zone="${{raw:"sink",washed:"board",chopped:"pot"}[kind]}"]`);
    await tap("[data-cook]");
    await tap("[data-serve]");
    assert(
      await page.evaluate(
        () => window.SeowooExperiencesV2.state.kitchen.served,
      ),
    );
    await tap("[data-kitchen-next]");
    await tap("[data-village-home]");
    await tap('[data-place="clinic"]');
    await layout("clinic");
    await page.screenshot({
      path: out + "/" + spec.id + "-clinic.png",
      fullPage: true,
    });
    const tools = await page.evaluate(
      () => window.SeowooExperiencesV2.state.clinic.required,
    );
    const otherTool=await page.evaluate(()=>SEOWOO_EXPERIENCE_V2.village.clinic.tools.find(([id])=>!SeowooExperiencesV2.state.clinic.required.includes(id))[0]);
    await dragTo(`[data-drag="${otherTool}"]`, '[data-zone="patient"]');
    assert.equal(await page.evaluate(()=>SeowooExperiencesV2.state.clinic.done.size),0,"unrequested tool must not progress treatment");
    for (const id of tools) await dragTo(`[data-drag="${id}"]`, '[data-zone="patient"]');
    assert.equal(
      await page.evaluate(
        () => window.SeowooExperiencesV2.state.clinic.done.size,
      ),
      4,
    );
    await tap("[data-clinic-next]");
    await require("./block-browser-flow.cjs")({page,spec,context,go,tap,layout,out,results});
    await go("puzzle");
    const puzzle = await page.evaluate(
      () => window.SeowooExperiencesV2.state.puzzle.case,
    );
    for (const [id, , target] of puzzle.pieces) {
      await tap(`[data-drag="${id}"]`);
      await tap(`[data-zone="p-${target}"]`);
    }
    assert(await page.locator(".puzzle-status.complete").count());
    if (!spec.touch) {
      await tap("[data-puzzle-next]");
      const [id, , target] = await page.evaluate(
        () => window.SeowooExperiencesV2.state.puzzle.case.pieces[0],
      );
      await dragTo(`[data-drag="${id}"]`, `[data-zone="p-${target}"]`);
      assert(
        await page.evaluate(
          (id) => window.SeowooExperiencesV2.state.puzzle.placed.has(id),
          id,
        ),
      );
    }
    await go("feelings");
    await tap("[data-feeling-start]");
    await layout("emotion-story");
    await page.screenshot({
      path: out + "/" + spec.id + "-story.png",
      fullPage: true,
    });
    const mood = await page.evaluate(
      () => window.SeowooExperiencesV2.state.feelings.case.mood,
    );
    await tap(`[data-story-mood="${mood}"]`);
    assert(
      await page.evaluate(
        () => window.SeowooExperiencesV2.state.feelings.answered,
      ),
    );
    if (!visualOnly) {
      // Genuine decoded MP3 playback: an uninterrupted short new recorded prompt.
      await tap("[data-feeling-home]");
      await tap("[data-calm-start]");
      await tap("[data-narration-repeat]");
      await page.waitForTimeout(9000);
      const voice = await page.evaluate(() => window.__voiceQA);
      assert(voice.starts > 0, "No decoded MP3 started");
      assert(
        voice.completed.some((id) => id.startsWith("play-calm-")),
        "New recorded prompt did not finish",
      );
      assert(
        await page.evaluate(() => {
          const a = window.SeowooCore.audio;
          return a.decodedVoices.has(
            a.manifest[
              "play-calm-" + window.SeowooExperiencesV2.state.feelings.calmType
            ].src,
          );
        }),
        "New MP3 not decoded",
      );
      assert.deepEqual(voice.fallbacks, [], "Unexpected device TTS fallback");
      await go("elevator");
      await tap('[data-floor="2"]');
      await page.waitForTimeout(18000);
      assert.equal(await page.locator("#elevatorFloor").textContent(), "2");
      await layout("elevator-arrival");
      assert.deepEqual(errors, [], spec.id + " runtime/network errors");
      results.push({
        profile: spec.id,
        flows: "market/kitchen/clinic/puzzle/feelings/elevator pass",
        audio: voice,
      });
    } else {
      assert.deepEqual(errors, [], spec.id + " runtime/network errors");
      results.push({
        profile: spec.id,
        flows: "visual and touch checks pass; audio verification deferred",
      });
    }
    await browser.close();
  }
  assert(results.length>0,"Unknown or empty browser profile");
  if (!visualOnly && (!profileOnly || profileOnly === "desktop-chromium")) {
    // Install real service worker, then reload offline and decode a cached new clip.
    const browser = await chromium.launch();
    browsers.push(browser);
    const context = await browser.newContext();
    // Initial activation may deliberately reload the installing tab. Start the
    // offline journey in a fresh tab only after that worker controls the origin.
    const installingPage = await context.newPage();
    await installingPage.goto("http://127.0.0.1:4175/");
    await installingPage.waitForFunction(() => navigator.serviceWorker.controller, null, {
      timeout: 45000,
    });
    await installingPage.close();
    const page = await context.newPage();
    currentPage = page;
    await page.goto("http://127.0.0.1:4175/");
    await page.locator('[data-go="village"]').click();
    await page.locator('[data-place="market"]').click();
    await page.waitForTimeout(9000);
    await context.setOffline(true);
    await page.reload();
    await page.locator(".v2-world-hub").waitFor();
    assert(
      await page
        .locator(".v2-scene-img")
        .evaluate((i) => i.complete && i.naturalWidth > 0),
    );
    await page.locator("[data-narration-repeat]").click();
    const offlineVoice = await page.evaluate(async () => {
      const a = window.SeowooCore.audio;
      const ok = await a.playVoice("play-village-start");
      return {
        ok,
        decoded: a.decodedVoices.has(a.manifest["play-village-start"].src),
      };
    });
    assert(
      offlineVoice.ok && offlineVoice.decoded,
      "Offline local voice did not play",
    );
    results.push({
      profile: "offline-chromium",
      cachedArt: "pass",
      cachedVoice: "pass",
    });
    await browser.close();
  }
  fs.writeFileSync(
    out + "/results" + (profileOnly ? "-" + profileOnly : "") + ".json",
    JSON.stringify({ results, failures }, null, 2),
  );
  console.log("PASS real browser storybook: " + results.length + " checks");
})()
  .catch(async (e) => {
    await currentPage
      ?.screenshot({ path: out + "/failure.png", fullPage: true })
      .catch(() => {});
    failures.push(String(e.stack || e));
    fs.writeFileSync(
      out + "/results" + (profileOnly ? "-" + profileOnly : "") + ".json",
      JSON.stringify({ results, failures }, null, 2),
    );
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled(browsers.map((b) => b.close()));
    server.kill();
  });
