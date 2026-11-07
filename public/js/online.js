/* IMPOSTOR – tryb online (Socket.IO). Klient zna tylko publiczny stan pokoju i własną rolę. */
import { S, store, profile, esc, defineScreen, act, go, rerender, toast, showModal, closeModal, refreshModal, confirmBox, vibrate,
  drafts, copyText, setServerTime, bumpGamesPlayed, addHistory } from './core.js';
import * as U from './ui.js';
import { sfx } from './sound.js';
import { confetti } from './fx.js';
import { historyEntry } from './local.js';

const E = window.ImpostorEngine;
const { icon, avatar } = U;

export const O = {
  socket: null, connected: false, authed: false, room: null, priv: null, stats: null,
  ident: store.get('ident', null), roomCode: null,
  ui: { gameId: null, flipped: false, flipping: false, pendingRender: false, selected: null, voteKey: null, resultsShownFor: null, lastPhase: null, lastTurn: null, recorded: {} }
};

/* ---------- połączenie ---------- */
export function initOnline() {
  if (typeof window.io !== 'function') { O.unavailable = true; return; }
  const s = window.io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });
  O.socket = s;
  s.on('connect', hello);
  s.on('disconnect', () => { O.connected = false; O.authed = false; connBanner(); if (S.screen === 'home') rerender(); });
  s.on('connect_error', () => connBanner());
  s.on('state', onState);
  s.on('toast', t => { if (O.room) { toast(t.text, t.kind === 'join' ? 'success' : ''); if (t.kind === 'join') sfx('join'); } });
  s.on('room:kicked', () => { O.room = null; O.priv = null; O.roomCode = null; closeModal(); go('home'); toast('Host usunął cię z pokoju.', 'error'); });
  s.on('session:replaced', () => { O.room = null; O.roomCode = null; O.replaced = true; toast('Gra została otwarta w innym oknie lub karcie.', 'error'); go('home'); });
}

function call(ev, data) {
  return new Promise(resolve => {
    if (!O.socket || !O.socket.connected) return resolve({ ok: false, error: 'Brak połączenia z serwerem.' });
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, error: 'Serwer nie odpowiada. Spróbuj ponownie.' }); } }, 8000);
    O.socket.emit(ev, data || {}, res => { if (done) return; done = true; clearTimeout(t); resolve(res || { ok: false, error: 'Błąd serwera.' }); });
  });
}
async function waitAuthed(ms) {
  const t0 = Date.now();
  while (!O.authed && Date.now() - t0 < (ms || 6000)) await new Promise(r => setTimeout(r, 100));
  return O.authed;
}

async function hello() {
  O.connected = true;
  const r = await call('hello', { playerId: O.ident && O.ident.playerId, token: O.ident && O.ident.token, name: profile.name || 'Gracz', avatar: profile.avatar });
  if (!r.ok) return;
  if (r.token) { O.ident = { playerId: r.playerId, token: r.token }; store.set('ident', O.ident); }
  O.authed = true;
  O.stats = r.stats;
  O.roomCode = r.roomCode;
  connBanner();
  if (!r.roomCode && O.room) {
    O.room = null; O.priv = null;
    if (S.screen === 'online') { toast('Pokój został zamknięty.', 'error'); go('home'); }
  }
  if (r.roomCode && S.screen === 'boot-wait') go('online');
  if (S.screen === 'home' || S.screen === 'stats') rerender();
}
export function meId() { return O.ident && O.ident.playerId; }
export function isOnlineReady() { return O.authed; }

function connBanner() {
  const el = document.getElementById('conn-banner');
  if (!el) return;
  const show = !O.connected && (S.screen === 'online' || !!O.room);
  el.hidden = !show;
  el.innerHTML = '<span class="spin"></span> Utracono połączenie — łączenie ponownie…';
}

