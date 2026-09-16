/* v6.8.0 — randomized high-resolution city panoramas with slightly faster visual travel. */
(()=>{
  'use strict';
  const SCENES=[
    '/assets/elevator-city-v6.webp?v=6.8.0',
    '/assets/elevator-scenes/city-01.svg?v=6.8.0',
    '/assets/elevator-scenes/city-02.svg?v=6.8.0',
    '/assets/elevator-scenes/city-03.svg?v=6.8.0',
    '/assets/elevator-scenes/city-04.svg?v=6.8.0',
    '/assets/elevator-scenes/city-05.svg?v=6.8.0',
    '/assets/elevator-scenes/city-06.svg?v=6.8.0',
    '/assets/elevator-scenes/city-07.svg?v=6.8.0',
    '/assets/elevator-scenes/city-08.svg?v=6.8.0',
    '/assets/elevator-scenes/city-09.svg?v=6.8.0',
    '/assets/elevator-scenes/city-10.svg?v=6.8.0'
  ];
  const chooseScene=()=>{
    let last=-1;try{last=Number(sessionStorage.getItem('seowoo-elevator-scene')??-1)}catch{}
    let idx=Math.floor(Math.random()*SCENES.length);if(SCENES.length>1&&idx===last)idx=(idx+1+Math.floor(Math.random()*(SCENES.length-1)))%SCENES.length;
    try{sessionStorage.setItem('seowoo-elevator-scene',String(idx))}catch{}
    return{src:SCENES[idx],idx};
  };
  window.SeowooPanorama={
    mount(view){
      const scene=chooseScene(),img=document.createElement('img');
      img.className='elevator-panorama-image';img.alt='';img.decoding='async';img.draggable=false;img.src=scene.src;view.dataset.scene=String(scene.idx);
      let floor=1,alive=true,shift=0,raf=0,observer=null,loaded=false;
      const tracks=[document.createElement('div'),document.createElement('div')];tracks.forEach((e,i)=>e.className='shaft-track'+(i?' right':''));view.replaceChildren(img,...tracks);view.style.backgroundImage=`url('${scene.src}')`;
      function paint(){if(!alive)return;const progress=Math.max(0,Math.min(1,(floor-1)/19));const fastProgress=1-Math.pow(1-progress,.92);const y=-shift*(1-fastProgress);img.style.transform=`translate3d(-50%,${y.toFixed(2)}px,0) scale(1.02)`;tracks.forEach(e=>e.style.transform=`translate3d(0,${((floor-1)*104)%208}px,0)`)}
      function resize(){if(!alive||!view.isConnected)return;const vw=view.clientWidth,vh=view.clientHeight;if(!vw||!vh)return;const iw=img.naturalWidth||1200,ih=img.naturalHeight||1800;const minTravel=Math.max(vh*.48,290);const cover=Math.max(vw/iw,(vh+minTravel)/ih);const scale=cover*(window.innerWidth>window.innerHeight?1.1:1.06);const w=iw*scale,h=ih*scale;img.style.width=`${w}px`;img.style.height=`${h}px`;shift=Math.max(0,h-vh);paint()}
      function requestResize(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;resize()})}
      img.addEventListener('load',()=>{loaded=true;view.classList.add('panorama-ready');resize()},{once:true});
      img.addEventListener('error',()=>{if(img.src.includes('elevator-city-v6.webp')){view.classList.add('panorama-fallback');return}img.src='/assets/elevator-city-v6.webp?v=6.8.0';view.style.backgroundImage="url('/assets/elevator-city-v6.webp?v=6.8.0')"},{once:true});
      if('ResizeObserver'in window){observer=new ResizeObserver(requestResize);observer.observe(view)}
      window.addEventListener('resize',requestResize,{passive:true});window.visualViewport?.addEventListener('resize',requestResize,{passive:true});
      if(img.complete&&img.naturalWidth){loaded=true;view.classList.add('panorama-ready');resize()}else requestResize();
      return{setFloor(v){floor=v;paint()},resize,destroy(){alive=false;observer?.disconnect();if(raf)cancelAnimationFrame(raf);window.removeEventListener('resize',requestResize);window.visualViewport?.removeEventListener('resize',requestResize);img.remove();tracks.forEach(e=>e.remove());if(loaded)view.classList.remove('panorama-ready')}};
    }
  };
})();
