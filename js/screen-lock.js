/* Seowoo Playground child lock. PWA containment only; OS home/app-switcher require device kiosk/guided-access mode. */
(()=>{
'use strict';

const STORAGE_KEY='seowoo-screen-lock-v1';
const HOLD_MS=5000;
let locked=false;
let holdTimer=0;
let holdPointer=null;
let holdCompleted=false;
let wakeLock=null;
let historyGuard=false;
let lockFullscreenOwned=false;
const nativeOpen=window.open.bind(window);

const body=()=>document.body;
const toast=msg=>{try{window.SeowooCore?.toast?.(msg)}catch{}};
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;

function readLocked(){
  try{return localStorage.getItem(STORAGE_KEY)==='1'}catch{return false}
}
function saveLocked(){
  try{localStorage.setItem(STORAGE_KEY,locked?'1':'0')}catch{}
}
function lockMarkup(id,compact=false){
  return `<button id="${id}" type="button" class="screen-lock-toggle${compact?' compact':''}" aria-pressed="false" aria-label="화면 잠금 꺼짐. 5초간 누르면 켜짐">
    <svg class="screen-lock-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="10" width="14" height="10" rx="3"></rect><path class="lock-shackle" d="M8 10V7a4 4 0 0 1 8 0v3"></path>
    </svg>
    <span class="screen-lock-label">${compact?'잠금':'화면잠금'}</span>
    <strong class="screen-lock-state">OFF</strong>
    <i class="screen-lock-progress" aria-hidden="true"></i>
  </button>`;
}
function ensureFloating(){
  let host=document.querySelector('#screenLockFloatHost');
  if(host)return host.querySelector('.screen-lock-toggle');
  host=document.createElement('div');
  host.id='screenLockFloatHost';
  host.className='screen-lock-float-host';
  host.innerHTML=lockMarkup('screenLockFloat',true);
  document.body.append(host);
  return host.querySelector('.screen-lock-toggle');
}
function buttons(){
  return [...document.querySelectorAll('.screen-lock-toggle')];
}
function syncButtons(){
  for(const btn of buttons()){
    btn.classList.toggle('on',locked);
    btn.setAttribute('aria-pressed',String(locked));
    btn.setAttribute('aria-label',locked?'화면 잠금 켜짐. 5초간 누르면 꺼짐':'화면 잠금 꺼짐. 5초간 누르면 켜짐');
    const state=btn.querySelector('.screen-lock-state');
    if(state)state.textContent=locked?'ON':'OFF';
  }
}
async function acquireWakeLock(){
  if(!locked||document.visibilityState!=='visible'||!('wakeLock' in navigator))return;
  try{
    wakeLock=await navigator.wakeLock.request('screen');
    wakeLock.addEventListener?.('release',()=>{wakeLock=null},{once:true});
  }catch{}
}
async function releaseWakeLock(){
  try{await wakeLock?.release()}catch{}
  wakeLock=null;
}
function armHistoryGuard(){
  if(historyGuard)return;
  try{
    history.pushState({...((history.state&&typeof history.state==='object')?history.state:{}),seowooLockGuard:true},'',location.href);
    historyGuard=true;
  }catch{}
}
function releaseHistoryGuard(){
  if(!historyGuard)return;
  historyGuard=false;
  try{
    if(history.state?.seowooLockGuard)history.back();
  }catch{}
}
function applyState(announce=false){
  document.documentElement.classList.toggle('screen-locked',locked);
  document.body.classList.toggle('screen-locked',locked);
  document.documentElement.dataset.screenLock=locked?'on':'off';
  syncButtons();
  if(locked){
    armHistoryGuard();
    acquireWakeLock();
  }else{
    releaseHistoryGuard();
    releaseWakeLock();
  }
  window.dispatchEvent(new CustomEvent('seowoo:screenlock',{detail:{locked}}));
  if(announce)toast(locked?'화면 잠금 ON · 5초간 누르면 해제돼요':'화면 잠금 OFF');
}
function setLocked(next,announce=true){
  if(locked===next)return;
  locked=next;
  saveLocked();
  applyState(announce);
  try{navigator.vibrate?.(locked?[45,55,80]:[80,45,45])}catch{}
}
async function requestFullscreenContainment(){
  if(!locked||standalone()||document.fullscreenElement||!document.documentElement.requestFullscreen)return;
  try{
    await document.documentElement.requestFullscreen({navigationUI:'hide'});
    lockFullscreenOwned=true;
  }catch{}
}
async function releaseFullscreenContainment(){
  if(!lockFullscreenOwned)return;
  lockFullscreenOwned=false;
  try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
}
function clearHold(btn){
  clearTimeout(holdTimer);
  holdTimer=0;
  holdPointer=null;
  btn?.classList.remove('holding');
  btn?.closest?.('.screen-lock-float-host')?.classList.remove('hold-active');
}
function startHold(e){
  const btn=e.currentTarget;
  if(btn.disabled)return;
  if(typeof e.button==='number'&&e.button!==0)return;
  e.preventDefault();
  clearTimeout(holdTimer);
  holdPointer=e.pointerId;
  holdCompleted=false;
  btn.classList.add('holding');
  btn.closest('.screen-lock-float-host')?.classList.add('hold-active');
  try{btn.setPointerCapture(e.pointerId)}catch{}
  holdTimer=setTimeout(()=>{
    holdTimer=0;
    holdCompleted=true;
    setLocked(!locked,true);
  },HOLD_MS);
}
function endHold(e){
  const btn=e.currentTarget;
  if(holdPointer!==null&&e.pointerId!==holdPointer)return;
  e.preventDefault();
  const completed=holdCompleted;
  const nowLocked=locked;
  clearHold(btn);
  holdCompleted=false;
  try{if(btn.hasPointerCapture?.(e.pointerId))btn.releasePointerCapture(e.pointerId)}catch{}
  if(completed){
    if(nowLocked)requestFullscreenContainment();
    else releaseFullscreenContainment();
  }
}
function cancelHold(e){
  const btn=e.currentTarget;
  if(holdPointer!==null&&e.pointerId!==holdPointer)return;
  clearHold(btn);
  holdCompleted=false;
}
function bindButton(btn){
  if(!btn||btn.dataset.screenLockBound==='1')return;
  btn.dataset.screenLockBound='1';
  btn.addEventListener('pointerdown',startHold);
  btn.addEventListener('pointerup',endHold);
  btn.addEventListener('pointercancel',cancelHold);
  btn.addEventListener('lostpointercapture',cancelHold);
  btn.addEventListener('contextmenu',e=>e.preventDefault());
  btn.addEventListener('dragstart',e=>e.preventDefault());
  btn.addEventListener('click',e=>e.preventDefault());
}
function blockExternalClick(e){
  if(!locked)return;
  const a=e.target.closest?.('a[href],area[href]');
  if(!a)return;
  let url;
  try{url=new URL(a.href,location.href)}catch{return}
  if(url.origin!==location.origin||a.target==='_blank'||a.hasAttribute('download')){
    e.preventDefault();
    e.stopImmediatePropagation();
    toast('화면 잠금 중이라 서우 놀이터 밖으로 나갈 수 없어요');
  }
}
function blockNativeGesture(e){
  if(!locked)return;
  e.preventDefault();
}
function onPopState(){
  if(!locked)return;
  try{
    history.pushState({seowooLockGuard:true},'',location.href);
    historyGuard=true;
  }catch{}
  toast('화면 잠금 중이에요');
}
function onKeyDown(e){
  if(!locked)return;
  const browserBack=(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))||e.key==='BrowserBack'||e.key==='BrowserForward';
  if(browserBack){
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}
function maybeReenterFullscreen(){
  if(!locked||standalone()||document.fullscreenElement||!document.documentElement.requestFullscreen)return;
  requestFullscreenContainment();
}
function installGlobalGuards(){
  document.addEventListener('click',blockExternalClick,true);
  document.addEventListener('auxclick',blockExternalClick,true);
  document.addEventListener('contextmenu',blockNativeGesture,true);
  document.addEventListener('dragstart',blockNativeGesture,true);
  document.addEventListener('selectstart',blockNativeGesture,true);
  document.addEventListener('keydown',onKeyDown,true);
  window.addEventListener('popstate',onPopState);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&locked)acquireWakeLock();
  });
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement)lockFullscreenOwned=false;
  });
  document.addEventListener('pointerdown',e=>{
    if(locked&&!e.target.closest?.('.screen-lock-toggle'))maybeReenterFullscreen();
  },true);
  window.open=(...args)=>{
    if(locked){
      toast('화면 잠금 중이라 새 창을 열 수 없어요');
      return null;
    }
    return nativeOpen(...args);
  };
}
function init(){
  const headerBtn=document.querySelector('#screenLockBtn');
  const floatBtn=ensureFloating();
  bindButton(headerBtn);
  bindButton(floatBtn);
  installGlobalGuards();
  locked=readLocked();
  applyState(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

window.SeowooScreenLock={
  get locked(){return locked},
  lock(){setLocked(true)},
  unlock(){setLocked(false)}
};
})();
