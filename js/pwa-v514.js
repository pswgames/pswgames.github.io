/* v5.14.0 — real PWA install flow. Avoids the Chrome-badged "website shortcut" path. */
(()=>{
  'use strict';
  let deferred=null, refreshing=false;
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;

  try{sessionStorage.setItem('installShown','1')}catch(e){}
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferred=event;
    window.__seowooInstallPrompt=event;
  });
  window.addEventListener('appinstalled',()=>{
    deferred=null;
    document.querySelector('#installBtn')?.setAttribute('hidden','');
  });

  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(refreshing) return;
      refreshing=true;
      location.reload();
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    document.body.classList.toggle('seowoo-standalone',standalone());
    const btn=document.querySelector('#installBtn');
    const dlg=document.querySelector('#installDialog');
    const steps=document.querySelector('#installSteps');
    const action=document.querySelector('#installAction');
    const later=document.querySelector('#installLater');
    if(!btn||!dlg||!steps||!action) return;
    if(standalone()){btn.hidden=true;return;}

    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const open=()=>{
      if(ios){
        steps.innerHTML='<div class="install-step"><b>Safari</b>에서 열고 공유 버튼을 눌러요.</div><div class="install-step"><b>홈 화면에 추가</b> → <b>추가</b>를 선택하면 주소창 없는 앱으로 열려요.</div>';
        action.textContent='알겠어요';
        action.onclick=()=>dlg.close();
      }else if(deferred||window.__seowooInstallPrompt){
        steps.innerHTML='<div class="install-step">아래 버튼을 누르면 Chrome의 <b>앱 설치</b> 창이 열려요. 일반 "바로가기 만들기"와 달라요.</div>';
        action.textContent='서우 놀이터 앱 설치';
        action.onclick=async()=>{
          const prompt=deferred||window.__seowooInstallPrompt;
          if(!prompt) return;
          await prompt.prompt();
          await prompt.userChoice.catch(()=>null);
          deferred=null; window.__seowooInstallPrompt=null; dlg.close();
        };
      }else{
        steps.innerHTML='<div class="install-step">Chrome 주소창 오른쪽의 <b>앱 설치 아이콘</b> 또는 메뉴의 <b>페이지를 앱으로 설치</b>를 선택해줘.</div><div class="install-step">기존에 Chrome 마크가 붙은 바로가기가 있다면 그건 삭제하고 새 앱을 설치해야 해.</div>';
        action.textContent='확인';
        action.onclick=()=>dlg.close();
      }
      if(!dlg.open) dlg.showModal();
    };
    btn.hidden=false;
    btn.onclick=open;
    later&&(later.onclick=()=>dlg.close());
  });
})();
