const assert = require('assert');
const E = require('../shared/engine.js');
const W = require('../shared/words.js');

console.log('Słów w bazie:', W.countWords());
assert(E.isGuessCorrect('pizza', 'Pizza'));
assert(E.isGuessCorrect('ŻÓŁW', 'zolw'));
assert(E.isGuessCorrect('spagetti', 'Spaghetti'));
assert(!E.isGuessCorrect('kot', 'pies'));
assert(E.revealsWord('duża pizza', 'Pizza'));
assert(!E.revealsWord('serce', 'Ser'));

function play(mode, n, imps, strategy) {
  const players = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'Gracz ' + i, avatar: i }));
  let ended = null;
  const g = new E.GameCore({ players, settings: { mode, impostors: imps, rounds: 2, answerTime: 15 }, options: { manual: true, onEnd: r => { ended = r; } } });
  g.start();
  assert.equal(g.phase, 'reveal');
  const roles = Object.values(g.roles);
  const impTeam = roles.filter(r => E.team(r) === 'impostors').length;
  assert(impTeam >= 1);
  if (mode === 'chaos') { assert(roles.includes('detective')); assert(roles.includes('jester')); }
  if (mode === 'mrwhite') assert(roles.includes('mrwhite'));
  // private state never leaks word to impostor
  for (const id in g.roles) {
    const v = g.privateState(id);
    if (g.roles[id] === 'impostor' || g.roles[id] === 'mrwhite') assert.equal(v.word, null);
    if (g.roles[id] === 'undercover') { assert.equal(v.kind, 'civilian'); assert.notEqual(v.word, g.word.word); }
  }
  // public state must not contain secret word or roles
  const pub = JSON.stringify(g.publicState());
  assert(!pub.includes('"roles"'));
  assert(!pub.toLowerCase().includes('"' + g.word.word.toLowerCase() + '"'));
  for (const p of players) g.confirmReveal(p.id);
  assert.equal(g.phase, 'answers');
  let guard = 0;
  while (g.phase === 'answers' && guard++ < 100) {
    const id = g.currentPlayerId();
    assert(g.waiting);
    assert(!g.submitAnswer(id, 'x').ok); // not started
    g.startTimer();
    const own = g.wordFor(id);
    if (own) assert(!g.submitAnswer(id, own).ok, 'should block own word');
    assert(g.submitAnswer(id, 'skojarzenie ' + guard).ok);
  }
  assert.equal(g.answers.length, n * 2);
  assert.equal(g.phase, 'voting');
  const ids = players.map(p => p.id);
  assert(!g.vote('p0', 'p0').ok);
  const impId = ids.find(id => E.team(g.roles[id]) === 'impostors');
  for (const id of ids) {
    const t = strategy === 'catch' ? (id === impId ? ids.find(x => x !== id) : impId) : ids.find(x => x !== id && E.team(g.roles[x]) !== 'impostors' && g.roles[x] !== 'jester') || ids.find(x => x !== id);
    assert(g.vote(id, t).ok);
    assert(!g.vote(id, t).ok, 'double vote blocked');
  }
  if (strategy === 'catch') {
    assert.equal(g.phase, 'lastchance');
    g.startTimer();
    assert(!g.submitGuess(ids.find(x => x !== impId), 'abc').ok);
    g.submitGuess(impId, g.word.word);
    assert.equal(ended.winner, 'impostors');
  }
  return ended || g;
}
for (const mode of ['classic', 'similar', 'mrwhite', 'chaos']) {
  for (const n of [4, 7, 12]) {
    const r = play(mode, n, 2, 'catch');
    assert(r.winners.length > 0);
    play(mode, n, 1, 'innocent');
  }
}
// tie -> runoff
{
  const players = Array.from({ length: 4 }, (_, i) => ({ id: 'p' + i, name: 'G' + i, avatar: i }));
  const g = new E.GameCore({ players, settings: { rounds: 1 }, options: { manual: true } });
  g.start(); players.forEach(p => g.confirmReveal(p.id));
  while (g.phase === 'answers') { g.startTimer(); g.timeoutTurn(); }
  g.vote('p0', 'p1'); g.vote('p1', 'p0'); g.vote('p2', 'p1'); g.vote('p3', 'p0');
  assert.equal(g.phase, 'voting'); assert.equal(g.voteRound, 2); assert.deepEqual(g.candidates.sort(), ['p0', 'p1']);
  g.vote('p0', 'p1'); g.vote('p1', 'p0'); g.vote('p2', 'p1'); g.vote('p3', 'p0');
  assert.equal(g.phase, 'results'); assert.equal(g.results.accusedId, null); assert.equal(g.results.winner, 'impostors');
}
// serialization
{
  const players = Array.from({ length: 5 }, (_, i) => ({ id: 'p' + i, name: 'G' + i, avatar: i }));
  const g = new E.GameCore({ players, settings: {}, options: { manual: true } });
  g.start(); players.forEach(p => g.confirmReveal(p.id)); g.startTimer();
  const g2 = E.GameCore.fromJSON(JSON.parse(JSON.stringify(g.toJSON())), { manual: true });
  assert.equal(g2.phase, 'answers'); assert(g2.waiting); assert.equal(g2.currentPlayerId(), g.currentPlayerId());
  g.destroy();
}
console.log('engine OK');
