/* v6.8.1 — real high-resolution photographic city panoramas, randomized per elevator visit. */
(()=>{
  'use strict';
  const FALLBACK='/assets/elevator-city-v6.webp?v=6.8.1';
  const U='?auto=format&fit=crop&crop=entropy&w=1600&h=2400&q=86';
  const REMOTE_SCENES=[
    {name:'서울 일몰',src:'https://images.unsplash.com/photo-1715760372615-0b120dfcddb2'+U},
    {name:'뉴욕 야경',src:'https://images.unsplash.com/photo-1767342976245-b34c150bddf9'+U},
    {name:'도쿄 타워',src:'https://images.unsplash.com/photo-1770888948551-d4610d14161f'+U},
    {name:'홍콩 야경',src:'https://images.unsplash.com/photo-1748100566893-9eda0d4eacdd'+U},
    {name:'파리 일몰',src:'https://images.unsplash.com/photo-1760281853022-44cda734ac18'+U},
    {name:'두바이 야경',src:'https://images.unsplash.com/photo-1753029111752-f12018752cd3'+U},
    {name:'싱가포르 블루아워',src:'https://images.unsplash.com/photo-1774075884764-be7319c06e08'+U},
    {name:'비 오는 네온도시',src:'https://images.unsplash.com/photo-1760165276068-22913e126b24'+U},
    {name:'눈 내린 도시',src:'https://images.unsplash.com/photo-1767777212976-2e7b74dc1248'+U},
    {name:'구름 낀 새벽도시',src:'https://images.unsplash.com/photo-1748344342511-df60438f4325'+U}
  ];
  const production=/^(pswgames\.github\.io)$/i.test(location.hostname)||!!window.SeowooNativeKiosk||/SeowooKiosk\//i.test(navigator.userAgent);
  const SCENES=production?[{name:'서우 시티',src:FALLBACK},...REMOTE_SCENES]:[{name:'서우 시티',src:FALLBACK}];
  const chooseScene=()=>{
    let last=-1;try{last=Number(sessionStorage.getItem('seowoo-elevator-scene')??-1)}catch{}
    let idx=Math.floor(Math.random()*SCENES.length);if(SCENES.length>1&&idx===last)idx=(idx+1+Math.floor(Math.random()*(SCENES.length-1)))%SCENES.length;
    try{sessionStorage.setItem('seowoo-elevator-scene',String(idx))}catch{}
    return{...SCENES[idx],idx};
  };
  window.SeowooPanorama={
    mount(view){
      const scene=chooseScene(),img=document.createElement('img');
      img.className='elevator-panorama-image';img.alt='';img.decoding='async';img.draggable=false;img.fetchPriority='high';img.src=scene.src;view.dataset.scene=String(scene.idx);view.dataset.sceneName=scene.name;
      let floor=1,alive=true,shift=0,raf=0,observer=null,loaded=false;
      const tracks=[document.createElement('div'),document.createElement('div')];tracks.forEach((e,i)=>e.className='shaft-track'+(i?' right':''));view.replaceChildren(img,...tracks);view.style.backgroundImage=`url('${scene.src}')`;
      function paint(){if(!alive)return;const progress=Math.max(0,Math.min(1,(floor-1)/19));const fastProgress=1-Math.pow(1-progress,1.08);const y=-shift*(1-fastProgress);img.style.transform=`translate3d(-50%,${y.toFixed(2)}px,0) scale(1.02)`;tracks.forEach(e=>e.style.transform=`translate3d(0,${((floor-1)*104)%208}px,0)`)}
      function resize(){if(!alive||!view.isConnected)return;const vw=view.clientWidth,vh=view.clientHeight;if(!vw||!vh)return;const iw=img.naturalWidth||1600,ih=img.naturalHeight||2400;const minTravel=Math.max(vh*.5,300);const cover=Math.max(vw/iw,(vh+minTravel)/ih);const scale=cover*(window.innerWidth>window.innerHeight?1.1:1.06);const w=iw*scale,h=ih*scale;img.style.width=`${w}px`;img.style.height=`${h}px`;shift=Math.max(0,h-vh);paint()}
      function requestResize(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;resize()})}
      img.addEventListener('load',()=>{loaded=true;view.classList.add('panorama-ready');resize()},{once:true});
      img.addEventListener('error',()=>{if(img.src.includes('elevator-city-v6.webp')){view.classList.add('panorama-fallback');return}img.src=FALLBACK;view.style.backgroundImage=`url('${FALLBACK}')`;view.dataset.sceneName='서우 시티'},{once:true});
      if('ResizeObserver'in window){observer=new ResizeObserver(requestResize);observer.observe(view)}
      window.addEventListener('resize',requestResize,{passive:true});window.visualViewport?.addEventListener('resize',requestResize,{passive:true});
      if(img.complete&&img.naturalWidth){loaded=true;view.classList.add('panorama-ready');resize()}else requestResize();
      return{setFloor(v){floor=v;paint()},resize,destroy(){alive=false;observer?.disconnect();if(raf)cancelAnimationFrame(raf);window.removeEventListener('resize',requestResize);window.visualViewport?.removeEventListener('resize',requestResize);img.remove();tracks.forEach(e=>e.remove());if(loaded)view.classList.remove('panorama-ready')}};
    }
  };
})();