/* ---------- odbiór stanu ---------- */
function onState({ room, priv }) {
  setServerTime(room.serverNow);
  const prev = O.room;
  O.room = room;
  O.priv = priv;
  O.roomCode = room.code;
  const g = room.game;
  const me = meId();
  if (g && g.id !== O.ui.gameId) { O.ui.gameId = g.id; O.ui.flipped = false; O.ui.selected = null; O.ui.lastTurn = null; }
  const phase = room.phase;
  if (phase !== O.ui.lastPhase) {
    if (phase === 'reveal') sfx('start');
    if (phase === 'answers') sfx('whoosh');
    if (phase === 'voting') { sfx('vote'); vibrate([60, 40, 60]); }
    if (phase === 'lastchance') sfx('impostor');
    if (phase === 'lobby' && O.ui.lastPhase === 'results') { O.ui.resultsShownFor = null; }
    O.ui.lastPhase = phase;
    for (const k in drafts) delete drafts[k];
    if (S.screen === 'online') window.scrollTo(0, 0);
  }
  if (g && phase === 'voting') {
    const key = g.id + ':' + g.voteRound;
    if (O.ui.voteKey !== key) { O.ui.voteKey = key; O.ui.selected = null; }
  }
  if (g && phase === 'answers') {
    const tk = g.round + ':' + g.turnPos;
    if (g.currentPlayerId === me && O.ui.lastTurn !== tk) { O.ui.lastTurn = tk; sfx('turn'); vibrate([50, 30, 50]); delete drafts['oans']; }
  }
  if (g && phase === 'results' && g.results && !O.ui.recorded[g.results.id]) {
    O.ui.recorded[g.results.id] = true;
    const r = g.results;
    if (r.players.some(p => p.id === me)) { addHistory(historyEntry(r, 'online', me)); bumpGamesPlayed(); }
    call('stats:get').then(x => { if (x.ok) O.stats = x.stats; });
  }
  if (!prev && S.screen === 'boot-wait') go('online');
  if (S.screen === 'online') {
    if (O.ui.flipping) O.ui.pendingRender = true; else rerender();
  } else if (S.screen === 'home') rerender();
  refreshModal();
  connBanner();
}

/* ---------- akcje publiczne ---------- */
export async function createRoom() {
  if (O.unavailable) return toast('Gra online jest niedostępna (brak połączenia z serwerem).', 'error');
  if (!await waitAuthed()) return toast('Nie udało się połączyć z serwerem.', 'error');
  const settings = E.sanitizeSettings(store.get('lastSettings', {}));
  const r = await call('room:create', { name: profile.name, avatar: profile.avatar, settings });
  if (!r.ok) return toast(r.error, 'error');
  sfx('join');
  go('online');
}
export async function joinRoom(code) {
  if (O.unavailable) return toast('Gra online jest niedostępna (brak połączenia z serwerem).', 'error');
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) return toast('Kod pokoju ma 5 znaków.', 'error');
  if (!await waitAuthed()) return toast('Nie udało się połączyć z serwerem.', 'error');
  const r = await call('room:join', { code, name: profile.name, avatar: profile.avatar });
  if (!r.ok) return toast(r.error, 'error');
  sfx('join');
  go('online');
}
export function applyOnlineSettings(patch) {
  call('room:settings', { settings: patch }).then(r => { if (!r.ok) toast(r.error, 'error'); });
  if (O.room) store.set('lastSettings', Object.assign({}, store.get('lastSettings', {}), patch));
}
export function pushProfile() { if (O.authed) call('profile:update', { name: profile.name, avatar: profile.avatar }); }
export const fetchStats = () => call('stats:get');
export const fetchRanking = () => call('ranking:get');
export function inviteLink(code) { return `${location.origin}/?room=${code}`; }

/* ---------- widoki ---------- */
function players() { return O.room ? O.room.players : []; }
function gPlayers() { return O.room && O.room.game ? O.room.game.players : []; }
function nameOf(id) { const p = gPlayers().find(x => x.id === id) || players().find(x => x.id === id); return p ? p.name : '?'; }
function isHost() { return O.room && O.room.hostId === meId(); }
function offlineSet() { return new Set(players().filter(p => !p.connected).map(p => p.id)); }

function topbar(title, right) {
  return `<div class="topbar">
    <button class="icon-btn" data-action="oLeave" aria-label="Opuść pokój">${icon('logout')}</button>
    <h1>${title}</h1>
    ${right || '<span class="spacer-44"></span>'}
  </div>`;
}

