/* Boty: pełne gry rozgrywane wyłącznie przez boty (oraz z jednym człowiekiem) we wszystkich trybach. */
const assert = require('assert');
const E = require('../shared/engine.js');
const B = require('../shared/bots.js');

function botGame(mode, n, level, extra) {
  return new Promise((resolve, reject) => {
    const players = Array.from({ length: n }, (_, i) => Object.assign({ id: 'b' + i, bot: true }, B.makeBot([])));
    if (extra) players[0] = { id: 'h0', name: 'Człowiek', avatar: 0 };
    const t0 = Date.now();
    const g = new E.GameCore({
      players, settings: Object.assign({ mode, impostors: n >= 7 ? 2 : 1, rounds: 3, answerTime: 15, botLevel: level }, extra && extra.settings),
      options: { manual: true, botDelay: [2, 6], guessTimeout: 30000, onEnd: r => resolve({ r, g, ms: Date.now() - t0 }) }
    });
    g.start();
    if (extra) extra.drive(g);
    setTimeout(() => reject(new Error('gra botów nie skończyła się')), 15000);
  });
}

(async () => {
  const wins = { civilians: 0, impostors: 0, jester: 0 };
  let caught = 0, guessed = 0, games = 0;
  for (const mode of ['classic', 'similar', 'mrwhite', 'chaos']) {
    for (const level of ['easy', 'medium', 'hard']) {
      for (const n of [4, 6, 9]) {
        const { r, g } = await botGame(mode, n, level);
        games++;
        wins[r.winner]++;
        assert.strictEqual(r.answers.length, n * 3, 'każdy bot odpowiada w każdej rundzie');
        for (const a of r.answers) {
          assert(!a.timedOut, 'bot nie przekroczył czasu');
          const own = g.wordFor(a.playerId);
          if (own) assert(!E.revealsWord(a.text, own), `bot zdradził słowo: ${a.text} / ${own}`);
        }
        if (r.accusedId && r.players.find(p => p.id === r.accusedId).team === 'impostors') { caught++; if (r.guessCorrect) guessed++; }
      }
    }
  }
  console.log(`gier botów: ${games}, wygrane:`, wins, `| Impostor złapany: ${caught}, z tego odgadł hasło: ${guessed}`);

  // jeden człowiek + boty: człowiek odpowiada i głosuje, reszta automatycznie
  const { r } = await botGame('classic', 5, 'medium', {
    drive(g) {
      const tick = () => {
        if (g.phase === 'reveal' && !g.revealed.includes('h0')) g.confirmReveal('h0');
        if (g.phase === 'answers' && g.currentPlayerId() === 'h0') { g.startTimer(); g.submitAnswer('h0', 'coś ' + g.round); }
        if (g.phase === 'voting' && !g.votes.h0) g.vote('h0', g.eligibleTargets('h0')[0]);
        if (g.phase === 'lastchance' && g.accusedId === 'h0') { g.startTimer(); g.submitGuess('h0', 'nie wiem'); }
        if (g.phase !== 'results') setTimeout(tick, 5);
      };
      tick();
    }
  });
  assert(r.players.find(p => p.id === 'h0'));
  assert.strictEqual(r.answers.filter(a => a.playerId === 'h0').length, 3);
  console.log('gra człowieka z botami: OK –', r.reason);

  // bot-Impostor potrafi wywnioskować hasło z dobrych skojarzeń
  const fake = { answers: [{ playerId: 'x', text: 'ser' }, { playerId: 'y', text: 'Włochy' }, { playerId: 'z', text: 'pepperoni' }], settings: { category: 'jedzenie', difficulty: 'easy', botLevel: 'hard' }, privateState: () => ({}) };
  const top = B.infer(fake, 'bot')[0];
  assert.strictEqual(top.word, 'Pizza');
  console.log('wnioskowanie bota: ser + Włochy + pepperoni →', top.word);
  console.log('bots OK');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
