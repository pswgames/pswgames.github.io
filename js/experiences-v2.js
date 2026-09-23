(() => {
  "use strict";
  const K = window.SeowooCore;
  const D = window.SEOWOO_EXPERIENCE_V2;
  const V = window.SeowooV2Icon;
  if (!K || !D || !V) return;

  const { audio, complete, recordChoice, confetti, shuffle } = K;
  let ctx = null;
  let active = null;
  let abort = null;
  let drag = null;
  let timers = new Set();

  const S = {
    village: { place: null },
    market: { mission: [], cart: [], checked: false },
    kitchen: { recipe: null, washed: new Set(), chopped: new Set(), pot: new Set(), cooked: false, served: false },
    clinic: { patient: null, required: [], done: new Set() },
    puzzle: { case: null, placed: new Set(), deck: [], tries: 0, completed: 0 },
    feelings: { mood: "happy", case: null, deck: [], tries: 0, completed: 0, calm: 0, calmType: "breathe" }
  };

  const later=(fn,ms)=>{
    const t=setTimeout(()=>{ timers.delete(t); if(ctx) fn(); },ms);
    timers.add(t); return t;
  };
  const stopTimers=()=>{ timers.forEach(clearTimeout); timers.clear(); };
  const tone=(notes)=>notes.forEach((n,i)=>audio.tone(n,.18,"sine",.035,i*.11));
  const finish=(id)=>{ complete(id); audio.success(); confetti?.(); };
  const esc=(s)=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const shell=(title,body,cls,back="home")=>{
    ctx.main.innerHTML=`<section class="play-screen v2-screen ${cls}">${ctx.header(title,back)}<div class="v2-body">${body}</div></section>`;
  };
  const pick=(a)=>a[Math.floor(Math.random()*a.length)];
  const newDeck=(a,last)=> {
    let d=shuffle(a.map(x=>x.id));
    if(last && d[0]===last && d.length>1) [d[0],d[1]]=[d[1],d[0]];
    return d;
  };
  const nextFromDeck=(key,list,current)=>{
    if(!S[key].deck.length) S[key].deck=newDeck(list,current?.id);
    const id=S[key].deck.shift();
    return list.find(x=>x.id===id) || list[0];
  };
  const itemMeta=(id,items)=>items.find(x=>x[0]===id);
  const character=(mood="happy")=>`
    <div class="v2-kid mood-${mood}" aria-hidden="true">
      <i class="hair h1"></i><i class="hair h2"></i><i class="hair h3"></i>
      <div class="kid-head"><i class="eye l"></i><i class="eye r"></i><i class="brow l"></i><i class="brow r"></i><i class="mouth"></i><i class="cheek l"></i><i class="cheek r"></i></div>
      <div class="kid-body"><i class="shirt-dot a"></i><i class="shirt-dot b"></i></div>
      <i class="kid-arm l"></i><i class="kid-arm r"></i><i class="kid-leg l"></i><i class="kid-leg r"></i>
    </div>`;

  function villageHub(){
    S.village.place=null;
    shell("역할놀이 마을",`
      <div class="v2-world-hub">
        <img class="v2-scene-img" src="assets/worlds/v2/village.svg" alt="마트와 주방, 동물병원이 이어진 서우 역할놀이 마을">
        <div class="v2-world-title"><span>SEOWOO TOWN</span><h2>오늘은 어디에서 놀까?</h2><p>건물을 누르면 바로 들어갈 수 있어</p></div>
        <button class="world-building market" data-place="market"><span class="building-badge">장보기</span><b>알록달록 마트</b><small>12가지 물건을 골라 계산해요</small></button>
        <button class="world-building kitchen" data-place="kitchen"><span class="building-badge">요리</span><b>우리집 주방</b><small>씻고, 썰고, 보글보글</small></button>
        <button class="world-building clinic" data-place="clinic"><span class="building-badge">돌보기</span><b>동물 병원</b><small>아픈 친구를 건강하게</small></button>
        <div class="v2-town-kid">${character("happy")}<div class="kid-talk">서우야, 같이 놀러 가자!</div></div>
      </div>`,
      "v2-village");
  }

  function resetMarket(){
    S.market.mission=[...pick(D.village.market.missions)];
    S.market.cart=[];
    S.market.checked=false;
  }
  function market(){
    if(!S.market.mission.length) resetMarket();
    S.village.place="market";
    const products=D.village.market.products;
    const target=new Set(S.market.mission);
    const have=new Set(S.market.cart);
    const allDone=S.market.mission.every(x=>have.has(x));
    shell("알록달록 마트",`
      <div class="v2-role-wrap market-world">
        <img class="v2-scene-img" src="assets/worlds/v2/market.svg" alt="상품 진열대와 계산대가 있는 알록달록 마트">
        <button class="scene-back" data-village-home>← 마을로</button>
        <div class="market-mission panel-glass"><span>오늘의 장보기</span><div class="mission-list">${S.market.mission.map(id=>{const m=itemMeta(id,products);return `<div class="${have.has(id)?"done":""}">${V(m[2])}<b>${m[1]}</b><i></i></div>`;}).join("")}</div></div>
        <div class="market-products">${products.map(([id,name,icon],i)=>`
          <button class="v2-drag product-card p-${i}" data-drag="${id}" data-kind="market-product" data-default-zone="market-cart" aria-label="${name} 장바구니에 넣기">
            ${V(icon)}<small>${name}</small>${target.has(id)?'<i class="mission-mark">★</i>':""}
          </button>`).join("")}</div>
        <div class="market-cart v2-drop" data-zone="market-cart" data-accept="market-product">
          <div class="cart-handle"></div><div class="cart-box">${S.market.cart.map(id=>{const m=itemMeta(id,products);return V(m?.[2]||id)}).join("")}</div><i class="wheel a"></i><i class="wheel b"></i>
          <span>${S.market.cart.length ? `${S.market.cart.length}개 담았어` : "물건을 여기에 쏙!"}</span>
        </div>
        <div class="market-checkout panel-glass">
          <div class="scanner-beam"></div><div class="checkout-display">${S.market.checked?"계산 완료!":allDone?"준비 완료":"장보는 중"}</div>
          <button data-market-checkout ${allDone&&!S.market.checked?"":"disabled"}>${S.market.checked?"또 장보기":"계산하기"}</button>
        </div>
      </div>`,
      "v2-village v2-market");
  }

  function resetKitchen(){
    S.kitchen.recipe=pick(D.village.kitchen.recipes);
    S.kitchen.washed=new Set(); S.kitchen.chopped=new Set(); S.kitchen.pot=new Set();
    S.kitchen.cooked=false; S.kitchen.served=false;
  }
  function kitchen(){
    if(!S.kitchen.recipe) resetKitchen();
    S.village.place="kitchen";
    const R=S.kitchen.recipe, items=D.village.kitchen.ingredients;
    const need=new Set(R.need);
    const potReady=R.need.every(id=>S.kitchen.pot.has(id));
    shell("우리집 주방",`
      <div class="v2-role-wrap kitchen-world ${S.kitchen.cooked?"cooked":""}">
        <img class="v2-scene-img" src="assets/worlds/v2/kitchen.svg" alt="싱크대와 도마, 냄비가 있는 따뜻한 주방">
        <button class="scene-back" data-village-home>← 마을로</button>
        <div class="recipe-card panel-glass"><span>오늘의 요리</span><h2>${R.name}</h2><div>${R.need.map(id=>{const m=itemMeta(id,items);return `<i class="${S.kitchen.pot.has(id)?"done":""}">${V(m[2])}<small>${m[1]}</small></i>`;}).join("")}</div></div>
        <div class="fridge-tray">${items.filter(([id])=>need.has(id)&&!S.kitchen.washed.has(id)).map(([id,name,ic])=>`
          <button class="v2-drag ingredient" data-drag="${id}" data-kind="raw" data-default-zone="sink">${V(ic)}<small>${name}</small></button>`).join("")}</div>
        <div class="kitchen-zone sink-zone v2-drop" data-zone="sink" data-accept="raw"><b>1. 깨끗이 씻기</b><span class="faucet"></span><div>${[...S.kitchen.washed].filter(id=>!S.kitchen.chopped.has(id)).map(id=>{const m=itemMeta(id,items);return `<button class="v2-drag processed washed" data-drag="${id}" data-kind="washed" data-default-zone="board">${V(m[2])}</button>`;}).join("")}</div></div>
        <div class="kitchen-zone board-zone v2-drop" data-zone="board" data-accept="washed"><b>2. 도마에서 썰기</b><span class="knife"></span><div>${[...S.kitchen.chopped].filter(id=>!S.kitchen.pot.has(id)).map(id=>{const m=itemMeta(id,items);return `<button class="v2-drag processed chopped" data-drag="${id}" data-kind="chopped" data-default-zone="pot">${V(m[2])}</button>`;}).join("")}</div></div>
        <div class="kitchen-zone pot-zone v2-drop" data-zone="pot" data-accept="chopped"><b>3. 냄비에 넣기</b><div class="v2-pot"><span class="pot-food">${[...S.kitchen.pot].map(id=>{const m=itemMeta(id,items);return V(m?.[2]||id)}).join("")}</span><i class="steam a"></i><i class="steam b"></i><i class="steam c"></i></div></div>
        <div class="kitchen-actions panel-glass">
          <button data-cook ${potReady&&!S.kitchen.cooked?"":"disabled"}>불 켜고 요리하기</button>
          <button data-serve ${S.kitchen.cooked&&!S.kitchen.served?"":"disabled"}>접시에 담기</button>
          <div class="served-plate">${S.kitchen.served?'<span class="meal-art"></span><b>완성!</b>':""}</div>
        </div>
      </div>`,
      "v2-village v2-kitchen");
  }

  function resetClinic(){
    S.clinic.patient=pick(D.village.clinic.patients);
    S.clinic.required=shuffle(D.village.clinic.tools.map(x=>x[0])).slice(0,4);
    S.clinic.done=new Set();
  }
  function clinic(){
    if(!S.clinic.patient) resetClinic();
    S.village.place="clinic";
    const P=S.clinic.patient, tools=D.village.clinic.tools, done=S.clinic.done;
    const finished=S.clinic.required.every(x=>done.has(x));
    shell("동물 병원",`
      <div class="v2-role-wrap clinic-world">
        <img class="v2-scene-img" src="assets/worlds/v2/clinic.svg" alt="진료대와 의료도구가 있는 밝은 동물 병원">
        <button class="scene-back" data-village-home>← 마을로</button>
        <div class="patient-card panel-glass"><span>오늘의 친구</span><h2>${P.name}</h2><p>${finished?"이제 건강해졌어!":"필요한 도구 4개로 돌봐줘"}</p><div class="care-dots">${S.clinic.required.map(id=>`<i class="${done.has(id)?"done":""}"></i>`).join("")}</div></div>
        <div class="v2-patient ${P.id} ${finished?"happy":""}" style="--fur:${P.tone}"><i class="ear l"></i><i class="ear r"></i><div class="animal-head"><i class="eye l"></i><i class="eye r"></i><i class="nose"></i><i class="mouth"></i></div><div class="animal-body"></div><i class="tail"></i></div>
        <div class="patient-drop v2-drop" data-zone="patient" data-accept="clinic-tool"><span>도구를 친구에게 가져가봐</span></div>
        <div class="clinic-toolbox panel-glass">${tools.map(([id,name])=>`
          <button class="v2-drag clinic-tool ${done.has(id)?"used":""} ${S.clinic.required.includes(id)?"needed":""}" data-drag="${id}" data-kind="clinic-tool" data-default-zone="patient" ${done.has(id)?"disabled":""}>
            ${V(id)}<small>${name}</small>
          </button>`).join("")}</div>
        ${finished?'<button class="clinic-next" data-clinic-next>다른 친구 돌보기</button>':""}
      </div>`,
      "v2-village v2-clinic");
  }

  function puzzleCase(next=false){
    if(next || !S.puzzle.case){
      const prev=S.puzzle.case;
      S.puzzle.case=nextFromDeck("puzzle",D.puzzles,prev);
      S.puzzle.placed=new Set(); S.puzzle.tries=0;
    }
    const C=S.puzzle.case;
    const done=S.puzzle.placed;
    const finished=C.pieces.every(p=>done.has(p[0]));
    shell("퍼즐 탐험대",`
      <div class="v2-puzzle-world theme-${C.theme}">
        <div class="puzzle-top panel-glass"><div><span>랜덤 퍼즐 ${D.puzzles.findIndex(x=>x.id===C.id)+1} / ${D.puzzles.length}</span><h2>${C.title}</h2><p>${C.prompt}</p></div><button data-puzzle-next>다른 퍼즐</button></div>
        <div class="v2-puzzle-board">
          <div class="puzzle-slots">${C.slots.map(([id,label])=>`
            <div class="v2-slot v2-drop ${[...done].some(pid=>C.pieces.find(p=>p[0]===pid)?.[2]===id)?"has":""}" data-zone="p-${id}" data-accept="puzzle-${id}">
              <div class="slot-visual slot-${id}"></div><b>${label}</b>
              <div class="placed-items">${C.pieces.filter(p=>p[2]===id&&done.has(p[0])).map(p=>V(p[1])).join("")}</div>
            </div>`).join("")}</div>
          <div class="puzzle-tray">${shuffle(C.pieces.filter(p=>!done.has(p[0]))).map(([id,icon,target])=>`
            <button class="v2-drag v2-piece" data-drag="${id}" data-kind="puzzle-${target}" data-default-zone="p-${target}">${V(icon)}</button>`).join("")}</div>
        </div>
        <div class="puzzle-status ${finished?"complete":""}">${finished?'<b>퍼즐 완성!</b><span>이번엔 또 어떤 퍼즐이 나올까?</span><button data-puzzle-next>다음 랜덤 퍼즐</button>':`<span>${done.size} / ${C.pieces.length}</span><b>천천히 보고 같은 곳에 놓아봐</b>`}</div>
      </div>`,
      "v2-puzzle");
  }

  function moodFace(mood){
    return `<span class="v2-mood-face mood-${mood}"><i class="eye l"></i><i class="eye r"></i><i class="brow l"></i><i class="brow r"></i><i class="mouth"></i><i class="cheek l"></i><i class="cheek r"></i></span>`;
  }
  function feelingsHome(){
    const mood=S.feelings.mood;
    shell("마음친구",`
      <div class="v2-feelings-home mood-${mood}">
        <div class="feel-copy"><span>내 마음을 말해보는 연습</span><h2>서우야, 지금 기분이 어때?</h2><p>말하기 어렵다면 얼굴부터 골라도 괜찮아</p></div>
        <div class="feel-character">${character(mood)}<div class="feel-speech"><b>${D.moods.find(x=>x.id===mood).label}</b><span>내 마음을 알아차렸어</span></div></div>
        <div class="mood-grid">${D.moods.map(m=>`<button class="${m.id===mood?"active":""}" data-mood="${m.id}">${moodFace(m.id)}<b>${m.label}</b></button>`).join("")}</div>
        <div class="feel-actions"><button class="primary" data-feeling-start>친구 마음 맞혀보기 <span>${D.feelings.length}가지</span></button><button data-calm-start>마음 천천히 하기</button></div>
      </div>`,
      "v2-feelings");
  }
  function storyArt(scene){
    const art={
      blocks:'<div class="scene-floor"></div><div class="block a"></div><div class="block b"></div><div class="block c"></div><div class="block d"></div>',
      storm:'<div class="story-window storm"><i></i><i></i><b></b></div>',
      bubbles:'<div class="bubble-set"><i></i><i></i><i></i><i></i><i></i><i></i></div>',
      toy:'<div class="story-car"></div><div class="reach-hand"></div>',
      hug:'<div class="hug-pair"><i></i><i></i></div>',
      dark:'<div class="dark-room"><i class="lamp"></i><i class="star a"></i><i class="star b"></i></div>',
      cookie:'<div class="cookie-art"><i></i><span></span><b></b></div>',
      birthday:'<div class="party-art"><i></i><i></i><i></i><span></span></div>',
      splash:'<div class="splash-art"><i></i><i></i><span></span></div>',
      puppy:'<div class="story-puppy"><i class="ear l"></i><i class="ear r"></i><span></span><b></b></div>',
      balloon:'<div class="balloon-art"><i></i><span></span><b></b></div>',
      slide:'<div class="slide-art"><i></i><span></span><b></b></div>'
    };
    return `<div class="v2-story-art art-${scene}">${art[scene]||""}</div>`;
  }
  function feelingCase(next=false){
    if(next || !S.feelings.case){
      const prev=S.feelings.case;
      S.feelings.case=nextFromDeck("feelings",D.feelings,prev);
      S.feelings.tries=0;
    }
    const C=S.feelings.case;
    shell("친구 마음 알아보기",`
      <div class="v2-feeling-case">
        <div class="case-top"><button data-feeling-home>← 마음친구</button><span>랜덤 상황 ${D.feelings.findIndex(x=>x.id===C.id)+1} / ${D.feelings.length}</span><button data-feeling-next>다른 상황</button></div>
        <div class="case-card">
          <div class="case-scene">${storyArt(C.scene)}${character(C.mood)}</div>
          <div class="case-copy"><span>무슨 일이 있었을까?</span><h2>${C.title}</h2><p>${C.text}</p><strong>친구 마음은 어떨까?</strong></div>
        </div>
        <div class="case-moods">${D.moods.map(m=>`<button data-story-mood="${m.id}">${moodFace(m.id)}<b>${m.label}</b></button>`).join("")}</div>
        <div id="v2FeelFeedback" class="feel-feedback">표정을 보고 마음을 골라봐</div>
      </div>`,
      "v2-feelings");
  }

  function calm(next=false){
    if(next || S.feelings.calm===0){
      S.feelings.calm=0;
      S.feelings.calmType=pick(["breathe","count","stretch"]);
    }
    const type=S.feelings.calmType, n=S.feelings.calm;
    const config={
      breathe:["풍선처럼 천천히 후~","동그라미가 커질 때 들이마시고 작아질 때 내쉬어봐","후~"],
      count:["하나, 둘, 셋 천천히","별을 하나씩 누르며 마음을 천천히 만들어봐","톡"],
      stretch:["어깨를 으쓱, 툭","몸을 쭉 늘였다가 힘을 툭 풀어봐","쭉"]
    }[type];
    shell("마음 천천히 하기",`
      <div class="v2-calm ${type}">
        <div class="calm-title"><span>마음 쉬는 연습</span><h2>${config[0]}</h2><p>${config[1]}</p></div>
        <button class="calm-orb ${n? "active":""}" data-calm-tap><span>${n>=3?"편안":config[2]}</span><i></i></button>
        <div class="calm-steps">${[0,1,2].map(i=>`<i class="${i<n?"done":""}"></i>`).join("")}</div>
        ${n>=3?'<div class="calm-finish"><b>잘했어</b><span>마음이 조금 천천해졌어</span><button data-calm-next>다른 마음 쉬기</button><button data-feeling-home>마음친구로</button></div>':""}
      </div>`,
      "v2-feelings");
  }

  function validDrop(item,zone){
    if(!zone) return false;
    return String(zone.dataset.accept||"").split(/\s+/).includes(item.dataset.kind);
  }
  function startDrag(e,item){
    if(e.button!=null && e.button!==0) return;
    e.preventDefault();
    const r=item.getBoundingClientRect(), ghost=item.cloneNode(true);
    ghost.classList.add("v2-drag-ghost");
    Object.assign(ghost.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"});
    document.body.appendChild(ghost);
    item.classList.add("dragging");
    item.setPointerCapture?.(e.pointerId);
    drag={item,ghost,id:e.pointerId,ox:e.clientX-r.left,oy:e.clientY-r.top,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};
    audio.button();
  }
  function moveDrag(e){
    if(!drag || e.pointerId!==drag.id) return;
    drag.x=e.clientX; drag.y=e.clientY;
    if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>7) drag.moved=true;
    drag.ghost.style.left=(e.clientX-drag.ox)+"px";
    drag.ghost.style.top=(e.clientY-drag.oy)+"px";
    ctx.main.querySelectorAll(".v2-drop.over").forEach(z=>z.classList.remove("over"));
    const z=document.elementFromPoint?.(e.clientX,e.clientY)?.closest?.(".v2-drop");
    if(z&&validDrop(drag.item,z)) z.classList.add("over");
  }
  function dropAction(item,zone){
    const id=item.dataset.drag, z=zone.dataset.zone;
    if(active==="village" && S.village.place==="market" && z==="market-cart"){
      if(!S.market.cart.includes(id)) S.market.cart.push(id);
      audio.button(); market(); return;
    }
    if(active==="village" && S.village.place==="kitchen"){
      if(z==="sink"&&item.dataset.kind==="raw"){S.kitchen.washed.add(id); audio.noise?.(.35,900,.06); kitchen(); return;}
      if(z==="board"&&item.dataset.kind==="washed"){S.kitchen.chopped.add(id); tone([650,720]); kitchen(); return;}
      if(z==="pot"&&item.dataset.kind==="chopped"){S.kitchen.pot.add(id); audio.button(); kitchen(); return;}
    }
    if(active==="village" && S.village.place==="clinic" && z==="patient"){
      if(S.clinic.required.includes(id)) {
        S.clinic.done.add(id); audio.success();
        if(S.clinic.required.every(x=>S.clinic.done.has(x))) { finish("v2Clinic"); audio.speak("잘했어"); }
      } else {
        tone([300]); 
      }
      clinic(); return;
    }
    if(active==="puzzle" && z.startsWith("p-")){
      S.puzzle.placed.add(id); recordChoice(true,true); audio.success();
      const finished=S.puzzle.case.pieces.every(p=>S.puzzle.placed.has(p[0]));
      if(finished){ S.puzzle.completed++; finish("v2Puzzle"); }
      puzzleCase(false); return;
    }
  }
  function endDrag(e){
    if(!drag || (e.pointerId!=null&&e.pointerId!==drag.id)) return;
    const d=drag; drag=null;
    d.item.classList.remove("dragging"); d.ghost.remove();
    ctx.main.querySelectorAll(".v2-drop.over").forEach(z=>z.classList.remove("over"));
    let zone=document.elementFromPoint?.(d.x,d.y)?.closest?.(".v2-drop");
    if(!d.moved && d.item.dataset.defaultZone) zone=ctx.main.querySelector(`[data-zone="${d.item.dataset.defaultZone}"]`);
    if(zone&&validDrop(d.item,zone)) dropAction(d.item,zone);
    else {
      if(active==="puzzle"){S.puzzle.tries++;recordChoice(false,false);}
      d.item.classList.add("bounce"); later(()=>d.item?.classList.remove("bounce"),320); tone([320]);
    }
  }

  function bind(){
    abort?.abort(); abort=new AbortController(); const sig=abort.signal;
    ctx.main.addEventListener("pointerdown",e=>{const i=e.target.closest(".v2-drag");if(i&&!i.disabled)startDrag(e,i);},{signal:sig});
    document.addEventListener("pointermove",moveDrag,{signal:sig,passive:false});
    document.addEventListener("pointerup",endDrag,{signal:sig});
    document.addEventListener("pointercancel",endDrag,{signal:sig});
    ctx.main.addEventListener("click",e=>{
      const b=e.target.closest("button"); if(!b||b.classList.contains("v2-drag")) return;
      const d=b.dataset;
      if(d.place){ if(d.place==="market"){resetMarket();market();} else if(d.place==="kitchen"){resetKitchen();kitchen();} else {resetClinic();clinic();} return; }
      if("villageHome" in d){villageHub();return;}
      if("marketCheckout" in d){
        if(S.market.checked){resetMarket();market();return;}
        const have=new Set(S.market.cart);
        if(S.market.mission.every(x=>have.has(x))){S.market.checked=true;finish("v2Market");tone([660,880,990]);market();}
        return;
      }
      if("cook" in d){
        if(S.kitchen.recipe.need.every(x=>S.kitchen.pot.has(x))){S.kitchen.cooked=true;tone([440,550,660]);kitchen();}
        return;
      }
      if("serve" in d){
        if(S.kitchen.cooked){S.kitchen.served=true;finish("v2Kitchen");audio.speak("잘했어");kitchen();}
        return;
      }
      if("clinicNext" in d){resetClinic();clinic();return;}
      if("puzzleNext" in d){puzzleCase(true);return;}
      if(d.mood){S.feelings.mood=d.mood;tone([520,640]);feelingsHome();return;}
      if("feelingStart" in d){feelingCase(true);return;}
      if("feelingHome" in d){feelingsHome();return;}
      if("feelingNext" in d){feelingCase(true);return;}
      if(d.storyMood){
        const C=S.feelings.case; S.feelings.tries++;
        const ok=d.storyMood===C.mood; recordChoice(ok,ok&&S.feelings.tries===1);
        const f=document.getElementById("v2FeelFeedback");
        if(ok){
          b.classList.add("correct"); audio.success(); audio.speak("잘했어");
          if(f)f.innerHTML=`<b>그래, ${D.moods.find(x=>x.id===C.mood).label}</b><span>${esc(C.response)}</span><button data-feeling-next>다음 랜덤 상황</button>`;
          S.feelings.completed++; finish("v2Feelings");
        } else {
          b.classList.add("wrong"); if(f)f.textContent="표정을 한 번 더 살펴볼까?";
          later(()=>b.classList.remove("wrong"),350);
          if(S.feelings.tries>=2) ctx.main.querySelector(`[data-story-mood="${C.mood}"]`)?.classList.add("hint");
        }
        return;
      }
      if("calmStart" in d){S.feelings.calm=0;calm(true);return;}
      if("calmTap" in d){
        if(S.feelings.calm<3){S.feelings.calm++;audio.tone(392,.7,"sine",.02);calm(false);}
        return;
      }
      if("calmNext" in d){S.feelings.calm=0;calm(true);return;}
    },{signal:sig});
  }

  function mount(kind,options){
    unmount(); ctx=options; active=kind; bind();
    if(kind==="village") villageHub();
    else if(kind==="puzzle") puzzleCase(true);
    else feelingsHome();
  }
  function unmount(){
    stopTimers(); abort?.abort(); abort=null;
    if(drag){drag.ghost?.remove();drag=null;}
    ctx=null; active=null;
  }
  window.SeowooExperiences={mount,unmount};
  window.SeowooExperiencesV2={state:S, data:D};
})();