defineScreen('online', () => {
  if (!O.room) {
    return `<div class="topbar"><button class="icon-btn" data-action="goHome">${icon('back')}</button><h1>Pokój</h1><span class="spacer-44"></span></div>
      <div class="big-state" style="flex:1;justify-content:center"><div class="bs-ic">${icon('globe')}</div><h2>Łączenie z pokojem…</h2><p>Jeśli to trwa zbyt długo, wróć do menu i dołącz ponownie.</p></div>`;
  }
  switch (O.room.phase) {
    case 'lobby': return viewLobby();
    case 'reveal': return viewReveal();
    case 'answers': return viewAnswers();
    case 'voting': return viewVoting();
    case 'lastchance': return viewLastChance();
    case 'results': return viewResults();
    default: return '';
  }
});

function viewLobby() {
  const room = O.room;
  const me = meId();
  const host = isHost();
  const ps = room.players;
  const s = room.settings;
  const min = E.minPlayersFor(s.mode);
  const online = ps.filter(p => p.connected);
  const notReady = online.filter(p => !p.ready && !p.isHost);
  let startReason = '';
  if (online.length < min) startReason = `Potrzeba co najmniej ${min} graczy (jest ${online.length}).`;
  else if (notReady.length) startReason = `Czekamy na gotowość: ${notReady.map(p => esc(p.name)).join(', ')}`;
  const meP = ps.find(p => p.id === me);
  const effImp = Math.min(s.impostors, E.maxImpostors(Math.max(3, ps.length), s.mode));
  return topbar('Lobby', `<button class="icon-btn" data-action="oInvite" aria-label="Zaproś">${icon('share')}</button>`) + `
    <div class="card code-card glow">
      <div class="kicker">Kod pokoju</div>
      <div class="code-letters">${room.code.split('').map((c, i) => `<span style="animation-delay:${i * 0.06}s">${esc(c)}</span>`).join('')}</div>
      <div class="btn-grid">
        <button class="btn ghost sm" data-action="oCopy">${icon('copy', 'sm')} Kopiuj kod</button>
        <button class="btn sm" data-action="oInvite">${icon('userPlus', 'sm')} Zaproś</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">${icon('users')} Gracze <span class="muted" style="margin-left:auto">${ps.length}/${s.maxPlayers}</span></div>
      <div class="plist">${ps.map((p, i) => `
        <div class="prow ${p.id === me ? 'me' : ''} ${p.connected ? '' : 'off'}" style="animation-delay:${i * 0.03}s">
          ${avatar(p.avatar, 'md', { dot: p.connected })}
          <div class="grow" style="min-width:0">
            <div class="pn ellipsis">${esc(p.name)}</div>
            <div class="row" style="gap:6px;margin-top:3px;flex-wrap:wrap">
              ${p.isHost ? `<span class="badge host">${icon('crown', 'xs')} Host</span>` : ''}
              ${p.id === me ? '<span class="badge me">Ty</span>' : ''}
              ${!p.connected ? '<span class="badge off">offline</span>' : p.isHost ? '' : p.ready ? `<span class="badge ready">${icon('check', 'xs')} Gotowy</span>` : '<span class="badge wait">Czeka</span>'}
            </div>
          </div>
          ${host && p.id !== me ? `<button class="icon-btn sm" data-action="oPlayerMenu" data-id="${esc(p.id)}" aria-label="Opcje gracza">${icon('more', 'sm')}</button>` : ''}
        </div>`).join('')}
      </div>
      ${ps.length < 3 ? `<div class="small muted center" style="margin-top:12px">Wyślij znajomym kod <b style="color:#fff">${esc(room.code)}</b> lub link z zaproszeniem.</div>` : ''}
    </div>
    <div class="card">
      <div class="card-title">${icon('sliders')} Ustawienia gry ${host ? `<button class="btn ghost sm" style="margin-left:auto;min-height:34px" data-action="oSettings">${icon('edit', 'xs')} Zmień</button>` : ''}</div>
      ${U.settingsSummary(s, ps.length)}
      ${effImp < s.impostors ? `<div class="small muted" style="margin-top:10px">Przy ${ps.length} graczach liczba Impostorów zostanie ograniczona do ${effImp}.</div>` : ''}
      <div class="small muted" style="margin-top:10px">${E.MODES[s.mode].desc}</div>
    </div>
    ${room.tournament && !room.tournament.finished ? U.standings(room.tournament) : ''}
    <div class="sticky-bottom stack" style="gap:8px">
      ${host
        ? `${startReason ? `<div class="small muted center">${startReason}</div>` : ''}<button class="btn block xl ${startReason ? '' : 'pulse'}" data-action="oStart" ${startReason ? 'disabled' : ''}>${icon('play')} Start</button>`
        : `<button class="btn block md ${meP && meP.ready ? 'green' : ''}" data-action="oReady">${meP && meP.ready ? `${icon('check')} Gotowy!` : 'Jestem gotowy'}</button>
           <div class="small muted center">${meP && meP.ready ? 'Czekamy, aż host rozpocznie grę…' : 'Zaznacz gotowość, aby host mógł rozpocząć.'}</div>`}
    </div>`;
}

