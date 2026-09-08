(()=>{'use strict';
function photoLandscape(){return `<div class="realistic-landscape photo-landscape" aria-hidden="true"></div>`}
function enhance(){
  const shell=document.querySelector('.elevator-shell');
  if(!shell)return;
  shell.querySelector('.controls')?.remove();
  const track=shell.querySelector('#floorTrack');
  if(track&&!track.querySelector('.photo-landscape')){
    track.querySelector('.scenic-world')?.setAttribute('hidden','');
    track.querySelector('.realistic-landscape')?.remove();
    track.insertAdjacentHTML('afterbegin',photoLandscape());
  }
}
const main=document.querySelector('#main');
if(main){let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;enhance()})}).observe(main,{childList:true,subtree:false})}
window.addEventListener('pageshow',enhance);
setTimeout(enhance,0);
})();