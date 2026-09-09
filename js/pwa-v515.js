/* v5.15.1 — Android/Chrome installable PWA flow with explicit readiness state. */
(()=>{
  'use strict';
  let deferred=null;
  let refreshing=false;
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isAndroidChrome=()=>/Android/i.test(navigator.userAgent)&&/Chrome\//i.test(navigator.userAgent)&&!/EdgA|OPR\//i.test(navigator.userAgent);

  const markReady=ready=>{
    document.documentElement.dataset.pwaInstallReady=ready?'1':'0';
    const btn=document.querySelector('#installBtn');
    if(btn) btn.classList.toggle('install-ready',!!ready);
  };

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferred=event;
    window.__seowooInstallPrompt=event;
    markReady(true);
  });

  window.addEventListener('appinstalled',()=>{
    deferred=null;
    window.__seowooInstallPrompt=null;
    markReady(false);
    document.querySelector('#installBtn')?.setAttribute('hidden','');
  });

  if('serviceWorker' in navigator){
    navigator.serviceWorker.ready.then(reg=>reg.update().catch(()=>{})).catch(()=>{});
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(refreshing) return;
      refreshing=true;
      setTimeout(()=>location.reload(),80);
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

    const close=()=>{try{dlg.close()}catch{}};
    const promptInstall=async()=>{
      const prompt=deferred||window.__seowooInstallPrompt;
      if(!prompt) return false;
      action.disabled=true;
      try{
        await prompt.prompt();
        await prompt.userChoice.catch(()=>null);
      }finally{
        deferred=null;
        window.__seowooInstallPrompt=null;
        markReady(false);
        action.disabled=false;
        close();
      }
      return true;
    };

    const open=()=>{
      if(isIOS()){
        steps.innerHTML='<div class="install-step"><b>Safari</b>에서 열고 공유 버튼을 눌러요.</div><div class="install-step"><b>홈 화면에 추가</b> → <b>추가</b>를 선택하면 주소창 없는 앱으로 열려요.</div>';
        action.textContent='알겠어요';
        action.onclick=close;
      }else if(deferred||window.__seowooInstallPrompt){
        steps.innerHTML='<div class="install-step">설치 준비가 끝났어요. 아래 버튼을 누르면 Chrome의 <b>앱 설치</b> 창이 열려요.</div>';
        action.textContent='서우 놀이터 앱 설치';
        action.onclick=promptInstall;
      }else if(isAndroidChrome()){
        steps.innerHTML='<div class="install-step">Chrome이 설치 가능 여부를 확인하고 있어요.</div><div class="install-step">이 화면을 <b>한 번 이상 눌러서 사용</b>하고 약 <b>30초 이상</b> 연 뒤 다시 설치 버튼을 눌러줘. 설치 조건이 충족되면 "바로가기 추가"가 아니라 <b>앱 설치</b>가 활성화돼요.</div><div class="install-step">기존에 Chrome 마크가 붙은 바로가기는 삭제해도 돼요.</div>';
        action.textContent='확인';
        action.onclick=close;
      }else{
        steps.innerHTML='<div class="install-step">브라우저 메뉴에서 <b>앱 설치</b> 또는 <b>이 사이트를 앱으로 설치</b>를 선택해줘.</div>';
        action.textContent='확인';
        action.onclick=close;
      }
      if(!dlg.open) dlg.showModal();
    };

    btn.hidden=false;
    btn.onclick=open;
    if(later) later.onclick=close;
    markReady(!!(deferred||window.__seowooInstallPrompt));
  });
})();