function viewReveal() {
  const g = O.room.game;
  const v = O.priv;
  const me = meId();
  if (!v) return spectator('Losowanie ról…');
  const confirmed = g.revealed.includes(me);
  const active = g.players.filter(p => !p.left);
  return topbar('Twoja rola', U.timer(g.deadline, 30000, { size: 'sm' })) + `
    ${U.roleCard(v, { flipped: O.ui.flipped, flipAction: 'oFlip', nameOf })}
    ${O.ui.flipped ? U.detectivePanel(v, g.players, me, 'oDetect') : ''}
    <div class="card tight"><div class="row between"><span class="small bold">Gotowi: ${g.revealed.length}/${active.length}</span><span class="small muted">Gra ruszy, gdy wszyscy potwierdzą</span></div>
      <div class="voted-strip" style="margin-top:10px">${active.map(p => `<div class="vs ${g.revealed.includes(p.id) ? '' : 'pending'}" title="${esc(p.name)}">${avatar(p.avatar, 'sm')}${g.revealed.includes(p.id) ? `<span class="ok">${icon('check')}</span>` : ''}</div>`).join('')}</div></div>
    <div class="sticky-bottom">
      <button class="btn block ${confirmed ? 'ghost' : ''}" data-action="oConfirmReveal" ${!O.ui.flipped || confirmed ? 'disabled' : ''}>${confirmed ? 'Czekam na pozostałych…' : `${icon('check')} Zapamiętane — gramy!`}</button>
    </div>`;
}

function viewAnswers() {
  const g = O.room.game;
  const me = meId();
  const v = O.priv;
  const mine = g.currentPlayerId === me;
  const cur = g.players.find(p => p.id === g.currentPlayerId);
  return topbar(`Runda ${g.round}/${g.rounds}`, `<span class="round-pill">${icon('users', 'xs')} ${g.players.filter(p => !p.left).length}</span>`) + `
    ${U.turnHeader(g, { mine })}
    ${v ? `<div class="row between wrap">${U.peekChip(v)}<span class="small muted">${g.categoryPublic ? `Kategoria: <b>${esc(g.categoryPublic)}</b>` : ''}</span></div>` : ''}
    ${mine ? `<div class="card glow answer-box">
        <div class="small muted">Wpisz jedno słowo lub krótkie skojarzenie. Wysłanej odpowiedzi nie można zmienić.</div>
        <input class="input" id="oans" data-persist maxlength="${E.MAX_ANSWER_LEN}" placeholder="Twoje skojarzenie…" data-enter="oSend" autocomplete="off" enterkeyhint="send" data-autofocus>
        <button class="btn block red" data-action="oSend">${icon('send')} Wyślij</button>
      </div>`
    : `<div class="card tight"><div class="row">${icon('clock')}<div class="grow small"><b>${esc(cur ? cur.name : '?')}</b> wpisuje skojarzenie…<br><span class="muted">${v ? 'Obserwuj odpowiedzi i szukaj Impostora.' : 'Obserwujesz grę.'}</span></div></div></div>`}
    ${v && v.kind === 'detective' ? U.detectivePanel(v, g.players, me, 'oDetect') : ''}
    <div class="card tight"><div class="card-title">${icon('list')} Tablica skojarzeń</div>${U.board(g, { meId: me, offline: offlineSet() })}</div>`;
}

