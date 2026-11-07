/* IMPOSTOR – tryb gry na jednym telefonie (przekazywanie urządzenia). */
import { S, store, profile, esc, defineScreen, act, go, rerender, toast, showModal, closeModal, confirmBox, vibrate, drafts,
  bumpGamesPlayed, addHistory, emptyLocalStats, applyResultToStats } from './core.js';
import * as U from './ui.js';
import { sfx } from './sound.js';
import { confetti } from './fx.js';

const E = window.ImpostorEngine;
const { icon, avatar } = U;

export const L = { setup: null, game: null, ui: freshUi(), tournament: null, results: null, lastPhase: null };
function freshUi() { return { stage: 'handoff', forId: null, flipped: false, selected: null, resultsShown: false }; }

/* ---------- zapis gry (powrót po przypadkowym zamknięciu) ---------- */
const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const dec = s => JSON.parse(decodeURIComponent(escape(atob(s))));
function saveLocal() {
  if (!L.game || L.game.phase === 'results') { store.del('localSave'); return; }
  store.set('localSave', enc({ setup: L.setup, tournament: L.tournament, game: L.game.toJSON() }));
}
export function hasLocalSave() { return !!store.get('localSave', null); }
export function resumeLocal() {
  try {
    const d = dec(store.get('localSave'));
    L.setup = d.setup; L.tournament = d.tournament;
    L.game = E.GameCore.fromJSON(d.game, gameOptions());
    L.ui = freshUi(); L.results = null; L.lastPhase = L.game.phase;
    go('local');
  } catch (e) {
    console.error(e);
    store.del('localSave');
    toast('Nie udało się wczytać zapisanej gry.', 'error');
  }
}

/* ---------- historia (wspólna z trybem online) ---------- */
export function historyEntry(r, type, meId) {
  const name = id => (r.players.find(p => p.id === id) || {}).name || '?';
  return {
    id: r.id, ts: r.finishedAt || Date.now(), type, mode: r.modeName, word: r.word, similar: r.similar, category: r.category,
    winner: r.winner, reason: r.reason,
    myResult: meId ? (r.winners.includes(meId) ? 'win' : 'lose') : null,
    players: r.players.map(p => ({ name: p.name, avatar: p.avatar, roleName: p.roleName, team: p.team, won: r.winners.includes(p.id) })),
    answers: r.order.map(id => ({ name: name(id), list: r.answers.filter(a => a.playerId === id).map(a => a.timedOut ? '—' : a.text) })),
    accused: r.accusedId ? name(r.accusedId) : null,
    correct: r.correctVoters.map(name)
  };
}

/* ---------- konfiguracja ---------- */
function randAv() { return Math.floor(Math.random() * U.AVATAR_COUNT); }
function newPlayer(name, av) { return { id: 'l' + E.randomId(8), name, avatar: av == null ? randAv() : av }; }
export function openLocalSetup() {
  if (!L.setup) {
    const group = store.get('localGroup', null);
    const settings = E.sanitizeSettings(store.get('lastSettings', {}));
    let players;
    if (Array.isArray(group) && group.length >= 3) players = group.map(p => newPlayer(p.name, p.avatar));
    else {
      players = [newPlayer(profile.name || 'Gracz 1', profile.avatar)];
      for (let i = 2; i <= 4; i++) players.push(newPlayer('Gracz ' + i));
    }
    L.setup = { players, settings };
  }
  go('local-setup');
}

export function applyLocalSettings(patch) {
  const s = Object.assign({}, L.setup.settings, patch);
  L.setup.settings = E.sanitizeSettings(s);
  const lastSaved = Object.assign({}, L.setup.settings);
  store.set('lastSettings', lastSaved);
  rerender();
}

