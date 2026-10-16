(() => {
  "use strict";
  const K = window.SeowooCore;
  const D = window.SEOWOO_EXPERIENCE_V2;
  const V = window.SeowooV2Icon;
  const N = window.SeowooNarrator;
  const say = (...keys) => N?.event(...keys);
  let selected = null,
    suppressClick = 0;
  const marketNext = () =>
    S.market.mission.find((id) => !S.market.cart.includes(id));
  const clinicNext = () =>
    S.clinic.required.find((id) => !S.clinic.done.has(id));
  const resetVoice = () => {
    N?.reset();
    audio.stopVoice();
  };
  const marketIntro = () =>
    say(
      "market-start-" +
        D.village.market.missions.findIndex(
          (m) => m.join() === S.market.mission.join(),
        ),
      "market-next-" + marketNext(),
    );
  if (!K || !D || !V) return;

  const { audio, complete, recordChoice, confetti, shuffle } = K;
  let ctx = null;
  let active = null;
  let abort = null;
  let unbindDrag = null;
  let timers = new Set();

  const S = {
    village: { place: null },
    market: { mission: [], cart: [], checked: false },
    kitchen: {
      recipe: null,
      washed: new Set(),
      chopped: new Set(),
      pot: new Set(),
      cooked: false,
      served: false,
    },
    clinic: { patient: null, required: [], done: new Set() },
    puzzle: {
      case: null,
      placed: new Set(),
      deck: [],
      recent: [],
      tries: 0,
      completed: 0,
    },
    feelings: {
      mood: "happy",
      case: null,
      deck: [],
      recent: [],
      tries: 0,
      completed: 0,
      calm: 0,
      calmType: "breathe",
    },
  };

  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (ctx) fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const stopTimers = () => {
    timers.forEach(clearTimeout);
    timers.clear();
  };
  const tone = (notes) =>
    notes.forEach((n, i) => audio.tone(n, 0.18, "sine", 0.035, i * 0.11));
  const finish = (id) => {
    complete(id);
    audio.success();
    confetti?.();
  };
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  const shell = (title, body, cls, back = "home") => {
    ctx.main.innerHTML = `<section class="play-screen v2-screen ${cls}">${ctx.header(title, back)}<div class="v2-body">${body}<div class="story-guide" role="status"><span data-narration></span><button data-narration-repeat aria-label="안내 다시 듣기">${ctx.icon("sound")}</button></div></div></section>`;
    N?.paint();
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const newDeck = (a, last) => {
    let d = shuffle(a.map((x) => x.id));
    if (last && d[0] === last && d.length > 1) [d[0], d[1]] = [d[1], d[0]];
    return d;
  };
  const nextFromDeck = (key, list, current) => {
    const state = S[key];
    const maxRecent = Math.max(1, list.length - 1);
    const blocked = new Set(state.recent || []);
    let candidates = list.filter(
      (x) => !blocked.has(x.id) && x.id !== current?.id,
    );
    if (!candidates.length) {
      state.recent = (state.recent || []).slice(-Math.max(0, maxRecent - 1));
      const retry = new Set(state.recent);
      candidates = list.filter((x) => !retry.has(x.id) && x.id !== current?.id);
    }
    const next = pick(
      candidates.length ? candidates : list.filter((x) => x.id !== current?.id),
    );
    state.recent = [...(state.recent || []), next.id].slice(-maxRecent);
    return next || list[0];
  };
  const itemMeta = (id, items) => items.find((x) => x[0] === id);
  const character = (mood = "happy") =>
    `<img class="story-child" src="assets/art/v3/child-${mood}.webp" alt="${D.moods.find((x) => x.id === mood)?.label || "서우"}" draggable="false">`;

  function villageHub() {
    S.village.place = null;
    shell(
      "역할놀이 마을",
      `
      <div class="v2-world-hub">
        <img class="v2-scene-img" src="assets/art/v3/village.webp" alt="마트와 주방, 동물병원이 이어진 서우 역할놀이 마을">
        <div class="v2-world-title"><span>서우의 작은 마을</span><h2>오늘은 어디에서 놀까?</h2><p>서우를 잡고 가고 싶은 집으로 끌어봐</p></div>
        <button class="world-building market v2-drop" data-zone="visit-market" data-accept="town-child" data-place="market">${V("apple")}<span class="building-badge">장보기</span><b>알록달록 마트</b><small>필요한 물건을 골라봐</small></button>
        <button class="world-building kitchen v2-drop" data-zone="visit-kitchen" data-accept="town-child" data-place="kitchen">${V("meal")}<span class="building-badge">요리</span><b>우리집 주방</b><small>씻고, 썰고, 보글보글</small></button>
        <button class="world-building clinic v2-drop" data-zone="visit-clinic" data-accept="town-child" data-place="clinic">${V("dog")}<span class="building-badge">돌보기</span><b>동물 병원</b><small>아픈 친구를 건강하게</small></button>
        <div class="v2-town-kid"><button class="v2-drag town-child" data-drag="seowoo" data-kind="town-child" aria-label="서우를 집으로 끌어 옮기기">${character("happy")}</button><div class="kid-talk">나를 잡고 집으로 데려다줘!</div></div>
      </div>`,
      "v2-village",
    );
    say("village-start");
  }

  function resetMarket() {
    S.market.mission = [...pick(D.village.market.missions)];
    S.market.cart = [];
    S.market.checked = false;
  }
  function market() {
    if (!S.market.mission.length) resetMarket();
    S.village.place = "market";
    const products = D.village.market.products;
    const target = new Set(S.market.mission);
    const have = new Set(S.market.cart);
    const allDone = S.market.mission.every((x) => have.has(x));
    shell(
      "알록달록 마트",
      `
      <div class="v2-role-wrap market-world">
        <img class="v2-scene-img" src="assets/art/v3/market.webp" alt="상품 진열대와 계산대가 있는 알록달록 마트">
        <button class="scene-back" data-village-home>← 마을로</button>
        <div class="market-mission panel-glass"><span>오늘의 장보기</span><div class="mission-list">${S.market.mission
          .map((id) => {
            const m = itemMeta(id, products);
            return `<div class="${have.has(id) ? "done" : ""}">${V(m[2])}<b>${m[1]}</b><i></i></div>`;
          })
          .join("")}</div></div>
        <div class="market-products">${products
          .map(
            ([id, name, icon], i) => `
          <button class="v2-drag product-card p-${i}" data-drag="${id}" data-kind="market-product" data-default-zone="market-cart" aria-label="${name} 장바구니에 넣기">
            ${V(icon)}<small>${name}</small>${have.has(id) ? '<i class="mission-mark">✓</i>' : ""}
          </button>`,
          )
          .join("")}</div>
        <div class="market-cart v2-drop" data-zone="market-cart" data-accept="market-product">
          <div class="cart-handle"></div><div class="cart-box">${S.market.cart
            .map((id) => {
              const m = itemMeta(id, products);
              return V(m?.[2] || id);
            })
            .join("")}</div><i class="wheel a"></i><i class="wheel b"></i>
          <span>${S.market.cart.length ? `${S.market.cart.length}개 담았어` : "물건을 여기에 쏙!"}</span>
        </div>
        <div class="market-checkout panel-glass">
          <div class="scanner-beam"></div><div class="checkout-display">${S.market.checked ? "계산 완료!" : allDone ? "준비 완료" : "장보는 중"}</div>
          <button data-market-checkout ${allDone ? "" : "disabled"}>${S.market.checked ? "또 장보기" : "계산하기"}</button>
        </div>
      </div>`,
      "v2-village v2-market",
    );
  }

  function resetKitchen() {
    S.kitchen.recipe = pick(D.village.kitchen.recipes);
    S.kitchen.washed = new Set();
    S.kitchen.chopped = new Set();
    S.kitchen.pot = new Set();
    S.kitchen.cooked = false;
    S.kitchen.served = false;
  }
  function kitchen() {
    if (!S.kitchen.recipe) resetKitchen();
    S.village.place = "kitchen";
    const R = S.kitchen.recipe,
      items = D.village.kitchen.ingredients;
    const need = new Set(R.need);
    const potReady = R.need.every((id) => S.kitchen.pot.has(id));
    shell(
      "우리집 주방",
      `
      <div class="v2-role-wrap kitchen-world ${S.kitchen.cooked ? "cooked" : ""}">
        <img class="v2-scene-img" src="assets/art/v3/kitchen.webp" alt="싱크대와 도마, 냄비가 있는 따뜻한 주방">
        <button class="scene-back" data-village-home>← 마을로</button>
        <div class="recipe-card panel-glass"><span>오늘의 요리</span><h2>${R.name}</h2><div>${R.need
          .map((id) => {
            const m = itemMeta(id, items);
            return `<i class="${S.kitchen.pot.has(id) ? "done" : ""}">${V(m[2])}<small>${m[1]}</small></i>`;
          })
          .join("")}</div></div>
        <div class="fridge-tray">${items
          .filter(([id]) => need.has(id) && !S.kitchen.washed.has(id))
          .map(
            ([id, name, ic]) => `
          <button class="v2-drag ingredient" data-drag="${id}" data-kind="raw" data-default-zone="sink" aria-label="${name} 씻기">${V(ic)}<small>${name}</small></button>`,
          )
          .join("")}</div>
        <div class="kitchen-zone sink-zone v2-drop" data-zone="sink" data-accept="raw"><b>1. 깨끗이 씻기</b><span class="station-art">${V("tap")}</span><div>${[
          ...S.kitchen.washed,
        ]
          .filter((id) => !S.kitchen.chopped.has(id))
          .map((id) => {
            const m = itemMeta(id, items);
            return `<button class="v2-drag processed washed" data-drag="${id}" data-kind="washed" data-default-zone="board" aria-label="${m[1]} 썰기">${V(m[2])}</button>`;
          })
          .join("")}</div></div>
        <div class="kitchen-zone board-zone v2-drop" data-zone="board" data-accept="washed"><b>2. 도마에서 썰기</b><span class="station-art">${V("board")}</span><div>${[
          ...S.kitchen.chopped,
        ]
          .filter((id) => !S.kitchen.pot.has(id))
          .map((id) => {
            const m = itemMeta(id, items);
            return `<button class="v2-drag processed chopped" data-drag="${id}" data-kind="chopped" data-default-zone="pot" aria-label="${m[1]} 냄비에 넣기">${V(m[2])}</button>`;
          })
          .join("")}</div></div>
        <div class="kitchen-zone pot-zone v2-drop" data-zone="pot" data-accept="chopped"><b>3. 냄비에 넣기</b><div class="v2-pot">${V("pot")}<span class="pot-food">${[
          ...S.kitchen.pot,
        ]
          .map((id) => {
            const m = itemMeta(id, items);
            return V(m?.[2] || id);
          })
          .join(
            "",
          )}</span><i class="steam a"></i><i class="steam b"></i><i class="steam c"></i></div></div>
        <div class="kitchen-actions panel-glass">
          <button data-cook ${potReady && !S.kitchen.cooked ? "" : "disabled"}>불 켜고 요리하기</button>
          <button data-serve ${S.kitchen.cooked && !S.kitchen.served ? "" : "disabled"}>접시에 담기</button>
          ${S.kitchen.served ? "<button data-kitchen-next>또 요리하기</button>" : ""}<div class="served-plate">${S.kitchen.served ? V("meal-" + S.kitchen.recipe.id) + "<b>완성!</b>" : ""}</div>
        </div>
      </div>`,
      "v2-village v2-kitchen",
    );
  }

  function resetClinic() {
    S.clinic.patient = pick(D.village.clinic.patients);
    S.clinic.required = shuffle(D.village.clinic.tools.map((x) => x[0])).slice(
      0,
      4,
    );
    S.clinic.done = new Set();
  }
  function clinic() {
    if (!S.clinic.patient) resetClinic();
    S.village.place = "clinic";
    const P = S.clinic.patient,
      tools = D.village.clinic.tools,
      done = S.clinic.done;
    const finished = S.clinic.required.every((x) => done.has(x));
    shell(
      "동물 병원",
      `
      <div class="v2-role-wrap clinic-world">
        <img class="v2-scene-img" src="assets/art/v3/clinic.webp" alt="진료대와 의료도구가 있는 밝은 동물 병원">
        <button class="scene-back" data-village-home>← 마을로</button>
        <div class="patient-card panel-glass"><span>오늘의 친구</span><h2>${P.name}</h2><p>${finished ? "이제 건강해졌어!" : "필요한 도구 4개로 돌봐줘"}</p><div class="care-dots">${S.clinic.required.map((id) => `<span class="care-item ${done.has(id) ? "done" : ""}">${V(id)}${done.has(id) ? "✓" : ""}</span>`).join("")}</div></div>
        <img class="v2-patient ${finished ? "happy" : ""}" src="assets/art/v3/${P.id}.webp" alt="${P.name}" draggable="false">
        <div class="patient-drop v2-drop" data-zone="patient" data-accept="clinic-tool"><span>그림에 나온 도구를 눌러줘</span></div>
        <div class="clinic-toolbox panel-glass">${tools
          .map(
            ([id, name]) => `
          <button class="v2-drag clinic-tool ${done.has(id) ? "used" : ""} ${S.clinic.required.includes(id) ? "needed" : ""}" data-drag="${id}" data-kind="clinic-tool" data-default-zone="patient" ${done.has(id) || finished ? "disabled" : ""} aria-label="${name} 사용하기">
            ${V(id)}<small>${name}</small>
          </button>`,
          )
          .join("")}</div>
        ${finished ? '<button class="clinic-next" data-clinic-next>다른 친구 돌보기</button>' : ""}
      </div>`,
      "v2-village v2-clinic",
    );
  }

  function puzzleCase(next = false) {
    if (next || !S.puzzle.case) {
      const prev = S.puzzle.case;
      S.puzzle.case = nextFromDeck("puzzle", D.puzzles, prev);
      S.puzzle.placed = new Set();
      S.puzzle.tries = 0;
      selected = null;
    }
    const C = S.puzzle.case;
    const done = S.puzzle.placed;
    const finished = C.pieces.every((p) => done.has(p[0]));
    shell(
      "퍼즐 탐험대",
      `
      <div class="v2-puzzle-world theme-${C.theme}">
        <div class="puzzle-top panel-glass"><div><span>랜덤 퍼즐 ${D.puzzles.findIndex((x) => x.id === C.id) + 1} / ${D.puzzles.length}</span><h2>${C.title}</h2><p>${C.prompt}</p></div><button data-puzzle-next>다른 퍼즐</button></div>
        <div class="v2-puzzle-board">
          <div class="puzzle-slots">${C.slots
            .map(
              ([id, label]) => `
            <button aria-label="${label} 자리" class="v2-slot v2-drop ${[...done].some((pid) => C.pieces.find((p) => p[0] === pid)?.[2] === id) ? "has" : ""}" data-zone="p-${id}" data-accept="puzzle-${id}">
              <div class="slot-visual">${slotArt(id)}</div><b>${label}</b>
              <div class="placed-items">${C.pieces
                .filter((p) => p[2] === id && done.has(p[0]))
                .map((p) => V(p[1]))
                .join("")}</div>
            </button>`,
            )
            .join("")}</div>
          <div class="puzzle-tray">${C.pieces
            .filter((p) => !done.has(p[0]))
            .map(
              ([id, icon, target]) => `
            <button class="v2-drag v2-piece ${selected === id ? "selected" : ""}" aria-pressed="${selected === id}" aria-label="${window.SeowooArt?.label(icon) || icon} 고르기" data-drag="${id}" data-kind="puzzle-${target}">${V(icon)}</button>`,
            )
            .join("")}</div>
        </div>
        <div class="puzzle-status ${finished ? "complete" : ""}">${finished ? "<b>퍼즐 완성!</b><span>이번엔 또 어떤 퍼즐이 나올까?</span><button data-puzzle-next>다음 랜덤 퍼즐</button>" : `<span>${done.size} / ${C.pieces.length}</span><b>천천히 보고 같은 곳에 놓아봐</b>`}</div>
      </div>`,
      "v2-puzzle",
    );
    if (next) say(C.id === "shape-garden" ? "puzzle-start" : "puzzle-" + C.id);
  }

  const slotArt = (id) =>
    V(
      {
        pond: "sea",
        treehome: "tree",
        road: "car",
        sky: "cloud",
        rail: "train",
        red: "apple",
        yellow: "banana",
        green: "pear",
        purple: "grape",
        big: "bear-big",
        small: "bear-small",
        rain: "rain",
        sunny: "sun",
        snow: "snow",
        s1: "tap",
        s2: "soap",
        s3: "hands",
        s4: "rinse",
        s5: "towel",
        applefull: "apple",
        ballfull: "ball",
        butterflyfull: "butterfly",
        fishfull: "fish",
        bathroom: "tap",
        home: "house",
        hit: "drum",
        blow: "trumpet",
        string: "guitar",
        circle: "shape-circle",
        triangle: "shape-triangle",
        square: "shape-square",
      }[id] || id,
    );
  function moodFace(mood) {
    return `<span class="mood-portrait">${character(mood)}</span>`;
  }
  function feelingsHome() {
    const mood = S.feelings.mood;
    shell(
      "마음친구",
      `
      <div class="v2-feelings-home mood-${mood}">
        <div class="feel-copy"><span>내 마음을 말해보는 연습</span><h2>서우야, 지금 기분이 어때?</h2><p>말하기 어렵다면 얼굴부터 골라도 괜찮아</p></div>
        <div class="feel-character">${character(mood)}<div class="feel-speech"><b>${D.moods.find((x) => x.id === mood).label}</b><span>내 마음을 알아차렸어</span></div></div>
        <div class="mood-grid">${D.moods.map((m) => `<button class="${m.id === mood ? "active" : ""}" data-mood="${m.id}">${moodFace(m.id)}<b>${m.label}</b></button>`).join("")}</div>
        <div class="feel-actions"><button class="primary" data-feeling-start>친구 마음 알아보기 <span>${D.feelings.length}가지</span></button><button data-calm-start>마음 천천히 하기</button></div>
      </div>`,
      "v2-feelings",
    );
  }
  function storyArt(scene) {
    const item = D.feelings.find((x) => x.scene === scene);
    return `<img class="v2-story-art" src="assets/art/v3/story-${item.id}.webp" alt="${esc(item.text)}">`;
  }
  function feelingCase(next = false) {
    if (next || !S.feelings.case) {
      const prev = S.feelings.case;
      S.feelings.case = nextFromDeck("feelings", D.feelings, prev);
      S.feelings.tries = 0;
      S.feelings.answered = false;
    }
    const C = S.feelings.case;
    shell(
      "친구 마음 알아보기",
      `
      <div class="v2-feeling-case">
        <div class="case-top"><button data-feeling-home>← 마음친구</button><span>랜덤 상황 ${D.feelings.findIndex((x) => x.id === C.id) + 1} / ${D.feelings.length}</span><button data-feeling-next>다른 상황</button></div>
        <div class="case-card">
          <div class="case-scene">${storyArt(C.scene)}</div>
          <div class="case-copy"><span>무슨 일이 있었을까?</span><h2>${C.title}</h2><p>${C.text}</p><strong>친구 마음은 어떨까?</strong></div>
        </div>
        <div class="case-moods">${D.moods.map((m) => `<button data-story-mood="${m.id}">${moodFace(m.id)}<b>${m.label}</b></button>`).join("")}</div>
        <div id="v2FeelFeedback" class="feel-feedback">표정을 보고 마음을 골라봐</div>
      </div>`,
      "v2-feelings",
    );
  }

  function calm(next = false) {
    if (next) {
      S.feelings.calm = 0;
      S.feelings.calmType = pick(["breathe", "count", "stretch"]);
    }
    const type = S.feelings.calmType,
      n = S.feelings.calm;
    const config = {
      breathe: [
        "풍선처럼 천천히 후~",
        "동그라미가 커질 때 들이마시고 작아질 때 내쉬어봐",
        "후~",
      ],
      count: [
        "하나, 둘, 셋 천천히",
        "별을 하나씩 누르며 마음을 천천히 만들어봐",
        "톡",
      ],
      stretch: ["어깨를 으쓱, 툭", "몸을 쭉 늘였다가 힘을 툭 풀어봐", "쭉"],
    }[type];
    shell(
      "마음 천천히 하기",
      `
      <div class="v2-calm ${type}">
        <div class="calm-title"><span>마음 쉬는 연습</span><h2>${config[0]}</h2><p>${config[1]}</p></div>
        <button class="calm-orb ${n ? "active" : ""}" data-calm-tap aria-label="${config[0]}" ${n >= 3 ? "disabled" : ""}>${V(type === "count" ? "star" : type === "breathe" ? "balloon" : "heart")}</button>
        <div class="calm-steps">${[0, 1, 2].map((i) => `<i class="${i < n ? "done" : ""}"></i>`).join("")}</div>
        ${n >= 3 ? '<div class="calm-finish"><b>잘했어</b><span>마음이 조금 천천해졌어</span><button data-calm-next>다른 마음 쉬기</button><button data-feeling-home>마음친구로</button></div>' : ""}
      </div>`,
      "v2-feelings",
    );
  }

  function validDrop(item, zone) {
    if (!item || !zone) return false;
    return String(zone.dataset.accept || "")
      .split(/\s+/)
      .includes(item.dataset.kind);
  }
  function dropAction(item, zone) {
    const id = item.dataset.drag,
      z = zone.dataset.zone;
    selected = null;
    if (item.dataset.kind === "town-child") {openPlace(z.replace("visit-", "")); return;}
    if (
      active === "village" &&
      S.village.place === "market" &&
      z === "market-cart"
    ) {
      if (S.market.checked) return;
      if (S.market.cart.includes(id)) {
        say("market-duplicate");
        return;
      }
      if (!S.market.mission.includes(id)) {
        say("market-other-" + id, "market-next-" + marketNext());
        return;
      }
      S.market.cart.push(id);
      audio.button();
      market();
      say(
        "market-pick-" + id,
        marketNext() ? "market-next-" + marketNext() : "market-ready",
      );
      return;
    }
    if (active === "village" && S.village.place === "kitchen") {
      if (z === "sink" && item.dataset.kind === "raw") {
        S.kitchen.washed.add(id);
        audio.noise?.(0.35, 900, 0.06);
        kitchen();
        say("kitchen-wash");
        return;
      }
      if (z === "board" && item.dataset.kind === "washed") {
        S.kitchen.chopped.add(id);
        tone([650, 720]);
        kitchen();
        say("kitchen-chop");
        return;
      }
      if (z === "pot" && item.dataset.kind === "chopped") {
        S.kitchen.pot.add(id);
        audio.button();
        kitchen();
        say(
          S.kitchen.recipe.need.every((x) => S.kitchen.pot.has(x))
            ? "kitchen-ready"
            : "kitchen-add",
        );
        return;
      }
    }
    if (
      active === "village" &&
      S.village.place === "clinic" &&
      z === "patient"
    ) {
      if (S.clinic.done.has(id)) return;
      if (S.clinic.required.includes(id)) {
        S.clinic.done.add(id);
        audio.success();
        if (S.clinic.required.every((x) => S.clinic.done.has(x))) {
          finish("v2Clinic");
        }
        say(
          "clinic-use-" + id,
          clinicNext() ? "clinic-next-" + clinicNext() : "clinic-done",
        );
      } else {
        say("clinic-wrong", "clinic-next-" + clinicNext());
      }
      clinic();
      return;
    }
    if (active === "puzzle" && z.startsWith("p-")) {
      if (S.puzzle.placed.has(id)) return;
      S.puzzle.placed.add(id);
      recordChoice(true, S.puzzle.tries === 0);
      audio.success();
      const finished = S.puzzle.case.pieces.every((p) =>
        S.puzzle.placed.has(p[0]),
      );
      if (finished) {
        S.puzzle.completed++;
        finish("v2Puzzle");
      }
      puzzleCase(false);
      say(finished ? "puzzle-done" : "puzzle-right");
      return;
    }
  }
  function openPlace(place) {
    resetVoice();
    if (place === "market") {resetMarket(); market(); marketIntro();}
    else if (place === "kitchen") {resetKitchen(); kitchen(); say("kitchen-start-" + S.kitchen.recipe.id);}
    else {resetClinic(); clinic(); say("clinic-start-" + S.clinic.patient.id, "clinic-next-" + clinicNext());}
  }
  function accepts(item, zone) {
    if (!validDrop(item, zone)) return false;
    const id=item.dataset.drag;
    if (item.dataset.kind === "market-product") return !S.market.checked && S.market.mission.includes(id) && !S.market.cart.includes(id);
    if (item.dataset.kind === "clinic-tool") return S.clinic.required.includes(id) && !S.clinic.done.has(id);
    return true;
  }
  function rejectDrop(item, zone) {
    const id=item.dataset.drag;
    if (active === "puzzle") {S.puzzle.tries++; recordChoice(false,false); say("puzzle-wrong");}
    else if (S.village.place === "market" && zone?.dataset.zone === "market-cart") {
      say(S.market.cart.includes(id) ? "market-duplicate" : "market-other-"+id, "market-next-"+marketNext());
    } else if (S.village.place === "kitchen") say("kitchen-"+item.dataset.kind);
    else if (S.village.place === "clinic") say("clinic-wrong", "clinic-next-"+clinicNext());
    else say("drag-help");
    tone([320]);
  }
  function bind() {
    abort?.abort();
    abort = new AbortController();
    const sig = abort.signal;
    unbindDrag = window.SeowooPointerDrag.bind(ctx.main, {
      items: ".v2-drag", zones: ".v2-drop", accept: accepts,
      start() {audio.unlock(); audio.button(); N?.invalidate(); suppressClick=Date.now()+500;},
      drop(item, zone) {suppressClick=Date.now()+400; dropAction(item,zone);},
      reject: rejectDrop,
      tap(item) {if(active === "puzzle") {selected=item.dataset.drag; puzzleCase(false); say("puzzle-select");}},
    });
    ctx.main.addEventListener(
      "click",
      (e) => {
        const b = e.target.closest("button");
        if (!b || b.disabled) return;
        const d = b.dataset;
        audio.unlock();
        if (b.classList.contains("v2-drag")) {
          if (Date.now() < suppressClick) return;
          if (active === "puzzle") {
            selected = d.drag;
            puzzleCase(false);
            say("puzzle-select");
          } else say("drag-help");
          return;
        }
        if (b.classList.contains("v2-slot") && selected) {
          const item = ctx.main.querySelector(`[data-drag="${selected}"]`);
          if (validDrop(item, b)) dropAction(item, b);
          else {
            S.puzzle.tries++;
            recordChoice(false, false);
            say("puzzle-wrong");
          }
          return;
        }
        if (d.place) {openPlace(d.place); return;}
        if ("villageHome" in d) {
          resetVoice();
          villageHub();
          return;
        }
        if ("marketCheckout" in d) {
          if (S.market.checked) {
            resetVoice();
            resetMarket();
            market();
            marketIntro();
            return;
          }
          const have = new Set(S.market.cart);
          if (S.market.mission.every((x) => have.has(x))) {
            S.market.checked = true;
            finish("v2Market");
            tone([660, 880, 990]);
            market();
            say("market-done");
          }
          return;
        }
        if ("cook" in d) {
          if (S.kitchen.recipe.need.every((x) => S.kitchen.pot.has(x))) {
            S.kitchen.cooked = true;
            tone([440, 550, 660]);
            kitchen();
            say("kitchen-cook");
          }
          return;
        }
        if ("serve" in d) {
          if (S.kitchen.cooked) {
            S.kitchen.served = true;
            finish("v2Kitchen");
            kitchen();
            say("kitchen-done");
          }
          return;
        }
        if ("kitchenNext" in d) {
          resetVoice();
          resetKitchen();
          kitchen();
          say("kitchen-start-" + S.kitchen.recipe.id);
          return;
        }
        if ("clinicNext" in d) {
          resetVoice();
          resetClinic();
          clinic();
          say(
            "clinic-start-" + S.clinic.patient.id,
            "clinic-next-" + clinicNext(),
          );
          return;
        }
        if ("puzzleNext" in d) {
          resetVoice();
          puzzleCase(true);
          return;
        }
        if (d.mood) {
          S.feelings.mood = d.mood;
          tone([520, 640]);
          feelingsHome();
          say("mood-" + d.mood);
          return;
        }
        if ("feelingStart" in d) {
          resetVoice();
          feelingCase(true);
          say("story-" + S.feelings.case.id);
          return;
        }
        if ("feelingHome" in d) {
          resetVoice();
          feelingsHome();
          say("feelings-start");
          return;
        }
        if ("feelingNext" in d) {
          resetVoice();
          feelingCase(true);
          say("story-" + S.feelings.case.id);
          return;
        }
        if (d.storyMood) {
          if (S.feelings.answered) return;
          const C = S.feelings.case;
          S.feelings.tries++;
          const ok = d.storyMood === C.mood;
          const f = document.getElementById("v2FeelFeedback");
          if (ok) {
            S.feelings.answered = true;
            b.classList.add("correct");
            audio.success();
            say("response-" + C.id);
            if (f)
              f.innerHTML = `<b>그래, ${D.moods.find((x) => x.id === C.mood).label}</b><span>${esc(C.response)}</span><button data-feeling-next>다음 랜덤 상황</button>`;
            S.feelings.completed++;
            finish("v2Feelings");
          } else {
            say("feelings-try");
            if (f)
              f.textContent = "그렇게 느낄 수도 있어. 친구의 표정도 살펴보자.";
            later(() => b.classList.remove("wrong"), 350);
            if (S.feelings.tries >= 2)
              ctx.main
                .querySelector(`[data-story-mood="${C.mood}"]`)
                ?.classList.add("hint");
          }
          return;
        }
        if ("calmStart" in d) {
          resetVoice();
          S.feelings.calm = 0;
          calm(true);
          say("calm-" + S.feelings.calmType);
          return;
        }
        if ("calmTap" in d) {
          if (S.feelings.calm < 3) {
            S.feelings.calm++;
            audio.tone(392, 0.7, "sine", 0.02);
            calm(false);
            if (S.feelings.calm === 3) say("calm-done");
          }
          return;
        }
        if ("calmNext" in d) {
          resetVoice();
          S.feelings.calm = 0;
          calm(true);
          say("calm-" + S.feelings.calmType);
          return;
        }
      },
      { signal: sig },
    );
  }

  function mount(kind, options) {
    unmount();
    ctx = options;
    active = kind;
    bind();
    if (kind === "village") villageHub();
    else if (kind === "puzzle") puzzleCase(true);
    else {
      feelingsHome();
      say("feelings-start");
    }
  }
  function unmount() {
    stopTimers();
    abort?.abort();
    abort = null;
    unbindDrag?.();
    unbindDrag = null;
    N?.reset();
    selected = null;
    suppressClick = 0;
    ctx = null;
    active = null;
  }
  window.SeowooExperiences = { mount, unmount };
  window.SeowooExperiencesV2 = { state: S, data: D };
})();
