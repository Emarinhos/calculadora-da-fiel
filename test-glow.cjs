const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(500);

  // Click Cenário Otimista
  const btn = await page.locator('text=Cenário Otimista');
  await btn.click();
  await page.waitForTimeout(500);

  const els = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).map(el => {
      const s = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        cls: el.className,
        rect: el.getBoundingClientRect(),
        bg: s.backgroundImage,
        bgColor: s.backgroundColor,
        boxShadow: s.boxShadow
      };
    }).filter(x => (x.bg && x.bg.includes('radial')) || (x.cls && typeof x.cls === 'string' && (x.cls.includes('radial') || x.cls.includes('pulse'))));
  });
  console.log(JSON.stringify(els, null, 2));
  await browser.close();
})();