defineScreen('local-setup', () => {
  const st = L.setup;
  const n = st.players.length;
  return `
  <div class="topbar">
    <button class="icon-btn" data-action="goHome" aria-label="Wróć">${icon('back')}</button>
    <h1>Jeden telefon</h1>
    <span class="spacer-44"></span>
  </div>
  <div class="card">
    <div class="card-title">${icon('users')} Gracze (${n})</div>
    <div class="plist">
      ${st.players.map((p, i) => `
        <div class="prow" style="animation-delay:${i * 0.03}s">
          <button data-action="lpAvatar" data-id="${p.id}" aria-label="Zmień awatar">${avatar(p.avatar, 'md')}</button>
          <input class="input" id="lp-${p.id}" value="${esc(p.name)}" maxlength="16" placeholder="Imię gracza ${i + 1}" data-input="lpName" data-id="${p.id}" autocomplete="off">
          <button class="icon-btn sm ghost danger" data-action="lpRemove" data-id="${p.id}" ${n <= 3 ? 'disabled' : ''} aria-label="Usuń gracza">${icon('x', 'sm')}</button>
        </div>`).join('')}
    </div>
    <button class="btn ghost block md" style="margin-top:12px" data-action="lpCount" data-delta="1" ${n >= 20 ? 'disabled' : ''}>${icon('userPlus')} Dodaj gracza</button>
  </div>
  <div class="card">
    <div class="card-title">${icon('sliders')} Ustawienia gry</div>
    ${U.settingsPanel(st.settings, { ctx: 'local', editable: true, playerCount: n })}
  </div>
  <div class="sticky-bottom">
    <button class="btn block xl pulse" data-action="localStart">${icon('play')} Start</button>
  </div>`;
});

act({
  lpName(el) { const p = L.setup.players.find(x => x.id === el.dataset.id); if (p) p.name = el.value; },
  lpCount(el) {
    const d = +el.dataset.delta;
    const pl = L.setup.players;
    if (d > 0 && pl.length < 20) pl.push(newPlayer('Gracz ' + (pl.length + 1)));
    if (d < 0 && pl.length > 3) pl.pop();
    rerender();
  },
  lpRemove(el) {
    if (L.setup.players.length <= 3) return;
    L.setup.players = L.setup.players.filter(p => p.id !== el.dataset.id);
    rerender();
  },
  lpAvatar(el) {
    const p = L.setup.players.find(x => x.id === el.dataset.id);
    if (!p) return;
    showModal(() => `<div class="sheet-head"><h2>Awatar: ${esc(p.name)}</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
      <div class="av-grid">${Array.from({ length: U.AVATAR_COUNT }, (_, i) => `<button class="av-pick ${p.avatar === i ? 'active' : ''}" data-action="lpAvatarPick" data-id="${p.id}" data-av="${i}">${avatar(i, 'md')}</button>`).join('')}</div>`);
  },
  lpAvatarPick(el) {
    const p = L.setup.players.find(x => x.id === el.dataset.id);
    if (p) p.avatar = +el.dataset.av;
    closeModal(); rerender();
  },
  localStart() {
    const st = L.setup;
    const seen = new Set();
    st.players.forEach((p, i) => {
      let n = E.cleanText(p.name, 16) || 'Gracz ' + (i + 1);
      let base = n, k = 2;
      while (seen.has(n.toLowerCase())) n = base.slice(0, 13) + ' ' + k++;
      seen.add(n.toLowerCase());
      p.name = n;
    });
    const min = E.minPlayersFor(st.settings.mode);
    if (st.players.length < min) return toast(`Ten tryb wymaga co najmniej ${min} graczy.`, 'error');
    store.set('localGroup', st.players.map(p => ({ name: p.name, avatar: p.avatar })));
    startGame();
  }
});

/* ---------- gra ---------- */
function gameOptions() {
  return { manual: true, guessTimeout: 30000, onChange: onGameChange, onEnd: onGameEnd };
}
function startGame() {
  const st = L.setup;
  if (st.settings.tournament) {
    if (!L.tournament || L.tournament.finished || L.tournament.total !== st.settings.tournamentGames) {
      L.tournament = { total: st.settings.tournamentGames, gameNo: 0, scores: {}, names: {}, results: [], finished: false, champions: [] };
    }
    L.tournament.gameNo++;
  } else L.tournament = null;
  if (L.game) L.game.destroy();
  const used = store.get('usedWords', []);
  L.game = new E.GameCore({ players: st.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })), settings: st.settings, used, options: gameOptions() });
  used.push(L.game.word.word);
  store.set('usedWords', used.slice(-150));
  L.ui = freshUi();
  L.results = null;
  L.lastPhase = null;
  sfx('start');
  L.game.start();
  go('local');
}

function onGameChange(g) {
  if (g !== L.game) return;
  if (L.lastPhase !== g.phase) {
    if (g.phase === 'answers') sfx('whoosh');
    if (g.phase === 'voting') { sfx('vote'); vibrate([60, 40, 60]); }
    if (g.phase === 'lastchance') sfx('impostor');
    L.lastPhase = g.phase;
  }
  saveLocal();
  if (S.screen === 'local') rerender();
}

