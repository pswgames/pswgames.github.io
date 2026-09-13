const {chromium}=require('playwright');
const assert=require('assert');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:768,height:1024}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.evaluate(()=>{SeowooCore.setting('voice',false);SeowooCore.setting('sound',false)});

  const speech=await page.evaluate(()=>({
    praise:SeowooPolish.cleanSpeech('딩동댕! 잘했어! ⭐'),
    quantity:SeowooPolish.cleanSpeech('세 개! 잘 셌어!'),
    order:SeowooPolish.cleanSpeech('7! 맞았어!'),
    memory:SeowooPolish.cleanSpeech('우와! 순서를 기억했네! ⭐'),
    emoji:SeowooPolish.stripEmoji('잘했어 ⭐')
  }));
  assert.equal(speech.praise,'잘했어.');assert.equal(speech.quantity,'잘했어.');assert.equal(speech.order,'잘했어.');assert.equal(speech.memory,'잘했어.');assert.equal(speech.emoji,'잘했어');

  await page.evaluate(()=>SeowooApp.go('numbers'));
  assert.equal(await page.locator('.number-spark-hero').count(),1,'number hero missing');
  assert.equal(await page.locator('.numbers-polished .tile').count(),5,'number tiles missing');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'numbers overflow');
  await page.screenshot({path:'qa-artifacts/numbers-tablet.png'});

  await page.evaluate(()=>SeowooApp.go('together'));
  const rounds=await page.evaluate(()=>SeowooCore.state.stats.rounds);
  await page.locator('#missionDone').click();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.hero').count(),1,'together completion did not return home');
  assert.equal(await page.evaluate(()=>SeowooCore.state.stats.rounds),rounds+1,'together completion counted more than once');
  assert.equal(errors.length,0,errors.join('\n'));
  await browser.close();
  console.log('POLISH QA PASSED: concise praise, number visual hero, together -> home');
})().catch(e=>{console.error(e);process.exit(1)});
