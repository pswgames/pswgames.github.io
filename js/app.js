/* One router, shared controls, and lifecycle-owned timers for every activity. */
(() => {
  "use strict";
  const K = window.SeowooCore,
    {
      C,
      state,
      audio,
      setting,
      save,
      recordChoice,
      complete,
      shuffle,
      rand,
      difficultyLevel,
      numberSpeech,
      toast,
      awardSticker,
    } = K;
  const APP_VERSION = window.__SEOWOO_VERSION__ || "7.2.0";
  const main = document.getElementById("main"),
    parent = document.getElementById("parentDialog");
  const paths = {
    home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
    back: "m14 6-6 6 6 6",
    sound: "M11 4 6 8H3v8h3l5 4V4m5 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
    mute: "M11 4 6 8H3v8h3l5 4V4m5 5 6 6m0-6-6 6",
    lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z",
    music: "M9 18V5l12-2v13M9 18c0 4-7 4-7 0s7-4 7 0m12-2c0 4-7 4-7 0s7-4 7 0",
    close: "m6 6 12 12M6 18 18 6",
    chevron: "m9 5 7 7-7 7",
    shuffle: "M3 5h3l12 14h3M3 19h3l4-5m4-4 4-5h3m-3-3 3 3-3 3m0 8 3 3-3 3",
    heart: "M12 20C-7 9 6-4 12 6c6-10 19 3 0 14",
    check: "m5 12 4 4L19 6",
    refresh: "M20 7V2m0 5h-5M20 7a9 9 0 1 0 1 8",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  };
  const icon = (n) =>
    `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[n] || paths.star}"/></svg>`;
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
  const art = (n) =>
    `<span class="toy-art art-${n}" aria-hidden="true"></span>`;
  const featuredArt = (kind) => {
    const svg = {
      village:
        '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M8 66h104v15H8z" fill="#8fd19a"/><path d="M13 58 35 38l22 20v23H13z" fill="#fff3d7"/><path d="M8 59 35 34l27 25" fill="none" stroke="#ef8b78" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><rect x="25" y="60" width="13" height="21" rx="3" fill="#7fc4e7"/><path d="M59 54 82 31l28 23v27H59z" fill="#eef8ff"/><path d="M55 55 82 27l31 28" fill="none" stroke="#73baa9" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><rect x="73" y="60" width="16" height="21" rx="3" fill="#f1b8cb"/><circle cx="99" cy="20" r="8" fill="#ffe277"/></svg>',
      puzzle:
        '<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="17" y="15" width="39" height="34" rx="10" fill="#ffd167"/><circle cx="56" cy="32" r="9" fill="#eaf8ff"/><rect x="62" y="15" width="41" height="34" rx="10" fill="#ef90ae"/><circle cx="62" cy="32" r="9" fill="#f7fbff"/><rect x="17" y="52" width="39" height="29" rx="10" fill="#78c7e7"/><circle cx="56" cy="66" r="9" fill="#f7fbff"/><rect x="62" y="52" width="41" height="29" rx="10" fill="#9a86d8"/><circle cx="62" cy="66" r="9" fill="#f7fbff"/></svg>',
      feelings:
        '<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M60 80C13 54 22 15 46 21c7 2 12 7 14 13 2-6 7-11 14-13 24-6 33 33-14 59z" fill="#ffad9b"/><circle cx="47" cy="46" r="4" fill="#5c5b67"/><circle cx="73" cy="46" r="4" fill="#5c5b67"/><path d="M48 61c8 8 16 8 24 0" fill="none" stroke="#6d5351" stroke-width="4" stroke-linecap="round"/><circle cx="38" cy="57" r="6" fill="#f58d8c" opacity=".55"/><circle cx="82" cy="57" r="6" fill="#f58d8c" opacity=".55"/></svg>',
    };
    return `<span class="featured-art featured-${kind}">${svg[kind]}</span>`;
  };
  const featuredActivities = [
    ["village", "역할놀이 마을", "마트·주방·동물병원", "village"],
    ["puzzle", "퍼즐 탐험대", "끌어서 맞추는 퍼즐", "puzzle"],
    ["feelings", "마음친구", "기분을 고르고 표현해요", "feelings"],
  ];
  let route = "home",
    epoch = 0,
    sequenceEpoch = 0,
    timers = new Set(),
    quiz = null,
    potty = { step: 0, wash: 0, awarded: false },
    memory = null,
    musicTimer = null,
    activeMinutes = 0,
    parentAuthenticated = false,
    gateFailures = 0,
    gateBlockedUntil = 0;
  function later(fn, ms) {
    const e = epoch,
      t = setTimeout(() => {
        timers.delete(t);
        if (e === epoch) fn();
      }, ms);
    timers.add(t);
    return t;
  }
  function stop() {
    epoch++;
    sequenceEpoch++;
    potty.busy = false;
    timers.forEach(clearTimeout);
    timers.clear();
    clearInterval(musicTimer);
    musicTimer = null;
    audio.stopAll();
    window.SeowooElevator.unmount();
    window.SeowooExperiences?.unmount?.();
    quiz = null;
    memory = null;
  }
  const titles = {
    home: "서우놀이터",
    elevator: "투명 엘리베이터",
    potty: "화장실 탐험대",
    language: "말글 놀이터",
    numbers: "숫자 놀이",
    shape: "도형 찾기",
    english: "영어 찾기",
    treasure: "보물상자",
    music: "음악 놀이터",
    more: "더 많은 놀이",
    numberBoard: "숫자 기차",
    quantity: "몇 개 있을까?",
    numberOrder: "숫자 순서",
    finger: "손가락 숫자",
    alphabet: "ABC 카드",
    englishWords: "그림 영단어",
    koreanWords: "그림 한글단어",
    hangul: "가나다 리듬",
    think: "생각 놀이터",
    color: "색깔 찾기",
    memory: "기억하고 톡톡",
    together: "엄마아빠랑 같이",
    village: "역할놀이 마을",
    puzzle: "퍼즐 탐험대",
    feelings: "마음친구",
  };
  function go(name, opts = {}) {
    if (name === "parent") {
      openParent();
      return;
    }
    if (!titles[name]) name = "home";
    stop();
    audio.unlock();
    route = name;
    document.body.dataset.route = name;
    document.title = `${titles[name]} · 서우놀이터`;
    if (!opts.fromHistory) {
      history.pushState(
        { route: name },
        "",
        name === "home" ? "#home" : `#${name}`,
      );
    }
    try {
      sessionStorage.setItem("seowoo-route", name);
    } catch {}
    window.dispatchEvent(
      new CustomEvent("seowoo:route", { detail: { route: name } }),
    );
    render();
    window.scrollTo(0, 0);
    main.querySelector("h1")?.focus({ preventScroll: true });
  }
  function header(title, back = "home", extra = "") {
    return `<header class="play-header"><button class="icon-btn" data-go="${back}" aria-label="${back === "home" ? "홈으로" : "뒤로가기"}">${icon(back === "home" ? "home" : "back")}</button><h1 tabindex="-1">${title}</h1><div class="header-actions">${extra}<button class="icon-btn" data-sound aria-label="${state.settings.voice ? "소리 끄기" : "소리 켜기"}">${icon(state.settings.voice ? "sound" : "mute")}</button></div></header>`;
  }
  function pill(route, label, n) {
    return `<button class="utility" data-go="${route}">${icon(n)}<span>${label}</span></button>`;
  }
  const activities = [
    ["elevator", "투명<br>엘리베이터", "lavender", 0],
    ["potty", "화장실<br>탐험대", "yellow", 1],
    ["numbers", "숫자<br>놀이", "sky", 2],
    ["language", "말글<br>놀이터", "pink", 3],
    ["shape", "도형<br>찾기", "mint", 4],
    ["english", "영어<br>찾기", "sky", 5],
  ];
  function renderHome() {
    main.innerHTML = `<section class="home-world"><img class="home-landscape" src="assets/art/hero.webp" alt="손을 흔드는 서우와 귀여운 강아지가 있는 화사한 놀이터" fetchpriority="high"><div class="home-top"><span class="home-greeting">함께 놀며 자라는 작은 세상</span><div class="home-tools"><button class="icon-btn" data-sound aria-label="${state.settings.voice ? "소리 끄기" : "소리 켜기"}">${icon(state.settings.voice ? "sound" : "mute")}</button><button class="parent-entry" data-parent>${icon("lock")} 보호자 메뉴</button></div></div><div class="brand-block"><h1 class="brand-logo" tabindex="-1" aria-label="서우놀이터">${[..."서우놀이터"].map((x, i) => `<span class="logo-${i}">${x}</span>`).join("")}</h1><p>오늘도 놀면서 쑥쑥 자라요!</p><div class="welcome-note">서우야,<br>${state.settings.greeting === "encourage" ? "오늘도 너를 응원해! <span>♡</span>" : "오늘은 뭐 하고 놀까? <span>☺</span>"}</div></div><div class="home-bottom"><section class="home-featured" aria-label="새 놀이"><div class="home-featured-head"><span>NEW</span><b>새로 생긴 놀이</b></div><div class="home-featured-grid">${featuredActivities.map(([r,t,s,k]) => `<button class="home-featured-card ${k}" data-go="${r}">${featuredArt(k)}<span><b>${t}</b><small>${s}</small></span><i>›</i></button>`).join("")}</div></section><nav class="activity-grid" aria-label="놀이 선택">${activities.map(([r, t, c, n]) => `<button class="activity-card ${c}" data-go="${r}"><span>${t}</span>${art(n)}</button>`).join("")}</nav><footer class="home-footer">${pill("treasure", `나의 보물 ${state.stickers.length}`, "star")}<span class="footer-message">오늘도 서우의 세상이 한 뼘 더!</span><div>${pill("music", "음악", "music")}${pill("more", "더 놀기", "heart")}</div></footer></div></section>`;
  }
  function gameShell(theme, title, content, tabs = "", back = "home") {
    main.innerHTML = `<section class="play-screen theme-${theme}">${header(title, back)}${tabs}<div class="game-body">${content}</div></section>`;
  }
  const tabButton = (id, label, current, attr = "mode") =>
    `<button role="tab" aria-selected="${id === current}" data-${attr}="${id}" class="${id === current ? "active" : ""}">${label}</button>`;
  function render() {
    switch (route) {
      case "home":
        renderHome();
        break;
      case "elevator":
        renderElevator();
        break;
      case "potty":
        renderPotty();
        break;
      case "language":
        startQuiz("hangul");
        break;
      case "english":
        startQuiz("english");
        break;
      case "shape":
        startQuiz("shape");
        break;
      case "color":
        startQuiz("color");
        break;
      case "quantity":
        startQuiz("quantity");
        break;
      case "numberOrder":
        startQuiz("order");
        break;
      case "finger":
        startQuiz("finger");
        break;
      case "numbers":
        renderNumbers();
        break;
      case "numberBoard":
        renderBoard();
        break;
      case "alphabet":
        renderAlphabet();
        break;
      case "englishWords":
        renderWords("en");
        break;
      case "koreanWords":
        renderWords("ko");
        break;
      case "hangul":
        renderRhythm();
        break;
      case "memory":
        startMemory();
        break;
      case "music":
        renderMusic();
        break;
      case "treasure":
        renderTreasure();
        break;
      case "together":
        renderTogether();
        break;
      case "village":
      case "puzzle":
      case "feelings":
        window.SeowooExperiences?.mount?.(route, {
          main,
          header,
          icon,
          go,
        });
        break;
      default:
        renderMore();
    }
  }
  function renderNumbers() {
    gameShell(
      "numbers",
      "숫자 놀이",
      `<div class="activity-intro">${art(2)}<div><span class="eyebrow">하나, 둘, 셋!</span><h2>숫자랑 친구가 돼요</h2></div></div><div class="number-activities">${[
        ["quantity", "몇 개 있을까?", "하나씩 톡톡 세어봐", "1 · 2 · 3", "sky"],
        ["numberOrder", "다음 숫자는?", "차례차례 이어봐", "2 → ?", "yellow"],
        [
          "numberBoard",
          "1부터 100까지",
          "좋아하는 숫자를 눌러봐",
          "1 — 100",
          "mint",
        ],
        ["finger", "손가락 숫자", "손으로도 만들어봐", "✋", "pink"],
      ]
        .map(
          ([r, t, s, p, c]) =>
            `<button class="learning-card ${c}" data-go="${r}"><span class="learning-symbol">${p}</span><h2>${t}</h2><p>${s}</p>${icon("chevron")}</button>`,
        )
        .join("")}</div>`,
    );
  }
  const jamo = {
    consonant: C.consonants.map(([key, say]) => ({ key, say })),
    vowel: [
      ["ㅏ", "아"],
      ["ㅑ", "야"],
      ["ㅓ", "어"],
      ["ㅕ", "여"],
      ["ㅗ", "오"],
      ["ㅛ", "요"],
      ["ㅜ", "우"],
      ["ㅠ", "유"],
      ["ㅡ", "으"],
      ["ㅣ", "이"],
    ].map(([key, say]) => ({ key, say })),
  };
  function config(kind) {
    let pool,
      theme = "ocean",
      title = "말글 놀이터",
      id = kind;
    switch (kind) {
      case "hangul":
        pool = C.hangulRhythm.map((key) => ({ key, say: key }));
        id = "hangulFind";
        break;
      case "consonant":
      case "vowel":
        pool = jamo[kind];
        id = `jamo-${kind}`;
        break;
      case "word":
        pool = C.words.map((w) => ({ key: w.ko, say: w.ko, pic: w.pic }));
        break;
      case "english":
        pool = C.alphabet.map(([key, word, pic]) => ({
          key,
          say: key,
          pic,
          word,
        }));
        theme = "english";
        title = "영어 찾기";
        id = "englishFind";
        break;
      case "shape":
        pool = C.shapes.map(([key, symbol]) => ({ key, say: key, symbol }));
        theme = "shapes";
        title = "도형 찾기";
        break;
      case "color":
        pool = C.colors.map(([key, color]) => ({ key, say: key, color }));
        theme = "shapes";
        title = "색깔 찾기";
        break;
      default:
        pool = Array.from({ length: kind === "finger" ? 10 : 20 }, (_, i) => ({
          key: String(i + 1),
          say: String(i + 1),
        }));
        theme = "numbers";
        title = titles[route] || "숫자 놀이";
        id = kind === "order" ? "numberOrder" : kind;
    }
    return { pool, theme, title, id };
  }
  function startQuiz(kind) {
    const c = config(kind);
    quiz = {
      kind,
      c,
      index: 0,
      total:
        kind === "quantity" || kind === "order" || kind === "finger" ? 6 : 12,
      score: 0,
      tries: 0,
      locked: false,
      deck: shuffle(c.pool),
    };
    drawQuiz();
  }
  function questionVisual(q) {
    const t = q.target;
    if (q.kind === "quantity")
      return `<div class="count-objects">${Array.from({ length: Number(t.key) }, (_, i) => `<button data-count="${i + 1}" aria-label="${i + 1}번째 별">★</button>`).join("")}</div>`;
    if (q.kind === "order")
      return `<div class="number-train"><span>${+t.key - 2}</span><span>${+t.key - 1}</span><span>?</span></div>`;
    if (q.kind === "finger")
      return `<div class="finger-display" aria-label="손가락 ${t.key}개">${hand(Math.min(5, +t.key))}${+t.key > 5 ? hand(+t.key - 5) : ""}</div>`;
    if (q.kind === "word") return `<div class="word-picture">${t.pic}</div>`;
    if (q.kind === "color")
      return `<span class="color-sample" style="--sample:${t.color}"></span>`;
    return `<div class="question-symbol ${q.kind === "shape" ? "shape-symbol" : ""}">${t.symbol || t.key}</div>`;
  }
  function hand(n) {
    return `<svg class="hand-picture" viewBox="0 0 160 190" role="img" aria-label="손가락 ${n}개"><g fill="#ffd8b5" stroke="#dea17d" stroke-width="2"><rect x="39" y="83" width="88" height="85" rx="32"/><rect x="63" y="148" width="44" height="34" rx="13"/>${[35, 58, 81, 104].map((x, i) => `<rect x="${x}" y="${i < Math.min(n, 4) ? [34, 18, 12, 28][i] : 67}" width="20" height="${i < Math.min(n, 4) ? [72, 88, 94, 78][i] : 39}" rx="10"/>`).join("")}<rect x="17" y="${n === 5 ? 79 : 104}" width="22" height="${n === 5 ? 59 : 36}" rx="11" transform="rotate(-35 28 111)"/></g></svg>`;
  }
  function drawQuiz() {
    const q = quiz;
    if (!q) return;
    if (q.index >= q.total) {
      complete(q.c.id, { score: q.score, total: q.total });
      renderResult(q.kind, q.c.theme);
      return;
    }
    q.locked = false;
    q.tries = 0;
    const lv = difficultyLevel(q.c.id);
    let target;
    if (["quantity", "finger"].includes(q.kind)) {
      target = q.c.pool[rand(lv === 1 ? 3 : lv === 2 ? 5 : 10)];
    } else if (q.kind === "order") {
      target = q.c.pool[2 + rand(lv === 1 ? 8 : 18)];
    } else {
      target = q.deck[q.index % q.deck.length];
    }
    q.target = target;
    const pool = ["quantity", "finger"].includes(q.kind)
      ? q.c.pool.slice(0, lv === 1 ? 5 : 10)
      : q.c.pool;
    const count = Math.min(pool.length, lv === 1 ? 3 : 4);
    q.options = shuffle([
      target,
      ...shuffle(pool.filter((x) => x.key !== target.key)).slice(0, count - 1),
    ]);
    const isLanguage = q.c.theme === "ocean";
    const tabs = isLanguage
      ? `<nav class="mode-tabs" role="tablist" aria-label="말글 놀이 종류">${[
          ["hangul", "한글 찾기"],
          ["consonant", "ㄱㄴㄷ 찾기"],
          ["vowel", "모음 찾기"],
          ["word", "단어 찾기"],
        ]
          .map(([i, t]) => tabButton(i, t, q.kind))
          .join("")}</nav>`
      : "";
    const prompt =
      q.kind === "quantity" || q.kind === "finger"
        ? "몇 개일까?"
        : q.kind === "order"
          ? "다음 숫자는?"
          : q.kind === "word"
            ? "이름을 찾아봐!"
            : `<span>${esc(target.key)}</span>${q.kind === "consonant" || (q.kind === "english" && "LMNR".includes(target.key)) || (/^[가-힣]+$/.test(q.target.say) && (q.target.say.charCodeAt(q.target.say.length - 1) - 44032) % 28 > 0) ? "을" : "를"} 찾아봐!`;
    gameShell(
      q.c.theme,
      q.c.title,
      `<div class="round-status"><div class="progress" role="progressbar" aria-label="놀이 진행" aria-valuenow="${q.index}" aria-valuemin="0" aria-valuemax="${q.total}"><i style="width:${(q.index / q.total) * 100}%"></i></div><span class="round-stars">${icon("star")} ${q.score}</span><span>${q.index + 1} / ${q.total}</span></div><div class="question-card"><div class="question-title"><h2>${prompt}</h2><button class="listen-btn" data-listen aria-label="문제 다시 듣기">${icon("sound")}</button></div>${questionVisual(q)}</div><div class="answer-choices ${q.kind === "word" ? "word-choices" : ""}">${q.options.map((x, i) => `<button class="answer ${q.c.theme === "ocean" ? "bubble" : "toy-choice"} choice-${i}" data-answer="${i}" aria-label="${esc(x.key)}"><span>${x.color ? `<i class="color-sample" style="--sample:${x.color}"></i>` : x.symbol || esc(x.key)}</span></button>`).join("")}</div><div class="feedback" id="feedback" role="status">${q.kind === "quantity" ? "별을 하나씩 눌러서 세어봐" : "같은 것을 톡 눌러봐"}</div>`,
      tabs,
      ["quantity", "finger", "order"].includes(q.kind) ? "numbers" : "home",
    );
    speakQuestion();
  }
  function speakQuestion() {
    if (!quiz) return;
    const q = quiz;
    audio.speak(
      q.kind === "english"
        ? q.target.key
        : q.kind === "word"
          ? q.target.say
          : ["quantity", "finger"].includes(q.kind)
            ? "몇 개일까?"
            : q.kind === "order"
              ? "다음 숫자는?"
              : `${q.target.say}, 찾아볼까?`,
      q.kind === "english" ? "en-US" : "ko-KR",
    );
  }
  function answer(i, button) {
    const q = quiz;
    if (!q || q.locked) return;
    q.tries++;
    const ok = q.options[i]?.key === q.target.key;
    recordChoice(ok, ok && q.tries === 1);
    const f = document.getElementById("feedback");
    if (ok) {
      q.locked = true;
      q.score++;
      button.classList.add("correct");
      f.textContent = "잘했어!";
      f.classList.add("success");
      audio.success();
      audio.speak("잘했어!");
      main
        .querySelectorAll("[data-answer]")
        .forEach((b) => (b.disabled = true));
      later(() => {
        q.index++;
        drawQuiz();
      }, 1000);
    } else {
      button.classList.add("try-again");
      f.textContent = "다시 찾아볼까?";
      audio.speak("다시 찾아볼까?");
      later(() => button.classList.remove("try-again"), 300);
      if (q.tries >= 2)
        main
          .querySelectorAll("[data-answer]")
          .forEach((b, n) =>
            b.classList.toggle("hint", q.options[n].key === q.target.key),
          );
    }
  }
  function renderResult(kind, theme) {
    const score = quiz?.score || 0;
    gameShell(
      theme,
      titles[route],
      `<div class="result-card"><div class="result-star">★</div><h2>끝까지 잘했어!</h2><p>반짝별 ${score}개를 모았어</p><div class="controls"><button class="btn primary" data-replay="${kind}">한 번 더</button><button class="btn soft" data-go="home">놀이터로</button></div></div>`,
    );
    audio.speak("잘했어!");
  }
  function renderBoard() {
    gameShell(
      "numbers",
      "1부터 100까지",
      `<div class="number-board-top"><strong id="numHero">1</strong><p id="numSpeech">${numberSpeech(1)}</p></div><div class="number-board">${Array.from({ length: 100 }, (_, i) => `<button data-number="${i + 1}">${i + 1}</button>`).join("")}</div>`,
      "",
      "numbers",
    );
  }
  const pottySteps = [
    ["화장실 가기", "화장실로 가볼까?", "문을 열고 들어가기", "🚪"],
    ["바지 내리기", "천천히 내려봐", "바지 내리기", "👖"],
    ["바르게 앉기", "편안하게 앉아봐", "변기에 앉기", "🚽"],
    ["잠깐 기다리기", "안 나와도 괜찮아", "", "💛"],
    ["휴지 사용하기", "휴지로 깨끗하게", "휴지로 쓱쓱 닦기", "🧻"],
    ["물 내리기", "이제 물을 내려볼까?", "물 내리기", "💧"],
    ["옷 정리하기", "바지를 다시 올려봐", "바지 올리기", "👖"],
    ["손 씻기", "비누로 뽀득뽀득", "손 비비기", "🫧"],
    ["칭찬 스티커", "혼자서도 잘했어!", "다시 탐험하기", "⭐"],
  ];
  function renderPotty(speak = true) {
    const p = potty,
      x = pottySteps[p.step];
    const stages = [0, 2, 4, 5, 7, 8];
    main.innerHTML = `<section class="play-screen theme-potty">${header("화장실 탐험대")}<div class="potty-layout"><div class="potty-scene"><img src="assets/art/bathroom.webp" alt="깨끗한 화장실에서 변기에 앉아 엄지를 든 서우와 노란 오리"><div class="potty-speech">${x[1]}<button class="listen-btn" data-potty-listen aria-label="다시 듣기">${icon("sound")}</button></div>${p.step === 5 ? '<div class="flush-ripple" aria-hidden="true"></div>' : ""}${p.step === 7 ? `<div class="wash-status">${"●".repeat(p.wash)}${"○".repeat(3 - p.wash)}</div>` : ""}</div><div class="potty-play"><div class="potty-heading"><span class="eyebrow">${p.step === 8 ? "탐험 완료!" : `${p.step + 1} / 8`}</span><h2>${x[0]}</h2></div><div class="potty-step-grid">${stages.map((n, i) => `<div class="potty-step ${p.step >= n ? "reached" : ""} ${p.step === n ? "current" : ""} pastel-${i}"><span class="step-number">${p.step > n ? "✓" : i + 1}</span><span class="potty-art step-art-${i}" aria-hidden="true"></span><b>${pottySteps[n][0]}</b></div>`).join("")}</div><div class="potty-controls">${p.step === 3 ? `<div class="potty-options"><button class="btn sky" data-potty="kind">쉬 했어요</button><button class="btn yellow" data-potty="kind">응가 했어요</button><button class="btn soft" data-potty="kind">안 나와도 괜찮아</button></div>` : `<button class="btn primary large" data-potty="${p.step === 8 ? "restart" : p.step === 7 ? "wash" : "next"}" ${p.busy ? "disabled" : ""}>${p.busy ? "빙글빙글…" : x[2]} ${p.step === 7 ? `${p.wash}/3` : icon(p.step === 8 ? "refresh" : "chevron")}</button>`}${p.step === 8 ? '<button class="btn soft" data-potty="real">진짜 화장실 가보기</button>' : ""}</div></div></div></section>`;
    if (speak) audio.speak(x[1]);
  }
  function pottyAction(action) {
    if (potty.busy) return;
    if (action === "restart") {
      potty = { step: 0, wash: 0, awarded: false };
      renderPotty();
      return;
    }
    if (action === "real") {
      gameShell(
        "potty",
        "화장실 탐험대",
        `<div class="result-card"><span class="big-emoji">🚽</span><h2>엄마아빠랑 다녀오자!</h2><p>앉아보기만 해도 충분해.</p><button class="btn primary" data-potty="sat">변기에 앉아봤어요</button><button class="btn soft" data-potty="return">돌아가기</button></div>`,
      );
      audio.speak("엄마아빠랑 화장실에 다녀오자");
      return;
    }
    if (action === "return") {
      renderPotty();
      return;
    }
    if (action === "sat") {
      complete("realPotty");
      awardSticker();
      audio.success();
      audio.speak("잘했어!");
      go("treasure");
      return;
    }
    if (action === "wash") {
      potty.wash++;
      audio.button();
      if (potty.wash < 3) {
        renderPotty(false);
        return;
      }
    }
    if (potty.step === 5) {
      potty.busy = true;
      renderPotty(false);
      audio.flush();
      later(() => {
        potty.busy = false;
        potty.step++;
        renderPotty();
      }, 800);
      return;
    }
    potty.step = Math.min(8, potty.step + 1);
    if (potty.step === 8 && !potty.awarded) {
      potty.awarded = true;
      complete("potty");
      awardSticker();
      audio.success();
    }
    renderPotty();
  }
  function renderElevator() {
    const floors = Array.from({ length: 10 }, (_, row) => [
      19 - row * 2,
      20 - row * 2,
    ]).flat();
    const keys = floors
      .map(
        (n) =>
          '<button type="button" class="floor-key" data-floor="' +
          n +
          '" aria-label="' +
          n +
          '층">' +
          n +
          "</button>",
      )
      .join("");
    main.innerHTML =
      '<section class="play-screen theme-elevator">' +
      header("투명 엘리베이터") +
      '<div class="elevator-layout"><div class="elevator-shell"><div class="glass-cabin">' +
      '<div class="outside-view"></div><div class="cabin-frame"><div class="door door-l"></div><div class="door door-r"></div><div class="cabin-rail"></div></div>' +
      '<div class="elevator-hud"><div class="elevator-display" aria-label="현재 층"><span id="elevatorArrow">•</span><strong id="elevatorFloor">' +
      window.SeowooElevator.current +
      '</strong><span>층</span></div><p id="elevatorMsg" role="status">어디로 갈까?</p></div>' +
      '<div class="elevator-console" role="group" aria-label="엘리베이터 조작 패널"><div class="floor-panel"><div class="floor-main" role="group" aria-label="층 선택, 위에서 19·20층부터 아래 1·2층까지">' +
      keys +
      "</div></div></div>" +
      '<button class="elevator-scene-button" data-city-random aria-label="도시 랜덤 선택">' +
      icon("shuffle") +
      "<span>다른 풍경</span></button>" +
      "</div></div></div></section>";
    window.SeowooElevator.mount(main.querySelector(".elevator-shell"));
  }

  function selectCity(id) {
    window.SeowooPanorama.choose(id);
    main.querySelectorAll("[data-city]").forEach((b) => {
      b.classList.toggle("active", b.dataset.city === id);
      b.setAttribute("aria-pressed", String(b.dataset.city === id));
    });
    audio.button();
  }
  function renderMore() {
    gameShell(
      "plain",
      route === "think" ? "생각 놀이터" : "더 많은 놀이",
      `<div class="more-intro"><span class="eyebrow">새로 생긴 놀이</span><h2>서우가 직접 만지고 움직이는 놀이</h2><p>정답보다 탐색과 표현을 먼저 생각했어.</p></div><div class="more-grid premium-first">${[
        ["village", "역할놀이 마을", "🏘️"],
        ["puzzle", "퍼즐 탐험대", "🧩"],
        ["feelings", "마음친구", "💛"],
        ["memory", "기억하고 톡톡", "🧠"],
        ["color", "색깔 찾기", "🌈"],
        ["alphabet", "ABC 카드", "ABC"],
        ["englishWords", "그림 영단어", "🐶"],
        ["koreanWords", "그림 한글단어", "가"],
        ["hangul", "가나다 리듬", "🎶"],
        ["together", "엄마아빠랑 같이", "💛"],
        ["treasure", "보물상자", "⭐"],
      ]
        .map(
          ([r, t, p], i) =>
            `<button class="learning-card pastel-${i % 6}" data-go="${r}"><span class="learning-symbol">${p}</span><h2>${t}</h2></button>`,
        )
        .join("")}</div>`,
    );
  }
  function renderAlphabet() {
    gameShell(
      "english",
      "ABC 카드",
      `<div class="alphabet-grid">${C.alphabet.map(([c, w, p]) => `<button class="alphabet-card" data-alpha="${c}"><b>${c}</b><span>${p}</span><small>${w}</small></button>`).join("")}</div><button class="btn primary" data-abc-play>ABC 들어보기</button>`,
      "",
      "more",
    );
  }
  function renderWords(lang, cat = "전체") {
    const cats = ["전체", ...new Set(C.words.map((w) => w.cat))];
    gameShell(
      lang === "en" ? "english" : "plain",
      lang === "en" ? "그림 영단어" : "그림 한글단어",
      `<nav class="category-tabs" aria-label="그림 단어 종류">${cats.map((c) => `<button class="${c === cat ? "active" : ""}" data-word-cat="${esc(c)}" data-lang="${lang}">${c}</button>`).join("")}</nav><div class="word-grid">${C.words
        .filter((w) => cat === "전체" || w.cat === cat)
        .map(
          (w) =>
            `<button class="word-card" data-word="${C.words.indexOf(w)}" data-lang="${lang}"><span>${w.pic}</span><b>${lang === "en" ? w.en : w.ko}</b></button>`,
        )
        .join("")}</div>`,
      "",
      "more",
    );
  }
  function renderRhythm() {
    gameShell(
      "ocean",
      "가나다 리듬",
      `<div class="rhythm-stage"><h2>듣고, 같이 말해봐!</h2><div class="rhythm-grid">${C.hangulRhythm.map((x) => `<button data-syllable="${x}">${x}</button>`).join("")}</div><button class="btn primary" data-rhythm-play>가나다 들어보기</button></div>`,
      "",
      "more",
    );
  }
  async function playSequence(items, selector, lang) {
    const e = epoch,
      seq = ++sequenceEpoch;
    audio.stopVoice();
    for (
      let i = 0;
      i < items.length && e === epoch && seq === sequenceEpoch;
      i++
    ) {
      main
        .querySelectorAll(selector)
        .forEach((b, n) => b.classList.toggle("active", n === i));
      await audio.speak(items[i], lang);
      await new Promise((r) => setTimeout(r, 200));
    }
    if (e === epoch && seq === sequenceEpoch)
      main
        .querySelectorAll(selector)
        .forEach((b) => b.classList.remove("active"));
  }
  function startMemory() {
    memory = { index: 0, score: 0, pos: 0, locked: true };
    drawMemory();
  }
  function drawMemory() {
    const m = memory;
    if (m.index >= 6) {
      complete("memory", { score: m.score });
      gameShell(
        "shapes",
        "기억하고 톡톡",
        `<div class="result-card"><div class="result-star">★</div><h2>잘 기억했어!</h2><button class="btn primary" data-go="memory">한 번 더</button></div>`,
      );
      return;
    }
    m.sequence = Array.from({ length: difficultyLevel("memory") }, () =>
      rand(4),
    );
    m.pos = 0;
    m.tries = 0;
    m.locked = true;
    gameShell(
      "shapes",
      "기억하고 톡톡",
      `<div class="memory-prompt"><h2>잘 보고 기억해봐!</h2><div id="memoryStage" class="memory-stage">☺</div></div><div class="answer-choices">${["🍎", "🚗", "🐶", "⭐"].map((s, i) => `<button class="answer toy-choice choice-${i}" data-memory="${i}" disabled>${s}</button>`).join("")}</div><div id="feedback" class="feedback" role="status">어떤 순서일까?</div>`,
      "",
      "more",
    );
    let i = 0;
    const display = () => {
      if (!memory) return;
      const el = document.getElementById("memoryStage");
      if (i < m.sequence.length) {
        el.textContent = ["🍎", "🚗", "🐶", "⭐"][m.sequence[i++]];
        later(() => {
          el.textContent = "";
          later(display, 220);
        }, 800);
      } else {
        el.textContent = "?";
        m.locked = false;
        main
          .querySelectorAll("[data-memory]")
          .forEach((b) => (b.disabled = false));
        audio.speak("같은 순서로 눌러봐");
      }
    };
    later(display, 300);
  }
  function answerMemory(i) {
    const m = memory;
    if (!m || m.locked) return;
    m.tries++;
    const ok = m.sequence[m.pos] === i;
    recordChoice(ok, ok && m.tries === m.pos + 1);
    if (ok) {
      m.pos++;
      audio.button();
      if (m.pos === m.sequence.length) {
        m.locked = true;
        m.score++;
        m.index++;
        document.getElementById("feedback").textContent = "잘했어!";
        audio.speak("잘했어!");
        later(drawMemory, 1000);
      }
    } else {
      m.pos = 0;
      document.getElementById("feedback").textContent = "처음부터 다시 해볼까?";
      audio.speak("다시 해볼까?");
    }
  }
  function renderTreasure() {
    gameShell(
      "plain",
      "보물상자",
      `<div class="treasure-heading"><span class="result-star small">★</span><h2>차곡차곡 모은 작은 기쁨</h2><p>서우의 스티커 ${state.stickers.length}개</p></div><div class="sticker-grid">${C.stickers.map(([id, name, pic]) => `<div class="sticker ${state.stickers.includes(id) ? "" : "locked"}"><span>${state.stickers.includes(id) ? pic : "?"}</span><p>${state.stickers.includes(id) ? name : "아직 비밀"}</p></div>`).join("")}</div>`,
    );
  }
  function renderTogether() {
    const m = C.missions[rand(C.missions.length)];
    gameShell(
      "plain",
      "엄마아빠랑 같이",
      `<div class="result-card"><span class="big-emoji">${m.pic}</span><h2>${m.text}</h2><div class="controls"><button class="btn primary" data-mission-done>같이 했어요</button><button class="btn soft" data-go="together">다른 놀이</button></div></div>`,
      "",
      "more",
    );
    audio.speak(m.say);
  }
  function renderMusic() {
    gameShell(
      "music",
      "음악 놀이터",
      `<div class="music-intro"><span class="big-emoji">🎵</span><h2>오늘은 어떤 멜로디?</h2><p id="musicStatus" role="status">좋아하는 노래를 골라봐</p></div><div class="music-grid">${C.music.map((s, i) => `<button class="music-card pastel-${i}" data-music="${i}" aria-pressed="false"><span>${s.cover}</span><h2>${s.title}</h2><small>${s.file ? "노래 듣기" : "놀이 멜로디"}</small></button>`).join("")}</div><div class="controls"><button class="btn soft" data-music-stop>음악 멈추기</button><button class="btn soft" data-music-repeat aria-pressed="${state.music.repeat}">반복 ${state.music.repeat ? "켜짐" : "꺼짐"}</button></div>`,
    );
  }
  function playMusic(i) {
    clearInterval(musicTimer);
    audio.stopAll();
    const item = C.music[i];
    if (!state.settings.sound) {
      toast("보호자 메뉴에서 효과음을 켜 주세요");
      return;
    }
    main
      .querySelectorAll("[data-music]")
      .forEach((b, n) => b.setAttribute("aria-pressed", String(i === n)));
    document.getElementById("musicStatus").textContent =
      `${item.title} 듣는 중`;
    if (item.file) {
      audio.playMusic(item.file);
      return;
    }
    const melodies = [
      [523, 587, 659, 523, 659, 587, 523, 392],
      [392, 523, 523, 659, 587, 523, 440, 392],
      [330, 392, 440, 392, 330, 294, 262, 0],
      [523, 659, 784, 659, 587, 698, 880, 698],
    ];
    let n = 0;
    const tick = () => {
      const f = melodies[i][n++ % 8];
      if (f) audio.tone(f, 0.45, "sine", 0.09);
      if (n >= 24 && !state.music.repeat) {
        clearInterval(musicTimer);
        document.getElementById("musicStatus").textContent = "또 들어볼까?";
        main
          .querySelectorAll("[data-music]")
          .forEach((b) => b.setAttribute("aria-pressed", "false"));
      }
    };
    tick();
    musicTimer = setInterval(tick, i === 2 ? 650 : 420);
  }
  function stopMusic() {
    clearInterval(musicTimer);
    audio.stopAll();
    main
      .querySelectorAll("[data-music]")
      .forEach((b) => b.setAttribute("aria-pressed", "false"));
    document.getElementById("musicStatus").textContent = "잠깐 쉬어가요";
  }
  function dialogHeader(title) {
    return `<div class="dialog-head"><h2>${title}</h2><button class="icon-btn" data-parent-close aria-label="보호자 메뉴 닫기">${icon("close")}</button></div>`;
  }
  function openParent() {
    audio.stopAll();
    parentAuthenticated = false;
    const has = window.SeowooScreenLock.hasPassword();
    parent.innerHTML = `${dialogHeader("보호자 메뉴")}<div class="parent-gate"><span class="gate-icon">${icon("lock")}</span><h3>${has ? "보호자 확인" : "보호자 비밀번호 설정"}</h3><p>${has ? "비밀번호를 한 번 입력해 주세요." : "사용할 숫자 4–8자리를 한 번 입력해 주세요."}</p><form id="parentGate" novalidate><input id="parentPin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="비밀번호" aria-label="보호자 비밀번호"><p id="gateError" class="form-error" role="alert"></p><button class="btn primary large" type="submit">${has ? "들어가기" : "설정하고 들어가기"}</button></form></div>`;
    if (!parent.open) parent.showModal();
    document.getElementById("parentGate").onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById("parentPin"),
        error = document.getElementById("gateError"),
        pin = input.value;
      if (Date.now() < gateBlockedUntil) {
        error.textContent = "잠시 후 다시 입력해 주세요.";
        return;
      }
      if (!/^\d{4,8}$/.test(pin)) {
        error.textContent = "숫자 4–8자리를 입력해 주세요.";
        return;
      }
      const submit = e.target.querySelector("button");
      submit.disabled = true;
      try {
        if (has && !(await window.SeowooScreenLock.verifyPin(pin))) {
          gateFailures++;
          if (gateFailures >= 5) {
            gateBlockedUntil = Date.now() + 30000;
            gateFailures = 0;
          }
          error.textContent = "비밀번호가 맞지 않아요.";
          input.value = "";
          submit.disabled = false;
          return;
        }
        if (!has) await window.SeowooScreenLock.saveCredential(pin);
        gateFailures = 0;
        parentAuthenticated = true;
        renderParent();
      } catch {
        error.textContent = "비밀번호를 저장하지 못했어요. 다시 시도해 주세요.";
        submit.disabled = false;
      }
    };
  }
  const switchControl = (key, label, value) =>
    `<button class="switch ${value ? "on" : ""}" role="switch" aria-label="${label}" aria-checked="${!!value}" data-setting="${key}"><i></i></button>`;
  function renderParent() {
    if (!parentAuthenticated) return;
    parent.innerHTML = `${dialogHeader("보호자 메뉴")}<div class="parent-content"><div class="parent-summary"><span>${icon("heart")}</span><div><h3>서우가 자라는 시간</h3><p>완료한 놀이 ${state.stats.rounds}회 · 스티커 ${state.stickers.length}개</p></div></div><div class="settings-group"><div class="setting-row"><span>${icon("lock")} 화면잠금</span>${switchControl("lock", "화면잠금", window.SeowooScreenLock.locked)}</div><button class="setting-row" data-change-pin><span>${icon("lock")} 비밀번호 변경</span>${icon("chevron")}</button><label class="setting-row"><span>${icon("clock")} 이용시간 설정</span><select data-pref="breakMinutes" aria-label="이용시간 설정">${[10, 15, 20, 30].map((n) => `<option value="${n}" ${state.settings.breakMinutes === n ? "selected" : ""}>${n}분</option>`).join("")}</select></label><div class="setting-row"><span>${icon("sound")} 음성 안내</span>${switchControl("voice", "음성 안내", state.settings.voice)}</div><div class="setting-row"><span>${icon("music")} 효과음</span>${switchControl("sound", "효과음", state.settings.sound)}</div><label class="setting-row"><span>목소리 크기</span><input type="range" min="0" max="1" step=".05" value="${audio.voiceVolume}" data-volume="voice" aria-label="목소리 크기"></label><label class="setting-row"><span>효과음 크기</span><input type="range" min="0" max="1" step=".05" value="${audio.sfxVolume}" data-volume="sfx" aria-label="효과음 크기"></label><button class="setting-row" data-audio-test><span>${icon("sound")} 음성·효과음 테스트</span>${icon("chevron")}</button></div><div class="settings-group"><label class="setting-row"><span>놀이 난이도</span><select data-pref="difficulty" aria-label="놀이 난이도">${[
      ["auto", "자동"],
      ["1", "1단계"],
      ["2", "2단계"],
      ["3", "3단계"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${String(state.settings.difficulty) === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select></label><label class="setting-row"><span>숫자 읽기</span><select data-pref="countMode" aria-label="숫자 읽기">${[
      ["both", "둘 다"],
      ["native", "하나·둘"],
      ["sino", "일·이"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${state.settings.countMode === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select></label><label class="setting-row"><span>캐릭터 인사</span><select data-pref="greeting" aria-label="캐릭터 인사">${[
      ["hello", "반갑게 인사"],
      ["encourage", "다정한 응원"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${(state.settings.greeting || "hello") === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select></label><button class="setting-row" data-records><span>놀이 기록</span>${icon("chevron")}</button><button class="setting-row" data-app-info><span>앱 정보 <small>${APP_VERSION}</small></span>${icon("chevron")}</button><button class="setting-row" data-refresh><span>${icon("refresh")} 업데이트 확인</span>${icon("chevron")}</button></div><p class="parent-note">이용시간은 쉬기 알림으로 안내해요. 놀이 기록은 이 기기에 저장됩니다.</p></div>`;
  }
  function changePin() {
    if (!parentAuthenticated) return;
    parent.innerHTML = `${dialogHeader("비밀번호 변경")}<form id="changePinForm" class="parent-gate"><p>새 비밀번호만 한 번 입력해 주세요.</p><input type="password" id="newPin" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="숫자 4–8자리" aria-label="새 비밀번호"><p id="pinError" class="form-error" role="alert"></p><button class="btn primary large" type="submit">변경하기</button><button class="btn soft" type="button" data-parent-back>취소</button></form>`;
    document.getElementById("changePinForm").onsubmit = async (e) => {
      e.preventDefault();
      const pin = document.getElementById("newPin").value;
      if (!/^\d{4,8}$/.test(pin)) {
        document.getElementById("pinError").textContent =
          "숫자 4–8자리를 입력해 주세요.";
        return;
      }
      try {
        await window.SeowooScreenLock.saveCredential(pin);
        renderParent();
        toast("비밀번호를 변경했어요");
      } catch {
        document.getElementById("pinError").textContent =
          "저장하지 못했어요. 다시 시도해 주세요.";
      }
    };
  }
  function records() {
    const pct = state.stats.totalChoices
      ? Math.round((state.stats.correct / state.stats.totalChoices) * 100)
      : 0;
    parent.innerHTML = `${dialogHeader("놀이 기록")}<div class="parent-content app-info"><div class="record-grid"><div><strong>${state.stats.rounds}</strong><span>완료한 놀이</span></div><div><strong>${state.stickers.length}</strong><span>모은 스티커</span></div><div><strong>${state.stats.firstTry}</strong><span>첫 시도 성공</span></div><div><strong>${pct}%</strong><span>정답 비율</span></div></div><p>이 기기에서의 놀이 기록이에요. 발달 수준이나 또래 비교를 의미하지 않아요.</p><button class="btn soft" data-reset-ask>놀이 기록과 설정 초기화</button><button class="btn primary" data-parent-back>돌아가기</button></div>`;
  }
  function resetPrompt() {
    parent.innerHTML = `${dialogHeader("기록 초기화")}<div class="parent-content app-info"><h3>처음부터 시작할까요?</h3><p>이 기기의 놀이 기록, 스티커와 놀이 설정을 지워요. 이 작업은 되돌릴 수 없어요. 보호자 비밀번호는 유지됩니다.</p><button class="btn soft" data-records>취소</button><button class="btn primary" data-reset-confirm>기록과 설정 지우기</button></div>`;
  }
  function info() {
    parent.innerHTML = `${dialogHeader("앱 정보")}<div class="parent-content app-info"><h3>서우놀이터 ${APP_VERSION}</h3><p>놀면서 자라는 서우의 작은 세상.</p><p>사진과 그림은 앱에 함께 저장됩니다. 마이크·카메라·계정 가입 없이 놀 수 있어요.</p><p>한국어 안내 음성은 Gemini Sulafat 로컬 음원만 사용합니다. 기기의 한국어 TTS로 대체하지 않습니다. 영어는 저장된 로컬 음원을 우선 사용합니다.</p><p>웹 화면잠금은 앱 안의 이동을 제한합니다. 기기 전체 잠금은 iPhone 사용법 유도 또는 Android 전용 모드가 필요합니다.</p><button class="btn primary" data-parent-back>돌아가기</button></div>`;
  }
  function closeParent() {
    parent.close();
    parentAuthenticated = false;
    if (route === "home") renderHome();
    main.querySelector("[data-parent]")?.focus();
  }
  main.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const d = b.dataset;
    if (d.go) {
      go(d.go);
      return;
    }
    if ("parent" in d) {
      openParent();
      return;
    }
    if ("sound" in d) {
      setting("voice", !state.settings.voice);
      audio.stopVoice();
      main.querySelectorAll("[data-sound]").forEach((x) => {
        x.innerHTML = icon(state.settings.voice ? "sound" : "mute");
        x.setAttribute(
          "aria-label",
          state.settings.voice ? "소리 끄기" : "소리 켜기",
        );
      });
      return;
    }
    if (d.mode) {
      audio.stopVoice();
      timers.forEach(clearTimeout);
      timers.clear();
      startQuiz(d.mode);
      return;
    }
    if ("answer" in d) {
      answer(+d.answer, b);
      return;
    }
    if ("listen" in d) {
      speakQuestion();
      return;
    }
    if (d.replay) {
      startQuiz(d.replay);
      return;
    }
    if (d.count) {
      b.classList.add("counted");
      audio.speak(numberSpeech(+d.count));
      return;
    }
    if (d.number) {
      document.getElementById("numHero").textContent = d.number;
      document.getElementById("numSpeech").textContent = numberSpeech(
        +d.number,
      );
      audio.speak(numberSpeech(+d.number));
      main
        .querySelectorAll("[data-number]")
        .forEach((x) => x.classList.toggle("active", x === b));
      return;
    }
    if (d.potty) {
      pottyAction(d.potty);
      return;
    }
    if ("pottyListen" in d) {
      audio.speak(pottySteps[potty.step][1]);
      return;
    }
    if (d.city) {
      selectCity(d.city);
      return;
    }
    if ("cityRandom" in d) {
      selectCity(window.SeowooPanorama.random());
      return;
    }
    if (d.alpha) {
      const x = C.alphabet.find((a) => a[0] === d.alpha);
      audio.speak(`${x[0]}, ${x[1]}`, "en-US");
      return;
    }
    if ("abcPlay" in d) {
      playSequence(
        C.alphabet.map((a) => a[0]),
        "[data-alpha]",
        "en-US",
      );
      return;
    }
    if (d.wordCat) {
      renderWords(d.lang, d.wordCat);
      return;
    }
    if ("word" in d) {
      const w = C.words[+d.word];
      audio.speak(
        d.lang === "en" ? w.en : w.ko,
        d.lang === "en" ? "en-US" : "ko-KR",
      );
      return;
    }
    if (d.syllable) {
      audio.speak(d.syllable);
      return;
    }
    if ("rhythmPlay" in d) {
      playSequence(C.hangulRhythm, "[data-syllable]", "ko-KR");
      return;
    }
    if ("memory" in d) {
      answerMemory(+d.memory);
      return;
    }
    if ("music" in d) {
      playMusic(+d.music);
      return;
    }
    if ("musicStop" in d) {
      stopMusic();
      return;
    }
    if ("musicRepeat" in d) {
      state.music.repeat = !state.music.repeat;
      save();
      b.setAttribute("aria-pressed", String(state.music.repeat));
      b.textContent = "반복 " + (state.music.repeat ? "켜짐" : "꺼짐");
      return;
    }
    if ("missionDone" in d) {
      complete("together");
      audio.speak("잘했어!");
      toast("함께한 시간을 기억할게!");
      go("treasure");
    }
  });
  parent.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const d = b.dataset;
    if ("parentClose" in d) {
      closeParent();
      return;
    }
    if (!parentAuthenticated) return;
    if ("parentBack" in d) renderParent();
    if ("changePin" in d) changePin();
    if ("appInfo" in d) info();
    if ("records" in d) records();
    if ("resetAsk" in d) resetPrompt();
    if ("resetConfirm" in d) {
      K.reset();
      return;
    }
    if ("audioTest" in d) {
      b.disabled = true;
      audio
        .playVoice("closing")
        .then(() => {
          audio.ding();
          return new Promise((resolve) => setTimeout(resolve, 500));
        })
        .then(() => audio.playVoice("opening"))
        .finally(() => {
          b.disabled = false;
        });
      return;
    }
    if (d.setting) {
      if (d.setting === "lock")
        window.SeowooScreenLock.setFromParent(!window.SeowooScreenLock.locked);
      else {
        setting(d.setting, !state.settings[d.setting]);
        audio.stopAll();
      }
      renderParent();
    }
    if ("refresh" in d) {
      const timeout = (ms) =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("update-timeout")), ms),
        );
      const applyWaitingWorker = (worker) => {
        if (!worker) return false;
        const activate = () => {
          if (worker.state === "installed") {
            worker.postMessage({ type: "SKIP_WAITING" });
            return true;
          }
          return false;
        };
        if (activate()) return true;
        worker.addEventListener("statechange", activate);
        return true;
      };
      b.disabled = true;
      b.innerHTML = `<span>${icon("refresh")} 업데이트 확인 중…</span>`;
      (async () => {
        try {
          if (!("serviceWorker" in navigator)) {
            renderParent();
            toast(`현재 최신 버전 ${APP_VERSION}이에요`);
            return;
          }
          const registration = await Promise.race([
            navigator.serviceWorker.getRegistration(),
            timeout(4000),
          ]);
          if (!registration) {
            renderParent();
            toast("업데이트 기능을 다시 준비해 주세요");
            return;
          }

          await Promise.race([registration.update(), timeout(8000)]);
          const worker = registration.waiting || registration.installing;
          if (applyWaitingWorker(worker)) {
            toast("새 버전을 적용하고 있어요");
            setTimeout(() => location.reload(), 2200);
            return;
          }

          renderParent();
          toast(`현재 최신 버전 ${APP_VERSION}이에요`);
        } catch {
          renderParent();
          toast("업데이트 확인이 지연됐어요. 앱을 다시 열면 자동으로 확인해요");
        }
      })();
      return;
    }
  });
  parent.addEventListener("change", (e) => {
    if (!parentAuthenticated) return;
    const el = e.target;
    if (el.dataset.pref) {
      setting(
        el.dataset.pref,
        el.dataset.pref === "breakMinutes" ? +el.value : el.value,
      );
      if (el.dataset.pref === "breakMinutes") activeMinutes = 0;
    }
  });
  parent.addEventListener("input", (e) => {
    if (!parentAuthenticated) return;
    const el = e.target;
    if (el.dataset.volume) {
      audio[el.dataset.volume === "voice" ? "setVoiceVolume" : "setSfxVolume"](
        +el.value,
      );
      save();
    }
  });
  parent.addEventListener("cancel", () => {
    parentAuthenticated = false;
  });
  parent.addEventListener("close", () => {
    parentAuthenticated = false;
  });
  window.addEventListener("popstate", () => {
    if (window.SeowooScreenLock.locked) return;
    go(location.hash.slice(1) || "home", { fromHistory: true });
  });
  window.addEventListener("pagehide", () => {
    audio.stopAll();
    clearInterval(musicTimer);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      audio.stopAll();
      clearInterval(musicTimer);
    }
  });
  document.addEventListener("pointerdown", () => audio.unlock(), {
    once: true,
  });
  let lastActive = Date.now();
  setInterval(() => {
    const now = Date.now();
    if (
      !document.hidden &&
      !parent.open &&
      !document.getElementById("breakDialog").open
    )
      activeMinutes += Math.min(10000, now - lastActive);
    lastActive = now;
    if (
      activeMinutes > Number(state.settings.breakMinutes || 15) * 60000 &&
      !document.hidden
    ) {
      audio.stopAll();
      document.getElementById("breakDialog").showModal();
      activeMinutes = 0;
    }
  }, 10000);
  document.getElementById("breakDone").onclick = () => {
    document.getElementById("breakDialog").close();
    activeMinutes = 0;
  };
  window.SeowooApp = { go };
  state.stats.sessionStarts++;
  save();
  history.replaceState({ route: location.hash.slice(1) || "home" }, "");
  go(location.hash.slice(1) || "home", { fromHistory: true });
})();
