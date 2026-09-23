const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  { webcrypto } = require("crypto"),
  { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");
const dom = new JSDOM(fs.readFileSync(path.join(root, "index.html"), "utf8"), {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const w = dom.window;
Object.defineProperty(w, "crypto", { value: webcrypto });
w.TextEncoder = TextEncoder;
w.matchMedia = () => ({ matches: false, addEventListener() {} });
w.scrollTo = () => {};
w.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
w.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
w.HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new w.Event("close"));
};
const spoken = [];
class Audio {
  constructor(settings) {
    this.settings = settings;
    this.voiceVolume = 1;
    this.sfxVolume = 0.65;
  }
  speak(t) {
    spoken.push(t);
    return Promise.resolve(true);
  }
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
  setVoiceVolume(v) {
    this.voiceVolume = +v;
  }
  setSfxVolume(v) {
    this.sfxVolume = +v;
  }
}
w.SeowooAudioManager = Audio;
w.SeowooElevator = { mount() {}, unmount() {}, current: 1 };
w.SeowooPanorama = {
  scenes: [{ id: "seoul", name: "서울", file: "seoul.webp" }],
  selected: "seoul",
  choose() {},
};
// Exercise pending callbacks quickly while keeping callback order intact.
const realTimeout = w.setTimeout.bind(w);
w.setTimeout = (fn, ms, ...args) =>
  realTimeout(fn, ms >= 500 ? 15 : ms, ...args);
for (const p of [
  "data/content.js",
  "js/core.js",
  "js/screen-lock.js",
  "js/experiences.js",
  "js/app.js",
])
  w.eval(fs.readFileSync(path.join(root, p), "utf8"));
fs.mkdirSync(path.join(root, ".test-results"), { recursive: true });
const doc = w.document,
  $ = (s) => doc.querySelector(s),
  click = (s) => {
    const e = $(s);
    assert(e, `Missing ${s}`);
    e.click();
  },
  go = (r) => w.SeowooApp.go(r),
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(20);
  const report = [];
  assert.equal(doc.querySelectorAll(".activity-card").length, 6);
  report.push("홈: 여섯 활동 진입");
  go("elevator");
  const floorOrder = Array.from({ length: 10 }, (_, row) => [
    19 - row * 2,
    20 - row * 2,
  ]).flat();
  assert.deepEqual(
    [...doc.querySelectorAll("[data-floor]")].map((b) => +b.dataset.floor),
    floorOrder,
  );
  assert.equal(
    doc.querySelectorAll(".glass-cabin .elevator-console .floor-main").length,
    1,
  );
  assert.equal(doc.querySelectorAll("details.more-floors").length, 0);
  assert(doc.querySelector(".glass-cabin .elevator-hud"));
  assert(doc.querySelector("[data-city-random]"));
  report.push("엘리베이터: 우측 패널 19·20 → 1·2 배열, 모든 층 표시, 별도 HUD");
  go("language");
  click('[data-mode="consonant"]');
  assert.equal(
    $('.mode-tabs [aria-selected="true"]').textContent,
    "ㄱㄴㄷ 찾기",
  );
  click('[data-mode="vowel"]');
  click('[data-mode="word"]');
  assert($(".word-picture"));
  report.push("말글: 한글/자음/모음/단어 전환");
  go("language");
  let target = $(".question-symbol").textContent;
  const wrong = [...doc.querySelectorAll("[data-answer]")].find(
    (x) => x.getAttribute("aria-label") !== target,
  );
  wrong.click();
  assert.equal($("#feedback").textContent, "다시 찾아볼까?");
  const correct = [...doc.querySelectorAll("[data-answer]")].find(
    (x) => x.getAttribute("aria-label") === target,
  );
  correct.click();
  const count = w.SeowooCore.state.stats.correct;
  correct.click();
  assert.equal(w.SeowooCore.state.stats.correct, count);
  assert.equal($("#feedback").textContent, "잘했어!");
  await wait(30);
  assert.equal($(".round-status>span:last-child").textContent, "2 / 12");
  report.push("정답/오답, 중복 탭 방지, 다음 문제");
  for (let n = 1; n < 12; n++) {
    target = $(".question-symbol").textContent;
    [...doc.querySelectorAll("[data-answer]")]
      .find((x) => x.getAttribute("aria-label") === target)
      .click();
    await wait(25);
  }
  assert($(".result-card"));
  assert.equal(w.SeowooCore.state.stats.byGame.hangulFind, 1);
  click("[data-replay]");
  assert($(".question-card"));
  report.push("12문제 완료·기록·다시하기");
  target = $(".question-symbol").textContent;
  [...doc.querySelectorAll("[data-answer]")]
    .find((x) => x.getAttribute("aria-label") === target)
    .click();
  go("home");
  await wait(40);
  assert($(".home-world"));
  go("potty");
  for (let i = 0; i < 3; i++) click('[data-potty="next"]');
  click('[data-potty="kind"]');
  click('[data-potty="next"]');
  click('[data-potty="next"]');
  go("home");
  go("potty");
  assert.equal($('[data-potty="next"]').disabled, false);
  click('[data-potty="next"]');
  await wait(30);
  go("home");
  report.push("화면 전환 뒤 오래된 문제 콜백 취소");
  for (const r of [
    "numbers",
    "quantity",
    "numberOrder",
    "finger",
    "numberBoard",
    "shape",
    "english",
    "color",
    "alphabet",
    "englishWords",
    "koreanWords",
    "hangul",
    "memory",
    "music",
    "treasure",
    "more",
    "together",
    "village",
    "puzzle",
    "feelings",
  ]) {
    go(r);
    assert($("#main h1"));
    assert.equal($("#main").textContent.includes("undefined"), false, r);
  }
  report.push("20개 기존/새 놀이 경로 렌더링");
  go("more");
  assert($('[data-go="village"]'));
  assert($('[data-go="puzzle"]'));
  assert($('[data-go="feelings"]'));
  go("village");
  assert($(".village-map"));
  click('[data-village-place="market"]');
  assert($(".market-room"));
  go("puzzle");
  assert($(".puzzle-hub"));
  click('[data-puzzle-mode="shadows"]');
  assert.equal(doc.querySelectorAll(".shape-piece").length, 4);
  go("feelings");
  assert($(".feelings-world"));
  click('[data-mood="sad"]');
  assert($(".mood-bg-sad"));
  click("[data-feeling-story]");
  assert($(".feeling-story"));
  report.push("프리미엄 3개 메뉴 진입·장면 전환·기본 상호작용 렌더링");
  go("potty");
  click('[data-potty="next"]');
  for (let i = 0; i < 3; i++) click('[data-potty="wash"]');
  click('[data-potty="restart"]');
  const before = w.SeowooCore.state.stats.byGame.potty || 0;
  for (let i = 0; i < 3; i++) click('[data-potty="next"]');
  click('[data-potty="kind"]');
  click('[data-potty="next"]');
  click('[data-potty="next"]');
  assert.equal($('[data-potty="next"]').disabled, true);
  await wait(30);
  click('[data-potty="next"]');
  for (let i = 0; i < 3; i++) click('[data-potty="wash"]');
  assert($('[data-potty="restart"]'));
  assert.equal(w.SeowooCore.state.stats.byGame.potty, before + 1);
  click('[data-potty="real"]');
  click('[data-potty="return"]');
  assert.equal(w.SeowooCore.state.stats.byGame.potty, before + 1);
  report.push("화장실 8단계·물 내림·손 씻기 3회·스티커 중복 방지");
  // These credentials exist only in this disposable, in-memory test DOM.
  go("home");
  click("[data-parent]");
  $("#parentPin").value = "2468";
  $("#parentGate").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await wait(30);
  assert($(".parent-content"));
  assert(await w.SeowooScreenLock.verifyPin("2468"));
  assert(!(await w.SeowooScreenLock.verifyPin("0000")));
  assert(!w.localStorage.getItem("seowoo-screen-lock-pin-v2").includes("2468"));
  click('[data-setting="voice"]');
  assert.equal(w.SeowooCore.state.settings.voice, false);
  const select = $('[data-pref="breakMinutes"]');
  select.value = "20";
  select.dispatchEvent(new w.Event("change", { bubbles: true }));
  assert.equal(w.SeowooCore.state.settings.breakMinutes, 20);
  click("[data-change-pin]");
  $("#newPin").value = "1357";
  $("#changePinForm").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await wait(30);
  assert(await w.SeowooScreenLock.verifyPin("1357"));
  assert(!(await w.SeowooScreenLock.verifyPin("2468")));
  report.push("보호자: 일회 입력·PIN 변경·해시 저장·음성/시간 설정");
  // Save the actually rendered parent component for a separate local visual fixture.
  let fixture = doc.documentElement.outerHTML.replace(
    /<script[\s\S]*?<\/script>/g,
    "",
  );
  fixture = fixture.replace("<head>", '<head><base href="/">');
  fixture = fixture.replace(
    "</body>",
    '<script>document.querySelector("#parentDialog").removeAttribute("open");document.querySelector("#parentDialog").showModal();</script></body>',
  );
  fs.writeFileSync(
    path.join(root, ".test-results/parent-preview.html"),
    "<!doctype html>" + fixture,
  );
  click("[data-parent-close]");
  click("[data-parent]");
  $("#parentPin").value = "0000";
  $("#parentGate").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await wait(30);
  assert.equal($("#gateError").textContent, "비밀번호가 맞지 않아요.");
  assert(!$(".parent-content"));
  report.push("잘못된 PIN으로 보호자 진입 차단");
  assert(
    w.localStorage.getItem("seowoo-play-v3"),
    "기존 저장 키를 사용해야 합니다",
  );
  const values = Array.from({ length: 20 }, (_, i) => i);
  for (let i = 0; i < 30; i++)
    assert.deepEqual(
      [...w.SeowooCore.shuffle(values)].sort((a, b) => a - b),
      values,
    );
  report.push("기존 저장 키 유지·셔플 항목 보존");
  fs.writeFileSync(
    path.join(root, ".test-results/functional-results.json"),
    JSON.stringify(
      {
        passed: report,
        failed: [],
        scope:
          "Node jsdom integration; no real user credentials or device state changed",
      },
      null,
      2,
    ),
  );
  console.log(report.map((x, i) => `PASS ${i + 1}. ${x}`).join("\n"));
  dom.window.close();
})().catch((e) => {
  console.error(e);
  dom.window.close();
  process.exitCode = 1;
});
