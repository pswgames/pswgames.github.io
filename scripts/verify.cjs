const {spawn}=require('child_process'),fs=require('fs');
fs.mkdirSync('qa-artifacts',{recursive:true});
const server=spawn(process.execPath,['scripts/serve.cjs'],{stdio:['ignore','pipe','inherit']});
const run=file=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,[file],{stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(`${file}: ${code}`)))});
server.stdout.once('data',async()=>{try{await run('tests/audio.cjs');await run('tests/browser.cjs');await run('tests/pwa-update.cjs')}catch(e){console.error(e);process.exitCode=1}finally{server.kill()}});
server.on('error',e=>{console.error(e);process.exitCode=1});
