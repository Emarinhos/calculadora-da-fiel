const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();

  // 1. Desktop 1440px - Unmarked
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page1 = await ctx1.newPage();
  await page1.goto('http://localhost:5173');
  await page1.waitForTimeout(1000);
  await page1.screenshot({ path: 'C:/Users/evert/.gemini/antigravity/brain/a455ceb8-0619-4d08-92f1-69cb38d4508e/screenshot-1440-unmarked.png' });

  // 2. Desktop 1440px - Marked (Click V on first 2 games)
  const buttons1 = await page1.$$('button:has-text("V")');
  if (buttons1.length >= 2) {
    await buttons1[0].click();
    await page1.waitForTimeout(200);
    await buttons1[1].click();
    await page1.waitForTimeout(600);
  }
  await page1.screenshot({ path: 'C:/Users/evert/.gemini/antigravity/brain/a455ceb8-0619-4d08-92f1-69cb38d4508e/screenshot-1440-marked.png' });
  await ctx1.close();

  // 3. Mobile 390px - Unmarked
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await ctx2.newPage();
  await page2.goto('http://localhost:5173');
  await page2.waitForTimeout(1000);
  await page2.screenshot({ path: 'C:/Users/evert/.gemini/antigravity/brain/a455ceb8-0619-4d08-92f1-69cb38d4508e/screenshot-390-unmarked.png' });

  // 4. Mobile 390px - Marked (Click V on first 2 games)
  const buttons2 = await page2.$$('button:has-text("V")');
  if (buttons2.length >= 2) {
    await buttons2[0].click();
    await page2.waitForTimeout(200);
    await buttons2[1].click();
    await page2.waitForTimeout(600);
  }
  await page2.screenshot({ path: 'C:/Users/evert/.gemini/antigravity/brain/a455ceb8-0619-4d08-92f1-69cb38d4508e/screenshot-390-marked.png' });
  await ctx2.close();

  await browser.close();
})();
