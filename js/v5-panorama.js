(()=>{'use strict';
const TILES=[0,1,2,3,4].map(i=>`/assets/elevator-city-tile-${i}.avif?v=5.11.0`);
let view=null,strip=null,styleObserver=null,resizeRaf=0;
const clamp=n=>Math.max(0,Math.min(1,n));
function progress(){if(!view)return 0;const pos=view.style.backgroundPosition||'';const m=pos.match(/(-?\d+(?:\.\d+)?)%/);const y=m?parseFloat(m[1]):100;return clamp((100-y)/100)}
function sync(){if(!view||!strip||!document.body.contains(view))return;const maxShift=Math.max(0,strip.scrollHeight-view.clientHeight);strip.style.transform=`translate3d(0,${(-maxShift*progress()).toFixed(2)}px,0)`}
function makeStrip(){const s=document.createElement('div');s.className='elevator-photo-strip';TILES.forEach((src,i)=>{const img=document.createElement('img');img.alt='';img.decoding='async';img.loading='eager';if(i<2)img.fetchPriority='high';img.src=src;img.addEventListener('load',sync,{passive:true});s.appendChild(img)});return s}
function bind(){const next=document.querySelector('.outside-view');if(!next)return;if(next!==view){if(styleObserver)styleObserver.disconnect();view=next;strip=view.querySelector('.elevator-photo-strip')||makeStrip();if(!strip.parentNode)view.prepend(strip);styleObserver=new MutationObserver(sync);styleObserver.observe(view,{attributes:true,attributeFilter:['style']})}sync()}
const main=document.querySelector('#main');if(main)new MutationObserver(()=>requestAnimationFrame(bind)).observe(main,{childList:true,subtree:true});
window.addEventListener('resize',()=>{if(resizeRaf)cancelAnimationFrame(resizeRaf);resizeRaf=requestAnimationFrame(()=>{resizeRaf=0;bind()})},{passive:true});
window.addEventListener('pageshow',bind);setTimeout(bind,0);
})();