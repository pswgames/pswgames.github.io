(()=>{'use strict';
function realisticLandscape(){return `<div class="realistic-landscape" aria-hidden="true">
  <div class="rl-sky"></div><div class="rl-sun"></div><div class="rl-cloud rl-c1"></div><div class="rl-cloud rl-c2"></div><div class="rl-cloud rl-c3"></div>
  <div class="rl-mountain rl-m1"></div><div class="rl-mountain rl-m2"></div><div class="rl-haze"></div>
  <div class="rl-city far">${Array.from({length:15},(_,i)=>`<i style="--i:${i};--h:${42+(i*23)%120}px"></i>`).join('')}</div>
  <div class="rl-city near">${Array.from({length:12},(_,i)=>`<i style="--i:${i};--h:${85+(i*37)%210}px"></i>`).join('')}</div>
  <div class="rl-river"><span></span></div><div class="rl-bridge"></div>
  <div class="rl-park"></div><div class="rl-road"><span></span></div>
  <div class="rl-foreground"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
</div>`}
function enhance(){
  const shell=document.querySelector('.elevator-shell');
  if(!shell)return;
  shell.querySelector('.controls')?.remove();
  const track=shell.querySelector('#floorTrack');
  if(track&&!track.querySelector('.realistic-landscape')){
    track.querySelector('.scenic-world')?.setAttribute('hidden','');
    track.insertAdjacentHTML('afterbegin',realisticLandscape());
  }
}
const main=document.querySelector('#main');
if(main){let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;enhance()})}).observe(main,{childList:true,subtree:false})}
window.addEventListener('pageshow',enhance);
setTimeout(enhance,0);
})();