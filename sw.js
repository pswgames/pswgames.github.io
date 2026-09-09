/* v5.15.2 — stable standalone PWA service worker; no per-navigation update loop. */
const VERSION='seowoo-static-5.15.2';
const CORE=[
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192-v515.png',
  '/icons/icon-512-v515.png',
  '/icons/icon-maskable-512-v515.png',
  '/css/app.css',
  '/css/v4.css',
  '/css/v5.css',
  '/css/v5-view.css',
  '/css/elevator-reference-v1.css',
  '/css/pwa-v514.css',
  '/assets/elevator-city-hq.webp',
  '/data/content.js',
  '/js/core.js',
  '/js/games.js',
  '/js/v5-panorama.js',
  '/js/v5.js',
  '/js/app-v4.js',
  '/js/pwa-v5152.js'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(VERSION);
    await Promise.allSettled(CORE.map(async path=>{
      try{
        const response=await fetch(path,{cache:'no-store'});
        if(response.ok) await cache.put(path,response.clone());
      }catch{}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(key=>key.startsWith('seowoo-')&&key!==VERSION).map(key=>caches.delete(key)));
    }catch{}
    await self.clients.claim();
  })());
});

async function networkFirstNavigation(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response?.ok){
      try{const cache=await caches.open(VERSION);await cache.put('/__seowoo_shell__',response.clone())}catch{}
    }
    return response;
  }catch{
    const cache=await caches.open(VERSION);
    return (await cache.match('/__seowoo_shell__'))||(await cache.match('/index.html'))||(await cache.match('/'))||new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>서우 놀이터</title><body style="font-family:system-ui;padding:32px;text-align:center"><h2>인터넷 연결을 확인해줘.</h2><p>연결 후 서우 놀이터를 다시 열어줘.</p></body>',{headers:{'content-type':'text/html; charset=utf-8'}});
  }
}

async function cacheFirst(request){
  const cache=await caches.open(VERSION);
  const hit=await cache.match(request,{ignoreSearch:true});
  if(hit) return hit;
  const response=await fetch(request,{cache:'no-store'});
  if(response?.ok){try{await cache.put(request,response.clone())}catch{}}
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  let url;
  try{url=new URL(request.url)}catch{return;}
  if(url.origin!==self.location.origin) return;

  if(request.mode==='navigate'){
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if(url.pathname==='/sw.js'||url.pathname==='/manifest.webmanifest'||url.pathname==='/index.html'){
    event.respondWith(fetch(request,{cache:'no-store'}));
    return;
  }

  const currentAsset=url.pathname.startsWith('/icons/')||url.pathname.startsWith('/css/')||url.pathname.startsWith('/js/')||url.pathname.startsWith('/data/')||url.pathname.startsWith('/assets/');
  if(currentAsset){event.respondWith(cacheFirst(request));return;}

  event.respondWith(fetch(request,{cache:'no-store'}));
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING'||event.data?.type==='SKIP_WAITING') self.skipWaiting();
  if(event.data?.type==='CHECK_UPDATE') event.waitUntil(self.registration.update().catch(()=>{}));
});