function viewVoting() {
  const g = O.room.game;
  const me = meId();
  const v = O.priv;
  const canVote = v && !g.players.find(p => p.id === me).left && g.candidates.some(c => c !== me);
  const voted = g.voted.includes(me);
  const runoff = g.voteRound === 2 ? `<div class="runoff-banner"><div class="kicker">Remis! Dogrywka</div>Głosujcie tylko na: ${g.candidates.map(id => esc(nameOf(id))).join(', ')}</div>` : '';
  const head = topbar(g.voteRound === 2 ? 'Dogrywka' : 'Głosowanie', U.timer(g.deadline, 60000, { size: 'sm', tick: voted ? null : 'vote' + g.voteRound }));
  if (!canVote || voted) {
    return head + runoff + `
      <div class="card big-state">
        <div class="bs-ic">${icon(voted ? 'check' : 'vote')}</div>
        <h2>${voted ? 'Głos oddany!' : 'Trwa głosowanie'}</h2>
        <p>${voted ? 'Twój głos jest tajny. Wyniki zobaczysz, gdy zagłosują wszyscy.' : 'Poczekaj na wyniki głosowania.'}</p>
        <div class="small bold">Zagłosowało: ${g.voted.length}/${g.players.filter(p => !p.left).length}</div>
        ${U.votedStrip(g)}
      </div>
      <div class="card tight"><div class="card-title">${icon('list')} Skojarzenia</div>${U.board(g, { meId: me })}</div>`;
  }
  return head + runoff + `
    <div class="center"><h2 style="font-family:var(--display);margin:0;font-size:22px">Kto jest Impostorem?</h2><div class="small muted" style="margin-top:4px">Wybierz jedną osobę. Głos jest tajny i ostateczny.</div></div>
    ${U.voteGrid(g, { meId: me, selected: O.ui.selected, action: 'oPick' })}
    <div class="card tight"><div class="row between"><span class="small bold">Zagłosowało: ${g.voted.length}/${g.players.filter(p => !p.left).length}</span></div><div style="margin-top:8px">${U.votedStrip(g)}</div></div>
    <div class="sticky-bottom"><button class="btn block red" data-action="oConfirmVote" ${O.ui.selected ? '' : 'disabled'}>${icon('check')} Zatwierdź głos</button></div>`;
}

function viewLastChance() {
  const g = O.room.game;
  const v = O.priv;
  const acc = g.players.find(p => p.id === g.accusedId);
  if (v && v.mustGuess) {
    return topbar('Ostatnia szansa') + `
      <div class="card glow-red big-state">
        <div class="row" style="gap:16px">${avatar(acc.avatar, 'lg')}${U.timer(g.deadline, 30000, { tick: 'guess' })}</div>
        <h2>Zdemaskowano cię!</h2>
        <p>${v.trueRole === 'undercover' ? 'To ty jesteś Impostorem — twoje słowo różniło się od słowa pozostałych! Jakie słowo mieli oni?' : 'Masz ostatnią szansę: wpisz tajne słowo. Jeśli trafisz — wygrywasz!'}</p>
      </div>
      <div class="card answer-box">
        <input class="input" id="oguess" data-persist maxlength="${E.MAX_GUESS_LEN}" placeholder="Tajne słowo…" data-enter="oGuess" autocomplete="off" enterkeyhint="done" data-autofocus>
        <button class="btn block red" data-action="oGuess">${icon('target')} Zgaduję</button>
      </div>
      <div class="card tight"><div class="card-title">${icon('list')} Skojarzenia</div>${U.board(g, { meId: meId(), showAll: true })}</div>`;
  }
  return topbar('Ostatnia szansa') + `
    <div class="card glow-red big-state">
      <div class="row" style="gap:16px">${avatar(acc.avatar, 'lg')}${U.timer(g.deadline, 30000)}</div>
      <h2>Zdemaskowano: ${esc(acc.name)}!</h2>
      <p>To Impostor! Ma jeszcze ostatnią szansę — jeśli odgadnie tajne słowo, wygra grę.</p>
    </div>
    <div class="card tight"><div class="card-title">${icon('list')} Skojarzenia</div>${U.board(g, { meId: meId(), showAll: true })}</div>`;
}