function onGameEnd(r) {
  L.results = r;
  // statystyki lokalne według imion
  const ls = store.get('localStats', {});
  for (const p of r.players) {
    const key = p.name.toLowerCase();
    const s = Object.assign(emptyLocalStats(), (ls[key] || {}).stats);
    applyResultToStats(s, r, p.id);
    ls[key] = { name: p.name, avatar: p.avatar, stats: s };
  }
  store.set('localStats', ls);
  const me = r.players.find(p => profile.name && p.name.toLowerCase() === profile.name.toLowerCase());
  if (me) store.set('myLocalStats', applyResultToStats(Object.assign(emptyLocalStats(), store.get('myLocalStats', {})), r, me.id));
  if (L.tournament) {
    const t = L.tournament;
    for (const p of r.players) { t.scores[p.id] = (t.scores[p.id] || 0) + (r.points[p.id] || 0); t.names[p.id] = { name: p.name, avatar: p.avatar }; }
    t.results.push({ gameNo: t.gameNo, word: r.word, winner: r.winner });
    if (t.gameNo >= t.total) {
      t.finished = true;
      const best = Math.max(...Object.values(t.scores));
      t.champions = Object.keys(t.scores).filter(id => t.scores[id] === best);
    }
  }
  addHistory(historyEntry(r, 'local', me ? me.id : null));
  bumpGamesPlayed();
  store.del('localSave');
  if (S.screen === 'local') rerender();
}

function syncStage(key) {
  if (L.ui.forId !== key) { L.ui.forId = key; L.ui.stage = 'handoff'; L.ui.flipped = false; L.ui.selected = null; }
}

function topbar(title) {
  return `<div class="topbar">
    <button class="icon-btn" data-action="lExit" aria-label="Przerwij grę">${icon('x')}</button>
    <h1>${title}</h1>
    <span class="spacer-44"></span>
  </div>`;
}

defineScreen('local', () => {
  const g = L.game;
  if (!g) { setTimeout(() => go('home')); return ''; }
  const vk = [g.phase, g.round, g.turnPos, g.waiting, g.voteRound, L.ui.forId, L.ui.stage].join('|');
  if (L.ui.viewKey !== vk) { L.ui.viewKey = vk; requestAnimationFrame(() => window.scrollTo(0, 0)); }
  switch (g.phase) {
    case 'reveal': return viewReveal(g);
    case 'answers': return viewAnswers(g);
    case 'voting': return viewVoting(g);
    case 'lastchance': return viewLastChance(g);
    case 'results': return viewResults(g);
    default: return '';
  }
});

function viewReveal(g) {
  const next = g.nextRevealId();
  if (!next) return topbar('Role');
  syncStage(next);
  const p = g.player(next);
  const total = g.activeIds().length;
  const idx = g.revealed.length;
  if (L.ui.stage === 'handoff') {
    return topbar('Losowanie ról') + U.handoff({
      dots: U.progressDots(total, idx, idx), kicker: `Gracz ${idx + 1} z ${total} — przekaż telefon`,
      name: p.name, avatar: p.avatar, text: 'Tylko ta osoba może teraz patrzeć na ekran. Pozostali — odwróćcie wzrok!',
      btn: `To ja — pokaż moją rolę`, action: 'lShowRole'
    });
  }
  const v = g.privateState(next);
  const pub = g.publicState();
  return topbar('Twoja rola') + `
    <div class="center"><span class="kicker">Rola gracza</span><div style="font-family:var(--display);font-weight:800;font-size:20px">${esc(p.name)}</div></div>
    ${U.roleCard(v, { flipped: L.ui.flipped, flipAction: 'lFlip', nameOf: id => g.name(id) })}
    ${L.ui.flipped ? U.detectivePanel(v, pub.players, next, 'lDetect') : ''}
    <div class="sticky-bottom"><button class="btn block" data-action="lHide" ${L.ui.flipped ? '' : 'disabled'}>${icon('eyeOff')} Zapamiętane — ukryj</button></div>`;
}

