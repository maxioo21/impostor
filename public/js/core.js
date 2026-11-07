/* IMPOSTOR – rdzeń klienta: stan, routing, renderowanie, akcje, modale, powiadomienia. */
import { sfx } from './sound.js';

/* ---------- pamięć lokalna (bezpieczna) ---------- */
export const store = {
  get(k, def) {
    try { const v = localStorage.getItem('imp.' + k); return v == null ? def : JSON.parse(v); } catch { return def; }
  },
  set(k, v) { try { localStorage.setItem('imp.' + k, JSON.stringify(v)); } catch { /* brak miejsca / tryb prywatny */ } },
  del(k) { try { localStorage.removeItem('imp.' + k); } catch { /* */ } }
};

/* ---------- profil i preferencje ---------- */
export const profile = Object.assign({ name: '', avatar: Math.floor(Math.random() * 32) }, store.get('profile', {}));
export function saveProfile() { store.set('profile', { name: profile.name, avatar: profile.avatar }); }
export const prefs = Object.assign({ sound: true, vibrate: true }, store.get('prefs', {}));
export function savePrefs() { store.set('prefs', prefs); }

/* ---------- escape HTML ---------- */
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- czas serwera ---------- */
let offset = 0;
export function setServerTime(serverNow) {
  const o = serverNow - Date.now();
  offset = Math.abs(o - offset) > 1500 ? o : offset * 0.7 + o * 0.3;
}
export function serverNow() { return Date.now() + offset; }

/* ---------- routing / render ---------- */
export const S = { screen: 'boot', params: {} };
const screens = {};
export const actions = {};
export function defineScreen(name, fn) { screens[name] = fn; }
export function act(map) { Object.assign(actions, map); }
export const drafts = {};
const enterHooks = [];
export function onEnter(fn) { enterHooks.push(fn); }

export function go(name, params) {
  const changed = S.screen !== name;
  S.screen = name;
  S.params = params || {};
  if (changed) for (const k in drafts) delete drafts[k];
  render(true);
  if (changed) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  enterHooks.forEach(f => f(name));
}

export function render(isNew) {
  const root = document.getElementById('app');
  const fn = screens[S.screen];
  if (!fn) return;
  const ae = document.activeElement;
  const focus = ae && ae.id && root.contains(ae) ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
  const scrollY = window.scrollY;
  let html;
  try { html = fn(S.params); } catch (e) { console.error(e); html = `<div class="empty-state">Wystąpił błąd widoku.<br><button class="btn sm" data-action="goHome">Menu</button></div>`; }
  root.innerHTML = `<div class="screen${isNew ? ' enter' : ''}">${html}</div>`;
  root.querySelectorAll('[data-persist]').forEach(el => { if (drafts[el.id] != null) el.value = drafts[el.id]; });
  if (focus) {
    const el = document.getElementById(focus.id);
    if (el) { el.focus({ preventScroll: true }); try { if (focus.s != null) el.setSelectionRange(focus.s, focus.e); } catch { /* */ } }
  }
  if (!isNew) window.scrollTo(0, scrollY);
  root.querySelectorAll('[data-autofocus]').forEach(el => { if (!focus && isNew && matchMedia('(pointer:fine)').matches) el.focus({ preventScroll: true }); });
  updateTimers(true);
}
export const rerender = () => render(false);

/* ---------- delegacja zdarzeń ---------- */
function handleAction(el, ev) {
  const name = el.dataset.action;
  const fn = actions[name];
  if (!fn) { console.warn('Brak akcji', name); return; }
  if (!el.dataset.silent) sfx('click');
  fn(el, ev);
}
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-action]');
  if (!el || el.disabled) return;
  if (el.tagName === 'A') ev.preventDefault();
  handleAction(el, ev);
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id && t.hasAttribute('data-persist')) drafts[t.id] = t.value;
  if (t.dataset.input && actions[t.dataset.input]) actions[t.dataset.input](t, ev);
});
document.addEventListener('keydown', ev => {
  const t = ev.target;
  if (ev.key === 'Enter' && t.dataset && t.dataset.enter && !ev.shiftKey) {
    ev.preventDefault();
    const fn = actions[t.dataset.enter];
    if (fn) fn(t, ev);
  }
  if (ev.key === 'Escape' && modalState.open && modalState.closable) closeModal();
});

