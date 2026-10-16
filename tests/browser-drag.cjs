const assert=require('assert/strict');
module.exports=function(page,spec,context){
  let client;
  async function path(from,to,cancel=false,probe=null){
    if(spec.touch && spec.type.name()==='chromium'){
      client ||= await context.newCDPSession(page);
      await page.evaluate(from=>{window.__pointerTrace=[];window.__pointerHit=document.elementFromPoint(from.x,from.y)?.outerHTML.slice(0,200);if(!window.__traceBound){for(const type of ["pointerdown","pointermove","pointerup","pointercancel","lostpointercapture"])document.addEventListener(type,e=>{window.__pointerTrace.push([type,e.pointerId,e.pointerType,e.clientX,e.clientY,e.target.className]);},{capture:true});window.__traceBound=true;}},from);
      const send=(type,p)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
      await send('touchStart',from);
      for(let i=1;i<=12;i++)await send('touchMove',{x:from.x+(to.x-from.x)*i/12,y:from.y+(to.y-from.y)*i/12});
      if(probe)await probe();
      await send(cancel?'touchCancel':'touchEnd');
    }else if(spec.touch){
      // WebKit exposes no native touch-move driver; run its Pointer Events path.
      await page.evaluate(({from,to,cancel})=>{
        const el=document.elementFromPoint(from.x,from.y);
        function send(target,type,p){target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:13,pointerType:'touch',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:p.x,clientY:p.y}));}
        send(el,'pointerdown',from);
        for(let i=1;i<=12;i++)send(document,'pointermove',{x:from.x+(to.x-from.x)*i/12,y:from.y+(to.y-from.y)*i/12});
        window.__qaEndPointer=()=>send(document,cancel?'pointercancel':'pointerup',to);
      },{from,to,cancel});
      if(probe)await probe();
      await page.evaluate(()=>{__qaEndPointer();delete window.__qaEndPointer;});
    }else{
      await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});
      if(probe)await probe();
      if(cancel)await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'})));
      await page.mouse.up();
    }
    await page.waitForTimeout(210);
    if(spec.touch && spec.type.name()==="chromium")console.log("NATIVE POINTER",JSON.stringify(await page.evaluate(()=>({hit:__pointerHit,events:__pointerTrace,place:SeowooExperiencesV2.state.village.place}))));
  }
  async function dragTo(sel,zoneSel,options={}){
    const item=page.locator(sel).first(),zone=page.locator(zoneSel).first();
    await item.scrollIntoViewIfNeeded();
    await page.evaluate(([a,b])=>{const ar=document.querySelector(a).getBoundingClientRect(),br=document.querySelector(b).getBoundingClientRect();const top=Math.min(ar.top,br.top),bottom=Math.max(ar.bottom,br.bottom);if(bottom-top<innerHeight-20)scrollBy(0,top-12);},[sel,zoneSel]);
    const r=await item.boundingBox(),z=await zone.boundingBox();
    const from={x:r.x+r.width/2,y:r.y+r.height/2},to={x:z.x+z.width/2,y:z.y+z.height/2};
    const viewport=page.viewportSize();assert(from.y>=0&&from.y<=viewport.height,'source visible '+sel);assert(to.y>=0&&to.y<=viewport.height,'target visible '+zoneSel);
    const before=await page.evaluate(()=>scrollY);await path(from,to,options.cancel);assert.equal(await page.evaluate(()=>scrollY),before,'touch drag must not scroll');
  }
  async function block(index,col,row,options={}){
    const item=page.locator(`[data-block-piece="${index}"] .block-piece`);await item.scrollIntoViewIfNeeded();
    const info=await page.evaluate(({index,col,row,touch})=>{
      const r=document.querySelector(`[data-block-piece="${index}"] .block-piece`).getBoundingClientRect(),a=document.querySelector('[data-board-cell="0"]').getBoundingClientRect(),b=document.querySelector('[data-board-cell="1"]').getBoundingClientRect();
      const p=SeowooBlockPang.snapshot().tray[index],shape=SeowooBlockEngine.shapes[p.shape],step=b.x-a.x;
      const width=(1+Math.max(...shape.map(c=>c[0])))*step-(step-a.width),height=(1+Math.max(...shape.map(c=>c[1])))*step-(step-a.height);
      return {from:{x:r.x+r.width/2,y:r.y+r.height/2},to:{x:a.x+col*step+width/2,y:a.y+row*step+(touch?height+24:height/2)}};
    },{index,col,row,touch:spec.touch});
    await path(info.from,info.to,options.cancel,async()=>{
      await page.waitForTimeout(40);
      const preview=await page.evaluate(({index,col,row})=>{
        const s=SeowooBlockPang.snapshot(),p=s.tray[index];
        return {valid:SeowooBlockEngine.fits(s.board,p,col,row),cells:SeowooBlockEngine.shapes[p.shape].length,good:document.querySelectorAll(".block-cell.preview").length,bad:document.querySelectorAll(".block-cell.preview-bad").length};
      },{index,col,row});
      if(preview.valid)assert.equal(preview.good,preview.cells,"live legal-placement preview follows the piece");
      else assert(preview.bad>0,"occupied-position preview is distinct");
    });await page.waitForTimeout(260);
  }
  return {dragTo,block,path};
};
