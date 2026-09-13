(()=>{
'use strict';
const K=window.SeowooCore;
if(!K)return;
const {audio,state,save,awardSticker,confetti,toast}=K;

function stripEmoji(text){
  let value=String(text??'');
  try{value=value.replace(/\p{Extended_Pictographic}/gu,'')}catch{}
  return value.replace(/[\uFE0F\u200D]/g,'').replace(/\s+/g,' ').trim();
}

function cleanSpeech(text){
  const value=stripEmoji(text);
  if(!value)return value;
  if(/딩동댕|잘 셌어|순서를 기억했네|맞았어|개!\s*잘했어/.test(value))return '잘했어.';
  if(/^잘했어[!. ]*$/.test(value))return '잘했어.';
  if(/화장실 순서를 모두 해봤어/.test(value))return '잘했어.';
  if(/화장실에 다녀오자/.test(value)&&/변기에 잠깐/.test(value))return '화장실에 다녀오자.';
  return value;
}

const originalSpeak=audio.speak.bind(audio);
audio.speak=(text,lang='ko-KR',rate=.9,entry)=>{
  const raw=String(text??'');
  const cleaned=lang.toLowerCase().startsWith('ko')?cleanSpeech(raw):stripEmoji(raw);
  if(!cleaned)return Promise.resolve(false);
  const changed=cleaned!==stripEmoji(raw);
  const safeEntry=changed&&entry?{...entry,text:cleaned,src:null}:entry;
  return originalSpeak(cleaned,lang,rate,safeEntry);
};

function numberHero(){
  return `<section class="number-spark-hero" aria-label="숫자 놀이 미리보기">
    <div class="number-spark-copy">
      <span class="number-spark-kicker">숫자랑 놀자</span>
      <h2><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b></h2>
      <p>누르고, 세고, 순서를 맞추면서 숫자를 만나봐.</p>
    </div>
    <div class="number-spark-orbit" aria-hidden="true"><i>7</i><i>10</i><i>20</i><i>100</i></div>
  </section>`;
}

function decorateRoute(route){
  const main=document.querySelector('#main');
  if(!main)return;
  main.classList.toggle('numbers-polished',route==='numbers');
  main.classList.toggle('number-board-polished',route==='numberBoard');
  main.classList.toggle('home-polished',route==='home');
  if(route==='numbers'&&!main.querySelector('.number-spark-hero')){
    const sub=main.querySelector('.subhead');
    if(sub)sub.insertAdjacentHTML('afterend',numberHero());
  }
  if(route==='numbers'){
    main.querySelectorAll('.tile').forEach((tile,index)=>tile.style.setProperty('--tile-index',String(index)));
  }
}

window.addEventListener('seowoo:route',event=>decorateRoute(event.detail?.route||''));

document.addEventListener('click',event=>{
  const done=event.target.closest?.('#missionDone');
  if(!done)return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if(done.dataset.handled==='1')return;
  done.dataset.handled='1';
  done.disabled=true;
  state.stats.rounds++;
  state.stats.byGame.together=(state.stats.byGame.together||0)+1;
  state.recent.unshift({game:'together',at:Date.now()});
  const sticker=awardSticker();
  save();
  confetti();
  audio.success();
  toast(sticker?`${sticker[2]} 스티커를 받았어!`:'잘했어!');
  setTimeout(()=>window.SeowooApp?.go('home'),650);
},true);

window.SeowooPolish={cleanSpeech,stripEmoji,decorateRoute};
})();
