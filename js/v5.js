/* One clock drives doors, floor position, display and panorama. */
(()=>{
'use strict';
const IMMERSIVE=new Set(['numberBoard','quantity','numberOrder','finger','elevator','alphabet','englishWords','koreanWords','hangul','color','shape','memory','potty','together']);
const FLOOR_MS=1750,RAMP_MS=600,DOOR_MS=1450,PRE_CLOSE_MS=350,POST_CLOSE_MS=180,ARRIVAL_MS=500,DOOR_HOLD_MS=1200;
const clamp=n=>Math.max(1,Math.min(20,Math.round(Number(n)||1)));
const clamp01=n=>Math.max(0,Math.min(1,n));
let initial=1;try{initial=clamp(sessionStorage.getItem('seowoo-floor'))}catch{}
const state={current:initial,position:initial,start:initial,target:initial,queued:null,phase:'idle',at:0,duration:0,raf:0,paused:null,door:0,doorFrom:0,doorTo:0,doorDuration:DOOR_MS,closeMode:'manual'};
let dom=null,panorama=null,lastPaint='';const audio=()=>window.SeowooCore?.audio;
const save=()=>{try{sessionStorage.setItem('seowoo-floor',state.current)}catch{}};
const setText=(el,t)=>{if(el&&el.textContent!==String(t))el.textContent=t};
const ease=t=>t*t*t*(t*(t*6-15)+10);
function schedule(){if(dom&&state.phase!=='idle'&&state.phase!=='closed'&&state.paused===null&&!document.hidden&&!state.raf)state.raf=requestAnimationFrame(tick)}
function phase(name,now){state.phase=name;state.at=now;paint();schedule()}
function doorFraction(now=performance.now()){
 if(state.phase==='closing'||state.phase==='opening'){
  const t=state.doorDuration<=0?1:clamp01((now-state.at)/state.doorDuration);
  return state.doorFrom+(state.doorTo-state.doorFrom)*ease(t);
 }
 if(state.phase==='travel'||state.phase==='arrival'||state.phase==='closed')return 1;
 if(state.phase==='idle'||state.phase==='waiting'||state.phase==='preclose')return state.door;
 return state.door;
}
function animateDoor(to,now,mode='manual'){
 const from=doorFraction(now);state.door=from;state.doorFrom=from;state.doorTo=to;state.closeMode=mode;
 state.doorDuration=Math.max(120,DOOR_MS*Math.abs(to-from));
 phase(to?'closing':'opening',now);
}
function prepareTrip(target){
 state.start=state.current;state.target=target;state.position=state.current;state.queued=null;state.duration=Math.abs(target-state.start)*FLOOR_MS+RAMP_MS;
}
function begin(target){
 prepareTrip(target);audio()?.playVoice('closing');
 if(doorFraction()>.985){state.door=1;state.doorFrom=1;state.doorTo=1;state.doorDuration=0;state.closeMode='trip';phase('closing',performance.now());return}
 state.door=0;phase('preclose',performance.now());
}
function doorLabel(){
 if(state.phase==='travel')return state.target>state.start?'올라가요':'내려가요';
 if(state.phase==='preclose'||state.phase==='closing')return'문이 닫혀요';
 if(state.phase==='opening')return'문이 열려요';
 if(state.phase==='closed')return'문이 닫혀 있어요';
 return`${state.current}층`;
}
function updateControls(){
 if(!dom)return;const moving=state.phase==='travel';
 if(dom.open){dom.open.disabled=moving;dom.open.setAttribute('aria-disabled',String(moving));}
 const closeDisabled=moving||state.phase==='closing'||state.phase==='closed'||state.phase==='arrival';
 if(dom.close){dom.close.disabled=closeDisabled;dom.close.setAttribute('aria-disabled',String(closeDisabled));}
}
function paint(){
 if(!dom)return;
 const signature=[state.phase,state.current,state.target,state.queued,state.closeMode].join(':');
 if(signature!==lastPaint){lastPaint=signature;dom.shell.dataset.phase=state.phase;dom.shell.dataset.target=state.target;
 setText(dom.floor,state.current);setText(dom.arrow,['preclose','closing','travel'].includes(state.phase)&&state.target!==state.start?(state.target>state.start?'▲':'▼'):'•');
 setText(dom.message,doorLabel());
 dom.keys.forEach(key=>{const n=+key.dataset.floor,selected=['preclose','closing','travel','arrival'].includes(state.phase)&&n===state.target;key.classList.toggle('here',n===state.current);key.classList.toggle('selected',selected);key.classList.toggle('queued',n===state.queued);key.setAttribute('aria-pressed',String(selected||n===state.queued));if(n===state.current)key.setAttribute('aria-current','true');else key.removeAttribute('aria-current')});updateControls();}
 let closed=doorFraction();if(matchMedia('(prefers-reduced-motion: reduce)').matches)closed=['closing','travel','arrival','closed'].includes(state.phase)?1:0;
 state.door=closed;dom.shell.style.setProperty('--door-closed',closed.toFixed(3));
 dom.left.style.transform=`translate3d(${-101*(1-closed)}%,0,0)`;dom.right.style.transform=`translate3d(${101*(1-closed)}%,0,0)`;panorama?.setFloor(state.position);
}
function select(value){
 if(!dom)return;const target=clamp(value);audio()?.button();
 if(state.phase==='closed'){
  if(target===state.current){requestOpen();return}
  begin(target);return;
 }
 if(state.phase==='closing'&&state.closeMode==='manual'&&target!==state.current){
  state.start=state.current;state.target=target;state.position=state.current;state.queued=null;state.duration=Math.abs(target-state.start)*FLOOR_MS+RAMP_MS;state.closeMode='trip';paint();schedule();return;
 }
 if(state.phase!=='idle'){
  state.queued=target===state.target?null:target;paint();return;
 }
 if(target===state.current){audio()?.playVoice('arrival-'+target);requestOpen(true);return}
 begin(target);
}
function requestOpen(quiet=false){
 if(!dom||state.phase==='travel')return false;if(!quiet)audio()?.button();const now=performance.now();
 if(state.phase==='idle'||state.phase==='waiting'){
  state.door=0;phase('waiting',now);return true;
 }
 if(state.phase==='arrival'){
  state.target=state.current;audio()?.doorOpen();animateDoor(0,now,'manual');return true;
 }
 if(state.phase==='preclose'||state.phase==='closing'){
  if((state.phase==='preclose'||state.closeMode==='trip')&&state.target!==state.current){state.queued=state.target;state.target=state.current;state.start=state.current}
  audio()?.doorOpen();animateDoor(0,now,'manual');return true;
 }
 if(state.phase==='closed'){
  audio()?.doorOpen();animateDoor(0,now,'manual');return true;
 }
 if(state.phase==='opening')return true;
 return false;
}
function requestClose(){
 if(!dom)return false;audio()?.button();const now=performance.now();
 if(state.phase==='travel'||state.phase==='arrival'||state.phase==='closing'||state.phase==='closed')return false;
 if(state.phase==='preclose'){
  audio()?.doorClose();animateDoor(1,now,'trip');return true;
 }
 if((state.phase==='opening'||state.phase==='waiting'||state.phase==='idle')&&state.queued!==null&&state.queued!==state.current){
  const next=state.queued;prepareTrip(next);audio()?.doorClose();animateDoor(1,now,'trip');return true;
 }
 if(state.phase==='opening'||state.phase==='waiting'||state.phase==='idle'){
  audio()?.doorClose();animateDoor(1,now,'manual');return true;
 }
 return false;
}
function distance(ms){const total=Math.abs(state.target-state.start);if(ms<RAMP_MS)return ms*ms/(2*RAMP_MS*FLOOR_MS);if(ms>state.duration-RAMP_MS)return total-(state.duration-ms)**2/(2*RAMP_MS*FLOOR_MS);return(ms-RAMP_MS/2)/FLOOR_MS}
function tick(now){
 state.raf=0;if(!dom?.shell.isConnected){unmount();return}if(document.hidden||state.paused!==null)return;const elapsed=now-state.at;
 if(state.phase==='preclose'&&elapsed>=PRE_CLOSE_MS){audio()?.doorClose();state.door=0;animateDoor(1,now,'trip')}
 else if(state.phase==='closing'&&elapsed>=state.doorDuration+(state.closeMode==='trip'?POST_CLOSE_MS:0)){
  state.door=1;
  if(state.closeMode==='trip'&&state.target!==state.current){audio()?.motorStart();audio()?.playVoice(state.target>state.start?'up':'down');phase('travel',now)}
  else phase('closed',now);
 }
 else if(state.phase==='travel'){
  const moved=distance(Math.min(elapsed,state.duration)),direction=Math.sign(state.target-state.start);state.position=state.start+direction*moved;state.current=clamp(state.position);
  if(elapsed>=state.duration){state.current=state.target;state.position=state.target;state.door=1;save();audio()?.motorStop();audio()?.ding();phase('arrival',now)}
 }
 else if(state.phase==='arrival'&&elapsed>=ARRIVAL_MS){audio()?.playVoice('arrival-'+state.current);audio()?.doorOpen();state.door=1;animateDoor(0,now,'arrival')}
 else if(state.phase==='opening'&&elapsed>=state.doorDuration){state.door=0;phase('waiting',now)}
 else if(state.phase==='waiting'&&elapsed>=DOOR_HOLD_MS){const next=state.queued;state.queued=null;phase('idle',now);if(next!==null&&next!==state.current)begin(next)}
 paint();schedule();
}
function ensureDoorControls(shell){
 const panel=shell.querySelector('.floor-panel');if(!panel)return{open:null,close:null};
 let controls=panel.querySelector('.door-controls');
 if(!controls){controls=document.createElement('div');controls.className='door-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','엘리베이터 문 조작');controls.innerHTML='<button type="button" class="door-control door-open" data-door-action="open" aria-label="엘리베이터 문 열기"><span class="door-symbol" aria-hidden="true">◁&nbsp;&nbsp;▷</span><small>열림</small></button><button type="button" class="door-control door-close" data-door-action="close" aria-label="엘리베이터 문 닫기"><span class="door-symbol" aria-hidden="true">▷&nbsp;&nbsp;◁</span><small>닫힘</small></button>';panel.append(controls)}
 return{open:controls.querySelector('[data-door-action="open"]'),close:controls.querySelector('[data-door-action="close"]')};
}
function unmount(){if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;if(dom){dom.shell.removeEventListener('click',onClick);audio()?.stopAll()}panorama?.destroy();dom=null;panorama=null;state.current=clamp(state.position);state.position=state.current;state.target=state.current;state.phase='idle';state.queued=null;state.paused=null;state.door=0;state.doorFrom=0;state.doorTo=0;state.closeMode='manual';lastPaint='';save()}
function onClick(e){
 const door=e.target.closest('[data-door-action]');if(door&&dom?.shell.contains(door)){door.dataset.doorAction==='open'?requestOpen():requestClose();return}
 const key=e.target.closest('[data-floor]');if(key&&dom?.shell.contains(key))select(key.dataset.floor)
}
function mount(shell){
 if(!shell||dom?.shell===shell)return;unmount();const controls=ensureDoorControls(shell);
 dom={shell,floor:shell.querySelector('#elevatorFloor'),arrow:shell.querySelector('#elevatorArrow'),message:shell.querySelector('#elevatorMsg'),left:shell.querySelector('.door-l'),right:shell.querySelector('.door-r'),keys:[...shell.querySelectorAll('[data-floor]')],open:controls.open,close:controls.close};
 shell.addEventListener('click',onClick);panorama=window.SeowooPanorama.mount(shell.querySelector('.outside-view'));audio()?.preload(['closing','up','down','arrival-'+state.current]);state.door=0;paint()
}
function pause(){save();if(!dom||state.paused!==null)return;state.paused=performance.now();cancelAnimationFrame(state.raf);state.raf=0;audio()?.stopAll()}
function resume(){if(!dom||document.hidden)return;if(state.paused!==null){state.at+=performance.now()-state.paused;state.paused=null;if(state.phase==='travel')audio()?.motorStart()}panorama?.resize();paint();schedule()}
document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);
window.SeowooElevator={mount,unmount,select,openDoor:requestOpen,closeDoor:requestClose,get current(){return state.current},get phase(){return state.phase},get position(){return state.position}};
function setMode(route){if(route!=='elevator'){unmount();if(!IMMERSIVE.has(route)&&document.fullscreenElement)document.exitFullscreen().catch(()=>{})}document.body.classList.toggle('game-fullscreen',IMMERSIVE.has(route));document.body.classList.toggle('elevator-fullscreen',route==='elevator');document.body.dataset.playRoute=route}
window.addEventListener('seowoo:route',e=>setMode(e.detail.route));
})();
