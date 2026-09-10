/* v6.0.2 — atomic precache with deterministic one-refresh updates. */
const VERSION='seowoo-static-6.0.2';
const CORE=['/','/index.html','/manifest.webmanifest','/icons/icon-192-v515.png','/icons/icon-512-v515.png','/icons/icon-maskable-512-v515.png','/css/app.css','/css/v4.css','/css/v5.css','/css/v5-view.css','/css/pwa-v514.css','/assets/elevator-city-v6.webp','/data/content.js','/audio/catalog.js','/js/audio.js','/js/core.js','/js/games.js','/js/v5-panorama.js','/js/v5.js','/js/app-v4.js','/js/pwa-v5152.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(VERSION);
 // A broken release never takes control: every required shell file must cache first.
 await cache.addAll(CORE.map(url=>new Request(url,{cache:'reload'})));
 // Once the complete shell is ready, do not leave an installed PWA pinned to the old worker.
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 const stale=keys.filter(k=>k.startsWith('seowoo-')&&k!==VERSION);
 await Promise.all(stale.map(k=>caches.delete(k)));
 await self.clients.claim();
 // Existing clients may still be executing the old cached JS. Refresh them exactly once per worker activation.
 if(stale.length){
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  await Promise.all(windows.map(async client=>{
   try{const url=new URL(client.url);if(url.origin===self.location.origin)await client.navigate(client.url)}catch{}
  }));
 }
})()));
self.addEventListener('fetch',event=>{
 const r=event.request,url=new URL(r.url);if(r.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/sw.js')return;
 event.respondWith((async()=>{
 const cache=await caches.open(VERSION);
 if(r.mode==='navigate')return (await cache.match('/index.html'))||fetch(r);
 const hit=await cache.match(r,{ignoreSearch:true});
 // Range requests must retain their HTTP semantics (not return an entire cached audio file).
 if(r.headers.has('range')){
  if(!hit)return fetch(r);
  const data=await hit.arrayBuffer(),range=/^bytes=(\d*)-(\d*)$/.exec(r.headers.get('range'));
  if(!range||(!range[1]&&!range[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+data.byteLength}});
  const start=range[1]?Number(range[1]):Math.max(0,data.byteLength-Number(range[2]));
  const end=range[1]?(range[2]?Math.min(Number(range[2]),data.byteLength-1):data.byteLength-1):data.byteLength-1;
  if(start>end||start>=data.byteLength)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+data.byteLength}});
  const headers=new Headers(hit.headers);headers.set('Content-Range',`bytes ${start}-${end}/${data.byteLength}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
  return new Response(data.slice(start,end+1),{status:206,headers});
 }
 if(hit)return hit;
 const response=await fetch(r);if(response.ok&&/^\/(audio|assets|icons)\//.test(url.pathname))await cache.put(r,response.clone());return response;
 })());
});
self.addEventListener('message',event=>{
 if(event.data==='SKIP_WAITING'||event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
 if(event.data?.type==='CHECK_UPDATE')event.waitUntil(self.registration.update().catch(()=>{}));
});
