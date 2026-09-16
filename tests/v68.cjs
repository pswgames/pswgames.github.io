const {chromium}=require('playwright');
const fs=require('fs'),assert=require('assert');
(async()=>{
  const html=fs.readFileSync('index.html','utf8');
  const upgrade=fs.readFileSync('js/v68-upgrade.js','utf8');
  const hotfix=fs.readFileSync('js/v681-hotfix.js','utf8');
  const pano=fs.readFileSync('js/v5-panorama.js','utf8');
  assert(html.includes('app-version" content="6.8.1"'));
  assert(html.includes('/css/v68-premium.css?v=6.8.1'));
  assert(html.includes('/css/v681-hotfix.css?v=6.8.1'));
  assert(html.includes('/js/v68-upgrade.js?v=6.8.1'));
  assert(html.includes('/js/v681-hotfix.js?v=6.8.1'));
  assert(html.includes('brand-version">v6.8.1'));
  assert(upgrade.includes('dataset.seowooKiosk'));
  assert(upgrade.includes('화면잠금 비밀번호 변경'));
  assert(upgrade.includes('consonant'));
  assert(upgrade.includes('vowel'));
  assert(upgrade.includes('화장실 탐험대'));
  assert(upgrade.includes('natural|neural|premium|enhanced|wavenet'));
  assert(hotfix.includes('앱 업데이트 / 새로고침'));
  assert(hotfix.includes('reg.update()'));
  assert.equal((pano.match(/images\.unsplash\.com\/photo-/g)||[]).length,10,'expected ten photographic elevator scenes');

  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:768,height:1024}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.evaluate(()=>{SeowooCore.setting('voice',false);SeowooCore.setting('sound',false)});
  assert.equal((await page.locator('.brand-version').textContent()).trim(),'v6.8.1','tiny title version missing');

  await page.evaluate(()=>SeowooApp.go('language'));
  await page.waitForSelector('[data-v68-find="consonant"]');
  assert.equal(await page.locator('[data-v68-find]').count(),2,'jamo finder tiles missing');
  await page.locator('[data-v68-find="consonant"]').click();
  await page.waitForSelector('.v68-letter-orb');
  assert((await page.locator('.v68-letter-choices button').count())>=2,'jamo choices missing');

  await page.evaluate(()=>SeowooApp.go('potty'));
  await page.waitForSelector('.v68-potty-shell');
  assert.equal(await page.locator('.v68-potty-track > span').count(),8,'premium potty progress missing');
  await page.locator('[data-v68-potty="next"]').click();
  assert((await page.locator('.v68-step-chip').textContent()).includes('2 / 8'),'potty step did not advance');

  await page.evaluate(()=>{window.SeowooNativeKiosk={};SeowooApp.go('home')});
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#installBtn').evaluate(el=>getComputedStyle(el).display),'none','install button should hide in kiosk');

  await page.evaluate(()=>{localStorage.removeItem('seowoo-screen-lock-pin-v2');SeowooScreenLock.open()});
  await page.waitForSelector('#screenLockDialog[open]');
  assert.equal(await page.locator('#screenLockConfirmWrap').evaluate(el=>el.hidden),true,'PIN setup must use one entry');
  await page.keyboard.press('Escape');

  await page.evaluate(()=>SeowooApp.go('parent'));
  for(const n of [1,2,3])await page.locator(`[data-gate="${n}"]`).click();
  await page.waitForSelector('#v681UpdateCard');
  assert((await page.locator('.v681-current-version').textContent()).includes('6.8.1'),'parent version missing');
  assert.equal(await page.locator('#v681RefreshApp').count(),1,'parent refresh button missing');

  await page.evaluate(()=>SeowooApp.go('elevator'));
  await page.waitForSelector('.elevator-panorama-image');
  const src=await page.locator('.elevator-panorama-image').getAttribute('src');
  assert(/elevator-city-v6|images\.unsplash\.com/.test(src),'unexpected elevator panorama source');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'v6.8.1 horizontal overflow');
  assert.equal(errors.length,0,errors.join('\n'));
  await page.screenshot({path:'qa-artifacts/v681-tablet.png',fullPage:true});
  await browser.close();
  console.log('V6.8.1 QA PASSED: title version, parent refresh, kiosk controls, premium potty, Jamo finders, photographic elevator scenes');
})().catch(e=>{console.error(e);process.exit(1)});
