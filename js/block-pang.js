(() => {
  "use strict";
  const E=window.SeowooBlockEngine, KEY="seowoo-blockpang-v1", BEST="seowoo-blockpang-best-v1", SOUND="seowoo-blockpang-sound";
  let ctx=null,state=null,best=0,paused=false,locked=false,drag=null,abort=null,frame=0,control=null,ignoreControlClick=0,soundEnabled=true;
  const timers=new Set();
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);if(ctx)fn();},ms);timers.add(t);};
  const audio=()=>window.SeowooCore.audio;
  function sound(id){if(!soundEnabled)return;for(const [hz,duration,type,delay] of window.SEOWOO_INTERACTIONS.blockSounds[id])audio().tone(hz,duration,type,.045,delay);}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(BEST,String(best));}catch{}}
  function pieceMarkup(piece,extra="") {
    const cells=E.shapes[piece.shape],w=1+Math.max(...cells.map(c=>c[0])),h=1+Math.max(...cells.map(c=>c[1]));
    return `<span class="block-piece ${extra}" style="--cols:${w};--rows:${h}">${cells.map(([x,y])=>`<i class="block-tile color-${piece.color}" style="grid-column:${x+1};grid-row:${y+1}" data-cell-x="${x}" data-cell-y="${y}"></i>`).join("")}</span>`;
  }
  function trayMarkup(){
    return `${state.tray.map((p,i)=>`<div class="block-pocket">${p?`<button class="block-grab" data-block-piece="${i}" aria-label="${i+1}번 블록, ${E.shapes[p.shape].length}칸${E.canFit(state.board,p)?"":", 지금은 놓을 자리가 없어요"}" ${paused||state.over?"disabled":""}>${pieceMarkup(p)}</button>`:'<span class="block-used" aria-label="사용한 조각">✓</span>'}</div>`).join("")}`;
  }
  // Keep the screen, background and grid mounted throughout a move. Replacing
  // the play-screen restarted its entrance animation twice on every drop.
  function updatePlay(board=state.board){
    const main=ctx.main;
    main.querySelectorAll("[data-board-cell]").forEach((cell,i)=>{
      const color=board[i],classes=`block-cell ${color?"filled color-"+color:""}`;
      if(cell.className!==classes)cell.className=classes;
      cell.setAttribute("aria-label",`${Math.floor(i/8)+1}행 ${i%8+1}열 ${color?"블록":"빈칸"}`);
    });
    main.querySelector("[data-block-score]").textContent=state.score.toLocaleString();
    main.querySelector("[data-block-best]").textContent=best.toLocaleString();
    main.querySelector(".block-combo b").textContent=state.combo?state.combo+" 콤보":"준비";
    const tray=main.querySelector(".block-tray"),markup=trayMarkup();
    if(tray._markup!==markup){tray.innerHTML=markup;tray._markup=markup;}
    main.querySelector(".block-particles").replaceChildren();
    main.querySelector(".block-banner").classList.remove("show");
  }
  function render(){
    if(!ctx)return;
    const finished=state.over&&!locked;
    ctx.main.innerHTML=`<section class="play-screen block-world">${ctx.header("서우 블록팡","home",`<button class="icon-btn" data-block-pause aria-label="잠깐 쉬기">Ⅱ</button><button class="icon-btn" data-block-sound aria-label="${soundEnabled?"효과음 끄기":"효과음 켜기"}" aria-pressed="${soundEnabled}">${ctx.icon(soundEnabled?"sound":"mute")}</button>`,false)}<div class="block-game"><div class="block-intro"><img src="assets/art/v3/blocks.webp" alt=""><div><span class="eyebrow">차곡차곡, 반짝!</span><p>빈칸에 놓고 한 줄을 채워봐</p></div></div><div class="block-scoreboard"><div><span>내 점수</span><strong data-block-score>${state.score.toLocaleString()}</strong></div><div><span>최고 기록</span><b data-block-best>${best.toLocaleString()}</b></div><div class="block-combo"><span>연속 팡!</span><b>${state.combo ? state.combo+" 콤보" : "준비"}</b></div></div><div class="block-board-wrap"><div class="block-board" role="grid" aria-label="8행 8열 블록판">${state.board.map((color,i)=>`<div class="block-cell ${color?"filled color-"+color:""}" role="gridcell" aria-label="${Math.floor(i/8)+1}행 ${i%8+1}열 ${color?"블록":"빈칸"}" data-board-cell="${i}"></div>`).join("")}</div><div class="block-particles" aria-hidden="true"></div><div class="block-banner" aria-live="polite"></div></div><div class="block-tray" aria-label="끌어서 놓을 세 조각">${trayMarkup()}</div><div class="block-help"><span>블록을 잡고 빈칸으로 끌어봐. 한 줄을 채우면 팡!</span></div></div><div class="block-overlay" ${paused||finished?"":"hidden"} role="dialog" aria-modal="true" aria-label="${state.over?"놀이 완료":"잠깐 쉬기"}"><div class="block-modal"><img src="assets/art/v3/${state.over?"star":"cloud"}.webp" alt=""><h2>${state.over?"차곡차곡 잘했어!":"잠깐 쉬어가자"}</h2><p>${state.over?"놓을 수 있는 블록이 없어요":"준비되면 다시 이어서 놀아요"}</p><strong>${state.score.toLocaleString()}<small> 점</small></strong>${!state.over?'<button class="btn primary" data-block-resume>계속하기</button>':""}<button class="btn ${state.over?"primary":"soft"}" data-block-restart ${locked?"disabled":""}>새로 시작하기</button><button class="btn soft" data-go="home">놀이터로</button></div></div></section>`;
  }
  function cancel(){
    control=null;
    if(!drag)return;
    const d=drag;drag=null;cancelAnimationFrame(frame);frame=0;
    d.ghost.remove();d.item.classList.remove("lifting");
    try{d.item.releasePointerCapture?.(d.id);}catch{}
    ctx?.main.querySelectorAll(".preview,.preview-bad").forEach(n=>n.classList.remove("preview","preview-bad"));
  }
  function dimensions(){
    const board=ctx.main.querySelector(".block-board").getBoundingClientRect();
    const first=ctx.main.querySelector('[data-board-cell="0"]').getBoundingClientRect();
    const next=ctx.main.querySelector('[data-board-cell="1"]').getBoundingClientRect();
    return {board,first,step:next.left-first.left};
  }
  function preview(){
    frame=0;if(!drag)return;
    const d=drag;
    const left=d.x-d.offsetX,top=d.y-d.offsetY;
    d.ghost.style.transform=`translate3d(${left}px,${top}px,0)`;
    d.col=Math.round((left-d.geometry.first.left)/d.geometry.step);
    d.row=Math.round((top-d.geometry.first.top)/d.geometry.step);
    d.valid=E.fits(state.board,d.piece,d.col,d.row);
    ctx.main.querySelectorAll(".preview,.preview-bad").forEach(n=>n.classList.remove("preview","preview-bad"));
    for(const [x,y] of E.shapes[d.piece.shape]){
      const col=d.col+x,row=d.row+y;
      if(col>=0&&col<8&&row>=0&&row<8)ctx.main.querySelector(`[data-board-cell="${row*8+col}"]`).classList.add(d.valid?"preview":"preview-bad");
    }
    d.ghost.classList.toggle("invalid",!d.valid);
  }
  function down(e){
    const item=e.target.closest("[data-block-piece]");
    if(!item||item.disabled||drag||paused||locked||state.over||(e.button!=null&&e.button!==0)||e.isPrimary===false)return;
    e.preventDefault();window.scrollTo({top:scrollY,left:scrollX,behavior:"instant"});audio().unlock();sound("pick");
    const index=Number(item.dataset.blockPiece),piece=state.tray[index],geometry=dimensions();
    const span=item.querySelector(".block-piece"),r=span.getBoundingClientRect();
    const shape=E.shapes[piece.shape],cols=1+Math.max(...shape.map(c=>c[0])),rows=1+Math.max(...shape.map(c=>c[1]));
    const width=cols*geometry.step-(geometry.step-geometry.first.width),height=rows*geometry.step-(geometry.step-geometry.first.height);
    const ghost=document.createElement("div");ghost.className="block-ghost";ghost.setAttribute("aria-hidden","true");
    ghost.innerHTML=pieceMarkup(piece);ghost.style.setProperty("--unit",geometry.first.width+"px");ghost.style.setProperty("--gap",geometry.step-geometry.first.width+"px");
    document.body.appendChild(ghost);item.classList.add("lifting");
    // Preserve the grabbed square for mouse; lift touch pieces above the finger.
    const offsetX=Math.max(0,Math.min(width,(e.clientX-r.left)/r.width*width));
    const offsetY=e.pointerType==="touch"?height+24:Math.max(0,Math.min(height,(e.clientY-r.top)/r.height*height));
    drag={item,index,piece,ghost,geometry,offsetX,offsetY,x:e.clientX,y:e.clientY,id:e.pointerId,sx:e.clientX,sy:e.clientY,moved:false};
    try{item.setPointerCapture(e.pointerId);}catch{}
    preview();
  }
  function move(e){if(!drag||drag.returning||e.pointerId!==drag.id)return;e.preventDefault();drag.x=e.clientX;drag.y=e.clientY;drag.moved ||= Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>6;if(!frame)frame=requestAnimationFrame(preview);}
  function celebrate(effect){
    const grid=ctx.main.querySelector(".block-board"),layer=ctx.main.querySelector(".block-particles");
    const rect=grid.getBoundingClientRect();
    for(const i of effect.cleared){
      const cell=grid.children[i],r=cell.getBoundingClientRect();cell.classList.add("clearing");
      // Two particles per square, bounded by the board (maximum 128).
      for(let n=0;n<2;n++){const spark=document.createElement("i");spark.className="block-spark color-"+effect.beforeClear[i];spark.style.cssText=`left:${r.left-rect.left+r.width/2}px;top:${r.top-rect.top+r.height/2}px;--dx:${(Math.random()-.5)*90}px;--dy:${-30-Math.random()*75}px;--turn:${Math.random()*180}deg`;layer.appendChild(spark);}
    }
    const banner=ctx.main.querySelector(".block-banner"),lines=effect.rows.length+effect.columns.length;
    banner.textContent=lines?(state.combo>1?`${state.combo} 콤보!`:`${lines}줄 팡!`)+` +${effect.points}`:`+${effect.points}`;
    banner.classList.add("show");
  }
  function up(e){
    if(!drag||drag.returning||e.pointerId!==drag.id)return;
    drag.x=e.clientX;drag.y=e.clientY;preview();
    const d=drag,result=d.moved&&d.valid?E.place(state,d.index,d.col,d.row):null;
    if(!result){
      d.returning=true;
      const r=d.item.getBoundingClientRect();
      d.ghost.style.transition="transform 150ms ease, opacity 150ms ease";
      d.ghost.style.transform=`translate3d(${r.left}px,${r.top}px,0) scale(.65)`;d.ghost.style.opacity="0";
      locked=true;later(()=>{cancel();locked=false;},160);
      if(d.moved){sound("return");}return;
    }
    cancel();locked=true;state=result.state;best=Math.max(best,state.score);persist();
    const effect=result.effect,lines=effect.rows.length+effect.columns.length;
    // Render the placed squares before the simultaneous row/column removal.
    updatePlay(effect.beforeClear);
    effect.cells.forEach(i=>ctx.main.querySelector(`[data-board-cell="${i}"]`).classList.add("placed"));
    celebrate(effect);sound(lines?(state.combo>1?"combo":"clear"):"place");
    later(()=>{
      locked=false;
      if(state.over)render();else updatePlay();
      if(state.over){window.SeowooCore.complete("blockpang");sound("over");ctx.main.querySelector("[data-block-restart]")?.focus({preventScroll:true});}
    },lines?420:180);
  }
  function setPaused(value){cancel();paused=value;render();sound(value?"pause":"resume");ctx.main.querySelector(value?"[data-block-resume]":"[data-block-pause]")?.focus({preventScroll:true});}
  function mount(options){
    unmount();ctx=options;
    try{soundEnabled=localStorage.getItem(SOUND)!=="false";}catch{soundEnabled=true;}
    try{state=E.restore(JSON.parse(localStorage.getItem(KEY)));best=Math.max(0,Number(localStorage.getItem(BEST))||0);}catch{state=null;}
    state ||= E.create();best=Math.max(best,state.score);paused=false;locked=false;render();sound(state.over?"over":"start");
    abort=new AbortController();const signal=abort.signal;
    const controlSelector="[data-block-pause],[data-block-resume],[data-block-restart],[data-block-sound]";
    function activate(button){
      if(button.disabled)return;
      audio().unlock();
      if(button.hasAttribute("data-block-sound")){soundEnabled=!soundEnabled;try{localStorage.setItem(SOUND,String(soundEnabled));}catch{}if(!soundEnabled)audio().stopSfx();render();if(soundEnabled)sound("pick");return;}
      if(button.hasAttribute("data-block-pause")){if(!locked&&!state.over)setPaused(true);return;}
      if(button.hasAttribute("data-block-resume")){setPaused(false);return;}
      cancel();timers.forEach(clearTimeout);timers.clear();state=E.create();paused=false;locked=false;persist();render();sound("start");
    }
    ctx.main.addEventListener("pointerdown",e=>{
      const button=e.target.closest(controlSelector);
      if(button&&!button.disabled){control={button,id:e.pointerId,x:e.clientX,y:e.clientY};return;}
      down(e);
    },{signal});
    // Some mobile browsers suppress the compatibility click after a captured
    // drag. Use the same button's completed touch, retaining normal mouse/keys.
    ctx.main.addEventListener("pointerup",e=>{
      const c=control;control=null;
      if(e.pointerType!=="touch"||!c||e.pointerId!==c.id||e.target.closest(controlSelector)!==c.button||Math.hypot(e.clientX-c.x,e.clientY-c.y)>12)return;
      e.preventDefault();ignoreControlClick=Date.now()+400;activate(c.button);
    },{signal});
    document.addEventListener("pointermove",move,{signal,passive:false});document.addEventListener("pointerup",up,{signal});document.addEventListener("pointercancel",cancel,{signal});
    ctx.main.addEventListener("lostpointercapture",()=>{if(!drag?.returning)cancel();},{signal});ctx.main.addEventListener("dragstart",e=>e.preventDefault(),{signal});
    ctx.main.addEventListener("click",e=>{
      const button=e.target.closest(controlSelector);
      if(button&&Date.now()>=ignoreControlClick)activate(button);
    },{signal});
    document.addEventListener("visibilitychange",()=>{if(document.hidden&&!state.over){cancel();paused=true;render();}},{signal});
    window.addEventListener("resize",cancel,{signal});window.addEventListener("blur",cancel,{signal});
  }
  function unmount(){cancel();abort?.abort();abort=null;timers.forEach(clearTimeout);timers.clear();ctx=null;locked=false;}
  window.SeowooBlockPang={mount,unmount,snapshot:()=>state?JSON.parse(JSON.stringify(state)):null};
})();
