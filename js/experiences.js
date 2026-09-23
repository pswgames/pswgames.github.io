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
<button class="village-phone-choice clinic" data-village-place="clinic"><span>🐶</span><div><b>동물 병원</b><small>멍멍이를 돌봐줘</small></div><i>›<