/*
 * Buduje aplikację na komputer: dist/IMPOSTOR.exe (Windows, jeden plik).
 *   npm run build:desktop            – Windows (domyślnie)
 *   node desktop/build.js --linux    – wersja testowa na Linuksa (desktop/build/impostor-linux)
 *
 * Kroki: esbuild (jeden plik JS) → blob Single Executable Application (Node.js) z wbudowanymi
 * plikami gry → ikona i opis pliku (resedit) → wstrzyknięcie bloba (postject) → tryb okienkowy.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const B = path.join(__dirname, 'build');
const LINUX = process.argv.includes('--linux');
const NODE_VERSION = process.versions.node; // blob musi pochodzić z tej samej wersji Node.js co plik .exe
const step = (n, t) => console.log(`${n}/6 ${t}`);
const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

fs.rmSync(B, { recursive: true, force: true });
fs.mkdirSync(B, { recursive: true });

step(1, 'Pakowanie kodu (esbuild)');
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'main.js')], bundle: true, platform: 'node', target: 'node22', format: 'cjs',
  outfile: path.join(B, 'app.cjs'), external: ['bufferutil', 'utf-8-validate'], minify: true, legalComments: 'none', logLevel: 'error'
});

step(2, 'Zasoby gry');
const assets = {};
function addDir(dir, prefix) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) addDir(p, `${prefix}/${f.name}`);
    else assets[`${prefix}/${f.name}`] = p;
  }
}
addDir(path.join(ROOT, 'public'), 'public');
addDir(path.join(ROOT, 'shared'), 'shared');
assets['vendor/socket.io.min.js'] = path.join(path.dirname(require.resolve('socket.io')), '..', 'client-dist', 'socket.io.min.js');
console.log(`   ${Object.keys(assets).length} plików`);

step(3, 'Blob aplikacji (Node.js SEA)');
const seaConfig = { main: path.join(B, 'app.cjs'), output: path.join(B, 'sea.blob'), disableExperimentalSEAWarning: true, useSnapshot: false, useCodeCache: false, assets };
fs.writeFileSync(path.join(B, 'sea-config.json'), JSON.stringify(seaConfig, null, 2));
execFileSync(process.execPath, ['--experimental-sea-config', path.join(B, 'sea-config.json')], { stdio: 'inherit' });

(async () => {
  let target;
  if (LINUX) {
    step(4, 'Plik wykonywalny (Linux, test)');
    target = path.join(B, 'impostor-linux');
    fs.copyFileSync(process.execPath, target);
  } else {
    step(4, `Node.js ${NODE_VERSION} dla Windows`);
    const nodeExe = await getWindowsNode();
    target = path.join(B, 'IMPOSTOR.exe');
    step(5, 'Ikona, opis i wbudowanie gry w plik');
    await brandExe(nodeExe, target, fs.readFileSync(path.join(B, 'sea.blob')));
  }

  if (LINUX) {
    step(5, 'Wbudowanie gry w plik');
    const postject = path.join(ROOT, 'node_modules', 'postject', 'dist', 'cli.js');
    const args = [postject, target, 'NODE_SEA_BLOB', path.join(B, 'sea.blob'), '--sentinel-fuse', FUSE];
    execFileSync(process.execPath, args, { stdio: ['ignore', 'ignore', 'inherit'] });
  }

  if (LINUX) { fs.chmodSync(target, 0o755); step(6, 'Gotowe: ' + path.relative(ROOT, target)); return; }

  step(6, 'Tryb okienkowy (bez czarnego okna konsoli)');
  setWindowsGuiSubsystem(target);
  const out = path.join(ROOT, 'dist', 'IMPOSTOR.exe');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(target, out);
  console.log(`Gotowe: dist/IMPOSTOR.exe (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
})().catch(e => { console.error(e); process.exit(1); });

/** Pobiera oficjalny node.exe tej samej wersji (pakiet node-win-x64 z rejestru npm). */
async function getWindowsNode() {
  const dir = path.join(__dirname, '.cache', `node-win-x64-${NODE_VERSION}`);
  const exe = path.join(dir, 'package', 'bin', 'node.exe');
  if (fs.existsSync(exe)) return exe;
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('npm', ['pack', `node-win-x64@${NODE_VERSION}`, '--silent'], { cwd: dir, stdio: ['ignore', 'ignore', 'inherit'] });
  const tgz = fs.readdirSync(dir).find(f => f.endsWith('.tgz'));
  execFileSync('tar', ['xzf', tgz], { cwd: dir });
  return exe;
}

