(() => {
"use strict";
const K = window.SeowooCore;
if (!K) return;
const { audio, complete, recordChoice, confetti } = K;
let ctx = null;
let activeKind = null;
let abort = null;
let timers = new Set();
let drag = null;
const state = {
village: { place: null, market: new Set(), kitchen: new Set(), clinic: new Set(), cooked: false },
puzzle: { mode: null, placed: new Set(), tries: 0, completed: new Set() },
feelings: { mood: "happy", story: 0, tries: 0, calm: 0 },
};
const moods = {
happy: { label: "기뻐요", mark: "해처럼 반짝반짝", tone: [523, 659, 784] },
sad: { label: "속상해요", mark: "마음에 비가 조금 와요", tone: [392, 349, 330] },
angry: { label: "화나요", mark: "마음이 뜨거워졌어요", tone: [440, 392, 349] },
scared: { label: "무서워요", mark: "가슴이 콩콩 뛰어요", tone: [494, 440, 392] },
};
const stories = [
{ mood: "sad", title: "블록 탑이 와르르", text: "친구가 열심히 만든 블록 탑이 무너졌어.", art: "blocks" },
{ mood: "scared", title: "우르릉 쾅!", text: "창밖에서 큰 천둥소리가 났어.", art: "storm" },
{ mood: "happy", title: "비눗방울 둥실둥실", text: "커다란 비눗방울이 하늘로 날아가.", art: "bubbles" },
{ mood: "angry", title: "내 장난감인데…", text: "친구가 말없이 자동차를 가져갔어.", art: "toy" },
];
const puzzleModes = {
shadows: { label: "그림자 맞추기", sub: "모양을 보고 쏙!", icon: "◐" },
colors: { label: "색깔 정리", sub: "같은 색끼리 모아봐", icon: "●" },
picture: { label: "그림 조각", sub: "네 조각을 완성해봐", icon: "▦" },
};
function later(fn, ms) {
const t = setTimeout(() => {
timers.delete(t);
if (ctx) fn();
}, ms);
timers.add(t);
return t;
}
function stopTimers() {
timers.forEach(clearTimeout);
timers.clear();
}
function toneSequence(notes) {
notes.forEach((f, i) => audio.tone(f, 0.18, "sine", 0.04, i * 0.12));
}
function sparkle(el) {
if (!el) return;
el.classList.remove("xp-spark");
void el.offsetWidth;
el.classList.add("xp-spark");
later(() => el.classList.remove("xp-spark"), 700);
}
function safeComplete(id) {
complete(id);
audio.success();
confetti?.();
}
function shell(title, body, className, back = "more") {
ctx.main.innerHTML = `<section class="play-screen xp-screen ${className}">${ctx.header(title, back)}<div class="xp-body">${body}</div></section>`;
}
function buddyFace(mood = "happy", size = "large") {
return `<div class="mood-buddy mood-${mood} ${size}" aria-hidden="true"><div class="buddy-ear left"></div><div class="buddy-ear right"></div><div class="buddy-body"><i class="buddy-eye left"></i><i class="buddy-eye right"></i><i class="buddy-brow left"></i><i class="buddy-brow right"></i><i class="buddy-mouth"></i><i class="buddy-cheek left"></i><i class="buddy-cheek right"></i></div><i class="buddy-arm left"></i><i class="buddy-arm right"></i><i class="buddy-foot left"></i><i class="buddy-foot right"></i></div>`;
}
function villageMapSvg() {
return `<svg class="village-map-art" viewBox="0 0 1200 680" aria-hidden="true">
<defs>
<linearGradient id="skyV" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bdefff"/><stop offset="1" stop-color="#effcff"/></linearGradient>
<linearGradient id="grassV" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bdeebf"/><stop offset="1" stop-color="#82d48f"/></linearGradient>
<filter id="softV"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#315a7330"/></filter>
</defs>
<rect width="1200" height="680" fill="url(#skyV)"/>
<circle cx="1050" cy="105" r="58" fill="#ffe88a" opacity=".95"/>
<g fill="#fff" opacity=".88"><ellipse cx="150" cy="120" rx="88" ry="32"/><ellipse cx="210" cy="112" rx="56" ry="26"/><ellipse cx="760" cy="92" rx="82" ry="30"/><ellipse cx="822" cy="101" rx="52" ry="23"/></g>
<path d="M0 360 Q160 295 320 350 T640 345 T960 335 T1200 350 V680 H0Z" fill="url(#grassV)"/>
<path d="M455 680 C490 560 525 490 600 420 C675 490 710 560 745 680Z" fill="#f7d9a8"/>
<path d="M0 570 Q170 520 330 555 T660 545 T990 555 T1200 535 V680 H0Z" fill="#75c783" opacity=".5"/>
<g filter="url(#softV)">
<g transform="translate(95 280)"><rect x="0" y="92" width="270" height="190" rx="26" fill="#fff7dd"/><path d="M-18 108 L135 5 288 108Z" fill="#ff8d7a"/><rect x="34" y="150" width="62" height="132" rx="12" fill="#89c9eb"/><rect x="132" y="142" width="100" height="72" rx="14" fill="#caebff"/><path d="M146 176h72" stroke="#fff" stroke-width="10"/><rect x="72" y="55" width="126" height="46" rx="18" fill="#fff"/><text x="135" y="86" text-anchor="middle" font-size="29" fill="#d35d55" font-family="sans-serif">MARKET</text></g>
<g transform="translate(462 220)"><rect x="0" y="114" width="280" height="230" rx="30" fill="#fff1f3"/><path d="M-18 132 L140 12 298 132Z" fill="#f7bb65"/><rect x="45" y="193" width="72" height="151" rx="14" fill="#9ad4b3"/><rect x="152" y="184" width="86" height="76" rx="18" fill="#ffe7ad"/><circle cx="204" cy="126" r="42" fill="#fff"/><path d="M184 126h40M204 106v40" stroke="#f48c86" stroke-width="8" stroke-linecap="round"/><text x="140" y="175" text-anchor="middle" font-size="27" fill="#b56842" font-family="sans-serif">KITCHEN</text></g>
<g transform="translate(825 292)"><rect x="0" y="88" width="270" height="190" rx="28" fill="#eef9ff"/><path d="M-18 105 L135 14 288 105Z" fill="#86d1c2"/><rect x="38" y="147" width="68" height="131" rx="13" fill="#f7c3d4"/><rect x="139" y="142" width="96" height="66" rx="16" fill="#caedff"/><circle cx="135" cy="89" r="38" fill="#fff"/><path d="M116 90h38M135 71v38" stroke="#70b8ac" stroke-width="8" stroke-linecap="round"/><text x="136" y="238" text-anchor="middle" font-size="26" fill="#3b7a74" font-family="sans-serif">PET CARE</text></g>
</g>
<g fill="#4fa85f"><circle cx="55" cy="480" r="42"/><circle cx="1135" cy="470" r="48"/><circle cx="390" cy="350" r="28"/><circle cx="790" cy="355" r="30"/></g>
<g fill="#fff6a3"><circle cx="90" cy="575" r="7"/><circle cx="145" cy="532" r="7"/><circle cx="1050" cy="555" r="7"/><circle cx="1112" cy="594" r="7"/><circle cx="805" cy="505" r="7"/></g>
</svg>`;
}
function renderVillageHome() {
state.village.place = null;
shell(
"역할놀이 마을",
`<div class="village-map"><div class="village-sky-layer">${villageMapSvg()}</div><div class="village-title-card"><span class="xp-kicker">서우만의 작은 마을</span><h2>어디에서 놀아볼까?</h2><p>정답 없이 마음대로 만지고 옮겨봐</p></div><div class="village-hotspots">
<button class="village-pin market" data-village-place="market"><span class="pin-icon">🛒</span><b>알록달록 마트</b><small>장바구니에 쏙</small></button>
<button class="village-pin kitchen" data-village-place="kitchen"><span class="pin-icon">🍳</span><b>냠냠 주방</b><small>보글보글 요리</small></button>
<button class="village-pin clinic" data-village-place="clinic"><span class="pin-icon">🐶</span><b>동물 병원</b><small>멍멍이를 돌봐줘</small></button>
</div><div class="village-phone-choice-list" aria-label="역할놀이 장소 선택">
<button class="village-phone-choice market" data-village-place="market"><span>🛒</span><div><b>알록달록 마트</b><small>골라서 카트에 담아봐</small></div><i>›</i></button>
<button class="village-phone-choice kitchen" data-village-place="kitchen"><span>🍳</span><div><b>냠냠 주방</b><small>재료를 넣고 요리해봐</small></div><i>›</i></button>
<button class="village-phone-choice clinic" data-village-place="clinic"><span>🐶</span><div><b>동물 병원</b><small>멍멍이를 돌봐줘</small></div><i>›</i></button>
</div><div class="village-character">${buddyFace("happy", "small")}<div class="character-bubble">서우야, 같이 가자!</div></div></div>`,
"xp-village",
);
toneSequence([523, 659]);
}
function marketArt() {
const picked = state.village.market;
const item = (id, emoji, name, cls) => picked.has(id) ? "" : `<button class="xp-drag market-item ${cls}" data-drag="${id}" data-kind="market" data-default-drop="cart" aria-label="${name} 장바구니에 넣기"><span>${emoji}</span><small>${name}</small></button>`;
return `<div class="role-room market-room">
<div class="room-depth"></div><div class="market-awning"></div>
<div class="market-sign">SEOWOO MARKET</div>
<div class="shelf shelf-a"><i></i><i></i><i></i></div><div class="shelf shelf-b"><i></i><i></i></div>
${item("apple","🍎","사과","i-apple")}${item("banana","🍌","바나나","i-banana")}${item("milk","🥛","우유","i-milk")}${item("bread","🍞","빵","i-bread")}${item("carrot","🥕","당근","i-carrot")}
<div class="checkout"><span class="scanner-light"></span><button data-market-scan class="scanner">삑!</button><div class="display">${picked.size ? `${picked.size}개` : "안녕!"}</div></div>
<div class="shopping-cart xp-drop-zone" data-drop-zone="cart" data-accept="market"><div class="cart-basket"><div class="cart-items">${[...picked].map((x)=>`<span>${({apple:"🍎",banana:"🍌",milk:"🥛",bread:"🍞",carrot:"🥕"})[x]}</span>`).join("")}</div></div><div class="cart-bar"></div><i></i><i></i><b>여기에 쏙!</b></div>
<button class="xp-reset-scene" data-village-reset="market">다시 채우기</button>
</div>`;
}
function kitchenArt() {
const added = state.village.kitchen;
const item = (id, emoji, name, cls) => added.has(id) ? "" : `<button class="xp-drag kitchen-item ${cls}" data-drag="${id}" data-kind="kitchen" data-default-drop="pot" aria-label="${name} 냄비에 넣기"><span>${emoji}</span><small>${name}</small></button>`;
return `<div class="role-room kitchen-room ${state.village.cooked ? "is-cooked" : ""}">
<div class="kitchen-window"><span></span><span></span></div><div class="kitchen-cabinet top"></div><div class="kitchen-counter"></div><div class="kitchen-cabinet bottom"></div>
<div class="fridge"><i></i><b>냉장고</b></div>
${item("tomato","🍅","토마토","k-tomato")}${item("carrot","🥕","당근","k-carrot")}${item("mushroom","🍄","버섯","k-mushroom")}${item("egg","🥚","달걀","k-egg")}
<div class="stove"><button data-kitchen-cook class="burner ${state.village.cooked ? "on" : ""}" aria-label="가스레인지 켜기"><i></i></button><div class="pot xp-drop-zone" data-drop-zone="pot" data-accept="kitchen"><div class="pot-fill">${[...added].map((x)=>`<span>${({tomato:"🍅",carrot:"🥕",mushroom:"🍄",egg:"🥚"})[x]}</span>`).join("")}</div><div class="steam"><i></i><i></i><i></i></div><b>냄비</b></div></div>
<div class="plate"><span>${state.village.cooked ? "🍲" : ""}</span></div>
<div class="kitchen-note">${state.village.cooked ? "따끈한 요리 완성!" : added.size ? "불을 켜볼까?" : "재료를 냄비에 넣어봐"}</div>
<button class="xp-reset-scene" data-village-reset="kitchen">다시 요리하기</button>
</div>`;
}
function clinicArt() {
const cared = state.village.clinic;
const done = cared.size >= 3;
const tool = (id, emoji, name, cls) => cared.has(id) ? `<div class="clinic-used ${cls}">${emoji}</div>` : `<button class="xp-drag clinic-tool ${cls}" data-drag="${id}" data-kind="clinic" data-default-drop="puppy" aria-label="${name} 사용하기"><span>${emoji}</span><small>${name}</small></button>`;
return `<div class="role-room clinic-room ${done ? "clinic-happy" : ""}">
<div class="clinic-wall-art"><span>♥</span></div><div class="clinic-cabinet"></div><div class="clinic-table"></div>
<div class="pet-bed xp-drop-zone" data-drop-zone="puppy" data-accept="clinic"><div class="puppy"><i class="ear left"></i><i class="ear right"></i><div class="puppy-head"><i class="eye left"></i><i class="eye right"></i><i class="nose"></i><i class="mouth"></i></div><div class="puppy-body"><i class="spot"></i></div><i class="tail"></i></div><div class="pet-status">${done ? "멍멍! 이제 좋아요" : cared.size ? "조금씩 좋아지고 있어" : "어디가 아픈지 살펴봐줘"}</div></div>
<div class="tool-tray">${tool("stethoscope","🩺","청진기","t-stetho")}${tool("thermo","🌡️","체온계","t-thermo")}${tool("bandage","🩹","반창고","t-bandage")}</div>
<div class="clinic-stars">${"★".repeat(cared.size)}${"☆".repeat(3-cared.size)}</div>
<button class="xp-reset-scene" data-village-reset="clinic">다시 돌보기</button>
</div>`;
}
function renderVillagePlace(place) {
state.village.place = place;
const title = { market: "알록달록 마트", kitchen: "냠냠 주방", clinic: "동물 병원" }[place];
const body = place === "market" ? marketArt() : place === "kitchen" ? kitchenArt() : clinicArt();
shell(title, `<div class="role-scene-wrap"><div class="role-top"><button class="role-back" data-village-home>← 마을로</button><span>${place === "market" ? "물건을 직접 옮겨봐" : place === "kitchen" ? "재료를 만지고 요리해봐" : "도구를 멍멍이에게 가져가봐"}</span></div>${body}</div>`, `xp-village xp-village-${place}`);
}
function renderPuzzleHome() {
state.puzzle.mode = null;
shell(
"퍼즐 탐험대",
`<div class="puzzle-hub"><div class="puzzle-hero"><div class="puzzle-island"><span class="p-shape a"></span><span class="p-shape b"></span><span class="p-shape c"></span><span class="p-shape d"></span>${buddyFace("happy","small")}</div><div><span class="xp-kicker">눈으로 보고 손으로 쏙</span><h2>오늘은 어떤 퍼즐?</h2><p>틀려도 괜찮아. 천천히 맞춰보자.</p></div></div><div class="puzzle-mode-grid">${Object.entries(puzzleModes).map(([id,m],i)=>`<button class="puzzle-mode-card mode-${i}" data-puzzle-mode="${id}"><span class="mode-symbol">${m.icon}</span><div><b>${m.label}</b><small>${m.sub}</small></div><i>›</i></button>`).join("")}</div></div>`,
"xp-puzzle",
);
}
function renderShadowPuzzle() {
const p = state.puzzle.placed;
const pieces = [
["circle","●","동그라미"],["star","★","별"],["triangle","▲","세모"],["heart","♥","하트"],
];
shell(
"그림자 맞추기",
`<div class="puzzle-stage"><div class="puzzle-stage-head"><button data-puzzle-home>← 퍼즐 고르기</button><div><span class="xp-kicker">그림자랑 똑같은 모양</span><h2>끌어서 쏙 넣어봐</h2></div><div class="puzzle-progress">${p.size}/4</div></div><div class="shadow-board">${pieces.map(([id,mark,name])=>`<div class="shadow-slot xp-drop-zone slot-${id} ${p.has(id)?"filled":""}" data-drop-zone="shadow-${id}" data-accept="${id}"><span>${p.has(id)?mark:""}</span><b>${p.has(id)?name:""}</b></div>`).join("")}</div><div class="piece-tray">${pieces.filter(([id])=>!p.has(id)).map(([id,mark,name])=>`<button class="xp-drag shape-piece piece-${id}" data-drag="${id}" data-kind="${id}" data-default-drop="shadow-${id}" aria-label="${name} 맞추기"><span>${mark}</span></button>`).join("")}</div><div class="puzzle-hint">모양이 같은 그림자를 찾아봐</div></div>`,
"xp-puzzle puzzle-shadows",
);
}
function renderColorPuzzle() {
const p = state.puzzle.placed;
const items = [
["r-apple","🍎","red"],["r-heart","♥","red"],["r-ball","●","red"],
["b-car","🚙","blue"],["b-drop","◆","blue"],["b-ball","●","blue"],
];
shell(
"색깔 정리",
`<div class="puzzle-stage"><div class="puzzle-stage-head"><button data-puzzle-home>← 퍼즐 고르기</button><div><span class="xp-kicker">빨강은 빨강끼리, 파랑은 파랑끼리</span><h2>같은 색 집에 넣어줘</h2></div><div class="puzzle-progress">${p.size}/6</div></div><div class="color-sort-world"><div class="color-bin red xp-drop-zone" data-drop-zone="red-bin" data-accept="red"><span>●</span><b>빨강 집</b><div>${items.filter(([id,,c])=>c==="red"&&p.has(id)).map(([,,])=>"★").join("")}</div></div><div class="sort-rug">${items.filter(([id])=>!p.has(id)).map(([id,mark,c],i)=>`<button class="xp-drag color-piece ${c} pos-${i}" data-drag="${id}" data-kind="${c}" data-default-drop="${c}-bin"><span>${mark}</span></button>`).join("")}</div><div class="color-bin blue xp-drop-zone" data-drop-zone="blue-bin" data-accept="blue"><span>●</span><b>파랑 집</b><div>${items.filter(([id,,c])=>c==="blue"&&p.has(id)).map(([,,])=>"★").join("")}</div></div></div><div class="puzzle-hint">색이 같은 쪽으로 가져가면 돼</div></div>`,
"xp-puzzle puzzle-colors",
);
}
function picturePieceSvg(id) {
const map = {
tl:`<svg viewBox="0 0 180 150"><rect width="180" height="150" fill="#bfefff"/><circle cx="35" cy="35" r="22" fill="#ffe88c"/><path d="M0 105 Q70 75 180 100V150H0Z" fill="#8bd094"/><path d="M108 80q26-38 52 0v54h-52z" fill="#ffb877"/></svg>`,
tr:`<svg viewBox="0 0 180 150"><rect width="180" height="150" fill="#bfefff"/><g fill="#fff" opacity=".9"><ellipse cx="60" cy="38" rx="35" ry="14"/><ellipse cx="94" cy="34" rx="23" ry="11"/></g><path d="M0 100 Q80 78 180 108V150H0Z" fill="#8bd094"/><path d="M0 80q26-38 52 0v54H0z" fill="#ffb877"/><circle cx="86" cy="107" r="22" fill="#f5f0df"/><circle cx="80" cy="103" r="3" fill="#2c5968"/><circle cx="92" cy="103" r="3" fill="#2c5968"/></svg>`,
bl:`<svg viewBox="0 0 180 150"><rect width="180" height="150" fill="#8bd094"/><path d="M0 78Q70 40 180 72V150H0Z" fill="#69bd78"/><rect x="108" y="0" width="52" height="70" fill="#ffb877"/><rect x="122" y="28" width="24" height="42" rx="5" fill="#82c7e8"/><g fill="#fff59a"><circle cx="35" cy="80" r="6"/><circle cx="74" cy="105" r="6"/></g></svg>`,
br:`<svg viewBox="0 0 180 150"><rect width="180" height="150" fill="#8bd094"/><path d="M0 72Q80 48 180 82V150H0Z" fill="#69bd78"/><circle cx="32" cy="0" r="22" fill="#f5f0df"/><path d="M55 102c25-28 52-28 77 0" fill="none" stroke="#f8d49c" stroke-width="26" stroke-linecap="round"/><circle cx="55" cy="103" r="16" fill="#7b5f52"/><circle cx="132" cy="103" r="16" fill="#7b5f52"/></svg>`,
};
return map[id];
}
function renderPicturePuzzle() {
const p = state.puzzle.placed;
const ids = ["tl","tr","bl","br"];
shell(
"그림 조각",
`<div class="puzzle-stage picture-stage"><div class="puzzle-stage-head"><button data-puzzle-home>← 퍼즐 고르기</button><div><span class="xp-kicker">네 조각을 한 장으로</span><h2>작은 마을 그림을 완성해봐</h2></div><div class="puzzle-progress">${p.size}/4</div></div><div class="picture-puzzle-layout"><div class="picture-board">${ids.map(id=>`<div class="picture-slot xp-drop-zone ${p.has(id)?"filled":""}" data-drop-zone="pic-${id}" data-accept="${id}">${p.has(id)?picturePieceSvg(id):`<span>${({tl:"1",tr:"2",bl:"3",br:"4"})[id]}</span>`}</div>`).join("")}</div><div class="picture-piece-tray">${ids.filter(id=>!p.has(id)).map(id=>`<button class="xp-drag picture-piece" data-drag="${id}" data-kind="${id}" data-default-drop="pic-${id}">${picturePieceSvg(id)}</button>`).join("")}</div></div><div class="puzzle-hint">그림 가장자리를 잘 살펴봐</div></div>`,
"xp-puzzle puzzle-picture",
);
}
function renderPuzzleMode(mode, reset = false) {
state.puzzle.mode = mode;
if (reset) {
state.puzzle.placed = new Set();
state.puzzle.tries = 0;
}
if (mode === "shadows") renderShadowPuzzle();
else if (mode === "colors") renderColorPuzzle();
else renderPicturePuzzle();
}
function emotionIcon(mood) {
return `<span class="emotion-mini mood-${mood}"><i></i><b></b></span>`;
}
function renderFeelingsHome() {
const mood = state.feelings.mood;
shell(
"마음친구",
`<div class="feelings-world mood-bg-${mood}"><div class="feelings-copy"><span class="xp-kicker">내 마음을 알아보는 시간</span><h2>서우야, 지금 기분이 어때?</h2><p>말로 설명하기 어려워도 얼굴을 골라보면 돼.</p></div><div class="buddy-stage">${buddyFace(mood,"large")}<div class="mood-bubble"><b>${moods[mood].label}</b><span>${moods[mood].mark}</span></div></div><div class="emotion-picker">${Object.keys(moods).map(m=>`<button class="emotion-card ${m===mood?"active":""}" data-mood="${m}">${emotionIcon(m)}<b>${moods[m].label}</b></button>`).join("")}</div><div class="feelings-actions"><button class="feelings-primary" data-feeling-story>친구 마음 알아보기 <span>›</span></button>${["angry","scared"].includes(mood)?`<button class="feelings-calm" data-feeling-calm>마음 천천히 하기</button>`:""}</div></div>`,
"xp-feelings",
);
}
function storyArt(type) {
const arts = {
blocks:`<div class="story-art blocks"><div class="story-child">${buddyFace("sad","tiny")}</div><div class="block b1"></div><div class="block b2"></div><div class="block b3"></div><div class="block b4"></div></div>`,
storm:`<div class="story-art storm"><div class="window-storm"><i></i><i></i><b>⚡</b></div><div class="story-child">${buddyFace("scared","tiny")}</div></div>`,
bubbles:`<div class="story-art bubbles"><div class="story-child">${buddyFace("happy","tiny")}</div>${Array.from({length:7},(_,i)=>`<i class="bubble bubble-${i}"></i>`).join("")}</div>`,
toy:`<div class="story-art toy"><div class="story-child first">${buddyFace("angry","tiny")}</div><div class="toy-car">🚗</div><div class="story-child second">${buddyFace("happy","tiny")}</div></div>`,
};
return arts[type];
}
function renderFeelingStory() {
const s = stories[state.feelings.story % stories.length];
shell(
"친구 마음 알아보기",
`<div class="feeling-story"><div class="story-top"><button data-feeling-home>← 내 마음으로</button><span>${state.feelings.story+1} / ${stories.length}</span></div><div class="story-card"><div class="story-visual">${storyArt(s.art)}</div><div class="story-text"><span class="xp-kicker">무슨 일이 있었을까?</span><h2>${s.title}</h2><p>${s.text}</p><strong>친구 마음은 어떨까?</strong></div></div><div class="story-emotions">${Object.keys(moods).map(m=>`<button data-story-mood="${m}" class="${m}">${emotionIcon(m)}<b>${moods[m].label}</b></button>`).join("")}</div><div class="story-feedback" id="storyFeedback">얼굴을 하나 골라봐</div></div>`,
"xp-feelings story-mode",
);
}
function renderCalm() {
const step = state.feelings.calm;
shell(
"마음 천천히 하기",
`<div class="calm-world"><div class="calm-stars"><i></i><i></i><i></i></div><div class="calm-copy"><span class="xp-kicker">화나거나 무서울 때</span><h2>풍선처럼 천천히 후~</h2><p>큰 동그라미를 눌러서 숨을 세 번 쉬어봐.</p></div><button class="breath-ball ${step ? "breathe" : ""}" data-breathe aria-label="천천히 숨 쉬기"><span>${step < 3 ? "후~" : "편안"}</span><i></i></button><div class="breath-dots">${[0,1,2].map(i=>`<i class="${i<step?"done":""}"></i>`).join("")}</div>${step>=3?`<div class="calm-done">잘했어. 마음이 조금 천천해졌어.</div><button class="feelings-primary small" data-feeling-home>마음친구로 돌아가기</button>`:`<div class="calm-guide">동그라미가 커질 때 숨을 들이마시고, 작아질 때 후~</div>`}</div>`,
"xp-feelings calm-mode",
);
}
function onDropSuccess(item, zone) {
const id = item.dataset.drag;
const kind = item.dataset.kind;
const dropId = zone.dataset.dropZone;
if (activeKind === "village" && state.village.place) {
const place = state.village.place;
state.village[place].add(id);
audio.button();
sparkle(zone);
if (place === "clinic" && state.village.clinic.size >= 3) {
safeComplete("villageClinic");
audio.speak("좋아");
}
renderVillagePlace(place);
return;
}
if (activeKind === "puzzle" && state.puzzle.mode) {
state.puzzle.placed.add(id);
recordChoice(true, true);
audio.button();
sparkle(zone);
const goal = state.puzzle.mode === "colors" ? 6 : 4;
if (state.puzzle.placed.size >= goal) {
const mode = state.puzzle.mode;
if (!state.puzzle.completed.has(mode)) {
state.puzzle.completed.add(mode);
safeComplete(`puzzle-${mode}`);
} else audio.success();
later(() => {
renderPuzzleMode(mode);
const hint = ctx.main.querySelector(".puzzle-hint");
if (hint) hint.innerHTML = `<b>완성!</b> 잘했어! <button data-puzzle-reset>한 번 더</button>`;
}, 120);
} else renderPuzzleMode(state.puzzle.mode);
return;
}
}
function canDrop(item, zone) {
if (!zone) return false;
const accept = String(zone.dataset.accept || "").split(/\s+/).filter(Boolean);
return accept.includes(item.dataset.kind);
}
function beginDrag(e, item) {
if (e.button != null && e.button !== 0) return;
e.preventDefault();
const rect = item.getBoundingClientRect();
const ghost = item.cloneNode(true);
ghost.classList.add("xp-drag-ghost");
ghost.style.width = `${rect.width}px`;
ghost.style.height = `${rect.height}px`;
ghost.style.left = `${rect.left}px`;
ghost.style.top = `${rect.top}px`;
document.body.appendChild(ghost);
item.classList.add("is-dragging");
item.setPointerCapture?.(e.pointerId);
drag = {
item,
ghost,
pointerId: e.pointerId,
startX: e.clientX,
startY: e.clientY,
offsetX: e.clientX - rect.left,
offsetY: e.clientY - rect.top,
moved: false,
lastX: e.clientX,
lastY: e.clientY,
};
audio.button();
}
function moveDrag(e) {
if (!drag || e.pointerId !== drag.pointerId) return;
drag.lastX = e.clientX;
drag.lastY = e.clientY;
if (Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8) drag.moved = true;
drag.ghost.style.left = `${e.clientX-drag.offsetX}px`;
drag.ghost.style.top = `${e.clientY-drag.offsetY}px`;
drag.ghost.style.transform = "rotate(3deg) scale(1.08)";
const hit = document.elementFromPoint(e.clientX,e.clientY)?.closest?.(".xp-drop-zone");
ctx?.main.querySelectorAll(".xp-drop-zone.is-over").forEach(z=>z.classList.remove("is-over"));
if (hit && canDrop(drag.item, hit)) hit.classList.add("is-over");
}
function endDrag(e) {
if (!drag || (e.pointerId != null && e.pointerId !== drag.pointerId)) return;
const current = drag;
drag = null;
current.item.classList.remove("is-dragging");
current.ghost.remove();
ctx?.main.querySelectorAll(".xp-drop-zone.is-over").forEach(z=>z.classList.remove("is-over"));
let zone = document.elementFromPoint(current.lastX,current.lastY)?.closest?.(".xp-drop-zone");
if (!current.moved && current.item.dataset.defaultDrop) {
zone = ctx.main.querySelector(`[data-drop-zone="${current.item.dataset.defaultDrop}"]`);
}
if (zone && canDrop(current.item,zone)) onDropSuccess(current.item, zone);
else {
current.item.classList.add("xp-bounce-home");
later(()=>current.item?.classList.remove("xp-bounce-home"),320);
audio.tone(330,0.08,"sine",0.025);
if (activeKind === "puzzle" && state.puzzle.mode) {
state.puzzle.tries++;
recordChoice(false,false);
}
}
}
function bind() {
abort?.abort();
abort = new AbortController();
const sig = abort.signal;
ctx.main.addEventListener("pointerdown", e => {
const item = e.target.closest(".xp-drag");
if (item) beginDrag(e,item);
}, { signal:sig });
document.addEventListener("pointermove", moveDrag, { signal:sig, passive:false });
document.addEventListener("pointerup", endDrag, { signal:sig });
document.addEventListener("pointercancel", endDrag, { signal:sig });
ctx.main.addEventListener("click", e => {
const b = e.target.closest("button");
if (!b || b.classList.contains("xp-drag")) return;
const d = b.dataset;
if (d.villagePlace) { renderVillagePlace(d.villagePlace); toneSequence([523,659]); return; }
if ("villageHome" in d) { renderVillageHome(); return; }
if (d.villageReset) {
state.village[d.villageReset] = new Set();
if (d.villageReset === "kitchen") state.village.cooked = false;
renderVillagePlace(d.villageReset); return;
}
if ("marketScan" in d) {
if (!state.village.market.size) { audio.tone(330,0.1,"sine",0.03); return; }
b.closest(".checkout")?.classList.add("scanning");
audio.tone(960,0.08,"square",0.025);
later(()=>b.closest(".checkout")?.classList.remove("scanning"),500);
return;
}
if ("kitchenCook" in d) {
if (!state.village.kitchen.size) { audio.tone(330,0.1,"sine",0.03); return; }
state.village.cooked = !state.village.cooked;
if (state.village.cooked) {
toneSequence([440,523,659]);
if (state.village.kitchen.size >= 2) safeComplete("villageKitchen");
}
renderVillagePlace("kitchen"); return;
}
if (d.puzzleMode) { renderPuzzleMode(d.puzzleMode,true); return; }
if ("puzzleHome" in d) { state.puzzle.mode=null; state.puzzle.placed=new Set(); renderPuzzleHome(); return; }
if ("puzzleReset" in d) { renderPuzzleMode(state.puzzle.mode,true); return; }
if (d.mood) {
state.feelings.mood=d.mood;
toneSequence(moods[d.mood].tone);
if (d.mood === "happy") audio.speak("좋아"); else audio.speak("괜찮아");
renderFeelingsHome(); return;
}
if ("feelingStory" in d) { state.feelings.story=0; state.feelings.tries=0; renderFeelingStory(); return; }
if ("feelingHome" in d) { renderFeelingsHome(); return; }
if ("feelingCalm" in d) { state.feelings.calm=0; renderCalm(); return; }
if ("breathe" in d) {
if (state.feelings.calm >= 3) return;
state.feelings.calm++;
audio.tone(392,0.8,"sine",0.018);
renderCalm(); return;
}
if (d.storyMood) {
const s=stories[state.feelings.story%stories.length];
state.feelings.tries++;
const ok=d.storyMood===s.mood;
recordChoice(ok,ok&&state.feelings.tries===1);
const f=document.getElementById("storyFeedback");
if (ok) {
b.classList.add("correct");
if (f) f.innerHTML="<b>그래, 그런 마음일 수 있어.</b> 표정을 잘 봤네!";
audio.success(); audio.speak("잘했어");
later(()=>{ state.feelings.story++; state.feelings.tries=0; if(state.feelings.story>=stories.length){ safeComplete("feelingsStories"); state.feelings.story=0; } renderFeelingStory(); },1200);
} else {
b.classList.add("soft-try");
if (f) f.textContent="얼굴을 한 번 더 살펴볼까?";
later(()=>b.classList.remove("soft-try"),350);
if (state.feelings.tries>=2) ctx.main.querySelector(`[data-story-mood="${s.mood}"]`)?.classList.add("hint");
}
}
}, { signal:sig });
}
function mount(kind, options) {
unmount();
activeKind = kind;
ctx = options;
if (kind !== "village") state.village.place = null;
if (kind !== "puzzle") state.puzzle.mode = null;
bind();
if (kind === "village") renderVillageHome();
else if (kind === "puzzle") { state.puzzle.mode=null; state.puzzle.placed=new Set(); renderPuzzleHome(); }
else renderFeelingsHome();
}
function unmount() {
stopTimers();
abort?.abort();
abort = null;
if (drag) {
drag.ghost?.remove();
drag = null;
}
ctx = null;
activeKind = null;
}
window.SeowooExperiences = { mount, unmount };
})();
