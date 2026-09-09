/* v5.14.3 — ultra-sharp generated WebP panorama with tablet-safe resize; external image only. */
(()=>{
  'use strict';
  const SRC='/assets/elevator-city-hq.webp?v=5.14.3';
  window.SeowooPanorama={
    mount(view){
      const img=document.createElement('img');
      img.className='elevator-panorama-image';img.alt='';img.decoding='async';img.draggable=false;img.src=SRC;
      let floor=1,alive=true,shift=0,raf=0,observer=null,loaded=false;
      view.replaceChildren(img);view.style.backgroundImage=`url('${SRC}')`;
      function paint(){if(!alive)return;const progress=Math.max(0,Math.min(1,(floor-1)/19));const y=-shift*(1-progress);img.style.transform=`translate3d(-50%,${y.toFixed(2)}px,0) scale(1.018)`;view.style.setProperty('--panorama-progress',progress.toFixed(4))}
      function resize(){if(!alive||!view.isConnected)return;const vw=view.clientWidth,vh=view.clientHeight;if(!vw||!vh)return;const iw=img.naturalWidth||1024,ih=img.naturalHeight||1536;const minTravel=Math.max(vh*.38,230);const cover=Math.max(vw/iw,(vh+minTravel)/ih);const scale=cover*(window.innerWidth>window.innerHeight?1.08:1.04);const w=iw*scale,h=ih*scale;img.style.width=`${w}px`;img.style.height=`${h}px`;shift=Math.max(0,h-vh);paint()}
      function requestResize(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;resize()})}
      img.addEventListener('load',()=>{loaded=true;view.classList.add('panorama-ready');resize()},{once:true});
      img.addEventListener('error',()=>{view.classList.add('panorama-fallback')},{once:true});
      if('ResizeObserver'in window){observer=new ResizeObserver(requestResize);observer.observe(view)}
      window.addEventListener('resize',requestResize,{passive:true});window.visualViewport?.addEventListener('resize',requestResize,{passive:true});
      if(img.complete&&img.naturalWidth){loaded=true;view.classList.add('panorama-ready');resize()}else requestResize();
      return{setFloor(v){floor=v;paint()},resize,destroy(){alive=false;observer?.disconnect();if(raf)cancelAnimationFrame(raf);window.removeEventListener('resize',requestResize);window.visualViewport?.removeEventListener('resize',requestResize);img.remove();if(loaded)view.classList.remove('panorama-ready')}};
    }
  };
})();