/* ---------- modal ---------- */
const modalState = { open: false, fn: null, closable: true };
export function showModal(fn, opts) {
  modalState.open = true;
  modalState.fn = fn;
  modalState.closable = !(opts && opts.closable === false);
  modalState.onClose = opts && opts.onClose;
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-backdrop><div class="sheet" role="dialog" aria-modal="true">${fn()}</div></div>`;
  root.querySelector('[data-backdrop]').addEventListener('click', e => { if (e.target === e.currentTarget && modalState.closable) closeModal(); });
  const af = root.querySelector('[data-autofocus]');
  if (af) setTimeout(() => af.focus(), 60);
}
export function refreshModal() {
  if (!modalState.open || !modalState.fn) return;
  const sheet = document.querySelector('#modal-root .sheet');
  if (!sheet) return;
  const ae = document.activeElement;
  const focus = ae && ae.id && sheet.contains(ae) ? { id: ae.id, v: ae.value, s: ae.selectionStart } : null;
  const st = sheet.scrollTop;
  sheet.innerHTML = modalState.fn();
  sheet.scrollTop = st;
  if (focus) { const el = document.getElementById(focus.id); if (el) { el.value = focus.v; el.focus(); try { el.setSelectionRange(focus.s, focus.s); } catch { /* */ } } }
}
export function closeModal() {
  if (!modalState.open) return;
  modalState.open = false;
  const cb = modalState.onClose;
  modalState.fn = null;
  const bd = document.querySelector('#modal-root .modal-backdrop');
  if (bd) { bd.classList.add('closing'); setTimeout(() => { if (!modalState.open) document.getElementById('modal-root').innerHTML = ''; }, 190); }
  if (cb) cb();
}
export function isModalOpen() { return modalState.open; }
act({ closeModal: () => closeModal() });

/** Okno potwierdzenia – zwraca Promise<boolean>. */
export function confirmBox({ title, text, ok = 'Potwierdź', cancel = 'Anuluj', danger = false }) {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (done) return; done = true; closeModal(); resolve(v); };
    act({ _cfOk: () => finish(true), _cfNo: () => finish(false) });
    showModal(() => `
      <div class="stack">
        <div class="sheet-head"><h2>${esc(title)}</h2></div>
        ${text ? `<p class="muted" style="margin:0">${text}</p>` : ''}
        <button class="btn block ${danger ? 'red' : ''}" data-action="_cfOk">${esc(ok)}</button>
        <button class="btn ghost block" data-action="_cfNo">${esc(cancel)}</button>
      </div>`, { onClose: () => finish(false) });
  });
}

/* ---------- toast ---------- */
export function toast(text, kind) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  const ic = kind === 'error' ? '<svg class="ic sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>'
    : kind === 'success' ? '<svg class="ic sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
      : '<svg class="ic sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
  el.innerHTML = ic + `<span>${esc(text)}</span>`;
  root.appendChild(el);
  while (root.children.length > 3) root.firstChild.remove();
  if (kind === 'error') { sfx('error'); vibrate(80); }
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, kind === 'error' ? 3600 : 2800);
}

export function vibrate(p) { if (prefs.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch { /* */ } }

/* ---------- liczniki czasu ---------- */
let lastSecs = {};
export function updateTimers(force) {
  document.querySelectorAll('[data-deadline]').forEach(el => {
    const dl = +el.dataset.deadline;
    const total = +el.dataset.total || 30000;
    const now = el.dataset.clock === 'local' ? Date.now() : serverNow();
    const rem = Math.max(0, dl - now);
    const secs = Math.min(Math.ceil(rem / 1000), Math.round(total / 1000));
    const pct = Math.max(0, Math.min(100, (rem / total) * 100));
    const num = el.querySelector('.timer-num');
    if (num) num.textContent = secs;
    const fg = el.querySelector('.ring-fg');
    if (fg) fg.style.strokeDashoffset = String(100 - pct);
    const bar = el.querySelector('.timer-bar i');
    if (bar) bar.style.width = pct + '%';
    el.classList.toggle('urgent', secs <= 5);
    const key = el.dataset.tick;
    if (key && !force && lastSecs[key] !== secs && secs <= 5 && secs > 0) { sfx('tick'); if (secs <= 3) vibrate(30); }
    if (key) lastSecs[key] = secs;
  });
}
setInterval(() => updateTimers(false), 200);

/* ---------- schowek / udostępnianie ---------- */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* */ }
    ta.remove();
    return ok;
  }
}

/* ---------- statystyki i historia lokalna ---------- */
export function bumpGamesPlayed() { store.set('gamesPlayed', (store.get('gamesPlayed', 0) || 0) + 1); }
export function addHistory(entry) {
  const h = store.get('history', []);
  h.unshift(entry);
  store.set('history', h.slice(0, 40));
}
export function emptyLocalStats() { return { games: 0, wins: 0, losses: 0, impostorGames: 0, impostorWins: 0, detections: 0, streak: 0, bestStreak: 0, jesterWins: 0 }; }
export function applyResultToStats(s, r, pid) {
  const pl = r.players.find(p => p.id === pid);
  if (!pl) return s;
  const won = r.winners.includes(pid);
  s.games++;
  if (won) { s.wins++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); } else { s.losses++; s.streak = 0; }
  if (pl.team === 'impostors') { s.impostorGames++; if (won) s.impostorWins++; }
  if (r.correctVoters.includes(pid)) s.detections++;
  if (pl.role === 'jester' && won) s.jesterWins++;
  return s;
}
export function statPoints(s) { return s.wins * 10 + s.detections * 5 + s.impostorWins * 5 + (s.jesterWins || 0) * 5; }
