/* Gra online: 2 ludzi + 2 boty dodane przez hosta, pełna rozgrywka na serwerze. */
process.env.DATA_FILE = require('path').join(__dirname, '..', 'data', 'test-bots-db.json');
const assert = require('assert');
const { io: ioc } = require('socket.io-client');
const { server } = require('../server/index.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 60000) { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error('timeout'); await sleep(25); } }
function client(name, port) {
  const s = ioc(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
  const c = { s, state: null, priv: null };
  s.on('state', st => { c.state = st.room; c.priv = st.priv; });
  c.call = (ev, d) => new Promise(res => s.emit(ev, d || {}, res));
  c.hello = async () => { const r = await c.call('hello', { name, avatar: 1 }); c.id = r.playerId; };
  return c;
}
(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const A = client('Ala', port), B = client('Bartek', port);
  await A.hello(); await B.hello();
  const { code } = await A.call('room:create', { name: 'Ala', settings: { rounds: 2, answerTime: 15 } });
  assert.strictEqual((await B.call('room:join', { code, name: 'Bartek' })).ok, true);
  assert.strictEqual((await B.call('room:addBot')).ok, false, 'tylko host dodaje boty');
  assert((await A.call('room:addBot')).ok); assert((await A.call('room:addBot')).ok);
  await until(() => A.state && A.state.players.length === 4);
  const bots = A.state.players.filter(p => p.bot);
  assert.strictEqual(bots.length, 2);
  assert.strictEqual((await A.call('room:transferHost', { playerId: bots[0].id })).ok, false, 'bot nie może być hostem');
  await B.call('room:ready', { ready: true });
  assert((await A.call('room:start')).ok);
  await until(() => A.state.phase === 'reveal' && A.priv);
  assert.deepStrictEqual(A.state.game.revealed.sort(), bots.map(b => b.id).sort(), 'boty od razu potwierdzają rolę');
  for (const c of [A, B]) await c.call('game:confirmReveal');
  await until(() => A.state.phase === 'answers');
  // ludzie odpowiadają, boty same
  while (A.state.phase === 'answers') {
    const cur = A.state.game.currentPlayerId;
    const c = [A, B].find(x => x.id === cur);
    if (c) await c.call('game:answer', { text: 'skojarzenie ' + A.state.game.answers.length });
    await sleep(40);
  }
  await until(() => A.state.phase === 'voting');
  const botAnswers = A.state.game.answers.filter(a => bots.some(b => b.id === a.playerId));
  assert.strictEqual(botAnswers.length, 4, 'każdy bot odpowiedział w obu rundach');
  // głosowanie (także ewentualna dogrywka) i ostatnia szansa
  while (A.state.phase !== 'results') {
    const g = A.state.game;
    if (A.state.phase === 'voting') {
      for (const c of [A, B]) {
        const t = c.state.game.candidates.find(x => x !== c.id);
        if (t && !c.state.game.voted.includes(c.id)) await c.call('game:vote', { targetId: t });
      }
    } else if (A.state.phase === 'lastchance') {
      const acc = [A, B].find(c => c.id === g.accusedId);
      if (acc && acc.priv && acc.priv.mustGuess) await acc.call('game:guess', { text: 'nie wiem' });
    }
    await sleep(60);
  }
  await until(() => A.state.phase === 'results');
  console.log('Odpowiedzi botów:', botAnswers.map(a => a.text).join(', '));
  console.log('Wynik:', A.state.game.results.reason);
  // usunięcie bota w lobby
  await A.call('room:playAgain');
  await until(() => A.state.phase === 'lobby');
  assert((await A.call('room:kick', { playerId: bots[1].id })).ok);
  await until(() => A.state.players.length === 3);
  console.log('online bots OK');
  A.s.close(); B.s.close(); server.close();
  require('fs').rmSync(process.env.DATA_FILE, { force: true });
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
