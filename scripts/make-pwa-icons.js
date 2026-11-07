/* Generuje ikony PNG aplikacji instalowanej z przeglądarki (scripts/pwa-icons/). Wymaga Playwright. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'pwa-icons');
const svg = fs.readFileSync(path.join(root, 'public', 'icon.svg'), 'utf8');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shot = async (px, html, file) => {
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
    await page.screenshot({ path: path.join(out, file), omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
  };
  for (const px of [192, 512]) await shot(px, svg.replace('<svg ', `<svg width="${px}" height="${px}" `), `icon-${px}.png`);
  // maskable: logo w bezpiecznej strefie (ok. 72%) na pełnym tle
  const inner = Math.round(512 * 0.72);
  await shot(512, `<div style="width:512px;height:512px;background:radial-gradient(circle at 50% 40%,#1c1250,#06070f 70%);display:grid;place-items:center">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>`, 'icon-maskable-512.png');
  await browser.close();
  console.log('Ikony PWA gotowe');
})();
