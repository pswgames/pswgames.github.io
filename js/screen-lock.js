/* Seowoo Playground parent PIN lock. Android wrapper requires Device Owner for strict Y700 kiosk mode. */
(()=>{
'use strict';

const STORAGE_KEY='seowoo-screen-lock-v1';
const CREDENTIAL_KEY='seowoo-screen-lock-pin-v2';
const PIN_RE=/^\d{4,8}$/;
const encoder=new TextEncoder();
let locked=false;
let wakeLock=null;
let historyGuard=false;
let lockFullscreenOwned=false;
let failedAttempts=0;
let blockedUntil=0;
const nativeOpen=window.open.bind(window);

function nativeBridge(){
  const bridge=window.SeowooNativeKiosk;
  return bridge&&typeof bridge.lock==='function'&&typeof bridge.unlock==='function'?bridge:null;
}
function nativeStrictReady(){
  const bridge=nativeBridge();if(!bridge)return null;
  try{
    if(typeof bridge.strictReady==='function')return bridge.strictReady()===true;
    if(typeof bridge.isDeviceOwner==='function')return bridge.isDeviceOwner()===true;
  }catch{}
  return false;
}
function syncNativeKiosk(){
  const bridge=nativeBridge();if(!bridge)return false;
  try{
    if(locked){if(nativeStrictReady()!==true)return false;bridge.lock()}
    else bridge.unlock();
    return true;
  }catch{return false}
}

const toast=msg=>{try{window.SeowooCore?.toast?.(msg)}catch{}};
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;

function readLocked(){try{return localStorage.getItem(STORAGE_KEY)==='1'}catch{return false}}
function saveLocked(){try{localStorage.setItem(STORAGE_KEY,locked?'1':'0')}catch{}}
function readCredential(){
  try{
    const raw=localStorage.getItem(CREDENTIAL_KEY);if(!raw)return null;
    const data=JSON.parse(raw);return data&&data.v===2&&typeof data.salt==='string'&&typeof data.hash==='string'?data:null;
  }catch{return null}
}
function bytesToHex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function digestPin(pin,salt){
  if(!crypto?.subtle)throw new Error('secure-crypto-unavailable');
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(`seowoo-parent-pin-v2:${salt}:${pin}`));
  return bytesToHex(new Uint8Array(digest));
}
function newSalt(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return bytesToHex(bytes)}
async function saveCredential(pin){const salt=newSalt(),hash=await digestPin(pin,salt);localStorage.setItem(CREDENTIAL_KEY,JSON.stringify({v:2,salt,hash}))}
async function verifyPin(pin){const cred=readCredential();if(!cred)return false;return(await digestPin(pin,cred.salt))===cred.hash}

function lockMarkup(id,compact=false){
  return `<button id="${id}" type="button" class="screen-lock-toggle${compact?' compact':''}" aria-pressed="false" aria-label="화면 잠금 꺼짐. 눌러서 부모 비밀번호 입력"><svg class="screen-lock-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="3"></rect><path class="lock-shackle" d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg><span class="screen-lock-label">${compact?'잠금':'화면잠금'}</span><strong class="screen-lock-state">OFF</strong></button>`;
}
function ensureFloating(){
  let host=document.querySelector('#screenLockFloatHost');if(host)return host.querySelector('.screen-lock-toggle');
  host=document.createElement('div');host.id='screenLockFloatHost';host.className='screen-lock-float-host';host.innerHTML=lockMarkup('screenLockFloat',true);document.body.append(host);return host.querySelector('.screen-lock-toggle');
}
function ensureDialog(){
  let dlg=document.querySelector('#screenLockDialog');if(dlg)return dlg;
  dlg=document.createElement('dialog');dlg.id='screenLockDialog';dlg.className='screen-lock-dialog';
  dlg.innerHTML=`<form class="screen-lock-card" novalidate><div class="screen-lock-dialog-icon" aria-hidden="true">🔒</div><h2 id="screenLockDialogTitle">부모 비밀번호</h2><p id="screenLockDialogText"></p><label class="screen-lock-field"><span>비밀번호</span><input id="screenLockPin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" pattern="[0-9]*" aria-describedby="screenLockError"></label><label class="screen-lock-field" id="screenLockConfirmWrap" hidden><span>비밀번호 확인</span><input id="screenLockPinConfirm" type="password" inputmode="numeric" autocomplete="off" maxlength="8" pattern="[0-9]*"></label><div id="screenLockError" class="screen-lock-error" role="alert"></div><div class="screen-lock-dialog-actions"><button type="button" class="screen-lock-cancel">취소</button><button type="submit" class="screen-lock-submit">확인</button></div></form>`;
  document.body.append(dlg);dlg.addEventListener('cancel',e=>{e.preventDefault();closeDialog()});dlg.querySelector('.screen-lock-cancel').addEventListener('click',closeDialog);dlg.querySelector('form').addEventListener('submit',handlePinSubmit);return dlg;
}
function buttons(){return [...document.querySelectorAll('.screen-lock-toggle')]}
function syncButtons(){
  for(const btn of buttons()){
    btn.classList.toggle('on',locked);btn.setAttribute('aria-pressed',String(locked));
    btn.setAttribute('aria-label',locked?'화면 잠금 켜짐. 눌러서 부모 비밀번호 입력 후 해제':'화면 잠금 꺼짐. 눌러서 부모 비밀번호 입력 후 잠금');
    const state=btn.querySelector('.screen-lock-state');if(state)state.textContent=locked?'ON':'OFF';
  }
}
async function acquireWakeLock(){if(!locked||document.visibilityState!=='visible'||!('wakeLock' in navigator))return;try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener?.('release',()=>{wakeLock=null},{once:true})}catch{}}
async function releaseWakeLock(){try{await wakeLock?.release()}catch{}wakeLock=null}
function armHistoryGuard(){if(historyGuard)return;try{history.pushState({...((history.state&&typeof history.state==='object')?history.state:{}),seowooLockGuard:true},'',location.href);historyGuard=true}catch{}}
function releaseHistoryGuard(){if(!historyGuard)return;historyGuard=false;try{if(history.state?.seowooLockGuard)history.back()}catch{}}
function applyState(announce=false){
  document.documentElement.classList.toggle('screen-locked',locked);document.body.classList.toggle('screen-locked',locked);document.documentElement.dataset.screenLock=locked?'on':'off';syncButtons();
  const nativeActive=syncNativeKiosk();if(locked){armHistoryGuard();acquireWakeLock()}else{releaseHistoryGuard();releaseWakeLock()}
  const ready=nativeStrictReady();document.documentElement.dataset.nativeKiosk=ready===true?'strict':ready===false?'setup-required':'web-only';
  window.dispatchEvent(new CustomEvent('seowoo:screenlock',{detail:{locked,nativeStrictReady:ready}}));
  if(announce)toast(locked?'완전 잠금 ON · 부모 비밀번호로만 해제할 수 있어요':'화면 잠금 OFF');
}
function setLocked(next,announce=true){if(locked===next)return;locked=next;saveLocked();applyState(announce);try{navigator.vibrate?.(locked?[45,55,80]:[80,45,45])}catch{}}
async function requestFullscreenContainment(){if(!locked||standalone()||document.fullscreenElement||!document.documentElement.requestFullscreen)return;try{await document.documentElement.requestFullscreen({navigationUI:'hide'});lockFullscreenOwned=true}catch{}}
async function releaseFullscreenContainment(){if(!lockFullscreenOwned)return;lockFullscreenOwned=false;try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}}
function showError(msg){const dlg=ensureDialog(),el=dlg.querySelector('#screenLockError');el.textContent=msg;dlg.querySelector('#screenLockPin')?.focus()}
function closeDialog(){const dlg=document.querySelector('#screenLockDialog');if(!dlg)return;try{dlg.close()}catch{}dlg.querySelector('form')?.reset();const err=dlg.querySelector('#screenLockError');if(err)err.textContent=''}
function strictLockBlocked(){return nativeBridge()&&nativeStrictReady()!==true}
function openPinDialog(){
  const dlg=ensureDialog(),setup=!readCredential(),title=dlg.querySelector('#screenLockDialogTitle'),text=dlg.querySelector('#screenLockDialogText'),confirmWrap=dlg.querySelector('#screenLockConfirmWrap'),submit=dlg.querySelector('.screen-lock-submit');
  dlg.dataset.mode=setup?'setup':'verify';
  if(setup){title.textContent='부모 비밀번호 설정';text.textContent=locked?'새 4~8자리 숫자 비밀번호를 설정하면 기존 잠금을 해제할 수 있어요.':'화면잠금에 사용할 4~8자리 숫자 비밀번호를 정해줘.';confirmWrap.hidden=false;submit.textContent=locked?'설정 후 잠금 해제':'설정 후 잠금 켜기'}
  else{title.textContent=locked?'화면잠금 해제':'화면잠금 켜기';text.textContent=locked?'부모 비밀번호를 입력하면 태블릿을 다시 정상적으로 사용할 수 있어요.':strictLockBlocked()?'Y700 완전잠금 설정이 아직 필요해. 비밀번호 확인 후에는 잠금 대신 설정 안내가 표시돼.':'부모 비밀번호를 입력하면 홈·최근앱·제어센터까지 막는 완전잠금이 켜져요.';confirmWrap.hidden=true;submit.textContent=locked?'잠금 해제':'잠금 켜기'}
  dlg.querySelector('#screenLockError').textContent='';dlg.querySelector('form').reset();if(!dlg.open)dlg.showModal();setTimeout(()=>dlg.querySelector('#screenLockPin')?.focus(),20);
}
async function handlePinSubmit(e){
  e.preventDefault();const dlg=ensureDialog(),pin=dlg.querySelector('#screenLockPin').value.trim(),mode=dlg.dataset.mode;
  if(Date.now()<blockedUntil){showError(`비밀번호를 여러 번 틀렸어. ${Math.ceil((blockedUntil-Date.now())/1000)}초 후 다시 시도해줘.`);return}
  if(!PIN_RE.test(pin)){showError('4~8자리 숫자로 입력해줘.');return}
  const submit=dlg.querySelector('.screen-lock-submit');submit.disabled=true;
  try{
    if(mode==='setup'){
      const confirm=dlg.querySelector('#screenLockPinConfirm').value.trim();if(pin!==confirm){showError('비밀번호가 서로 달라. 다시 확인해줘.');return}
      if(!locked&&strictLockBlocked()){showError('Y700 완전잠금 준비가 안 됐어. 먼저 이 앱을 Device Owner로 1회 설정해야 잠금 ON이 가능해.');return}
      await saveCredential(pin);failedAttempts=0;closeDialog();const next=!locked;setLocked(next,true);if(next&&!nativeBridge())requestFullscreenContainment();else if(!next)releaseFullscreenContainment();return;
    }
    const ok=await verifyPin(pin);
    if(!ok){failedAttempts++;if(failedAttempts>=5){blockedUntil=Date.now()+30000;failedAttempts=0;showError('비밀번호를 5번 틀렸어. 30초 후 다시 시도해줘.')}else showError(`비밀번호가 맞지 않아. (${failedAttempts}/5)`);return}
    if(!locked&&strictLockBlocked()){showError('Y700 완전잠금 준비가 안 됐어. 이 APK를 Device Owner로 설정한 뒤 다시 눌러줘.');return}
    failedAttempts=0;blockedUntil=0;closeDialog();const next=!locked;setLocked(next,true);if(next&&!nativeBridge())requestFullscreenContainment();else if(!next)releaseFullscreenContainment();
  }catch{showError('비밀번호 처리 중 오류가 났어. 앱을 다시 열고 시도해줘.')}finally{submit.disabled=false}
}
function bindButton(btn){if(!btn||btn.dataset.screenLockBound==='1')return;btn.dataset.screenLockBound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPinDialog()});btn.addEventListener('contextmenu',e=>e.preventDefault());btn.addEventListener('dragstart',e=>e.preventDefault())}
function blockExternalClick(e){if(!locked)return;const a=e.target.closest?.('a[href],area[href]');if(!a)return;let url;try{url=new URL(a.href,location.href)}catch{return}if(url.origin!==location.origin||a.target==='_blank'||a.hasAttribute('download')){e.preventDefault();e.stopImmediatePropagation();toast('화면 잠금 중이라 서우 놀이터 밖으로 나갈 수 없어요')}}
function blockNativeGesture(e){if(locked)e.preventDefault()}
function onPopState(){if(!locked)return;try{history.pushState({seowooLockGuard:true},'',location.href);historyGuard=true}catch{}toast('화면 잠금 중이에요')}
function onKeyDown(e){if(!locked)return;const browserBack=(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))||e.key==='BrowserBack'||e.key==='BrowserForward';if(browserBack){e.preventDefault();e.stopImmediatePropagation()}}
function maybeReenterFullscreen(){if(!locked||nativeBridge()||standalone()||document.fullscreenElement||!document.documentElement.requestFullscreen)return;requestFullscreenContainment()}
function installGlobalGuards(){
  document.addEventListener('click',blockExternalClick,true);document.addEventListener('auxclick',blockExternalClick,true);document.addEventListener('contextmenu',blockNativeGesture,true);document.addEventListener('dragstart',blockNativeGesture,true);document.addEventListener('selectstart',blockNativeGesture,true);document.addEventListener('keydown',onKeyDown,true);window.addEventListener('popstate',onPopState);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&locked)acquireWakeLock()});document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)lockFullscreenOwned=false});document.addEventListener('pointerdown',e=>{if(locked&&!e.target.closest?.('.screen-lock-toggle,.screen-lock-dialog'))maybeReenterFullscreen()},true);
  window.open=(...args)=>{if(locked){toast('화면 잠금 중이라 새 창을 열 수 없어요');return null}return nativeOpen(...args)};
}
function init(){
  const headerBtn=document.querySelector('#screenLockBtn'),floatBtn=ensureFloating();ensureDialog();bindButton(headerBtn);bindButton(floatBtn);installGlobalGuards();
  locked=readLocked();if(locked&&nativeBridge()&&nativeStrictReady()!==true){locked=false;saveLocked();toast('Y700 완전잠금 설정이 필요해서 기존 임시 잠금을 해제했어.')}applyState(false)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.SeowooScreenLock={get locked(){return locked},open:openPinDialog,hasPassword(){return!!readCredential()},get strictReady(){return nativeStrictReady()}};
})();