function viewAnswers(g) {
  const pub = g.publicState();
  const cur = g.currentPlayerId();
  const p = g.player(cur);
  const boardCard = `<div class="card tight"><div class="card-title">${icon('list')} Tablica skojarzeń</div>${U.board(pub, {})}</div>`;
  if (g.waiting) {
    return topbar(`Runda ${g.round}/${g.settings.rounds}`) + U.handoff({
      dots: U.progressDots(pub.order.length, g.turnPos, g.turnPos),
      kicker: `Runda ${g.round} z ${g.settings.rounds} · przekaż telefon`, name: p.name, avatar: p.avatar,
      text: `Twoja kolej na skojarzenie. Po kliknięciu ruszy czas: <b>${g.settings.answerTime} s</b>.`,
      btn: 'Zaczynam', btnIcon: 'play', action: 'lStartTurn'
    }) + boardCard;
  }
  const v = g.privateState(cur);
  return topbar(`Runda ${g.round}/${g.settings.rounds}`) + `
    ${U.turnHeader(pub, { mine: true, local: true })}
    <div class="row between wrap">${U.peekChip(v)}<span class="small muted">Jedno słowo lub krótkie skojarzenie</span></div>
    <div class="card glow answer-box">
      <div class="input-row">
        <input class="input" id="ans-input" data-persist maxlength="${E.MAX_ANSWER_LEN}" placeholder="${esc(p.name)}, wpisz skojarzenie…" data-enter="lSend" autocomplete="off" autocapitalize="sentences" enterkeyhint="send" data-autofocus>
      </div>
      <button class="btn block red" data-action="lSend">${icon('send')} Wyślij</button>
    </div>
    ${boardCard}`;
}

function votingOrderNext(g) {
  const pending = new Set(g.pendingVoters());
  const p = L.setup.players.find(x => pending.has(x.id));
  return p ? p.id : g.pendingVoters()[0];
}

function viewVoting(g) {
  const pub = g.publicState();
  const next = votingOrderNext(g);
  if (!next) return topbar('Głosowanie');
  syncStage(next + ':' + g.voteRound);
  const p = g.player(next);
  const voters = g.activeIds().filter(id => g.eligibleTargets(id).length > 0);
  const done = Object.keys(g.votes).length;
  const runoff = g.voteRound === 2 ? `<div class="runoff-banner"><div class="kicker">Remis! Dogrywka</div>Głosujcie tylko na: ${g.candidates.map(id => esc(g.name(id))).join(', ')}</div>` : '';
  if (L.ui.stage === 'handoff') {
    return topbar(g.voteRound === 2 ? 'Dogrywka' : 'Głosowanie') + runoff + U.handoff({
      dots: U.progressDots(voters.length, done, done), kicker: 'Tajne głosowanie · przekaż telefon',
      name: p.name, avatar: p.avatar, text: 'Kto twoim zdaniem jest Impostorem? Głos jest tajny i nie można go zmienić.',
      btn: 'Głosuję', btnIcon: 'vote', action: 'lVoteStage', red: true
    });
  }
  return topbar(g.voteRound === 2 ? 'Dogrywka' : 'Głosowanie') + runoff + `
    <div class="center"><span class="kicker">Głosuje: ${esc(p.name)}</span><h2 style="font-family:var(--display);margin:6px 0 0;font-size:22px">Kto jest Impostorem?</h2></div>
    ${U.voteGrid(pub, { meId: next, selected: L.ui.selected, action: 'lPick' })}
    <div class="sticky-bottom"><button class="btn block red" data-action="lConfirmVote" ${L.ui.selected ? '' : 'disabled'}>${icon('check')} Zatwierdź głos</button></div>`;
}

function viewLastChance(g) {
  const p = g.player(g.accusedId);
  const role = g.roles[g.accusedId];
  const roleName = E.ROLES[role].name;
  if (g.waiting) {
    return topbar('Ostatnia szansa') + U.handoff({
      kicker: 'Zdemaskowano!', name: p.name, avatar: p.avatar,
      text: `<b style="color:#ff6b7a">${esc(p.name)} to ${esc(roleName)}!</b><br>Ostatnia szansa: przekaż telefon tej osobie. Jeśli odgadnie tajne słowo w 30 sekund — Impostor wygrywa.`,
      btn: 'Zgaduję słowo', btnIcon: 'target', action: 'lStartGuess', red: true
    });
  }
  return topbar('Ostatnia szansa') + `
    <div class="card glow-red big-state">
      <div class="row" style="gap:16px">${avatar(p.avatar, 'lg')}${U.timer(g.deadline, 30000, { tick: 'guess', local: true })}</div>
      <h2>${esc(p.name)}, odgadnij słowo!</h2>
      <p>${role === 'undercover' ? 'Twoje słowo było inne niż pozostałych graczy! Jakie słowo mieli oni?' : 'Na podstawie skojarzeń wpisz tajne słowo pozostałych graczy.'}</p>
    </div>
    <div class="card answer-box">
      <input class="input" id="guess-input" data-persist maxlength="${E.MAX_GUESS_LEN}" placeholder="Tajne słowo…" data-enter="lGuess" autocomplete="off" enterkeyhint="done" data-autofocus>
      <button class="btn block red" data-action="lGuess">${icon('target')} Zgaduję</button>
    </div>
    <div class="card tight"><div class="card-title">${icon('list')} Skojarzenia</div>${U.board(g.publicState(), { showAll: true })}</div>`;
}

