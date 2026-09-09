/* v5.14.0 — polished elevator motion, door feedback and sound timing. */
(()=>{
  'use strict';
  const IMMERSIVE=new Set(['numberBoard','quantity','numberOrder','finger','elevator','alphabet','englishWords','koreanWords','hangul','color','shape','memory','potty','together']);
  const FLOOR_MS=1750,RAMP_MS=250,DOOR_MS=1250,DWELL_MS=360;
  const clampFloor=n=>Math.max(1,Math.min(20,Number(n)||1));
  const state={current:1,position:1,start:1,target:1,queued:null,phase:'idle',phaseStart:0,duration:0,raf:0,pausedAt:null};
  let dom=null,panorama=null;
  const audio=()=>window.SeowooCore?.audio;
  function text(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
  function schedule(){if(dom&&state.phase!=='idle'&&state.pausedAt===null&&!document.hidden&&!state.raf)state.raf=requestAnimationFrame(tick)}
  function paint(){
    if(!dom)return;const travelling=state.phase==='travel';
    dom.shell.dataset.phase=state.phase;dom.shell.dataset.position=state.position.toFixed(4);dom.shell.dataset.target=String(state.target);
    text(dom.floor,state.current);text(dom.arrow,state.phase==='closing'||travelling?(state.target>state.start?'▲':'▼'):'•');
    dom.cabin.classList.toggle('moving',travelling);dom.frame.classList.toggle('doors-closed',state.phase==='closing'||travelling);
    dom.keys.forEach(key=>{const floor=+key.dataset.floor;key.classList.toggle('here',floor===state.current);key.classList.toggle('selected',state.phase!=='idle'&&floor===state.target);key.classList.toggle('queued',floor===state.queued);key.setAttribute('aria-pressed',String((state.phase!=='idle'&&floor===state.target)||floor===state.queued));if(floor===state.current)key.setAttribute('aria-current','true');else key.removeAttribute('aria-current')});
    if(dom.message){let message=`${state.current}층`;if(state.phase==='closing')message=`${state.target}층으로 출발`;else if(travelling)message=`현재 ${state.current}층`;else if(state.phase==='opening'||state.phase==='waiting')message=`${state.current}층 도착`;text(dom.message,message)}
    panorama?.setFloor(state.position);
  }
  function begin(target){
    if(!dom)return;state.start=state.current;state.target=target;state.position=state.current;state.queued=null;state.phase='closing';state.phaseStart=performance.now();state.duration=Math.abs(target-state.start)*FLOOR_MS+RAMP_MS;
    paint();audio()?.unlock();audio()?.doorClose?.();audio()?.speak(`${target}층, ${target>state.start?'올라갑니다':'내려갑니다'}`);schedule();
  }
  function select(target){
    if(!dom)return;target=Math.round(clampFloor(target));audio()?.button?.();
    if(state.phase!=='idle'){state.queued=target===state.target?null:target;paint();return}
    if(target===state.current){audio()?.ding?.();audio()?.speak(`${target}층 입니다`);return}
    begin(target);
  }
  function travelled(ms){const distance=Math.abs(state.target-state.start);if(ms<=RAMP_MS)return ms*ms/(2*RAMP_MS*FLOOR_MS);if(ms>=state.duration-RAMP_MS)return distance-Math.pow(state.duration-ms,2)/(2*RAMP_MS*FLOOR_MS);return(ms-RAMP_MS/2)/FLOOR_MS}
  function tick(now){
    state.raf=0;if(!dom||!dom.shell.isConnected){unmount();return}if(document.hidden||state.pausedAt!==null)return;let elapsed=Math.max(0,now-state.phaseStart);
    if(state.phase==='closing'&&elapsed>=DOOR_MS){state.phase='travel';state.phaseStart+=DOOR_MS;audio()?.motorStart?.();elapsed=Math.max(0,now-state.phaseStart)}
    if(state.phase==='travel'){
      const ms=Math.min(state.duration,Math.max(0,now-state.phaseStart));const direction=Math.sign(state.target-state.start),distance=Math.abs(state.target-state.start);const moved=Math.max(0,Math.min(distance,travelled(ms)));state.position=state.start+direction*moved;state.current=state.start+direction*Math.min(distance-1,Math.floor(moved+1e-7));
      if(ms>=state.duration){state.current=state.target;state.position=state.target;state.phase='opening';state.phaseStart=now;audio()?.motorStop?.();audio()?.ding?.();audio()?.doorOpen?.();setTimeout(()=>audio()?.speak(`${state.current}층 입니다`),120)}
    }else if(state.phase==='opening'&&elapsed>=DOOR_MS){state.phase='waiting';state.phaseStart=now}
    else if(state.phase==='waiting'&&elapsed>=DWELL_MS){const next=state.queued;state.queued=null;state.phase='idle';if(next!==null&&next!==state.current){begin(next);return}}
    paint();schedule();
  }
  function unmount(){if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;if(dom)dom.shell.removeEventListener('click',onFloorClick);panorama?.destroy();panorama=null;dom=null;state.current=Math.round(clampFloor(state.position));state.position=state.current;state.target=state.current;state.phase='idle';state.queued=null;state.pausedAt=null}
  function onFloorClick(event){const key=event.target.closest('[data-floor]');if(key&&dom?.shell.contains(key))select(key.dataset.floor)}
  function mount(shell){if(!shell||shell===dom?.shell)return;unmount();dom={shell,floor:shell.querySelector('#elevatorFloor'),arrow:shell.querySelector('#elevatorArrow'),message:shell.querySelector('#elevatorMsg'),cabin:shell.querySelector('.glass-cabin'),frame:shell.querySelector('.cabin-frame'),keys:[...shell.querySelectorAll('[data-floor]')]};shell.addEventListener('click',onFloorClick);panorama=window.SeowooPanorama.mount(shell.querySelector('.outside-view'));paint()}
  function pause(){if(!dom||state.pausedAt!==null)return;state.pausedAt=performance.now();if(state.raf)cancelAnimationFrame(state.raf);state.raf=0}
  function resume(){if(!dom||document.hidden)return;if(state.pausedAt!==null)state.phaseStart+=performance.now()-state.pausedAt;state.pausedAt=null;panorama?.resize();schedule()}
  document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());window.addEventListener('pagehide',pause);window.addEventListener('pageshow',resume);window.SeowooElevator={mount,unmount,select,get current(){return state.current}};
  const isIOS=/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  function setMode(route,native=false){if(route!=='elevator')unmount();const immersive=IMMERSIVE.has(route);document.body.classList.toggle('game-fullscreen',immersive);document.body.classList.toggle('elevator-fullscreen',route==='elevator');document.body.dataset.playRoute=route;if(immersive&&native&&!isIOS&&!matchMedia('(display-mode: standalone)').matches){try{const result=document.documentElement.requestFullscreen?.({navigationUI:'hide'});result?.catch(()=>{})}catch(e){}}else if(!immersive&&document.fullscreenElement){try{document.exitFullscreen()?.catch(()=>{})}catch(e){}}}
  document.addEventListener('click',event=>{const target=event.target.closest('[data-go]');if(target)setMode(target.dataset.go,true)},true);window.addEventListener('seowoo:route',event=>setMode(event.detail.route));
})();
