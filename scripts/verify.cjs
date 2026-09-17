const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  vm = require("vm"),
  { spawnSync } = require("child_process");
const root = path.resolve(__dirname, "..");
process.chdir(root);
for (const dir of ["js", "data", "audio"])
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js")))
    new vm.Script(fs.readFileSync(path.join(dir, file), "utf8"), {
      filename: file,
    });
const html = fs.readFileSync("index.html", "utf8");
for (const [, file] of html.matchAll(/(?:src|href)="([^"#]+)"/g))
  assert(fs.existsSync(file), `Missing ${file}`);
for (const file of ["css/app.css", "css/tokens.css"])
  for (const [, asset] of fs
    .readFileSync(file, "utf8")
    .matchAll(/url\(['"]?([^)'" ]+)/g))
    assert(
      fs.existsSync(path.resolve("css", asset)),
      `Missing CSS asset ${asset}`,
    );
const code = [
  "index.html",
  ...fs.readdirSync("js").map((f) => "js/" + f),
  ...fs.readdirSync("css").map((f) => "css/" + f),
]
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");
assert(!code.includes("data:image/"), "Assets must be files");
assert(!code.includes("beforeinstallprompt"), "No app install button");
const sw = fs.readFileSync("sw.js", "utf8");
const manifest = JSON.parse(sw.match(/const FILES=(\[[\s\S]*?\]);/)[1]);
manifest.forEach((p) =>
  assert(fs.existsSync(p), `Offline asset missing: ${p}`),
);
console.log(
  "PASS source syntax, HTML/CSS resources, offline manifest, external asset rules",
);
for (const test of ["audio", "regression", "elevator"]) {
  const r = spawnSync(process.execPath, [`tests/${test}.cjs`], {
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
