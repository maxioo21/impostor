/*
 * IMPOSTOR – silnik gry (wspólny dla serwera i trybu jednego telefonu).
 * W trybie online działa wyłącznie na serwerze – klient dostaje tylko publiczny stan
 * oraz swój prywatny widok (rolę). W trybie lokalnym działa w przeglądarce.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./words.js'));
  else root.ImpostorEngine = factory(root.ImpostorWords);
})(typeof self !== 'undefined' ? self : this, function (WORDS) {
  'use strict';

  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 20;
  const ANSWER_TIMES = [15, 30, 45, 60];
  const MAX_ANSWER_LEN = 30;
  const MAX_GUESS_LEN = 40;

  const MODES = {
    classic: { name: 'Klasyczny', icon: '🎭', desc: 'Impostor nie zna tajnego słowa. Wszyscy pozostali dostają identyczne hasło.' },
    similar: { name: 'Podobne słowa', icon: '🔀', desc: 'Impostor dostaje podobne słowo (np. PIES zamiast KOT) i nie wie, że jest Impostorem.' },
    mrwhite: { name: 'Mr. White', icon: '👻', desc: 'Mr. White nie dostaje żadnego słowa i musi je odgadnąć. Dodatkowi Impostorzy dostają podobne słowo.' },
    chaos: { name: 'Chaos', icon: '🌀', desc: 'Specjalne role: Detektyw może sprawdzić jedną osobę, a Błazen wygrywa, jeśli zostanie wytypowany.' }
  };

  const ROLES = {
    civilian: { name: 'Cywil', team: 'civilians', icon: '🙂' },
    detective: { name: 'Detektyw', team: 'civilians', icon: '🕵️' },
    impostor: { name: 'Impostor', team: 'impostors', icon: '🎭' },
    undercover: { name: 'Impostor (inne słowo)', team: 'impostors', icon: '🔀' },
    mrwhite: { name: 'Mr. White', team: 'impostors', icon: '👻' },
    jester: { name: 'Błazen', team: 'jester', icon: '🃏' }
  };

  const DEFAULT_SETTINGS = {
    maxPlayers: 10,
    impostors: 1,
    rounds: 3,
    answerTime: 30,
    category: 'random',
    difficulty: 'medium',
    impostorHint: true,
    mode: 'classic',
    tournament: false,
    tournamentGames: 3,
    custom: null // { name, words: [{word, similar}] } gdy category === 'custom'
  };

  /* ---------- losowość (kryptograficzna) ---------- */
  function randInt(n) {
    if (n <= 1) return 0;
    const c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
    if (c && c.getRandomValues) {
      const lim = Math.floor(0x100000000 / n) * n;
      const buf = new Uint32Array(1);
      do { c.getRandomValues(buf); } while (buf[0] >= lim);
      return buf[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function randomId(len) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < (len || 10); i++) s += chars[randInt(chars.length)];
    return s;
  }

  /* ---------- tekst ---------- */
  function cleanText(s, max) {
    return String(s == null ? '' : s)
      .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max || 30);
  }
  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
  function tokens(s) {
    return String(s || '').split(/[\s\-_,.;:!?/]+/).map(normalize).filter(Boolean);
  }
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }
  function isGuessCorrect(guess, word) {
    const g = normalize(guess);
    const w = normalize(word);
    if (!g || !w) return false;
    if (g === w) return true;
    const d = levenshtein(g, w);
    if (w.length >= 5 && d <= 1) return true;
    if (w.length >= 9 && d <= 2) return true;
    return false;
  }
  /** Czy odpowiedź zdradza słowo gracza (zawiera je wprost). */
  function revealsWord(answer, word) {
    const w = normalize(word);
    if (!w) return false;
    const a = normalize(answer);
    if (a === w) return true;
    if (tokens(answer).includes(w)) return true;
    if (w.length >= 6 && a.includes(w)) return true;
    return false;
  }

  /* ---------- ustawienia ---------- */
  function clampInt(v, min, max, def) {
    v = parseInt(v, 10);
    if (!Number.isFinite(v)) return def;
    return Math.max(min, Math.min(max, v));
  }
  function minPlayersFor(mode) { return mode === 'chaos' ? 4 : MIN_PLAYERS; }
  function maxImpostors(n, mode) {
    if (mode === 'chaos') return Math.max(1, Math.floor((n - 3) / 2));
    return Math.max(1, Math.floor((n - 1) / 2));
  }
  function sanitizeCustom(custom) {
    if (!custom || typeof custom !== 'object' || !Array.isArray(custom.words)) return null;
    const seen = new Set();
    const words = [];
    for (const w of custom.words.slice(0, 400)) {
      const word = cleanText(w && w.word, MAX_ANSWER_LEN);
      const similar = cleanText(w && w.similar, MAX_ANSWER_LEN);
      const key = normalize(word);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      words.push({ word, similar });
    }
    if (words.length < 3) return null;
    return { name: cleanText(custom.name, 24) || 'Własna kategoria', words };
  }
  function sanitizeSettings(input, base) {
    const b = Object.assign({}, DEFAULT_SETTINGS, base || {});
    const s = Object.assign({}, b, input || {});
    const out = {};
    out.maxPlayers = clampInt(s.maxPlayers, MIN_PLAYERS, MAX_PLAYERS, b.maxPlayers);
    out.mode = MODES[s.mode] ? s.mode : 'classic';
    out.impostors = clampInt(s.impostors, 1, 9, 1);
    out.rounds = clampInt(s.rounds, 1, 6, 3);
    out.answerTime = ANSWER_TIMES.includes(+s.answerTime) ? +s.answerTime : 30;
    out.difficulty = WORDS.DIFFICULTIES[s.difficulty] ? s.difficulty : 'medium';
    out.impostorHint = !!s.impostorHint;
    out.tournament = !!s.tournament;
    out.tournamentGames = [3, 5, 7].includes(+s.tournamentGames) ? +s.tournamentGames : 3;
    out.custom = null;
    if (s.category === 'custom') {
      const c = sanitizeCustom(s.custom);
      if (c) { out.category = 'custom'; out.custom = c; } else out.category = 'random';
    } else {
      out.category = (s.category === 'random' || WORDS.CATEGORIES[s.category]) ? s.category : 'random';
    }
    return out;
  }
  function categoryLabel(settings) {
    if (settings.category === 'custom' && settings.custom) return settings.custom.name;
    if (settings.category === 'random') return 'Losowa kategoria';
    const c = WORDS.CATEGORIES[settings.category];
    return c ? c.name : 'Losowa kategoria';
  }

  /* ---------- losowanie słowa ---------- */
  function pickWord(settings, used) {
    const usedSet = new Set((used || []).map(normalize));
    if (settings.category === 'custom' && settings.custom) {
      const list = settings.custom.words;
      let pool = list.filter(w => !usedSet.has(normalize(w.word)));
      if (!pool.length) pool = list;
      const w = pool[randInt(pool.length)];
      let similar = w.similar;
      if (!similar) {
        const others = list.filter(x => x.word !== w.word);
        similar = others.length ? others[randInt(others.length)].word : w.word;
      }
      return { word: w.word, similar, hint: '', category: 'custom', categoryName: settings.custom.name, categoryIcon: '✏️', difficulty: 'custom' };
    }
    const catKeys = settings.category === 'random' || !WORDS.CATEGORIES[settings.category]
      ? Object.keys(WORDS.CATEGORIES) : [settings.category];
    const diffs = settings.difficulty === 'mixed' ? ['easy', 'medium', 'hard'] : [settings.difficulty];
    const all = [];
    for (const ck of catKeys) for (const d of diffs) for (const e of WORDS.CATEGORIES[ck][d]) all.push({ ck, d, e });
    let pool = all.filter(x => !usedSet.has(normalize(WORDS.parse(x.e).word)));
    if (!pool.length) pool = all;
    const pick = pool[randInt(pool.length)];
    const p = WORDS.parse(pick.e);
    const cat = WORDS.CATEGORIES[pick.ck];
    return { word: p.word, similar: p.similar, hint: p.hint, category: pick.ck, categoryName: cat.name, categoryIcon: cat.icon, difficulty: pick.d };
  }

  function team(role) { return role && ROLES[role] ? ROLES[role].team : null; }

  function tally(votes, candidates) {
    const counts = {};
    for (const c of candidates) counts[c] = 0;
    for (const v in votes) if (counts[votes[v]] !== undefined) counts[votes[v]]++;
    return counts;
  }

  /** Punkty turniejowe za jedną grę. */
  function scoreGame(r) {
    const pts = {};
    for (const p of r.players) {
      let s = 0;
      if (r.winners.includes(p.id)) s += r.winner === 'jester' ? 4 : r.winner === 'impostors' ? 3 : 2;
      if (r.correctVoters.includes(p.id)) s += 1;
      pts[p.id] = s;
    }
    return pts;
  }

  /* =================================================================== */
  /*                              GameCore                                */
  /* =================================================================== */
  const STATE_KEYS = ['id', 'players', 'settings', 'mode', 'word', 'roles', 'order', 'round', 'turnPos', 'phase',
    'deadline', 'waiting', 'answers', 'revealed', 'detect', 'votes', 'voteRound', 'candidates', 'firstVotes',
    'firstCounts', 'runoffVotes', 'runoffCounts', 'accusedId', 'guess', 'guessCorrect', 'results', 'startedAt'];

  class GameCore {
    /**
     * @param {object} cfg
     *  players: [{id, name, avatar}], settings, used: [słowa], options: {
     *    manual: bool  – tryb jednego telefonu (tura startuje dopiero po przekazaniu telefonu),
     *    revealTimeout, voteTimeout, guessTimeout (ms), onChange(game), onEnd(results) }
     */
    constructor(cfg) {
      this.o = Object.assign({ manual: false, revealTimeout: 0, voteTimeout: 0, guessTimeout: 30000, onChange() {}, onEnd() {} }, cfg.options || {});
      this._timer = null;
      this._tseq = 0;
      if (cfg.restore) {
        for (const k of STATE_KEYS) this[k] = cfg.restore[k];
        if (this.o.manual && (this.phase === 'answers' || this.phase === 'lastchance')) { this.waiting = true; this.deadline = null; }
        return;
      }
      this.id = randomId(12);
      this.settings = sanitizeSettings(cfg.settings);
      this.mode = this.settings.mode;
      this.players = cfg.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, left: false }));
      this.word = pickWord(this.settings, cfg.used);
      this.roles = {};
      this.order = [];
      this.round = 0;
      this.turnPos = 0;
      this.phase = 'init';
      this.deadline = null;
      this.waiting = false;
      this.answers = [];
      this.revealed = [];
      this.detect = {};
      this.votes = {};
      this.voteRound = 0;
      this.candidates = [];
      this.firstVotes = null; this.firstCounts = null;
      this.runoffVotes = null; this.runoffCounts = null;
      this.accusedId = null;
      this.guess = null;
      this.guessCorrect = false;
      this.results = null;
      this.startedAt = Date.now();
    }

    static fromJSON(data, options) { return new GameCore({ restore: data, options }); }
    toJSON() { const o = {}; for (const k of STATE_KEYS) o[k] = this[k]; return o; }

    /* ---- pomocnicze ---- */
    _set(ms, fn) {
      this._clear();
      const seq = ++this._tseq;
      this._timer = setTimeout(() => { if (seq === this._tseq) fn(); }, ms);
    }
    _clear() { if (this._timer) clearTimeout(this._timer); this._timer = null; this._tseq++; }
    destroy() { this._clear(); this.o.onChange = () => {}; this.o.onEnd = () => {}; }
    _emit() { try { this.o.onChange(this); } catch (e) { console.error(e); } }
    player(id) { return this.players.find(p => p.id === id); }
    name(id) { const p = this.player(id); return p ? p.name : '?'; }
    isLeft(id) { const p = this.player(id); return !p || p.left; }
    activeIds() { return this.players.filter(p => !p.left).map(p => p.id); }
    roundOrder(r) {
      const n = this.order.length;
      if (!n) return [];
      const k = ((r || 1) - 1) % n;
      return this.order.slice(k).concat(this.order.slice(0, k));
    }
    currentPlayerId() {
      if (this.phase !== 'answers') return null;
      return this.roundOrder(this.round)[this.turnPos] || null;
    }
    wordFor(id) {
      const r = this.roles[id];
      if (r === 'undercover') return this.word.similar;
      if (r === 'civilian' || r === 'detective' || r === 'jester') return this.word.word;
      return null;
    }
    eligibleTargets(id) { return this.candidates.filter(c => c !== id); }
    pendingVoters() {
      return this.activeIds().filter(id => !this.votes[id] && this.eligibleTargets(id).length > 0);
    }
    nextRevealId() { return this.activeIds().find(id => !this.revealed.includes(id)) || null; }

    /* ---- start ---- */
    start() {
      const ids = shuffle(this.players.map(p => p.id));
      const n = ids.length;
      const k = Math.min(this.settings.impostors, maxImpostors(n, this.mode));
      const roles = {};
      ids.forEach(id => { roles[id] = 'civilian'; });
      if (this.mode === 'classic') {
        for (let i = 0; i < k; i++) roles[ids[i]] = 'impostor';
      } else if (this.mode === 'similar') {
        for (let i = 0; i < k; i++) roles[ids[i]] = 'undercover';
      } else if (this.mode === 'mrwhite') {
        roles[ids[0]] = 'mrwhite';
        for (let i = 1; i < k; i++) roles[ids[i]] = 'undercover';
      } else if (this.mode === 'chaos') {
        for (let i = 0; i < k; i++) roles[ids[i]] = 'impostor';
        if (n - k >= 2) roles[ids[k]] = 'detective';
        if (n - k >= 3) roles[ids[k + 1]] = 'jester';
      }
      this.roles = roles;
      this.impostorCount = k;
      // kolejność wypowiedzi; osoba, która wie, że nie zna słowa, nie zaczyna pierwszej rundy
      const order = shuffle(this.players.map(p => p.id));
      const knowsNothing = id => roles[id] === 'impostor' || roles[id] === 'mrwhite';
      if (knowsNothing(order[0])) {
        const j = order.findIndex(id => !knowsNothing(id));
        if (j > 0) [order[0], order[j]] = [order[j], order[0]];
      }
      this.order = order;
      this.phase = 'reveal';
      this.revealed = [];
      if (!this.o.manual && this.o.revealTimeout) {
        this.deadline = Date.now() + this.o.revealTimeout;
        this._set(this.o.revealTimeout + 250, () => this._toAnswers());
      }
      this._emit();
    }

    confirmReveal(id) {
      if (this.phase !== 'reveal') return { ok: false, error: 'Faza odkrywania ról już się skończyła.' };
      if (!this.roles[id]) return { ok: false, error: 'Nie bierzesz udziału w tej grze.' };
      if (!this.revealed.includes(id)) this.revealed.push(id);
      if (this.activeIds().every(x => this.revealed.includes(x))) this._toAnswers();
      else this._emit();
      return { ok: true };
    }

    detectPlayer(id, targetId) {
      if (this.roles[id] !== 'detective') return { ok: false, error: 'Tylko Detektyw może sprawdzać graczy.' };
      if (this.phase !== 'reveal' && this.phase !== 'answers') return { ok: false, error: 'Na sprawdzanie jest już za późno.' };
      if (this.detect[id]) return { ok: false, error: 'Sprawdzenie zostało już wykorzystane.' };
      if (targetId === id || !this.roles[targetId]) return { ok: false, error: 'Nieprawidłowy gracz.' };
      const res = { targetId, isImpostor: team(this.roles[targetId]) === 'impostors' };
      this.detect[id] = res;
      this._emit();
      return { ok: true, result: res };
    }

    /* ---- skojarzenia ---- */
    _toAnswers() {
      if (this.phase !== 'reveal') return;
      this._clear();
      this.phase = 'answers';
      this.round = 1;
      this.turnPos = 0;
      this._beginTurn();
    }

    _beginTurn() {
      this._clear();
      for (;;) {
        if (this.round > this.settings.rounds) return this._toVoting(this.activeIds(), 1);
        const order = this.roundOrder(this.round);
        if (this.turnPos >= order.length) { this.round++; this.turnPos = 0; continue; }
        if (this.isLeft(order[this.turnPos])) { this.turnPos++; continue; }
        break;
      }
      if (this.o.manual) { this.waiting = true; this.deadline = null; }
      else this._startTurnTimer();
      this._emit();
    }

    _startTurnTimer() {
      this.waiting = false;
      const ms = this.settings.answerTime * 1000;
      this.deadline = Date.now() + ms;
      this._set(ms + 300, () => this.timeoutTurn());
    }

    /** Tryb lokalny: tura/zgadywanie zaczyna się po przekazaniu telefonu. */
    startTimer() {
      if (!this.waiting) return;
      if (this.phase === 'answers') this._startTurnTimer();
      else if (this.phase === 'lastchance') this._startGuessTimer();
      else return;
      this._emit();
    }

    submitAnswer(id, raw) {
      if (this.phase !== 'answers') return { ok: false, error: 'Teraz nie można odpowiadać.' };
      if (this.currentPlayerId() !== id) return { ok: false, error: 'To nie twoja kolej.' };
      if (this.waiting) return { ok: false, error: 'Tura jeszcze się nie zaczęła.' };
      const text = cleanText(raw, MAX_ANSWER_LEN);
      if (!text) return { ok: false, error: 'Wpisz skojarzenie.' };
      const own = this.wordFor(id);
      if (own && revealsWord(text, own)) return { ok: false, error: 'Nie możesz wpisać tajnego słowa!' };
      this.answers.push({ round: this.round, playerId: id, text, timedOut: false });
      this.turnPos++;
      this._beginTurn();
      return { ok: true };
    }

    timeoutTurn() {
      if (this.phase !== 'answers') return;
      const id = this.currentPlayerId();
      if (id) this.answers.push({ round: this.round, playerId: id, text: '', timedOut: true });
      this.turnPos++;
      this._beginTurn();
    }

    /* ---- głosowanie ---- */
    _toVoting(candidates, voteRound) {
      this._clear();
      this.phase = 'voting';
      this.waiting = false;
      this.votes = {};
      this.candidates = candidates.slice();
      this.voteRound = voteRound;
      if (!this.o.manual && this.o.voteTimeout) {
        this.deadline = Date.now() + this.o.voteTimeout;
        this._set(this.o.voteTimeout + 300, () => this._finishVoting());
      } else this.deadline = null;
      this._emit();
    }

    vote(id, targetId) {
      if (this.phase !== 'voting') return { ok: false, error: 'Głosowanie nie trwa.' };
      if (this.isLeft(id) || !this.roles[id]) return { ok: false, error: 'Nie możesz głosować.' };
      if (this.votes[id]) return { ok: false, error: 'Twój głos został już oddany.' };
      if (targetId === id) return { ok: false, error: 'Nie możesz głosować na siebie.' };
      if (!this.eligibleTargets(id).includes(targetId)) return { ok: false, error: 'Nie można głosować na tę osobę.' };
      this.votes[id] = targetId;
      if (this.pendingVoters().length === 0) this._finishVoting();
      else this._emit();
      return { ok: true };
    }

    _finishVoting() {
      if (this.phase !== 'voting') return;
      this._clear();
      const counts = tally(this.votes, this.candidates);
      const max = Math.max(0, ...Object.values(counts));
      if (this.voteRound === 1) { this.firstVotes = Object.assign({}, this.votes); this.firstCounts = counts; }
      else { this.runoffVotes = Object.assign({}, this.votes); this.runoffCounts = counts; }
      if (max === 0) { this.accusedId = null; return this._finish('novotes'); }
      const top = this.candidates.filter(c => counts[c] === max);
      if (top.length > 1) {
        if (this.voteRound === 1) return this._toVoting(top, 2);
        this.accusedId = null;
        return this._finish('tie');
      }
      this.accusedId = top[0];
      if (team(this.roles[this.accusedId]) === 'impostors' && !this.isLeft(this.accusedId)) return this._toLastChance();
      return this._finish();
    }

    /* ---- ostatnia szansa ---- */
    _toLastChance() {
      this.phase = 'lastchance';
      this.guess = null;
      if (this.o.manual) { this.waiting = true; this.deadline = null; }
      else this._startGuessTimer();
      this._emit();
    }
    _startGuessTimer() {
      this.waiting = false;
      this.deadline = Date.now() + this.o.guessTimeout;
      this._set(this.o.guessTimeout + 300, () => {
        if (this.phase !== 'lastchance') return;
        this.guess = '';
        this.guessCorrect = false;
        this._finish();
      });
    }
    submitGuess(id, raw) {
      if (this.phase !== 'lastchance') return { ok: false, error: 'Teraz nie można zgadywać.' };
      if (id !== this.accusedId) return { ok: false, error: 'Tylko zdemaskowany Impostor może zgadywać.' };
      if (this.waiting) return { ok: false, error: 'Zgadywanie jeszcze się nie zaczęło.' };
      const text = cleanText(raw, MAX_GUESS_LEN);
      if (!text) return { ok: false, error: 'Wpisz tajne słowo.' };
      this.guess = text;
      this.guessCorrect = isGuessCorrect(text, this.word.word);
      this._finish();
      return { ok: true };
    }

    /* ---- opuszczenie gry ---- */
    markLeft(id) {
      const p = this.player(id);
      if (!p || p.left) return;
      p.left = true;
      if (this.phase === 'reveal') {
        if (this.activeIds().every(x => this.revealed.includes(x))) this._toAnswers(); else this._emit();
      } else if (this.phase === 'answers') {
        if (this.currentPlayerId() === id) {
          this.answers.push({ round: this.round, playerId: id, text: '', timedOut: true, left: true });
          this.turnPos++;
          this._beginTurn();
        } else this._emit();
      } else if (this.phase === 'voting') {
        if (this.pendingVoters().length === 0) this._finishVoting(); else this._emit();
      } else if (this.phase === 'lastchance') {
        if (this.accusedId === id) { this.guess = ''; this.guessCorrect = false; this._finish(); } else this._emit();
      } else this._emit();
    }

    /* ---- koniec gry ---- */
    _finish(reason) {
      this._clear();
      const acc = this.accusedId;
      const accRole = acc ? this.roles[acc] : null;
      const accName = acc ? this.name(acc) : '';
      let winner, reasonText;
      if (!acc) {
        winner = 'impostors';
        reasonText = reason === 'tie'
          ? 'Ponowny remis w dogrywce — nikt nie został wytypowany, więc Impostor wygrywa.'
          : 'Nikt nie oddał głosu — Impostor pozostał w ukryciu.';
      } else if (accRole === 'jester') {
        winner = 'jester';
        reasonText = `Wytypowano Błazna (${accName}) — Błazen wygrywa!`;
      } else if (team(accRole) === 'impostors') {
        if (this.guessCorrect) {
          winner = 'impostors';
          reasonText = `Impostor (${accName}) został zdemaskowany, ale odgadł tajne słowo!`;
        } else {
          winner = 'civilians';
          reasonText = this.guess
            ? `Impostor (${accName}) został zdemaskowany i nie odgadł tajnego słowa.`
            : `Impostor (${accName}) został zdemaskowany i nie zdążył zgadnąć słowa.`;
        }
      } else {
        winner = 'impostors';
        reasonText = `Wytypowano niewinną osobę (${accName}) — Impostor pozostał w ukryciu!`;
      }
      const winners = this.players.filter(p => {
        const t = team(this.roles[p.id]);
        return winner === 'jester' ? this.roles[p.id] === 'jester' : t === winner;
      }).map(p => p.id);
      const finalVotes = this.runoffVotes || this.firstVotes || {};
      const correctVoters = Object.keys(finalVotes).filter(v => team(this.roles[finalVotes[v]]) === 'impostors');
      const hasUndercover = Object.values(this.roles).includes('undercover');
      const r = {
        id: this.id,
        mode: this.mode,
        modeName: MODES[this.mode].name,
        word: this.word.word,
        similar: hasUndercover ? this.word.similar : null,
        category: this.word.categoryName,
        categoryIcon: this.word.categoryIcon,
        difficulty: this.word.difficulty,
        players: this.players.map(p => ({
          id: p.id, name: p.name, avatar: p.avatar, left: p.left,
          role: this.roles[p.id], roleName: ROLES[this.roles[p.id]].name, team: team(this.roles[p.id])
        })),
        order: this.order,
        rounds: this.settings.rounds,
        answers: this.answers,
        firstVotes: this.firstVotes || {},
        firstCounts: this.firstCounts || {},
        runoff: this.runoffVotes ? { candidates: this.candidates, votes: this.runoffVotes, counts: this.runoffCounts } : null,
        accusedId: acc,
        guess: this.guess,
        guessCorrect: this.guessCorrect,
        winner,
        reason: reasonText,
        winners,
        correctVoters,
        detect: this.detect,
        finishedAt: Date.now()
      };
      r.points = scoreGame(r);
      this.results = r;
      this.phase = 'results';
      this.deadline = null;
      this.waiting = false;
      this._emit();
      try { this.o.onEnd(r); } catch (e) { console.error(e); }
    }

    /* ---- widoki ---- */
    publicState() {
      const showAcc = this.phase === 'lastchance' || this.phase === 'results';
      return {
        id: this.id,
        phase: this.phase,
        mode: this.mode,
        rounds: this.settings.rounds,
        answerTime: this.settings.answerTime,
        round: this.round,
        turnPos: this.turnPos,
        currentPlayerId: this.currentPlayerId(),
        order: this.phase === 'answers' ? this.roundOrder(this.round) : this.order,
        waiting: this.waiting,
        deadline: this.deadline,
        players: this.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, left: p.left })),
        answers: this.answers,
        revealed: this.revealed.slice(),
        voted: Object.keys(this.votes),
        voteRound: this.voteRound,
        candidates: this.candidates,
        accusedId: showAcc ? this.accusedId : null,
        categoryPublic: this.settings.category === 'random' ? null : this.word.categoryName,
        hasDetective: Object.values(this.roles).includes('detective'),
        hasJester: Object.values(this.roles).includes('jester'),
        impostorCount: this.impostorCount || Object.values(this.roles).filter(r => team(r) === 'impostors').length,
        results: this.phase === 'results' ? this.results : null
      };
    }

    privateState(id) {
      const role = this.roles[id];
      if (!role) return null;
      const hint = this.settings.impostorHint;
      const v = { myVote: this.votes[id] || null };
      if (role === 'civilian' || role === 'undercover') {
        v.kind = 'civilian';
        v.word = role === 'undercover' ? this.word.similar : this.word.word;
        v.category = this.word.categoryName;
      } else if (role === 'detective' || role === 'jester') {
        v.kind = role;
        v.word = this.word.word;
        v.category = this.word.categoryName;
      } else {
        v.kind = role; // impostor | mrwhite
        v.word = null;
        v.category = hint ? this.word.categoryName : null;
        v.clue = hint && this.word.hint ? this.word.hint : null;
        if (role === 'impostor') v.partners = Object.keys(this.roles).filter(x => x !== id && this.roles[x] === 'impostor');
      }
      if (role === 'detective') {
        v.detectResult = this.detect[id] || null;
        v.canDetect = !this.detect[id] && (this.phase === 'reveal' || this.phase === 'answers');
      }
      if (this.phase === 'lastchance' && this.accusedId === id) {
        v.mustGuess = true;
        v.trueRole = role;
      }
      return v;
    }
  }

  return {
    GameCore, MODES, ROLES, DEFAULT_SETTINGS, MIN_PLAYERS, MAX_PLAYERS, ANSWER_TIMES, MAX_ANSWER_LEN, MAX_GUESS_LEN,
    sanitizeSettings, sanitizeCustom, categoryLabel, maxImpostors, minPlayersFor, pickWord, team, tally, scoreGame,
    normalize, cleanText, isGuessCorrect, revealsWord, levenshtein, shuffle, randInt, randomId
  };
});
