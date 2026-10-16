/* Pointer event integration helper: no business-method shortcuts. */
module.exports=async function(w,itemSelector,zoneSelector,options={}) {
  const assert=require('assert/strict'),doc=w.document,item=doc.querySelector(itemSelector),zone=doc.querySelector(zoneSelector);
  assert(item,'Drag item '+itemSelector);assert(zone,'Drop zone '+zoneSelector);assert(!item.disabled,'Drag item enabled');
  item.getBoundingClientRect=()=>({left:20,top:20,right:90,bottom:90,width:70,height:70});
  zone.getBoundingClientRect=()=>({left:240,top:180,right:340,bottom:280,width:100,height:100});
  doc.elementFromPoint=(x,y)=>x>200&&y>150?zone:item;
  function send(target,type,x,y) {const e=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperties(e,{pointerId:{value:7},pointerType:{value:'touch'},isPrimary:{value:true}});target.dispatchEvent(e);}
  send(item,'pointerdown',50,50);send(doc,'pointermove',290,230);send(doc,options.cancel?'pointercancel':'pointerup',290,230);
  await new Promise(r=>setTimeout(r,options.wait??185));
};
