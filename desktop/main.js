/*
 * IMPOSTOR – aplikacja na komputer (Windows).
 * Uruchamia serwer gry i otwiera ją we własnym oknie (Microsoft Edge lub Chrome w trybie aplikacji,
 * bez pasków przeglądarki). Zamknięcie okna kończy działanie aplikacji.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const isWin = process.platform === 'win32';
const dataDir = path.join(process.env.APPDATA || path.join(os.homedir(), '.config'), 'IMPOSTOR');
fs.mkdirSync(dataDir, { recursive: true });
process.env.DATA_FILE = process.env.DATA_FILE || path.join(dataDir, 'db.json');
const logFile = path.join(dataDir, 'log.txt');

function log(...a) {
  try { fs.appendFileSync(logFile, `${new Date().toISOString()} ${a.join(' ')}\n`); } catch { /* */ }
}
function showError(msg) {
  log('BŁĄD', msg);
  if (isWin) {
    const text = String(msg).replace(/["'\\\r\n]/g, ' ').slice(0, 400);
    spawn('mshta', [`javascript:alert("IMPOSTOR: ${text}");close()`], { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
  } else console.error(msg);
}
process.on('uncaughtException', e => { showError(e && e.stack || e); setTimeout(() => process.exit(1), 3000); });

const START_PORT = 3000;

/** Czy gra już działa (drugie uruchomienie ma tylko otworzyć okno)? */
function probe(port) {
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 800 }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => { try { resolve(JSON.parse(body).app === 'impostor'); } catch { resolve(false); } });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function findBrowser() {
  if (!isWin) {
    for (const p of ['/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }
  const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  const rel = ['Microsoft\\Edge\\Application\\msedge.exe', 'Google\\Chrome\\Application\\chrome.exe', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'];
  for (const r of rel) for (const root of roots) {
    const p = path.join(root, r);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Otwiera grę we własnym oknie. Zwraca proces okna (lub null, gdy użyto zwykłej przeglądarki). */
function openWindow(port) {
  const url = `http://localhost:${port}/`;
  const browser = findBrowser();
  if (browser) {
    const child = spawn(browser, [
      `--app=${url}`,
      `--user-data-dir=${path.join(dataDir, 'okno')}`,
      '--window-size=520,900',
      '--no-first-run', '--no-default-browser-check', '--disable-features=Translate,msEdgeSidebarV2',
      '--lang=pl'
    ], { stdio: 'ignore', windowsHide: false });
    child.on('error', e => log('Nie udało się otworzyć okna:', e.message));
    log('Okno gry:', browser);
    return child;
  }
  log('Brak Edge/Chrome – otwieram domyślną przeglądarkę');
  if (isWin) spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', windowsHide: true });
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' });
  return null;
}

(async () => {
  log('Start aplikacji', process.version);
  if (await probe(START_PORT)) { openWindow(START_PORT); setTimeout(() => process.exit(0), 1500); return; }

  const srv = require('../server/index.js');
  srv.start(START_PORT, 20, port => {
    log('Serwer gry na porcie', port, 'adresy w sieci:', srv.lanAddresses().join(', '));
    const started = Date.now();
    const child = openWindow(port);
    // Zamknięcie okna kończy aplikację. Gdy przeglądarka przekaże okno innemu procesowi,
    // aplikacja kończy się, gdy przez 20 s żadne okno gry na tym komputerze nie jest otwarte.
    if (child) child.on('exit', () => { if (Date.now() - started > 8000) { log('Okno zamknięte'); process.exit(0); } });
    let seen = false, idleSince = Date.now();
    setInterval(() => {
      if (srv.localClientCount() > 0) { seen = true; idleSince = Date.now(); return; }
      const limit = seen ? 20000 : 120000;
      if (Date.now() - idleSince > limit) { log('Brak otwartego okna gry – zamykam'); process.exit(0); }
    }, 2000);
  });
})();
