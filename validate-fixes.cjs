const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();

  // Desktop Page (1440px)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  // Helper function to capture cropped arc + number
  async function captureArc(val, filename, color) {
    await page.evaluate(({ val, color }) => {
      const paths = document.querySelectorAll('svg path');
      if (paths.length >= 2) {
        const arc = paths[1];
        const offset = 376.99 * (1 - val / 100);
        arc.setAttribute('stroke-dashoffset', offset);
        arc.setAttribute('stroke', color);
      }
      const numSpan = document.querySelector('[aria-live="polite"] span:first-child');
      if (numSpan) {
        numSpan.textContent = val.toFixed(1);
        numSpan.className = 'text-[48px] font-light tracking-tight tabular-nums leading-none transition-all duration-700 ' + (val < 30 ? 'text-risk-safe' : val <= 60 ? 'text-risk-warn' : 'text-risk-danger');
      }
    }, { val, color });
    await page.waitForTimeout(200);

    const arcEl = page.locator('.relative.w-\\[280px\\]');
    await arcEl.screenshot({
      path: `C:/Users/evert/.gemini/antigravity/brain/a455ceb8-0619-4d08-92f1-69cb38d4508e/${filename}`
    });
  }

  // Item 1: Cropped zooms for 10%, 50%, 74.5%, 99%
  await captureArc(10.0, 'zoom-arc-10.png', '#34C759');
  await captureArc(50.0, 'zoom-arc-50.png', '#FFD60A');
  await captureArc(74.5, 'zoom-arc-74.5.png', '#FF453A');
  await captureArc(99.0, 'zoom-arc-99.png', '#FF453A');

  // Reload to test natural application state with 0 games marked
  await page.reload();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/evert/.gemini/antigravity/brain/a455ceb8-0619-4d08-92f1-69cb38d4508e/screenshot-1440-fixed.png' });

  // Item 2: Mark 2 wins (Rodada 30 and 31 as V)
  const btns = await page.$$('button:has-text("V")');
  await btns[0].click();
  await page.waitForTimeout(200);
  await btns[1].click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/evert/.gemini/antigravity/brain/a455ceb8-0619-4d08-92f1-69cb38d4508e/screenshot-1440-2wins.png' });
  await ctx.close();

  // Mobile Page (390px)
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto('http://localhost:5173');
  await mobilePage.waitForTimeout(1000);

  // Screenshot mobile default (unmarked) - verifying clean black bar with no orphan glow
  await mobilePage.screenshot({ path: 'C:/Users/evert/.gemini/antigravity/brain/a455ceb8-0619-4d08-92f1-69cb38d4508e/screenshot-390-fixed-unmarked.png' });

  // Mark 2 wins on mobile
  const mBtns = await mobilePage.$$('button:has-text("V")');
  await mBtns[0].click();
  await mobilePage.waitForTimeout(200);
  await mBtns[1].click();
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: 'C:/Users/evert/.gemini/antigravity/brain/a455ceb8-0619-4d08-92f1-69cb38d4508e/screenshot-390-fixed-2wins.png' });

  await mobileCtx.close();
  await browser.close();
})();
