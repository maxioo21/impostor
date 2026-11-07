/*
 * Buduje jednoplikową wersję gry (tryb jednego telefonu, bez serwera): dist/impostor-standalone.html
 * Uruchom: npm run build:standalone
 * Wariant dla aplikacji Android: node scripts/build-standalone.js --app <plik wyjściowy>
 *   (czcionki z katalogu fonts/ obok pliku, flaga IMPOSTOR_APP)
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const PWA = process.argv.includes('--pwa');
const APP = PWA || process.argv.includes('--app'); // obie wersje mają czcionki w plikach obok
const flagArg = PWA ? '--pwa' : '--app';
const outArg = APP ? process.argv[process.argv.indexOf(flagArg) + 1] : null;
const VERSION = require(path.join(__dirname, '..', 'package.json')).version + '-' + Date.now().toString(36);
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const bundle = esbuild.buildSync({
  entryPoints: [path.join(root, 'public/js/app.js')],
  bundle: true, format: 'iife', minify: true, write: false, target: 'es2019', charset: 'utf8'
}).outputFiles[0].text;
const min = code => esbuild.transformSync(code, { minify: true, target: 'es2019', charset: 'utf8' }).code;
const css = esbuild.transformSync(read('public/css/style.css'), { loader: 'css', minify: true, charset: 'utf8' }).code;

// Dopasowanie do osadzenia jako strona: marginesy boczne z uwzględnieniem wcięć ekranu
const extraCss = `:root{color-scheme:dark}body{background:#04050c;color:#f0f1ff}
#app{padding-top:14px;padding-bottom:24px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}`;

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const face = (fam, file, range) => `@font-face{font-family:'${fam}';font-style:normal;font-display:swap;font-weight:100 900;src:url(fonts/${file}) format('woff2');unicode-range:${range}}`;
const fontFaces = [['Manrope', 'manrope'], ['Unbounded', 'unbounded']].map(([f, k]) => face(f, k + '-latin-wght-normal.woff2', LATIN) + face(f, k + '-latin-ext-wght-normal.woff2', LATIN_EXT)).join('');

const scripts = [read('shared/words.js'), read('shared/engine.js')].map(min);
for (const s of [...scripts, bundle]) if (/<\/script/i.test(s)) throw new Error('Kod zawiera </script>');

const html = `<title>IMPOSTOR</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="IMPOSTOR – gra towarzyska w skojarzenia na jednym telefonie.">${APP ? '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">' : ''}
${APP ? '' : '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@500;700;800;900&display=swap">'}
<style>${APP ? fontFaces : ''}${css}
${extraCss}</style>
<div class="bg-fx" aria-hidden="true"><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div><div class="grid-lines"></div><div class="stars"></div><div class="vignette"></div></div>
<div id="conn-banner" class="conn-banner" hidden></div>
<main id="app" aria-live="polite"><div class="boot"><div class="boot-logo">IMPOSTOR</div></div></main>
<div id="modal-root"></div>
<div id="toast-root"></div>
<canvas id="fx-canvas" aria-hidden="true"></canvas>
<script>window.IMPOSTOR_STANDALONE=true;${PWA ? 'window.IMPOSTOR_PWA=true;' : APP ? 'window.IMPOSTOR_APP=true;' : ''}</script>
${scripts.map(s => `<script>${s}</script>`).join('\n')}
<script>${bundle}</script>
`;
const out = outArg ? path.resolve(outArg) : path.join(root, 'dist/impostor-standalone.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
const pwaHead = PWA ? `<meta name="theme-color" content="#06070f"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="IMPOSTOR">` : '';
fs.writeFileSync(out, APP ? `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">${pwaHead}</head><body>${html}</body></html>` : html);
if (PWA) writePwaFiles(path.dirname(out));

/** Pliki aplikacji instalowanej z przeglądarki: manifest, ikony, czcionki, service worker (offline). */
function writePwaFiles(dir) {
  const fdir = path.join(dir, 'fonts');
  fs.mkdirSync(fdir, { recursive: true });
  for (const f of fs.readdirSync(path.join(root, 'public/fonts'))) fs.copyFileSync(path.join(root, 'public/fonts', f), path.join(fdir, f));
  fs.copyFileSync(path.join(root, 'public/icon.svg'), path.join(dir, 'icon.svg'));
  for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) fs.copyFileSync(path.join(root, 'scripts/pwa-icons', f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify({
    id: './', name: 'IMPOSTOR – gra w skojarzenia', short_name: 'IMPOSTOR', description: 'Gra towarzyska w skojarzenia. Kto nie zna tajnego słowa?',
    lang: 'pl', start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
    background_color: '#04050c', theme_color: '#06070f', categories: ['games', 'entertainment'],
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2));
  const files = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']
    .concat(fs.readdirSync(fdir).map(f => 'fonts/' + f));
  fs.writeFileSync(path.join(dir, 'sw.js'), `/* IMPOSTOR – praca offline (wersja ${VERSION}) */
const CACHE = 'impostor-${VERSION}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match('index.html'))));
});
`);
  fs.writeFileSync(path.join(dir, '.nojekyll'), '');
}
console.log('Zapisano', path.relative(root, out), Math.round(html.length / 1024) + ' KB');
