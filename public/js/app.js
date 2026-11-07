/* IMPOSTOR – punkt wejścia aplikacji. */
import { S, store, act, actions, go, rerender, refreshModal, closeModal, isModalOpen, toast } from './core.js';
import './screens.js';
import { O, initOnline, applyOnlineSettings } from './online.js';
import { L, applyLocalSettings } from './local.js';
import { customSets } from './ui.js';

const E = window.ImpostorEngine;

/* Gradient wspólny dla liczników (SVG <defs>) */
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c084fc"/><stop offset=".55" stop-color="#a855f7"/><stop offset="1" stop-color="#f43f5e"/></linearGradient></defs></svg>`);

/* ---------- ustawienia gry: wspólna obsługa (lokalnie lub u hosta online) ---------- */
function currentSettings(ctx) {
  if (ctx === 'local') return L.setup ? L.setup.settings : null;
  return O.room ? O.room.settings : null;
}
function apply(ctx, patch) {
  if (ctx === 'local') applyLocalSettings(patch);
  else applyOnlineSettings(patch);
}
function parseVal(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return +v;
  return v;
}
act({
  opt(el) {
    const { ctx, key } = el.dataset;
    const patch = { [key]: parseVal(el.dataset.val) };
    if (key === 'category') patch.custom = null;
    apply(ctx, patch);
  },
  optStep(el) {
    const { ctx, key } = el.dataset;
    const s = currentSettings(ctx);
    if (!s) return;
    let v = (+s[key] || 0) + (+el.dataset.delta);
    if (key === 'impostors') {
      const n = ctx === 'local' ? L.setup.players.length : Math.max(3, O.room.players.length);
      v = Math.max(1, Math.min(E.maxImpostors(n, s.mode), Math.min(s.impostors, E.maxImpostors(n, s.mode)) + (+el.dataset.delta)));
    }
    apply(ctx, { [key]: v });
  },
  optToggle(el) {
    const { ctx, key } = el.dataset;
    const s = currentSettings(ctx);
    if (!s) return;
    apply(ctx, { [key]: !s[key] });
  },
  optCustom(el) {
    const set = customSets().find(x => x.id === el.dataset.id);
    if (!set) return toast('Nie znaleziono zestawu słów.', 'error');
    apply(el.dataset.ctx, { category: 'custom', custom: { name: set.name, words: set.words } });
  },
  peek(el) {
    const v = el.querySelector('#peek-val');
    if (!v) return;
    v.classList.remove('blur');
    clearTimeout(el._t);
    el._t = setTimeout(() => v.classList.add('blur'), 2200);
  },
  flipCard() {}
});

/* ---------- start ---------- */
function boot() {
  initOnline();
  const params = new URLSearchParams(location.search);
  const code = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (code) {
    history.replaceState(null, '', location.pathname);
    go('join', { code });
    return;
  }
  // jeśli serwer potwierdzi, że jesteśmy w pokoju, przejdziemy do niego automatycznie
  go('boot-wait');
  setTimeout(() => { if (S.screen === 'boot-wait') go(O.roomCode ? 'online' : 'home'); }, O.unavailable ? 0 : 900);
}
import { defineScreen } from './core.js';
defineScreen('boot-wait', () => `<div class="boot"><div class="boot-logo">IMPOSTOR</div></div>`);
// po udanym powitaniu z pokojem – przejdź od razu
const origInterval = setInterval(() => {
  if (S.screen === 'boot-wait' && O.authed) { clearInterval(origInterval); go(O.roomCode ? 'online' : 'home'); }
  if (S.screen !== 'boot-wait') clearInterval(origInterval);
}, 100);

window.addEventListener('popstate', () => { closeModal(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && O.socket && !O.socket.connected) O.socket.connect();
});
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.IMPOSTOR_STANDALONE) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
/* Przycisk „Wstecz” w aplikacji na Androida */
window.impostorBack = () => {
  if (isModalOpen()) { closeModal(); return true; }
  if (S.screen === 'home' || S.screen === 'boot-wait') return false;
  if (S.screen === 'local' && actions.lExit) { actions.lExit(); return true; }
  if (S.screen === 'online' && actions.oLeave && O.room) { actions.oLeave(); return true; }
  go('home');
  return true;
};
void store; void rerender; void refreshModal;
boot();
if (location.hash === '#conn-error') {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => toast('Nie udało się połączyć z grą na komputerze. Sprawdź adres i czy telefon jest w tym samym Wi-Fi.', 'error'), 600);
}
