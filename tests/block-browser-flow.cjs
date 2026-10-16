module.exports=async function({page,spec,context,go,tap,layout,out,results}){
 const assert=require('assert/strict'),{dragTo,block,path}=require('./browser-drag.cjs')(page,spec,context);
 await go('potty');
 await dragTo('.potty-drag-scene .potty-child','[data-potty-zone]',{cancel:true});assert.equal(await page.locator('.potty-drag-scene').getAttribute('data-step'),'0');
 const child=await page.locator('.potty-drag-scene .potty-child').boundingBox(),room=await page.locator('.potty-drag-scene').boundingBox();
 await path({x:child.x+child.width/2,y:child.y+child.height/2},{x:room.x+room.width*.45,y:room.y+room.height*.85});
 assert.equal(await page.locator('.potty-drag-scene').getAttribute('data-step'),'0','wrong potty target returns');
 for(let step=0;step<3;step++){await dragTo('.potty-drag-scene .potty-child','[data-potty-zone]');assert.equal(await page.locator('.potty-drag-scene').getAttribute('data-step'),String(step+1));}
 await tap('[data-potty="kind"]');await dragTo('.potty-drag-scene .potty-child','[data-potty-zone]');
 assert.equal(await page.locator('.potty-drag-scene').getAttribute('data-step'),'5');await dragTo('.potty-drag-scene .potty-child','[data-potty-zone]');assert(await page.locator('.potty-drag-scene .potty-child').isDisabled());
 await page.waitForTimeout(850);await dragTo('.potty-drag-scene .potty-child','[data-potty-zone]');
 for(let i=0;i<3;i++)await dragTo('.potty-drag-scene .potty-child','[data-potty-zone]');
 assert(await page.locator('[data-potty="restart"]').isVisible());await layout('potty-drag-complete');
 await tap('[data-potty="restart"]');await page.screenshot({path:out+'/'+spec.id+'-potty-drag.png',fullPage:true});
 results.push({profile:spec.id,flow:'potty: cancel, wrong target, 8 stages, flush lock, 3 washes, restart',status:'pass'});
 async function seed(kind){
   await go('home');await page.evaluate(kind=>{
    const E=SeowooBlockEngine,one=E.shapes.findIndex(p=>p.length===1),sq=E.shapes.findIndex(p=>p.length===4&&p.every(([x,y])=>x<2&&y<2));
    const s={...E.create(),tray:[{shape:one,color:1},{shape:one,color:3},{shape:one,color:4}]};
    if(kind==='cross'){for(let i=1;i<8;i++){s.board[i]=2;s.board[i*8]=3;}}
    if(kind==='combo'){for(let x=0;x<8;x++){if(x!==0)s.board[x]=4;if(x!==1)s.board[8+x]=5;}}
    if(kind==='over'){s.board=s.board.map((_,i)=>(i%8+Math.floor(i/8))%2?2:0);s.tray[1]={shape:sq,color:3};s.tray[2]={shape:sq,color:4};}
    localStorage.setItem('seowoo-blockpang-v1',JSON.stringify(s));
   },kind);await go('blockpang');
 }
 const snapshot=()=>page.evaluate(()=>SeowooBlockPang.snapshot());
 await seed('empty');await layout('blockpang');
 await page.evaluate(()=>{window.__blockTones=[];const a=SeowooCore.audio,orig=a.tone.bind(a);a.tone=(...args)=>{__blockTones.push(args);return orig(...args);};});
 await block(0,0,0,{cancel:true});assert.equal((await snapshot()).moves,0);
 await block(0,0,0);assert.equal((await snapshot()).score,10);
 await block(1,0,0);assert.equal((await snapshot()).score,10,'occupied cell rejects');
 await block(1,1,0);await block(2,2,0);assert.equal((await snapshot()).moves,3);assert.equal((await snapshot()).tray.filter(Boolean).length,3,'refill after exactly three pieces');
 await tap('[data-block-pause]');assert(await page.locator('[data-block-resume]').isVisible());assert(await page.locator('[data-block-piece]').first().isDisabled());await tap('[data-block-resume]');assert.equal((await snapshot()).score,30);
 await go('home');await go('blockpang');assert.equal((await snapshot()).score,30,'resume board');
 await seed('cross');await block(0,0,0);let s=await snapshot();assert.equal(s.score,260);assert.equal(s.board.filter(Boolean).length,0);assert.equal(s.combo,1);
 await seed('combo');await block(0,0,0);await block(1,1,1);s=await snapshot();assert.equal(s.score,270);assert.equal(s.combo,2);
 assert((await page.evaluate(()=>__blockTones)).some(a=>a[0]===1319),'original combo arpeggio');
 await seed('over');await block(0,0,0);assert((await snapshot()).over);assert(await page.locator('[data-block-restart]').isVisible());
 await tap('[data-block-restart]');
 await page.waitForFunction(()=>SeowooBlockPang.snapshot().score===0,null,{timeout:1500});
 s=await snapshot();assert.equal(s.score,0);assert.equal(s.board.filter(Boolean).length,0);assert(!s.over);assert.equal(s.tray.filter(Boolean).length,3);
 assert(Number(await page.evaluate(()=>localStorage.getItem('seowoo-blockpang-best-v1')))>=270,'best score survives restart');
 await page.waitForTimeout(6500);
 assert(await page.evaluate(()=>__voiceQA.completed.includes("play-block-start")),"new Block Pang Sulafat MP3 completes");
 await page.screenshot({path:out+'/'+spec.id+'-blockpang.png',fullPage:true});
 results.push({profile:spec.id,flow:'block: drag/cancel/reject, preview, refill, cross clear, combo, score, pause, resume, game over, restart, best record, original sound',status:'pass'});
};
