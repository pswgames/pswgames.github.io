(()=>{'use strict';
const IMMERSIVE=new Set(['numberBoard','quantity','numberOrder','finger','elevator','alphabet','englishWords','koreanWords','hangul','color','shape','memory','potty','together']);
const MENU=new Set(['home','numbers','language','think','music','treasure','parent']);
const smoothElevator={current:1,moving:false,raf:0,startTime:0,startFloor:1,targetFloor:1,duration:0,queued:null};
const ua=navigator.userAgent||'';
const isIOS=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;

function tryEnterNativeFullscreen(){
  if(isIOS||isStandalone)return;
  try{
    if(document.fullscreenElement)return;
    const el=document.documentElement;
    if(el.requestFullscreen){
      const p=el.requestFullscreen({navigationUI:'hide'});
      if(p&&p.catch)p.catch(()=>{});
    }
  }catch(e){}
}
function tryExitNativeFullscreen(){
  try{
    if(document.fullscreenElement&&document.exitFullscreen){
      const p=document.exitFullscreen();
      if(p&&p.catch)p.catch(()=>{});
    }
  }catch(e){}
}
function stopSmoothMotion(){
  if(smoothElevator.raf)cancelAnimationFrame(smoothElevator.raf);
  smoothElevator.raf=0;
  smoothElevator.moving=false;
  smoothElevator.queued=null;
}
function setMode(dest,{native=false}={}){
  const immersive=IMMERSIVE.has(dest);
  const prev=document.body.dataset.playRoute||'';
  if(prev==='elevator'&&dest!=='elevator')stopSmoothMotion();
  document.body.classList.toggle('game-fullscreen',immersive);
  document.body.classList.toggle('elevator-fullscreen',dest==='elevator');
  document.body.dataset.playRoute=dest||'';
  if(immersive&&native)tryEnterNativeFullscreen();
  else if(MENU.has(dest))tryExitNativeFullscreen();
}
function scenicMarkup(){return`<div class="scenic-world" aria-hidden="true"><div class="scenic-cloud c1"></div><div class="scenic-cloud c2"></div><div class="scenic-cloud c3"></div><div class="scenic-haze"></div><div class="scenic-ridge"></div><div class="scenic-skyline"><div class="scenic-building b1"></div><div class="scenic-building b2"></div><div class="scenic-building b3"></div><div class="scenic-building b4 crown"></div><div class="scenic-building b5"></div><div class="scenic-building b6"></div><div class="scenic-building b7"></div><div class="scenic-building b8"></div></div><div class="scenic-river"></div><div class="scenic-park"></div><div class="scenic-road"></div><div class="scenic-trees">🌳 🌲 🌳 🌲 🌳 🌲 🌳 🌲 🌳</div></div>`}
function trackY(floor){return -(30-floor)*92}
function eased(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
function setTextIfChanged(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
function syncElevatorDom(floorFloat,final=false){
  const floorEl=document.querySelector('#elevatorFloor');
  const arrow=document.querySelector('#elevatorArrow');
  const track=document.querySelector('#floorTrack');
  const msg=document.querySelector('#elevatorMsg');
  const shown=Math.max(1,Math.min(20,Math.round(floorFloat)));
  setTextIfChanged(floorEl,shown);
  if(track){track.style.transition='none';track.style.transform=`translate3d(0,${trackY(floorFloat)}px,0)`}
  document.querySelectorAll('.floor-key').forEach(b=>b.classList.toggle('here',+b.dataset.floor===shown));
  if(arrow)setTextIfChanged(arrow,smoothElevator.moving?(smoothElevator.targetFloor>smoothElevator.startFloor?'▲':'▼'):'•');
  if(msg&&smoothElevator.moving&&!final){
    const dir=smoothElevator.targetFloor>smoothElevator.startFloor?'올라가는':'내려가는';
    const text=`${smoothElevator.targetFloor}층으로 ${dir} 중 · 현재 ${shown}층`;
    setTextIfChanged(msg,text);
  }
}
function finishSmoothElevator(){
  if(smoothElevator.raf)cancelAnimationFrame(smoothElevator.raf);
  smoothElevator.raf=0;
  smoothElevator.current=smoothElevator.targetFloor;
  smoothElevator.moving=false;
  syncElevatorDom(smoothElevator.current,true);
  document.querySelector('.glass-cabin')?.classList.remove('moving');
  document.querySelector('.cabin-frame')?.classList.remove('doors-closed');
  const msg=document.querySelector('#elevatorMsg');
  if(msg)setTextIfChanged(msg,`딩동! ${smoothElevator.current}층에 도착했어요!`);
  const K=window.SeowooCore;
  if(K&&K.audio){K.audio.success();K.audio.speak(`${smoothElevator.current}층 입니다`)}
  const queued=smoothElevator.queued;
  smoothElevator.queued=null;
  if(queued&&queued!==smoothElevator.current)setTimeout(()=>startSmoothElevator(queued),450);
}
function stepSmoothElevator(now){
  if(!smoothElevator.moving||!document.querySelector('.elevator-shell')){stopSmoothMotion();return}
  const raw=Math.min(1,(now-smoothElevator.startTime)/smoothElevator.duration);
  const p=eased(raw);
  const floor=smoothElevator.startFloor+(smoothElevator.targetFloor-smoothElevator.startFloor)*p;
  syncElevatorDom(floor,false);
  if(raw<1)smoothElevator.raf=requestAnimationFrame(stepSmoothElevator);
  else finishSmoothElevator();
}
function startSmoothElevator(target){
  target=Math.max(1,Math.min(20,Number(target)||1));
  if(smoothElevator.moving){smoothElevator.queued=target;return}
  if(target===smoothElevator.current){
    const K=window.SeowooCore;
    if(K&&K.audio){K.audio.success();K.audio.speak(`${target}층 입니다`)}
    return;
  }
  smoothElevator.startFloor=smoothElevator.current;
  smoothElevator.targetFloor=target;
  smoothElevator.moving=true;
  const goingUp=target>smoothElevator.startFloor;
  const distance=Math.abs(target-smoothElevator.startFloor);
  smoothElevator.duration=Math.min(12000,Math.max(2400,1500+distance*520));
  smoothElevator.startTime=performance.now()+320;
  document.querySelector('.glass-cabin')?.classList.add('moving');
  document.querySelector('.cabin-frame')?.classList.add('doors-closed');
  const msg=document.querySelector('#elevatorMsg');
  if(msg)setTextIfChanged(msg,`${target}층으로 ${goingUp?'올라갑니다':'내려갑니다'}`);
  const K=window.SeowooCore;
  if(K&&K.audio)K.audio.speak(`${target}층, ${goingUp?'올라갑니다':'내려갑니다'}`);
  setTimeout(()=>{
    if(smoothElevator.moving&&document.querySelector('.elevator-shell')){
      smoothElevator.startTime=performance.now();
      smoothElevator.raf=requestAnimationFrame(stepSmoothElevator);
    }
  },320);
}
function upgradeElevator(){
  const track=document.querySelector('#floorTrack');
  if(!track||track.dataset.v5==='1')return;
  track.dataset.v5='1';
  track.insertAdjacentHTML('afterbegin',scenicMarkup());
  const cabin=document.querySelector('.glass-cabin');
  if(cabin)cabin.classList.add('premium-panorama');
  document.querySelectorAll('.floor-key').forEach(btn=>{
    const f=btn.textContent.trim();
    btn.setAttribute('aria-label',`${f}층`);
    btn.title=`${f}층`;
  });
  syncElevatorDom(smoothElevator.current,true);
}
function detectCurrentScreen(){
  const main=document.querySelector('#main');
  if(!main)return;
  if(main.querySelector('.elevator-shell')){
    upgradeElevator();
    if(document.body.dataset.playRoute!=='elevator')setMode('elevator');
    return;
  }
  if(main.querySelector('.bathroom-scene')){
    if(document.body.dataset.playRoute!=='potty')setMode('potty');
  }
}

document.addEventListener('click',e=>{
  const floorBtn=e.target.closest('.floor-key');
  if(floorBtn&&document.querySelector('.elevator-shell')){
    e.preventDefault();
    e.stopImmediatePropagation();
    startSmoothElevator(+floorBtn.dataset.floor);
    return;
  }
  const homeBtn=e.target.closest('#elevatorHome');
  if(homeBtn&&document.querySelector('.elevator-shell')){
    e.preventDefault();
    e.stopImmediatePropagation();
    startSmoothElevator(1);
    return;
  }
},true);

document.addEventListener('click',e=>{
  const target=e.target.closest('[data-go]');
  if(!target)return;
  const dest=target.dataset.go;
  if(IMMERSIVE.has(dest)||MENU.has(dest))setMode(dest,{native:IMMERSIVE.has(dest)});
},true);

document.addEventListener('fullscreenchange',()=>{
  if(!document.fullscreenElement&&IMMERSIVE.has(document.body.dataset.playRoute||''))document.body.classList.add('game-fullscreen');
});

const main=document.querySelector('#main');
if(main){
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;detectCurrentScreen()});
  }).observe(main,{childList:true});
}
window.addEventListener('pageshow',detectCurrentScreen);
setTimeout(detectCurrentScreen,0);
})();