/**
 * Ikona, nazwa i opis pliku .exe oraz wbudowana gra – wszystko w jednym przebiegu (resedit):
 * blob aplikacji trafia jako zasób RT_RCDATA „NODE_SEA_BLOB” (tak samo jak przy postject),
 * a bezpiecznik SEA zostaje włączony.
 */
async function brandExe(src, dst, blob) {
  const ResEdit = await import('resedit');
  const exe = ResEdit.NtExecutable.from(fs.readFileSync(src), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(await makeIco()));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const gid = groups.length ? groups[0].id : 1;
  const glang = groups.length ? groups[0].lang : 1033;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, gid, glang, ico.icons.map(i => i.data));
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] || ResEdit.Resource.VersionInfo.createEmpty();
  vi.setFileVersion(1, 0, 0, 0, 1033);
  vi.setProductVersion(1, 0, 0, 0, 1033);
  const langs = vi.getAllLanguagesForStringValues();
  const lang = langs[0] || { lang: 1033, codepage: 1200 };
  vi.setStringValues(lang, {
    CompanyName: 'IMPOSTOR', FileDescription: 'IMPOSTOR – gra w skojarzenia', ProductName: 'IMPOSTOR',
    InternalName: 'IMPOSTOR', OriginalFilename: 'IMPOSTOR.exe', FileVersion: '1.0.0', ProductVersion: '1.0.0', LegalCopyright: 'IMPOSTOR'
  });
  vi.outputToResourceEntries(res.entries);
  res.entries = res.entries.filter(e => !(e.type === 10 && e.id === 'NODE_SEA_BLOB'));
  res.entries.push({ type: 10, id: 'NODE_SEA_BLOB', lang: 0, codepage: 0, bin: blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength) });
  res.outputResource(exe);
  const out = Buffer.from(exe.generate());
  const off = out.indexOf(FUSE + ':0');
  if (off < 0 || out.indexOf(FUSE + ':0', off + 1) >= 0) throw new Error('Nie znaleziono bezpiecznika SEA w node.exe');
  out.write('1', off + FUSE.length + 1, 'latin1');
  fs.writeFileSync(dst, out);
}

/** Plik .ico z logo gry (PNG w kilku rozmiarach, renderowane przez Playwright). */
async function makeIco() {
  const out = path.join(B, 'icon.ico');
  const { chromium } = require('playwright');
  const svg = fs.readFileSync(path.join(ROOT, 'public', 'icon.svg'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = [];
  for (const px of sizes) {
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body></html>`);
    pngs.push(await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } }));
  }
  await browser.close();
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((px, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(px >= 256 ? 0 : px, e); header.writeUInt8(px >= 256 ? 0 : px, e + 1);
    header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += pngs[i].length;
  });
  fs.writeFileSync(out, Buffer.concat([header, ...pngs]));
  return out;
}

/** Zmienia podsystem PE z konsolowego (3) na okienkowy (2) – brak czarnego okna. */
function setWindowsGuiSubsystem(file) {
  const fd = fs.openSync(file, 'r+');
  const buf = Buffer.alloc(4);
  fs.readSync(fd, buf, 0, 4, 0x3c);
  const pe = buf.readUInt32LE(0);
  const sig = Buffer.alloc(4);
  fs.readSync(fd, sig, 0, 4, pe);
  if (sig.toString('binary') !== 'PE\0\0') throw new Error('To nie jest plik PE');
  const subsystemOffset = pe + 24 + 68;
  const cur = Buffer.alloc(2);
  fs.readSync(fd, cur, 0, 2, subsystemOffset);
  if (cur.readUInt16LE(0) !== 3 && cur.readUInt16LE(0) !== 2) throw new Error('Nieoczekiwany podsystem PE: ' + cur.readUInt16LE(0));
  const two = Buffer.alloc(2); two.writeUInt16LE(2, 0);
  fs.writeSync(fd, two, 0, 2, subsystemOffset);
  fs.closeSync(fd);
}
