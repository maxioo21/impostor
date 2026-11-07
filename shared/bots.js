/*
 * IMPOSTOR – boty (gracze komputerowi).
 * Bot korzysta wyłącznie z informacji, które miałby prawdziwy gracz: swojej roli i słowa,
 * publicznych odpowiedzi innych oraz (gdy jest Impostorem z podpowiedzią) kategorii.
 * Wczytywany po engine.js (w przeglądarce) – silnik sięga po boty dopiero w trakcie gry.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./words.js'), require('./associations.js'), () => require('./engine.js'));
  } else {
    root.ImpostorBots = factory(root.ImpostorWords, root.ImpostorAssociations, () => root.ImpostorEngine);
  }
})(typeof self !== 'undefined' ? self : this, function (WORDS, ASSOC, getEngine) {
  'use strict';

  const NAMES = ['Bot Bolek', 'Bot Ada', 'Bot Kuba', 'Bot Ola', 'Bot Igor', 'Bot Zosia', 'Bot Leon', 'Bot Nina', 'Bot Tytus',
    'Bot Hela', 'Bot Maks', 'Bot Lena', 'Bot Szymek', 'Bot Iga', 'Bot Franek', 'Bot Pola', 'Bot Antek', 'Bot Mila', 'Bot Staś'];
  const GENERIC = ['codzienne', 'popularne', 'znane', 'ciekawe', 'kolorowe', 'fajne', 'duże', 'małe', 'stare', 'nowoczesne',
    'ważne', 'przyjemne', 'dziwne', 'szybkie', 'drogie', 'zwyczajne', 'lubiane', 'praktyczne'];
  const LEVEL = {
    easy: { noise: 0.9, useAnswers: 0.5, guessTop: 0.5, guessRight: 0.2 },
    medium: { noise: 0.45, useAnswers: 0.75, guessTop: 0.7, guessRight: 0.4 },
    hard: { noise: 0.15, useAnswers: 1, guessTop: 0.9, guessRight: 0.6 }
  };

  let cache = null;
  function data() {
    if (cache) return cache;
    const E = getEngine();
    const assoc = new Map();
    for (const line of ASSOC) {
      const i = line.indexOf(':');
      const key = E.normalize(line.slice(0, i));
      const list = line.slice(i + 1).split(',').map(s => s.trim()).filter(Boolean);
      assoc.set(key, (assoc.get(key) || []).concat(list));
    }
    const entries = [];
    for (const ck of Object.keys(WORDS.CATEGORIES)) {
      const c = WORDS.CATEGORIES[ck];
      for (const d of ['easy', 'medium', 'hard']) for (const e of c[d]) {
        const p = WORDS.parse(e);
        entries.push({ word: p.word, cat: ck, catName: c.name });
      }
    }
    const generic = new Set(GENERIC.map(E.normalize));
    // wersje znormalizowane (szybkie porównania) i indeks odwrotny: skojarzenie -> hasła
    const prepared = new Map();
    const rev = new Map();
    for (const [key, list] of assoc) {
      const items = list.map(x => ({ n: E.normalize(x), t: tokensRaw(E, x) }));
      prepared.set(key, items);
      for (const it of items) { if (!rev.has(it.n)) rev.set(it.n, new Set()); rev.get(it.n).add(key); }
    }
    cache = { E, assoc, entries, generic, prepared, rev };
    return cache;
  }

  const rnd = n => getEngine().randInt(n);
  const pick = arr => arr[rnd(arr.length)];
  const levelOf = g => LEVEL[g.settings.botLevel] || LEVEL.medium;

  function assocOf(word) { const d = data(); return d.assoc.get(d.E.normalize(word)) || []; }

  function tokensRaw(E, s) { return String(s).split(/[\s,.;:!?/-]+/).map(E.normalize).filter(t => t.length >= 4); }
  function tokensOf(s) { return tokensRaw(data().E, s); }

  /** Jak bardzo odpowiedź pasuje do hasła: 2 – dokładne skojarzenie, 1 – częściowe, 0 – brak. */
  function match(answer, word) {
    const d = data();
    const a = d.E.normalize(answer);
    if (!a) return 0;
    const list = d.prepared.get(d.E.normalize(word)) || [];
    let best = 0;
    const at = tokensOf(answer);
    for (const x of list) {
      if (x.n === a) return 2;
      if (best) continue;
      if (x.n.length >= 5 && a.length >= 5 && (x.n.startsWith(a.slice(0, 5)) || a.startsWith(x.n.slice(0, 5)))) best = 1;
      else if (at.some(t => x.t.includes(t))) best = 1;
    }
    return best;
  }

  /** Pula słów, wśród których może być hasło (z tego, co bot wie). */
  function candidatePool(g, id) {
    const d = data();
    if (g.settings.category === 'custom' && g.settings.custom) return g.settings.custom.words.map(w => ({ word: w.word, catName: g.settings.custom.name }));
    let cat = g.settings.category !== 'random' ? g.settings.category : null;
    if (!cat) {
      const v = g.privateState(id);
      if (v && v.category) { const e = d.entries.find(x => x.catName === v.category); if (e) cat = e.cat; }
    }
    const diffWords = g.settings.difficulty === 'mixed' || !cat ? null : new Set(WORDS.CATEGORIES[cat][g.settings.difficulty].map(e => WORDS.parse(e).word));
    let pool = d.entries.filter(e => (!cat || e.cat === cat) && (!diffWords || diffWords.has(e.word)));
    if (!pool.length) pool = d.entries;
    return pool;
  }

  /** Zgadywanie hasła na podstawie odpowiedzi innych graczy. */
  function infer(g, id, exclude) {
    const E = data().E;
    const lv = levelOf(g);
    let answers = g.answers.filter(a => a.playerId !== id && !a.timedOut && a.text);
    if (lv.useAnswers < 1) answers = answers.filter(() => Math.random() < lv.useAnswers);
    const ex = exclude ? E.normalize(exclude) : null;
    const scored = candidatePool(g, id)
      .filter(c => E.normalize(c.word) !== ex)
      .map(c => ({ word: c.word, score: answers.reduce((s, a) => s + match(a.text, c.word), 0) + Math.random() * 0.01 }));
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  function freshFrom(list, g, avoidWord) {
    const E = data().E;
    const used = new Set(g.answers.map(a => E.normalize(a.text)).filter(Boolean));
    const ok = list.filter(a => a.length <= 30 && !used.has(E.normalize(a)) && !(avoidWord && E.revealsWord(a, avoidWord)));
    return ok.length ? pick(ok) : null;
  }

  /** Skojarzenie bota w jego turze. */
  function answer(g, id) {
    const myWord = g.wordFor(id);
    if (myWord) {
      return freshFrom(assocOf(myWord), g, myWord) || freshFrom(GENERIC, g, myWord) || pick(GENERIC);
    }
    // Impostor / Mr. White – nie zna słowa
    const cands = infer(g, id);
    if (cands.length && cands[0].score >= 1) {
      const top = Math.random() < levelOf(g).guessTop || cands.length < 2 ? cands[0].word : cands[1 + rnd(Math.min(2, cands.length - 1))].word;
      const a = freshFrom(assocOf(top), g, top);
      if (a) return a;
    }
    const v = g.privateState(id);
    if (v && v.category && Math.random() < 0.6) {
      const pool = candidatePool(g, id);
      const w = pick(pool).word;
      const a = freshFrom(assocOf(w), g, w);
      if (a) return a;
    }
    return freshFrom(GENERIC, g) || pick(GENERIC);
  }

  /** Podejrzliwość wobec gracza z perspektywy hasła ref (wyższa = bardziej podejrzany). */
  function suspicion(g, pid, ref) {
    const d = data();
    const answers = g.answers.filter(a => a.playerId === pid);
    if (!answers.length) return 0.5;
    let s = 0;
    for (const a of answers) {
      if (a.timedOut) { s += 1.2; continue; }
      const m = ref ? match(a.text, ref) : 0;
      if (m === 2) continue;
      if (m === 1) { s += 0.25; continue; }
      if (d.generic.has(d.E.normalize(a.text))) { s += 0.75; continue; }
      const owners = d.rev.get(d.E.normalize(a.text));
      const refKey = ref ? d.E.normalize(ref) : null;
      const elsewhere = !!owners && [...owners].some(k => k !== refKey);
      s += elsewhere ? 0.95 : 0.5;
    }
    return s / answers.length;
  }

  /** Głos bota. */
  function vote(g, id) {
    const targets = g.eligibleTargets(id);
    if (!targets.length) return null;
    const role = g.roles[id];
    if (role === 'jester') return pick(targets);
    const det = g.detect[id];
    if (det && det.isImpostor && targets.includes(det.targetId)) return det.targetId;
    const lv = levelOf(g);
    let ref = g.wordFor(id);
    let avoid = new Set();
    if (role === 'impostor' || role === 'mrwhite') {
      const c = infer(g, id);
      ref = c.length && c[0].score > 0 ? c[0].word : null;
      for (const x of Object.keys(g.roles)) if (x !== id && g.roles[x] === 'impostor' && role === 'impostor') avoid.add(x);
    }
    let best = null, bestScore = -Infinity;
    for (const t of targets) {
      if (avoid.has(t) && targets.length > avoid.size) continue;
      let s = suspicion(g, t, ref) + (Math.random() * 2 - 1) * lv.noise;
      if (det && det.targetId === t && !det.isImpostor) s -= 2;
      if (s > bestScore) { bestScore = s; best = t; }
    }
    return best || pick(targets);
  }

  /** Ostatnia szansa – bot zgaduje hasło. */
  function guess(g, id) {
    const lv = levelOf(g);
    const own = g.wordFor(id); // Impostor z innym słowem wie już, że jego słowo jest złe
    const cands = infer(g, id, own);
    if (!cands.length) return pick(GENERIC);
    // nawet dobry trop nie gwarantuje trafienia – skuteczność zależy od poziomu botów
    if (Math.random() < lv.guessRight) return cands[0].word;
    return cands[Math.min(cands.length - 1, 1 + rnd(5))].word;
  }

  /** Detektyw-bot: kogo sprawdzić. */
  function detectTarget(g, id) {
    const others = g.activeIds().filter(x => x !== id);
    return others.length ? pick(others) : null;
  }

  /** Nowy bot o unikalnej nazwie. */
  function makeBot(takenNames) {
    const taken = new Set((takenNames || []).map(n => String(n).toLowerCase()));
    const free = NAMES.filter(n => !taken.has(n.toLowerCase()));
    let name = free.length ? pick(free) : 'Bot ' + (taken.size + 1);
    let k = 2;
    while (taken.has(name.toLowerCase())) name = 'Bot ' + k++;
    return { name, avatar: rnd(32) };
  }

  return { answer, vote, guess, detectTarget, makeBot, infer, match, NAMES };
});
