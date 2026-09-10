/* One clock drives doors, floor position, display and panorama. */
(()=>{
'use strict';
const IMMERSIVE=new Set(['numberBoard','quantity','numberOrder','finger','elevator','alphabet','englishWords','koreanWords','hangul','color','shape','memory','potty','together']);
const FLOOR_MS=1750,RAMP_MS=600,DOOR_MS=1450;
const clamp=n=>Math.max(1,Math.min(20,Math.round(Number(n)||1)));
let initial=1;try{initial=clamp(sessionStorage.getItem('seowoo-floor'))}catch{}
const state={current:initial,position:initial,start:initial,target:initial,queued:null,phase:'idle',at:0,duration:0,raf:0,paused:null};
let dom=null,panorama=null,lastPaint='';const audio=()=>window.SeowooCore?.audio;
const save=()=>{try{sessionStorage.setItem('seowoo-floor',state.current)}catch{}};
const setText=(el,t)=>{if(el&&el.textContent!==String(t))el.textContent=t};
function schedule(){if(dom&&state.phase!=='idle'&&state.paused===null&&!document.hidden&&!state.raf)state.raf=requestAnimationFrame(tick)}
function phase(name,now){state.phase=name;state.at=now;paint();schedule()}
function paint(){
 if(!dom)return;
 const signature=[state.phase,state.current,state.target,state.queued].join(':');
 if(signature!==lastPaint){lastPaint=signature;dom.shell.dataset.phase=state.phase;dom.shell.dataset.target=state.target;
 setText(dom.floor,state.current);setText(dom.arrow,['preclose','closing','travel'].includes(state.phase)?(state.target>state.start?'▲':'▼'):'•');
 setText(dom.message,state.phase==='travel'?(state.target>state.start?'올라가요':'내려가요'):state.phase==='closing'?'문이 닫혀요':state.phase==='opening'?'문이 열려요':`${state.current}층`);
 dom.keys.forEach(key=>{const n=+key.dataset.floor,selected=state.phase!=='idle'&&n===state.target;key.classList.toggle('here',n===state.current);key.classList.toggle('selected',selected);key.classList.toggle('queued',n===state.queued);key.setAttribute('aria-pressed',String(selected||n===state.queued));if(n===state.current)key.setAttribute('aria-current','true');else key.removeAttribute('aria-current')});}
 let closed=0;const elapsed=performance.now()-state.at,ease=t=>t*t*t*(t*(t*6-15)+10);
 if(state.phase==='closing')closed=ease(Math.min(1,Math.max(0,elapsed/DOOR_MS)));
 else if(state.phase==='travel'||state.phase==='arrival')closed=1;
 else if(state.phase==='opening')closed=1-ease(Math.min(1,Math.max(0,elapsed/DOOR_MS)));
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)closed=['closing','travel','arrival'].includes(state.phase)?1:0;
 dom.left.style.transform=`translate3d(${-101*(1-closed)}%,0,0)`;dom.right.style.transform=`translate3d(${101*(1-closed)}%,0,0)`;panorama?.setFloor(state.position);
}
function begin(target){state.start=state.current;state.target=target;state.position=state.current;state.queued=null;state.duration=Math.abs(target-state.start)*FLOOR_MS+RAMP_MS;audio()?.playVoice('closing');phase('preclose',performance.now())}
function select(value){if(!dom)return;const target=clamp(value);audio()?.button();if(state.phase!=='idle'){state.queued=target===state.target?null:target;paint();return}if(target===state.current){audio()?.playVoice('arrival-'+target);return}begin(target)}
function distance(ms){const total=Math.abs(state.target-state.start);if(ms<RAMP_MS)return ms*ms/(2*RAMP_MS*FLOOR_MS);if(ms>state.duration-RAMP_MS)return total-(state.duration-ms)**2/(2*RAMP_MS*FLOOR_MS);return(ms-RAMP_MS/2)/FLOOR_MS}
function tick(now){state.raf=0;if(!dom?.shell.isConnected){unmount();return}if(document.hidden||state.paused!==null)return;const elapsed=now-state.at;
 if(state.phase==='preclose'&&elapsed>=350){audio()?.doorClose();phase('closing',now)}
 else if(state.phase==='closing'&&elapsed>=DOOR_MS+180){audio()?.motorStart();audio()?.playVoice(state.target>state.start?'up':'down');phase('travel',now)}
 else if(state.phase==='travel'){const moved=distance(Math.min(elapsed,state.duration)),direction=Math.sign(state.target-state.start);state.position=state.start+direction*moved;state.current=clamp(state.position);if(elapsed>=state.duration){state.current=state.target;state.position=state.target;save();audio()?.motorStop();audio()?.ding();phase('arrival',now)}}
 else if(state.phase==='arrival'&&elapsed>=500){audio()?.playVoice('arrival-'+state.current);audio()?.doorOpen();phase('opening',now)}
 else if(state.phase==='opening'&&elapsed>=DOOR_MS)phase('waiting',now);
 else if(state.phase==='waiting'&&elapsed>=1200){const next=state.queued;state.queued=null;phase('idle',now);if(next!==null&&next!==state.current)begin(next)}
 paint();schedule();
}
function unmount(){if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;if(dom){dom.shell.removeEventListener('click',onClick);audio()?.stopAll()}panorama?.destroy();dom=null;panorama=null;state.current=clamp(state.position);state.position=state.current;state.phase='idle';state.queued=null;state.paused=null;lastPaint='';save()}
function onClick(e){const key=e.target.closest('[data-floor]');if(key&&dom?.shell.contains(key))select(key.dataset.floor)}
function mount(shell){if(!shell||dom?.shell===shell)return;unmount();dom={shell,floor:shell.querySelector('#elevatorFloor'),arrow:shell.querySelector('#elevatorArrow'),message:shell.querySelector('#elevatorMsg'),left:shell.querySelector('.door-l'),right:shell.querySelector('.door-r'),keys:[...shell.querySelectorAll('[data-floor]')]};shell.addEventListener('click',onClick);panorama=window.SeowooPanorama.mount(shell.querySelector('.outside-view'));audio()?.preload(['closing','up','down','arrival-'+state.current]);paint()}
function pause(){save();if(!dom||state.paused!==null)return;state.paused=performance.now();cancelAnimationFrame(state.raf);state.raf=0;audio()?.stopAll()}
function resume(){if(!dom||document.hidden)return;if(state.paused!==null){state.at+=performance.now()-state.paused;state.paused=null;if(state.phase==='travel')audio()?.motorStart()}panorama?.resize();paint();schedule()}
document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);
window.SeowooElevator={mount,unmount,select,get current(){return state.current},get phase(){return state.phase},get position(){return state.position}};
function setMode(route){if(route!=='elevator'){unmount();if(!IMMERSIVE.has(route)&&document.fullscreenElement)document.exitFullscreen().catch(()=>{})}document.body.classList.toggle('game-fullscreen',IMMERSIVE.has(route));document.body.classList.toggle('elevator-fullscreen',route==='elevator');document.body.dataset.playRoute=route}
window.addEventListener('seowoo:route',e=>setMode(e.detail.route));
})();