function viewResults() {
  const g = O.room.game;
  const r = g.results;
  const me = meId();
  if (!r) return spectator('Liczenie głosów…');
  const animate = O.ui.resultsShownFor !== r.id;
  if (animate) {
    O.ui.resultsShownFor = r.id;
    sfx('drum');
    const won = r.winners.includes(me);
    setTimeout(() => {
      if (r.players.some(p => p.id === me)) { sfx(won ? 'win' : 'lose'); if (won) confetti(r.winner === 'impostors' ? 'red' : r.winner === 'jester' ? 'gold' : 'purple'); }
      else sfx('win');
      vibrate(won ? [80, 60, 120] : 200);
    }, 1200);
  }
  const t = O.room.tournament;
  const host = isHost();
  const nextLabel = t && !t.finished ? `Gra ${t.gameNo + 1} z ${t.total}` : 'Zagraj ponownie';
  const footer = `${host
    ? `<button class="btn block md" data-action="oAgain">${icon('refresh')} ${nextLabel}</button>`
    : `<button class="btn ghost block md" disabled>${icon('clock')} Czekamy na hosta…</button>`}
    <button class="btn ghost block sm" data-action="oLeaveNow">${icon('home')} Powrót do menu</button>`;
  return `<div class="topbar"><span class="spacer-44"></span><h1>Wyniki</h1><span class="spacer-44"></span></div>` +
    U.resultsView(r, { animate, meId: me, tournament: t, footer });
}

function spectator(title) {
  return topbar('Gra') + `<div class="big-state" style="flex:1;justify-content:center"><div class="bs-ic">${icon('eye')}</div><h2>${title}</h2><p>Obserwujesz rozgrywkę.</p></div>`;
}

/* ---------- obsługa akcji ---------- */
async function doCall(ev, data) {
  const r = await call(ev, data);
  if (!r.ok) toast(r.error, 'error');
  return r;
}

