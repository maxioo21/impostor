/* Generuje ikony aplikacji (PNG) z public/icon.svg przy użyciu przeglądarki Playwright. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const svg = fs.readFileSync(path.join(__dirname, '..', 'public', 'icon.svg'), 'utf8');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [dpi, px] of Object.entries(sizes)) {
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body></html>`);
    const dir = path.join(__dirname, 'res', `mipmap-${dpi}`);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'ic_launcher.png'), omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
  }
  await browser.close();
  console.log('Ikony gotowe');
})();
