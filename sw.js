/* v5.14.3 — network-first updates + offline shell, including ultra-sharp external elevator WebP. */
const VERSION='seowoo-v5.14.3';
const V='5.14.3';
const CORE=[
  '/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png',
  '/css/app.css','/css/v4.css','/css/v5.css','/css/v5-view.css','/css/elevator-reference-v1.css','/css/pwa-v514.css',
  '/assets/elevator-city-hq.webp',
  '/data/content.js','/js/core.js','/js/games.js','/js/v5-panorama.js','/js/v5.js','/js/app-v4.js','/js/pwa-v514.js'
].map(path=>`${path}${path.includes('?')?'&':'?'}v=${V}`);

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('seowoo-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
      if(!response.ok) throw new Error('navigation failed');
      const copy=response.clone();
      event.waitUntil(caches.open(VERSION).then(cache=>cache.put('/index.html?v='+V,copy)));
      return response;
    }).catch(async()=>{
      const cache=await caches.open(VERSION);
      return (await cache.match('/index.html?v='+V)) || (await cache.match('/?v='+V));
    }));
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    try{
      const fresh=await fetch(request,{cache:'no-store'});
      if(fresh.ok) event.waitUntil(cache.put(request,fresh.clone()));
      return fresh;
    }catch(e){
      return (await cache.match(request)) || Response.error();
    }
  })());
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING'||event.data?.type==='SKIP_WAITING') self.skipWaiting();
});
