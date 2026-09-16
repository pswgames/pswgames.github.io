/* Seowoo Playground v6.8.1 — visible app version + parent-triggered update/refresh. */
(()=>{
'use strict';
const VERSION=String(window.__SEOWOO_VERSION__||'6.8.1');
const main=document.querySelector('#main');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function ensureVersionBadge(){
  const brand=document.querySelector('.brand');if(!brand||brand.querySelector('.brand-version'))return;
  const copy=[...brand.children].find(el=>el.tagName==='SPAN'&&!el.classList.contains('brand-mark'));
  const title=copy?.querySelector('b');if(!copy||!title)return;
  const row=document.createElement('span');row.className='brand-title-row';title.before(row);row.append(title);
  const badge=document.createElement('small');badge.className='brand-version';badge.textContent=`v${VERSION}`;row.append(badge);
}

function route(){return document.body.dataset.playRoute||''}
function injectUpdateCard(){
  if(route()!=='parent'||!main?.querySelector('.parent-card')||main.querySelector('#v681UpdateCard'))return;
  const card=document.createElement('div');card.id='v681UpdateCard';card.className='parent-card v681-update-card';
  card.innerHTML=`<div class="v681-card-head"><span class="v681-update-icon" aria-hidden="true">↻</span><div><h2>앱 업데이트 / 새로고침</h2><p>최신 버전을 확인하고 서우놀이터를 새로 불러와.</p></div></div>
    <div class="setting v681-version-row"><span><b>현재 버전</b><small>지금 이 기기에서 실행 중인 버전</small></span><strong class="v681-current-version">v${VERSION}</strong></div>
    <button id="v681RefreshApp" type="button" class="btn primary v681-refresh-btn">최신 버전 확인 · 새로고침</button>
    <p id="v681UpdateStatus" class="v681-update-status">업데이트가 있으면 적용한 뒤 자동으로 다시 열려.</p>`;
  const cards=[...main.querySelectorAll('.parent-card')];
  const recordCard=cards.at(-1);if(recordCard)recordCard.insertAdjacentElement('beforebegin',card);else main.append(card);
  card.querySelector('#v681RefreshApp').addEventListener('click',()=>refreshApp(card));
}

async function waitForWorker(worker,timeout=2600){
  if(!worker||['installed','activated','redundant'].includes(worker.state))return;
  await Promise.race([new Promise(resolve=>worker.addEventListener('statechange',()=>{if(['installed','activated','redundant'].includes(worker.state))resolve()},{once:false})),wait(timeout)]);
}
async function refreshApp(card){
  const btn=card.querySelector('#v681RefreshApp'),status=card.querySelector('#v681UpdateStatus');
  if(btn.disabled)return;btn.disabled=true;btn.textContent='업데이트 확인 중…';status.textContent='서버의 최신 버전을 확인하고 있어.';
  try{
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg){
        const controllerChanged=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(true),{once:true}));
        await reg.update();
        await waitForWorker(reg.installing);
        if(reg.waiting){
          reg.waiting.postMessage({type:'SKIP_WAITING'});
          await Promise.race([controllerChanged,wait(2200)]);
        }
      }
    }
    status.textContent='최신 파일을 불러오는 중이야.';btn.textContent='새로고침 중…';
  }catch(error){
    console.warn('Seowoo manual update check failed',error);
    status.textContent=navigator.onLine?'업데이트 확인을 다시 시도하며 새로고침할게.':'인터넷 연결은 없지만 저장된 버전으로 다시 열게.';
    btn.textContent='새로고침 중…';
  }
  await wait(250);
  const url=new URL(location.href);url.searchParams.set('__sw',`manual-${Date.now().toString(36)}`);location.replace(url.href);
}

function sync(){ensureVersionBadge();injectUpdateCard()}
window.addEventListener('seowoo:route',()=>queueMicrotask(sync));
if(main)new MutationObserver(sync).observe(main,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
