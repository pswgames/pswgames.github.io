const {chromium}=require('playwright');
const fs=require('fs'),assert=require('assert');
const routes=['home','numbers','numberBoard','quantity','numberOrder','finger','elevator','language','alphabet','englishWords','koreanWords','hangul','think','color','shape','memory','potty','together','music','treasure','parent'];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1024,height:768}}),page=await context.newPage();
 const errors=[],missing=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 await page.goto('http://127.0.0.1:4173');await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForTimeout(300);
 await page.evaluate(()=>{SeowooCore.setting('voice',false);SeowooCore.setting('sound',false)});
 for(const [width,height] of [[360,800],[390,844],[430,932],[768,1024],[800,1280],[1024,768],[1280,800],[800,360]]){
  await page.setViewportSize({width,height});
  for(const route of routes){
   await page.evaluate(r=>SeowooApp.go(r),route);await page.waitForTimeout(35);
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,body:document.querySelector('#main').textContent.length}));
   assert(!layout.overflow,`${route} overflow ${width}`);assert(layout.body>0,`${route} blank`);
   if(route==='elevator'){
    const metrics=await page.evaluate(()=>({buttons:[...document.querySelectorAll('.floor-key')].map(e=>{const r=e.getBoundingClientRect();return{w:r.width,h:r.height,x:r.x,y:r.y,bottom:r.bottom,right:r.right}}),cabin:document.querySelector('.glass-cabin').getBoundingClientRect().height}));
    assert(metrics.buttons.length===20);assert(metrics.buttons.every(r=>r.w>=48&&r.h>=48&&r.bottom<=height&&r.right<=width&&r.x>=0&&r.y>=0),`floor clipping ${width}`);
    assert(metrics.cabin>90,`cabin too small ${width}`);
    if([390,800,1024,1280].includes(width)&&height>400){await page.waitForTimeout(300);await page.screenshot({path:`qa-artifacts/elevator-${width}.png`})}
   }
  }
  results.push({width,height,routes:routes.length,status:'pass'});console.log('Layout pass',width,height);
 }
 await page.setViewportSize({width:1024,height:768});await page.evaluate(()=>SeowooApp.go('elevator'));
 await page.clock.install();await page.locator('[data-floor="3"]').click();
 await page.clock.runFor(1000);assert.equal(await page.evaluate(()=>SeowooElevator.current),1);
 assert.equal(await page.evaluate(()=>SeowooElevator.phase),'closing');
 await page.clock.runFor(1200);assert.equal(await page.evaluate(()=>SeowooElevator.phase),'travel');
 await page.clock.runFor(1800);const middle=await page.evaluate(()=>SeowooElevator.position);assert(middle>1&&middle<3);
 await page.locator('[data-floor="5"]').click();assert.equal(await page.locator('.queued').textContent(),'5');
 await page.clock.runFor(13000);assert.equal(await page.evaluate(()=>SeowooElevator.current),5);
 await page.clock.runFor(6000);assert.equal(await page.evaluate(()=>SeowooElevator.phase),'idle');
 await page.locator('[data-floor="1"]').click();await page.clock.runFor(13000);assert.equal(await page.evaluate(()=>SeowooElevator.current),1);
 results.push({check:'closed-before-travel, intermediate floor, queue and descent',status:'pass'});
 const open=page.locator('[data-door-action="open"]');
 const blocked=await open.evaluate(el=>!el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})));assert(blocked,'elevator context menu must be suppressed');
 const panelBg=await page.locator('.floor-panel').evaluate(el=>getComputedStyle(el).backgroundColor);assert(panelBg.includes('0.05'),`floor panel is not 95% transparent: ${panelBg}`);
 await open.dispatchEvent('pointerdown',{pointerId:41,pointerType:'touch',isPrimary:true,button:0});
 assert.equal(await page.evaluate(()=>SeowooElevator.phase),'waiting');assert.equal(await open.getAttribute('aria-pressed'),'true');
 await page.clock.runFor(4000);assert.equal(await page.evaluate(()=>SeowooElevator.phase),'waiting','holding OPEN must keep the door open');
 await open.dispatchEvent('pointerup',{pointerId:41,pointerType:'touch',isPrimary:true,button:0});
 assert.equal(await open.getAttribute('aria-pressed'),'false');await page.clock.runFor(1100);assert.equal(await page.evaluate(()=>SeowooElevator.phase),'waiting');
 await page.clock.runFor(200);assert.equal(await page.evaluate(()=>SeowooElevator.phase),'idle');
 results.push({check:'hold-to-open, native long-press menu suppression and 95% transparent floor panel',status:'pass'});
 await page.evaluate(()=>SeowooApp.go('quantity'));
 const value=await page.locator('.object-cloud').evaluate(e=>[...e.textContent].length);
 const choicesBefore=await page.evaluate(()=>SeowooCore.state.stats.totalChoices);
 await page.locator(`[data-n="${value}"]`).evaluate(b=>{b.click();b.click();b.click()});
 assert.equal(await page.evaluate(()=>SeowooCore.state.stats.totalChoices),choicesBefore+1);
 await page.evaluate(()=>SeowooApp.go('home'));await page.clock.runFor(3000);assert(await page.locator('.hero').count());
 await page.evaluate(()=>SeowooApp.go('memory'));await page.evaluate(()=>SeowooApp.go('home'));await page.clock.runFor(4000);assert(await page.locator('.hero').count());
 results.push({check:'rapid answers count once; delayed game callbacks cancelled on exit',status:'pass'});
 await page.evaluate(()=>SeowooApp.go('parent'));for(const n of [1,2,3])await page.locator(`[data-gate="${n}"]`).click();assert(await page.locator('#voiceVolume').count());
 await page.locator('#voiceVolume').fill('0.5');assert.equal(await page.evaluate(()=>SeowooCore.audio.voiceVolume),.5);
 await page.evaluate(()=>SeowooApp.go('elevator'));const saved=await page.evaluate(()=>localStorage.getItem('seowoo-play-v3'));
 await page.reload();assert.equal(await page.evaluate(()=>document.body.dataset.playRoute),'elevator');
 assert.equal(await page.evaluate(()=>SeowooCore.state.settings.voiceVolume),.5);
 await context.setOffline(true);await page.reload();assert.equal(await page.evaluate(()=>document.body.dataset.playRoute),'elevator');
 await page.evaluate(()=>SeowooApp.go('numberBoard'));assert.equal(await page.locator('[data-num]').count(),100);
 await page.evaluate(()=>SeowooApp.go('home'));await page.screenshot({path:'qa-artifacts/home-tablet.png'});
 await context.setOffline(false);results.push({check:'parent volume, route restore, offline elevator and number board, existing storage schema',status:'pass'});
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(missing.length,0,missing.join('\n'));
 fs.writeFileSync('qa-artifacts/qa-results.json',JSON.stringify({results,errors,missing,limitations:['Desktop Chrome emulation, not a physical Android device','Neural voice recordings not supplied; browser fallback remains','Effects are synthesized, not field recordings']},null,2));
 await browser.close();console.log('ALL QA PASSED');
})().catch(e=>{console.error(e);process.exit(1)});
