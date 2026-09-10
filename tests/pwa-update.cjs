const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
(async()=>{
 let release='a';const root=path.resolve('.');
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),p=path.join(root,url.pathname==='/'?'index.html':url.pathname);try{if(release==='c'&&url.pathname==='/js/audio.js')throw Error('simulated missing asset');let b=fs.readFileSync(p);if(url.pathname==='/sw.js')b=Buffer.from(b.toString().replace('seowoo-static-6.0.0',`seowoo-static-test-${release}`));const type=p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(b)}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(4174,'127.0.0.1',r));
 const b=await chromium.launch({channel:'chrome',headless:true}),ctx=await b.newContext(),p=await ctx.newPage();
 await p.goto('http://127.0.0.1:4174');await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.evaluate(()=>{SeowooApp.go('elevator');window.sentinel='still playing'});
 release='b';await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update()});
 await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
 assert.equal(await p.evaluate(()=>window.sentinel),'still playing');assert.equal(await p.evaluate(()=>document.body.dataset.playRoute),'elevator');
 assert(await p.evaluate(async()=>(await caches.keys()).includes('seowoo-static-test-a')));
 await p.close();const next=await ctx.newPage();await next.goto('http://127.0.0.1:4174');await next.waitForFunction(async()=>(await caches.keys()).includes('seowoo-static-test-b')&&!(await caches.keys()).includes('seowoo-static-test-a'));
 await ctx.setOffline(true);await next.reload();assert.equal(await next.locator('.category-card').count(),7);
 await ctx.setOffline(false);await next.evaluate(()=>SeowooApp.go('elevator'));
 // A failed precache must leave the active version intact.
 release='c';
 const failed=await next.evaluate(async()=>{const r=await navigator.serviceWorker.ready;const outcome=new Promise(resolve=>r.addEventListener('updatefound',()=>{const w=r.installing;w.addEventListener('statechange',()=>{if(w.state==='redundant')resolve('rejected')})},{once:true}));await r.update();return outcome});
 assert.equal(failed,'rejected');assert.equal(await next.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).waiting),null);
 assert.equal(await next.evaluate(()=>document.body.dataset.playRoute),'elevator');
 await b.close();await new Promise(r=>server.close(r));console.log('PWA update test passed: waiting update, no reset, next launch activation, old-cache cleanup, offline shell');
})().catch(e=>{console.error(e);process.exit(1)});
