const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");
const root = path.resolve(__dirname, ".."),
  files = [];
function walk(p) {
  for (const d of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, d.name);
    if (d.isDirectory()) walk(full);
    else if (!/\.md$/i.test(full))
      files.push(path.relative(root, full).replaceAll("\\", "/"));
  }
}
for (const p of [
  "css",
  "js",
  "data",
  "audio",
  "icons",
  "assets/art",
  "assets/cities",
  "assets/fonts",
])
  walk(path.join(root, p));
files.push(
  "index.html",
  "manifest.webmanifest",
  "assets/elevator-city-v6.webp",
);
const hash = crypto.createHash("sha256");
for (const f of files) hash.update(fs.readFileSync(path.join(root, f)));
const version = "seowoo-v7-" + hash.digest("hex").slice(0, 10);
fs.writeFileSync(
  path.join(root, "sw.js"),
  `/* Generated offline manifest; run node scripts/build-cache.cjs after changes. */\nconst CACHE=${JSON.stringify(version)};\nconst FILES=${JSON.stringify(files)};\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('seowoo-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});\nself.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;const url=new URL(e.request.url);const key=e.request.mode==='navigate'?'index.html':e.request;if(e.request.mode==='navigate'||/\\.(js|css)$/.test(url.pathname)){e.respondWith(fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put(key,r.clone())}return r}).catch(()=>caches.match(key,{ignoreSearch:true})));return}e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put(e.request,r.clone())}return r}))) });\n`,
);
console.log(`Offline manifest: ${files.length} assets, ${version}`);
