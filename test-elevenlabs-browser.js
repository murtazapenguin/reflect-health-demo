const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to test page...');
  await page.goto('https://reflect-health-demo.vercel.app/test-elevenlabs.html');
  await page.waitForLoadState('networkidle');
  
  console.log('Taking initial screenshot...');
  await page.screenshot({ path: 'screenshot-initial.png', fullPage: true });
  
  console.log('Clicking Start button...');
  await page.click('#start');
  
  console.log('Waiting 10 seconds for output...');
  await page.waitForTimeout(10000);
  
  console.log('Taking final screenshot...');
  await page.screenshot({ path: 'screenshot-final.png', fullPage: true });
  
  console.log('Getting log content...');
  const logContent = await page.locator('#log').textContent();
  
  console.log('\n========== LOG CONTENT ==========');
  console.log(logContent);
  console.log('========== END LOG CONTENT ==========\n');
  
  await browser.close();
})();