function viewResults() {
  const r = L.results;
  if (!r) return '';
  const t = L.tournament;
  const animate = !L.ui.resultsShown;
  if (animate) {
    L.ui.resultsShown = true;
    sfx('drum');
    setTimeout(() => {
      if (r.winner === 'impostors') sfx('impostor');
      setTimeout(() => sfx('win'), r.winner === 'impostors' ? 500 : 0);
      confetti(r.winner === 'impostors' ? 'red' : r.winner === 'jester' ? 'gold' : 'purple');
      vibrate([80, 60, 120]);
    }, 1200);
  }
  const nextLabel = t && !t.finished ? `Gra ${t.gameNo + 1} z ${t.total}` : 'Zagraj ponownie';
  const footer = `
    <button class="btn block md" data-action="lAgain">${icon('refresh')} ${nextLabel}</button>
    <div class="btn-grid"><button class="btn ghost sm" data-action="lSettings">${icon('sliders')} Ustawienia</button><button class="btn ghost sm" data-action="lMenu">${icon('home')} Menu</button></div>`;
  return `<div class="topbar"><span class="spacer-44"></span><h1>Wyniki</h1><span class="spacer-44"></span></div>` +
    U.resultsView(r, { animate, tournament: t, footer });
}

act({
  lShowRole() { L.ui.stage = 'private'; sfx('whoosh'); rerender(); },
  lFlip() {
    const g = L.game;
    U.flipCardAnim(() => {
      const v = g.privateState(L.ui.forId);
      if (v && (v.kind === 'impostor' || v.kind === 'mrwhite')) { sfx('impostor'); vibrate([100, 50, 100]); } else sfx('reveal');
      setTimeout(() => { L.ui.flipped = true; rerender(); }, 820);
    }, sfx);
  },
  lDetect(el) {
    const r = L.game.detectPlayer(L.ui.forId, el.dataset.id);
    if (!r.ok) toast(r.error, 'error'); else sfx(r.result.isImpostor ? 'impostor' : 'reveal');
    rerender();
  },
  lHide() { L.game.confirmReveal(L.ui.forId); sfx('whoosh'); },
  lStartTurn() { for (const k in drafts) delete drafts[k]; sfx('turn'); L.game.startTimer(); },
  lSend() {
    const el = document.getElementById('ans-input');
    const g = L.game;
    const r = g.submitAnswer(g.currentPlayerId(), el ? el.value : '');
    if (!r.ok) return toast(r.error, 'error');
    delete drafts['ans-input'];
    sfx('submit');
  },
  lVoteStage() { L.ui.stage = 'private'; L.ui.selected = null; rerender(); },
  lPick(el) { L.ui.selected = el.dataset.id; vibrate(20); rerender(); },
  async lConfirmVote() {
    const g = L.game;
    const voter = L.ui.forId.split(':')[0];
    const target = L.ui.selected;
    if (!target) return;
    const ok = await confirmBox({ title: 'Zatwierdzić głos?', text: `Głosujesz na <b>${esc(g.name(target))}</b>. Tej decyzji nie można zmienić.`, ok: 'Tak, głosuję', danger: true });
    if (!ok || L.game !== g || g.phase !== 'voting') return;
    const r = g.vote(voter, target);
    if (!r.ok) return toast(r.error, 'error');
    sfx('vote'); vibrate(40);
  },
  lStartGuess() { for (const k in drafts) delete drafts[k]; L.game.startTimer(); sfx('turn'); },
  lGuess() {
    const el = document.getElementById('guess-input');
    const r = L.game.submitGuess(L.game.accusedId, el ? el.value : '');
    if (!r.ok) toast(r.error, 'error');
  },
  lAgain() { startGame(); },
  lSettings() { if (L.game) L.game.destroy(); L.game = null; go('local-setup'); },
  lMenu() { if (L.game) L.game.destroy(); L.game = null; go('home'); },
  async lExit() {
    if (L.game && L.game.phase === 'results') return actionsMenu();
    const ok = await confirmBox({ title: 'Przerwać grę?', text: 'Bieżąca rozgrywka zostanie zakończona bez wyniku.', ok: 'Przerwij grę', danger: true });
    if (!ok) return;
    if (L.game) L.game.destroy();
    L.game = null;
    store.del('localSave');
    go('home');
  }
});
function actionsMenu() { if (L.game) L.game.destroy(); L.game = null; go('home'); }
