const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");
const root = path.resolve(__dirname, ".."),
  files = [];
function walk(p) {
  for (const d of fs.readdirSync(p, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name,"en"))) {
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
  "icons",
  "assets/art",
  "assets/cities",
  "assets/fonts",
])
  walk(path.join(root, p));

// Voice clips are numerous, so only the elevator/core pack is installed eagerly.
// Every other local voice file is cached on first use by the service worker.
for (const p of ["audio/catalog.js", "audio/extra-catalog.js", "audio/files.js", "audio/sfx.js"])
  if (fs.existsSync(path.join(root, p))) files.push(p);
if (fs.existsSync(path.join(root, "audio/sfx"))) walk(path.join(root, "audio/sfx"));
const voiceManifestPath = path.join(root, "audio/files.js");
if (fs.existsSync(voiceManifestPath)) {
  const source = fs.readFileSync(voiceManifestPath, "utf8");
  const match = source.match(/window\.SEOWOO_AUDIO_FILES\s*=\s*(\{[\s\S]*\})\s*;/);
  if (match) {
    const voices = JSON.parse(match[1]);
    const critical = [
      "closing",
      "opening",
      "up",
      "down",
      ...Array.from({ length: 20 }, (_, i) => `arrival-${i + 1}`),
      ...Array.from({ length: 9 }, (_, i) => `common-${i}`),
    ];
    for (const id of critical) {
      const p = voices[id];
      if (p && fs.existsSync(path.join(root, p)) && !files.includes(p)) files.push(p);
    }
  }
}
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
  `/* Generated offline manifest; run node scripts/build-cache.cjs after changes. */\nconst CACHE=${JSON.stringify(version)};\nconst FILES=${JSON.stringify(files)};\nself.addEventListener('install',e=>e.waitUntil((async()=>{try{const c=await caches.open(CACHE);await c.addAll(FILES.map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting()}catch(error){await caches.delete(CACHE);throw error}})()));\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('seowoo-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('message',e=>{if(e.data==='SKIP_WAITING'||e.data?.type==='SKIP_WAITING')e.waitUntil(self.skipWaiting());if(e.data?.type==='CHECK_UPDATE')e.waitUntil(self.registration.update().catch(()=>{}))});\nself.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin||new URL(e.request.url).pathname==='/sw.js')return;const url=new URL(e.request.url);const key=e.request.mode==='navigate'?'index.html':e.request;if(e.request.mode==='navigate'||/\\.(js|css)$/.test(url.pathname)){e.respondWith(fetch(e.request,{cache:'no-cache'}).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put(key,r.clone())}return r}).catch(()=>caches.match(key,{ignoreSearch:true})));return}e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put(e.request,r.clone())}return r}))) });\n`,
);
console.log(`Offline manifest: ${files.length} assets, ${version}`);
