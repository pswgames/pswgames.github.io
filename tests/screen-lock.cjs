const assert=require('assert');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1024,height:768}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));

  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(()=>localStorage.removeItem('seowoo-screen-lock-v1'));
  await page.reload();
  await page.clock.install();

  const top=page.locator('#screenLockBtn');
  assert.equal(await top.count(),1);
  assert.equal(await top.locator('.screen-lock-state').textContent(),'OFF');
  assert.equal(await page.evaluate(()=>SeowooScreenLock.locked),false);

  await top.dispatchEvent('pointerdown',{pointerId:41,pointerType:'touch',isPrimary:true,button:0});
  await page.clock.runFor(4900);
  assert.equal(await page.evaluate(()=>SeowooScreenLock.locked),false,'lock must require at least five seconds');
  await page.clock.runFor(150);
  assert.equal(await page.evaluate(()=>SeowooScreenLock.locked),true,'five-second hold must enable lock');
  assert(await page.locator('body.screen-locked').count());
  assert.equal(await top.locator('.screen-lock-state').textContent(),'ON');
  await top.dispatchEvent('pointerup',{pointerId:41,pointerType:'touch',isPrimary:true,button:0});

  const installDisplay=await page.locator('#installBtn').evaluate(e=>getComputedStyle(e).display);
  assert.equal(installDisplay,'none','install UI must be unavailable while locked');

  const gestureBlocked=await page.evaluate(()=>{
    const menu=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});
    document.body.dispatchEvent(menu);
    return menu.defaultPrevented;
  });
  assert.equal(gestureBlocked,true,'native context menu must be blocked while locked');

  const externalBlocked=await page.evaluate(()=>{
    const a=document.createElement('a');
    a.href='https://example.com/';
    document.body.append(a);
    const ev=new MouseEvent('click',{bubbles:true,cancelable:true});
    a.dispatchEvent(ev);
    a.remove();
    return ev.defaultPrevented;
  });
  assert.equal(externalBlocked,true,'external anchors must be blocked while locked');
  assert.equal(await page.evaluate(()=>window.open('https://example.com/')),null,'window.open must be blocked while locked');

  await page.evaluate(()=>history.back());
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(()=>SeowooScreenLock.locked),true,'back navigation must not disable lock');
  assert.equal(new URL(page.url()).origin,'http://127.0.0.1:4173');

  await page.evaluate(()=>SeowooApp.go('elevator'));
  await page.waitForTimeout(20);
  const floating=page.locator('#screenLockFloat');
  assert.equal(await floating.count(),1);
  assert.equal(await floating.isVisible(),true,'locked immersive routes need a reachable unlock control');

  await floating.dispatchEvent('pointerdown',{pointerId:42,pointerType:'touch',isPrimary:true,button:0});
  await page.clock.runFor(4900);
  assert.equal(await page.evaluate(()=>SeowooScreenLock.locked),true,'unlock must also require at least five seconds');
  await page.clock.runFor(150);
  assert.equal(await page.evaluate(()=>SeowooScreenLock.locked),false,'five-second hold must disable lock');
  await floating.dispatchEvent('pointerup',{pointerId:42,pointerType:'touch',isPrimary:true,button:0});
  assert.equal(await page.locator('body.screen-locked').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('seowoo-screen-lock-v1')),'0');

  assert.equal(errors.length,0,errors.join('\n'));
  await browser.close();
  console.log('SCREEN LOCK QA PASSED: 5s toggle, persistent app guard, external-navigation blocking, immersive unlock control');
})().catch(e=>{console.error(e);process.exit(1)});