act({
  async oCopy() { if (await copyText(O.room.code)) toast('Skopiowano kod pokoju!', 'success'); else toast('Nie udało się skopiować.', 'error'); },
  async oInvite() {
    const url = inviteLink(O.room.code);
    const text = `Zagraj ze mną w IMPOSTORA! Kod pokoju: ${O.room.code}`;
    if (navigator.share) { try { await navigator.share({ title: 'IMPOSTOR', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    if (await copyText(`${text}\n${url}`)) toast('Link z zaproszeniem skopiowany!', 'success');
  },
  oReady() { const meP = O.room.players.find(p => p.id === meId()); doCall('room:ready', { ready: !(meP && meP.ready) }); },
  async oStart() { const r = await doCall('room:start'); if (r.ok) sfx('start'); },
  oSettings() {
    showModal(() => {
      if (!O.room || O.room.phase !== 'lobby') return `<div class="sheet-head"><h2>Ustawienia</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div><p class="muted">Gra już się rozpoczęła.</p>`;
      const s = O.room.settings;
      return `<div class="sheet-head"><h2>Ustawienia gry</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
        ${U.settingsPanel(s, { ctx: 'online', editable: isHost(), playerCount: Math.max(3, O.room.players.length), inRoom: O.room.players.length })}
        <button class="btn block" style="margin-top:12px" data-action="closeModal">${icon('check')} Gotowe</button>`;
    });
  },
  oPlayerMenu(el) {
    const id = el.dataset.id;
    const p = O.room.players.find(x => x.id === id);
    if (!p) return;
    showModal(() => `<div class="sheet-head"><div class="row">${avatar(p.avatar, 'md')}<h2>${esc(p.name)}</h2></div><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
      <div class="menu-list">
        <button class="menu-item" data-action="oMakeHost" data-id="${esc(id)}">${icon('crown')} Przekaż hostowanie</button>
        <button class="menu-item danger" data-action="oKick" data-id="${esc(id)}">${icon('userMinus')} Usuń z pokoju</button>
      </div>`);
  },
  async oMakeHost(el) { closeModal(); const r = await doCall('room:transferHost', { playerId: el.dataset.id }); if (r.ok) sfx('join'); },
  async oKick(el) {
    const id = el.dataset.id;
    closeModal();
    const ok = await confirmBox({ title: 'Usunąć gracza?', text: `<b>${esc(nameOf(id))}</b> nie wróci już do tego pokoju.`, ok: 'Usuń', danger: true });
    if (ok) doCall('room:kick', { playerId: id });
  },
  oFlip() {
    O.ui.flipping = true;
    U.flipCardAnim(() => {
      const v = O.priv;
      if (v && (v.kind === 'impostor' || v.kind === 'mrwhite')) { sfx('impostor'); vibrate([100, 50, 100]); } else sfx('reveal');
      setTimeout(() => { O.ui.flipped = true; O.ui.flipping = false; O.ui.pendingRender = false; rerender(); }, 820);
    }, sfx);
  },
  async oDetect(el) {
    const r = await doCall('game:detect', { targetId: el.dataset.id });
    if (r.ok) sfx(r.result.isImpostor ? 'impostor' : 'reveal');
  },
  oConfirmReveal() { doCall('game:confirmReveal'); sfx('whoosh'); },
  async oSend() {
    const el = document.getElementById('oans');
    const text = el ? el.value : '';
    if (!E.cleanText(text, 30)) return toast('Wpisz skojarzenie.', 'error');
    const r = await doCall('game:answer', { text });
    if (r.ok) { sfx('submit'); delete drafts['oans']; }
  },
  oPick(el) { O.ui.selected = el.dataset.id; vibrate(20); rerender(); },
  async oConfirmVote() {
    const target = O.ui.selected;
    if (!target) return;
    const ok = await confirmBox({ title: 'Zatwierdzić głos?', text: `Głosujesz na <b>${esc(nameOf(target))}</b>. Tej decyzji nie można zmienić.`, ok: 'Tak, głosuję', danger: true });
    if (!ok) return;
    const r = await doCall('game:vote', { targetId: target });
    if (r.ok) { sfx('vote'); vibrate(40); }
  },
  async oGuess() {
    const el = document.getElementById('oguess');
    const text = el ? el.value : '';
    if (!E.cleanText(text, 40)) return toast('Wpisz tajne słowo.', 'error');
    await doCall('game:guess', { text });
  },
  oAgain() { doCall('room:playAgain'); },
  async oLeaveNow() { await leaveRoom(); },
  async oLeave() {
    const room = O.room;
    if (!room) return go('home');
    const others = room.players.filter(p => p.id !== meId());
    const inGame = room.phase !== 'lobby' && room.phase !== 'results';
    if (isHost() && others.length) {
      showModal(() => `<div class="sheet-head"><h2>Opuścić pokój?</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
        <p class="muted" style="margin-top:0">Jesteś hostem. Wybierz, komu przekazać hostowanie${inGame ? ' (gra będzie toczyć się dalej bez ciebie)' : ''}:</p>
        <div class="menu-list">${others.map(p => `<button class="menu-item" data-action="oLeaveTo" data-id="${esc(p.id)}">${avatar(p.avatar, 'sm', { dot: p.connected })} ${esc(p.name)}</button>`).join('')}</div>
        <button class="btn ghost block" style="margin-top:12px" data-action="oLeaveTo">${icon('shuffle')} Wybierz automatycznie</button>`);
      return;
    }
    const ok = await confirmBox({ title: 'Opuścić pokój?', text: inGame ? 'Gra trwa — twoje kolejne tury zostaną pominięte.' : 'Możesz później dołączyć ponownie z tym samym kodem.', ok: 'Opuść pokój', danger: true });
    if (ok) await leaveRoom();
  },
  async oLeaveTo(el) { closeModal(); await leaveRoom(el.dataset.id); }
});

async function leaveRoom(newHostId) {
  await call('room:leave', { newHostId });
  O.room = null; O.priv = null; O.roomCode = null;
  go('home');
}
