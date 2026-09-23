const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('sw.js','utf8');
const version=JSON.parse(code.match(/const CACHE=("[^"]+");/)[1]);
function worker(fail=false){
  const events={},removed=[],requests=[];let skipped=0,claimed=0;
  const cache={addAll:async r=>{requests.push(...r);if(fail)throw Error('network');},put:async()=>{}};
  const scope={self:{location:{origin:'https://pswgames.github.io'},addEventListener:(k,f)=>events[k]=f,skipWaiting:async()=>skipped++,clients:{claim:async()=>claimed++},registration:{update:async()=>{}}},caches:{open:async()=>cache,delete:async k=>removed.push(k),keys:async()=>['seowoo-static-6.8.1',version,'unrelated-app'],match:async()=>new Response('offline shell')},Request:class extends Request{constructor(url,options){super(new URL(url,'https://pswgames.github.io/'),options)}},URL,fetch:async()=>{throw Error('offline')}};
  vm.runInNewContext(code,scope);
  const trigger=async(type,props={})=>{let pending;events[type]({...props,waitUntil:p=>pending=p,respondWith:p=>pending=p});return pending};
  return {trigger,removed,requests,get skipped(){return skipped},get claimed(){return claimed}};
}
function client(controlled){
  const events={},docEvents={};let reloads=0,updates=0,options,registeredUrl;
  const registration={
    active:controlled?{scriptURL:'https://pswgames.github.io/sw.js?app=7.0.2'}:null,
    waiting:null,
    installing:null,
    addEventListener(){},
    update:async()=>updates++,
  };
  const sw={
    controller:controlled?{}:null,
    addEventListener:(k,f)=>events[k]=f,
    register:async(url,o)=>{
      registeredUrl=url;
      assert.equal(url,'sw.js?app=7.2.0');
      options=o;
      return registration;
    },
  };
  vm.runInNewContext(fs.readFileSync('js/pwa.js','utf8'),{
    navigator:{serviceWorker:sw},
    location:{reload:()=>reloads++},
    document:{hidden:false,addEventListener:(k,f)=>docEvents[k]=f,querySelector:()=>null},
    window:{__SEOWOO_VERSION__:'7.2.0',addEventListener:(k,f)=>events[k]=f},
    encodeURIComponent,
  });
  return {events,docEvents,get reloads(){return reloads},get updates(){return updates},get options(){return options},get registeredUrl(){return registeredUrl}};
}
(async()=>{
 const w=worker();await w.trigger('install');assert(w.requests.length>=38);assert(w.requests.every(r=>r.cache==='reload'));assert.equal(w.skipped,1);
 await w.trigger('activate');assert.deepEqual(w.removed,['seowoo-static-6.8.1']);assert.equal(w.claimed,1);
 const fallback=await w.trigger('fetch',{request:{method:'GET',url:'https://pswgames.github.io/',mode:'navigate'}});assert.equal(await fallback.text(),'offline shell');
 const failed=worker(true);await assert.rejects(failed.trigger('install'));assert.deepEqual(failed.removed,[version]);assert.equal(failed.skipped,0);
 for(const controlled of [true,false]){const c=client(controlled);await new Promise(r=>setImmediate(r));assert.equal(c.registeredUrl,'sw.js?app=7.2.0');assert.equal(c.options.updateViaCache,'none');c.events.controllerchange();c.events.controllerchange();assert.equal(c.reloads,controlled?1:0);c.events.online();c.docEvents.visibilitychange();await new Promise(r=>setImmediate(r));assert.equal(c.updates,3);}
 console.log('PASS PWA: versioned worker URL, fresh HTTP precache, failed-install rollback, scoped old-cache cleanup, offline shell, single upgrade reload, resume checks');
})().catch(e=>{console.error(e);process.exitCode=1});
