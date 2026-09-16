/* Seowoo Playground v6.8.0 — kiosk polish, parent PIN tools, premium potty flow, Jamo finders, voice refinement. */
(()=>{
'use strict';
const K=window.SeowooCore;if(!K)return;
const {audio,state,save,recordChoice,complete,confetti,difficultyLevel,shuffle,toast,awardSticker}=K;
const main=document.querySelector('#main');
const PIN_KEY='seowoo-screen-lock-pin-v2';
const encoder=new TextEncoder();
let currentRoute='';
let letterRun=null,letterTimer=0,pottyRun=null;

const nativeKiosk=()=>!!window.SeowooNativeKiosk||/SeowooKiosk\//i.test(navigator.userAgent);
function applyKioskUi(){
  const kiosk=nativeKiosk();document.documentElement.dataset.seowooKiosk=kiosk?'1':'0';
  if(!kiosk)return;
  const btn=document.querySelector('#installBtn');if(btn){btn.hidden=true;btn.setAttribute('aria-hidden','true')}
  const dlg=document.querySelector('#installDialog');if(dlg?.open){try{dlg.close()}catch{}}
}

function bytesToHex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function digestPin(pin,salt){const d=await crypto.subtle.digest('SHA-256',encoder.encode(`seowoo-parent-pin-v2:${salt}:${pin}`));return bytesToHex(new Uint8Array(d))}
function readCredential(){try{const d=JSON.parse(localStorage.getItem(PIN_KEY)||'null');return d&&d.v===2&&d.salt&&d.hash?d:null}catch{return null}}
async function verifyPin(pin){const c=readCredential();return!!c&&(await digestPin(pin,c.salt))===c.hash}
async function writePin(pin){const b=new Uint8Array(16);crypto.getRandomValues(b);const salt=bytesToHex(b),hash=await digestPin(pin,salt);localStorage.setItem(PIN_KEY,JSON.stringify({v:2,salt,hash}))}

function enableSingleEntrySetup(){
  const dlg=document.querySelector('#screenLockDialog');if(!dlg)return;
  const sync=()=>{
    const pin=dlg.querySelector('#screenLockPin'),confirm=dlg.querySelector('#screenLockPinConfirm'),wrap=dlg.querySelector('#screenLockConfirmWrap');
    if(!pin||!confirm||!wrap)return;
    if(dlg.dataset.mode==='setup'){
      wrap.hidden=true;confirm.value=pin.value;
      if(pin.dataset.singleEntry!=='1'){
        pin.dataset.singleEntry='1';pin.addEventListener('input',()=>{if(dlg.dataset.mode==='setup')confirm.value=pin.value});
      }
      const text=dlg.querySelector('#screenLockDialogText');if(text&&!text.dataset.v68){text.dataset.v68='1';text.textContent='화면잠금에 사용할 4~8자리 숫자 비밀번호를 한 번만 입력해줘.'}
    }
  };
  new MutationObserver(sync).observe(dlg,{attributes:true,attributeFilter:['open','data-mode'],subtree:false});
  dlg.addEventListener('input',sync);sync();
}

function ensurePinChangeDialog(){
  let dlg=document.querySelector('#v68PinChange');if(dlg)return dlg;
  dlg=document.createElement('dialog');dlg.id='v68PinChange';dlg.className='modal v68-pin-dialog';
  dlg.innerHTML=`<form class="v68-pin-card" novalidate>
    <div class="v68-pin-icon" aria-hidden="true">🔐</div><h2>화면잠금 비밀번호 변경</h2>
    <p>현재 비밀번호를 확인한 뒤 새 비밀번호는 한 번만 입력해.</p>
    <label class="v68-pin-field" id="v68CurrentWrap"><span>현재 비밀번호</span><input id="v68CurrentPin" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></label>
    <label class="v68-pin-field"><span>새 비밀번호</span><input id="v68NewPin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="4~8자리 숫자"></label>
    <div id="v68PinError" class="screen-lock-error" role="alert"></div>
    <div class="modal-actions"><button type="button" class="btn soft" data-pin-cancel>취소</button><button type="submit" class="btn primary">변경하기</button></div>
  </form>`;
  document.body.append(dlg);
  const close=()=>{try{dlg.close()}catch{}dlg.querySelector('form').reset();dlg.querySelector('#v68PinError').textContent=''};
  dlg.querySelector('[data-pin-cancel]').onclick=close;
  dlg.addEventListener('cancel',e=>{e.preventDefault();close()});
  dlg.querySelector('form').onsubmit=async e=>{
    e.preventDefault();const old=dlg.querySelector('#v68CurrentPin').value.trim(),next=dlg.querySelector('#v68NewPin').value.trim(),err=dlg.querySelector('#v68PinError');err.textContent='';
    if(!/^\d{4,8}$/.test(next)){err.textContent='새 비밀번호는 4~8자리 숫자로 입력해줘.';return}
    if(readCredential()&&!(await verifyPin(old))){err.textContent='현재 비밀번호가 맞지 않아.';return}
    try{await writePin(next);close();toast('화면잠금 비밀번호를 변경했어')}catch{err.textContent='비밀번호 변경 중 오류가 났어.'}
  };
  return dlg;
}
function openPinChange(){
  if(window.SeowooScreenLock?.locked){toast('먼저 화면잠금을 해제해줘');return}
  const dlg=ensurePinChangeDialog();dlg.querySelector('#v68CurrentWrap').hidden=!readCredential();if(!dlg.open)dlg.showModal();setTimeout(()=>dlg.querySelector(readCredential()?'#v68CurrentPin':'#v68NewPin')?.focus(),30);
}
function enhanceParent(){
  if(currentRoute!=='parent'||!main?.querySelector('.parent-card')||main.querySelector('#v68LockSettings'))return;
  const card=document.createElement('div');card.id='v68LockSettings';card.className='parent-card v68-security-card';
  card.innerHTML=`<div class="v68-card-title"><span class="v68-card-icon">🔐</span><div><h2>화면잠금</h2><p>서우모드의 완전잠금 비밀번호를 관리해.</p></div></div>
    <div class="setting"><span><b>잠금 비밀번호</b><small>${readCredential()?'설정됨 · 새 비밀번호는 한 번만 입력':'아직 설정되지 않음'}</small></span><button id="v68ChangePin" class="btn soft">${readCredential()?'비밀번호 변경':'비밀번호 설정'}</button></div>
    ${nativeKiosk()?'<div class="v68-kiosk-badge">완전잠금 연결됨 · 홈/최근앱/알림창 차단</div>':''}`;
  const cards=[...main.querySelectorAll('.parent-card')];(cards[1]||cards.at(-1))?.insertAdjacentElement('afterend',card);card.querySelector('#v68ChangePin').onclick=openPinChange;
}

const JAMO={
  consonant:[['ㄱ','기역'],['ㄴ','니은'],['ㄷ','디귿'],['ㄹ','리을'],['ㅁ','미음'],['ㅂ','비읍'],['ㅅ','시옷'],['ㅇ','이응'],['ㅈ','지읒'],['ㅊ','치읓'],['ㅋ','키읔'],['ㅌ','티읕'],['ㅍ','피읖'],['ㅎ','히읗']],
  vowel:[['ㅏ','아'],['ㅑ','야'],['ㅓ','어'],['ㅕ','여'],['ㅗ','오'],['ㅛ','요'],['ㅜ','우'],['ㅠ','유'],['ㅡ','으'],['ㅣ','이']]
};
function addJamoTiles(){
  const grid=main?.querySelector('.tile-grid');if(currentRoute!=='language'||!grid||grid.querySelector('[data-v68-find]'))return;
  grid.insertAdjacentHTML('beforeend',`<button class="tile v68-jamo-tile" data-v68-find="consonant"><span class="emoji v68-jamo-mark">ㄱㄴㄷ</span><b>자음 찾기</b><small>기역·니은·디귿을 보고 찾아요</small></button><button class="tile v68-jamo-tile" data-v68-find="vowel"><span class="emoji v68-jamo-mark">ㅏㅓㅕ</span><b>모음 찾기</b><small>아·어·여 소리를 보고 찾아요</small></button>`);
}
function stopLetter(){clearTimeout(letterTimer);letterTimer=0;letterRun=null}
function letterDeck(pool,n=12){const out=[];while(out.length<n){for(const x of shuffle(pool)){out.push(x);if(out.length===n)break}}return out}
function startJamo(kind){
  stopLetter();audio.stopVoice?.();const pool=JAMO[kind]||JAMO.consonant;letterRun={kind,pool,q:0,score:0,tries:0,total:12,deck:letterDeck(pool)};drawJamo();
}
function drawJamo(){
  const s=letterRun;if(!s||!main)return;if(s.q>=s.total){complete(`jamo-${s.kind}`,{score:s.score,total:s.total});confetti();audio.success();main.innerHTML=`<div class="result v68-result"><div class="big">🎉</div><h2>${s.kind==='consonant'?'자음':'모음'} 찾기 끝!</h2><p>12번 끝까지 잘 찾았어. 별 ${s.score}개!</p><div class="btns"><button class="btn primary" data-v68-replay="${s.kind}">한 번 더</button><button class="btn soft" data-v68-back-language>말글 놀이터</button></div></div>`;return}
  const target=s.deck[s.q],lv=difficultyLevel(`jamo-${s.kind}`),count=lv===1?2:lv===2?3:4,others=shuffle(s.pool.filter(x=>x[0]!==target[0])).slice(0,count-1),choices=shuffle([target,...others]);s.tries=0;s.locked=false;
  main.innerHTML=`<div class="v68-find-screen"><div class="game-top"><button class="back-btn" data-v68-back-language>←</button><div class="progress"><i style="width:${s.q/s.total*100}%"></i></div><div class="stars">⭐ ${s.score}</div></div><div class="v68-find-head"><span>${s.kind==='consonant'?'자음':'모음'} 찾기</span><small>${s.q+1} / ${s.total}</small></div><div class="v68-letter-hero"><div class="v68-letter-orb">${target[0]}</div><h2>${target[1]} 소리를 찾아볼까?</h2><button class="v68-listen" data-v68-listen="${target[1]}" aria-label="다시 듣기">🔊 다시 듣기</button></div><div class="v68-letter-choices">${choices.map((x,i)=>`<button data-v68-choice="${i}" data-char="${x[0]}"><b>${x[0]}</b><small>${x[1]}</small></button>`).join('')}</div><div id="v68LetterFeedback" class="feedback">천천히 보고 같은 글자를 찾아봐</div></div>`;
  audio.speak(`${target[1]} 소리를 찾아볼까?`);main.querySelectorAll('[data-v68-choice]').forEach(b=>b.onclick=()=>answerJamo(b,target));
}
function answerJamo(btn,target){const s=letterRun;if(!s||s.locked)return;s.tries++;const ok=btn.dataset.char===target[0];recordChoice(ok,ok&&s.tries===1);const f=document.querySelector('#v68LetterFeedback');if(ok){s.locked=true;btn.classList.add('good');if(f){f.classList.add('ok');f.textContent='잘했어!'}navigator.vibrate?.(35);audio.success();const voice=audio.speak('잘했어.');s.score++;s.q++;letterTimer=setTimeout(()=>Promise.resolve(voice).then(drawJamo),520)}else{btn.classList.add('try-again');if(f)f.textContent='다시 찾아볼까?';audio.speak('다시 찾아볼까?');if(s.tries>=2)main.querySelector(`[data-char="${CSS.escape(target[0])}"]`)?.classList.add('hint')}}

const POTTY_STEPS=[
  {title:'화장실로 가요',sub:'문을 열고 천천히 들어가요',icon:'🚪',say:'화장실로 가볼까?'},
  {title:'바지를 내려요',sub:'혼자 어렵다면 어른에게 도움을 받아요',icon:'👖',say:'바지를 천천히 내려볼까?'},
  {title:'변기에 앉아요',sub:'발이 편안하게 닿도록 앉아요',icon:'🚽',say:'변기에 편하게 앉아볼까?'},
  {title:'몸의 신호를 기다려요',sub:'안 나와도 괜찮아. 앉아본 것만으로 충분해요',icon:'💛',say:'천천히 기다려보자. 안 나와도 괜찮아.'},
  {title:'깨끗하게 닦아요',sub:'휴지를 필요한 만큼만 사용해요',icon:'🧻',say:'휴지로 깨끗하게 닦아볼까?'},
  {title:'물을 내려요',sub:'레버를 누르고 빙글빙글 물을 구경해요',icon:'💦',say:'이제 물을 내려볼까?'},
  {title:'바지를 올려요',sub:'옷을 편안하게 정리해요',icon:'👖',say:'바지를 다시 올려볼까?'},
  {title:'비누로 손을 씻어요',sub:'손바닥·손등·손가락 사이까지 비벼요',icon:'🫧',say:'마지막으로 손을 깨끗하게 씻어볼까?'},
  {title:'탐험 완료!',sub:'오늘도 화장실 순서를 멋지게 연습했어요',icon:'⭐',say:'화장실 탐험 완료! 잘했어.'}
];
function resetPremiumPotty(){pottyRun={step:0,kind:'',wash:0,flushing:false,awarded:false,stars:0}}
function pottySceneHtml(s){const step=s.step,prop=step===3?(s.kind==='pee'?'💧':s.kind==='poop'?'💩':'✨'):POTTY_STEPS[step].icon;return`<div class="v68-potty-room ${s.flushing?'is-flushing':''}" data-step="${step}"><div class="v68-potty-window"><i></i><span></span></div><div class="v68-potty-shelf"><span>🧻</span><span>🧼</span><span>🪴</span></div><div class="v68-potty-toilet"><div class="tank"><button data-v68-flush ${step!==5?'disabled':''} aria-label="물 내리기"></button></div><div class="lid"></div><div class="bowl"><span>${step===3?prop:''}</span></div><div class="base"></div></div><div class="v68-potty-sink"><div class="tap"></div><div class="basin">${step===7?'🫧':''}</div></div><div class="v68-potty-avatar"><div class="face">${step===8?'😊':'🙂'}</div><div class="body"></div><div class="prop">${prop}</div></div>${step===7?`<div class="v68-wash-cloud">${'●'.repeat(Math.max(1,s.wash))}</div>`:''}</div>`}
function pottyActionHtml(s){switch(s.step){case 0:return'<button class="v68-potty-main" data-v68-potty="next">문 열고 들어가기</button>';case 1:return'<button class="v68-potty-main" data-v68-potty="next">바지 천천히 내리기</button>';case 2:return'<button class="v68-potty-main" data-v68-potty="next">변기에 편하게 앉기</button>';case 3:return'<div class="v68-potty-choice"><button data-v68-kind="pee"><span>💧</span>쉬 했어요</button><button data-v68-kind="poop"><span>💩</span>응가 했어요</button><button data-v68-kind="none"><span>💛</span>안 나와도 괜찮아요</button></div>';case 4:return'<button class="v68-potty-main" data-v68-potty="next">휴지로 깨끗하게 닦기</button>';case 5:return'<button class="v68-potty-main" data-v68-potty="flush">물 내리기</button>';case 6:return'<button class="v68-potty-main" data-v68-potty="next">바지 다시 올리기</button>';case 7:return`<button class="v68-potty-main" data-v68-potty="wash">비누로 손 비비기 <b>${s.wash}/3</b></button>`;default:return'<div class="v68-potty-done-actions"><button class="btn primary" data-v68-real-potty>진짜 화장실 가보기</button><button class="btn soft" data-v68-potty="restart">다시 탐험하기</button></div>'}}
function renderPremiumPotty(announce=true){
  if(currentRoute!=='potty'||!main)return;if(!pottyRun)resetPremiumPotty();const s=pottyRun,step=POTTY_STEPS[s.step];audio.stopVoice?.();
  main.innerHTML=`<div class="v68-potty-shell"><div class="v68-potty-top"><button class="back-btn" data-v68-potty-home>←</button><div><span class="eyebrow">생활습관 미션</span><h1>화장실 탐험대</h1></div><div class="v68-courage">용기별 <b>${s.stars}</b></div></div><div class="v68-potty-track">${POTTY_STEPS.slice(0,8).map((x,i)=>`<span class="${i<s.step?'done':''} ${i===s.step?'now':''}"><i>${i<s.step?'✓':i+1}</i><small>${x.title.split(' ')[0]}</small></span>`).join('')}</div><div class="v68-potty-stage">${pottySceneHtml(s)}<div class="v68-potty-copy"><span class="v68-step-chip">${Math.min(s.step+1,8)} / 8</span><h2>${step.title}</h2><p>${step.sub}</p><button class="v68-listen" data-v68-potty-listen>🔊 다시 듣기</button></div></div><div class="v68-potty-actions">${pottyActionHtml(s)}</div><div class="v68-potty-note"><b>성공보다 익숙함이 먼저예요.</b><span>안 나와도 괜찮고, 잠깐 앉아본 것만으로도 충분히 칭찬해 주세요.</span></div></div>`;
  if(announce)audio.speak(step.say);wirePremiumPotty();if(s.step===8&&!s.awarded){s.awarded=true;s.stars++;const sticker=awardSticker();state.stats.rounds++;state.stats.byGame.potty=(state.stats.byGame.potty||0)+1;state.recent.unshift({game:'potty',at:Date.now()});save();confetti();audio.success();if(sticker)toast(`${sticker[2]} ${sticker[1]} 스티커를 받았어!`)}}
function wirePremiumPotty(){
  main.querySelector('[data-v68-potty-home]')?.addEventListener('click',()=>{pottyRun=null;window.SeowooApp?.go('home')});
  main.querySelector('[data-v68-potty-listen]')?.addEventListener('click',()=>audio.speak(POTTY_STEPS[pottyRun.step].say));
  main.querySelectorAll('[data-v68-kind]').forEach(b=>b.onclick=()=>{pottyRun.kind=b.dataset.v68Kind;pottyRun.step=4;pottyRun.stars++;navigator.vibrate?.(25);renderPremiumPotty()});
  main.querySelectorAll('[data-v68-potty]').forEach(b=>b.onclick=()=>{const a=b.dataset.v68Potty;if(a==='restart'){resetPremiumPotty();renderPremiumPotty();return}if(a==='next'){pottyRun.step++;pottyRun.stars++;navigator.vibrate?.(20);renderPremiumPotty();return}if(a==='flush'){if(pottyRun.flushing)return;pottyRun.flushing=true;audio.playSfx?.('doorClose');renderPremiumPotty(false);setTimeout(()=>{if(!pottyRun)return;pottyRun.flushing=false;pottyRun.step=6;pottyRun.stars++;renderPremiumPotty()},850);return}if(a==='wash'){pottyRun.wash++;navigator.vibrate?.(15);audio.tone?.(560,.07);if(pottyRun.wash>=3){pottyRun.step=8;pottyRun.stars++;renderPremiumPotty()}else renderPremiumPotty(false)}});
  main.querySelector('[data-v68-flush]')?.addEventListener('click',()=>main.querySelector('[data-v68-potty="flush"]')?.click());
  main.querySelector('[data-v68-real-potty]')?.addEventListener('click',()=>{main.innerHTML=`<div class="v68-real-potty"><button class="back-btn" data-v68-return-potty>←</button><div class="v68-real-icon">🚽</div><h2>이제 화면을 잠깐 내려놓자</h2><p>엄마아빠 손을 잡고 실제 화장실에 다녀와요.<br>앉아보기만 해도 충분해요.</p><button class="btn primary" data-v68-sat>변기에 앉아봤어요</button></div>`;audio.speak('엄마아빠 손 잡고 화장실에 다녀오자. 앉아보기만 해도 충분해.');main.querySelector('[data-v68-return-potty]').onclick=()=>renderPremiumPotty(false);main.querySelector('[data-v68-sat]').onclick=()=>{confetti();audio.speak('잘했어.');setTimeout(()=>window.SeowooApp?.go('treasure'),650)}})
}

function polishVoice(){
  if(!audio||audio.__v68Voice)return;audio.__v68Voice=true;
  audio.voiceScore=v=>{
    const n=(v?.name||'').toLowerCase();let score=0;
    if(/natural|neural|premium|enhanced|wavenet|studio|online/.test(n))score+=100;
    if(/google/.test(n))score+=48;if(/microsoft/.test(n))score+=42;if(/samsung/.test(n))score+=35;
    if(/yuna|sunhi|jenny|seoyeon|jiwoo|heami|sora/.test(n))score+=30;
    if(/espeak|pico|robot/.test(n))score-=100;if(v?.default)score+=8;if(v?.localService===false)score+=12;return score;
  };
  const original=audio.speak.bind(audio);audio.speak=(text,lang='ko-KR',rate=.9,entry)=>{
    const len=String(text||'').length;let smart=rate;
    if(lang.startsWith('ko'))smart=len<=6?.92:len<=22?.95:.98;
    else if(lang.startsWith('en'))smart=Math.min(rate||.88,.9);
    return original(text,lang,smart,entry);
  };
}

function onRoute(route){
  currentRoute=route||'';if(route!=='language')stopLetter();if(route!=='potty')pottyRun=null;
  requestAnimationFrame(()=>{applyKioskUi();if(route==='language')addJamoTiles();if(route==='potty'){resetPremiumPotty();renderPremiumPotty()}if(route==='parent')enhanceParent()});
}
window.addEventListener('seowoo:route',e=>onRoute(e.detail?.route));
document.addEventListener('click',e=>{
  const f=e.target.closest?.('[data-v68-find]');if(f){e.preventDefault();e.stopPropagation();startJamo(f.dataset.v68Find);return}
  const r=e.target.closest?.('[data-v68-replay]');if(r){e.preventDefault();startJamo(r.dataset.v68Replay);return}
  if(e.target.closest?.('[data-v68-back-language]')){e.preventDefault();stopLetter();window.SeowooApp?.go('language');return}
  const l=e.target.closest?.('[data-v68-listen]');if(l){e.preventDefault();audio.speak(`${l.dataset.v68Listen} 소리를 찾아볼까?`)}
},true);
const observer=new MutationObserver(()=>{applyKioskUi();enableSingleEntrySetup();if(currentRoute==='parent')enhanceParent();if(currentRoute==='language')addJamoTiles()});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','data-mode']});
polishVoice();applyKioskUi();enableSingleEntrySetup();
})();
