/* Test integracyjny: 4 klientów Socket.IO rozgrywa pełną grę na serwerze. */
process.env.DATA_FILE = require('path').join(__dirname, '..', 'data', 'test-db.json');
const assert = require('assert');
const { io: ioc } = require('socket.io-client');
const E = require('../shared/engine.js');
const { server } = require('../server/index.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));
function client(name, i, port) {
  const s = ioc(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
  const c = { s, name, state: null, priv: null, raw: [] };
  s.on('state', st => { c.state = st.room; c.priv = st.priv; c.raw.push(JSON.stringify(st)); });
  c.call = (ev, d) => new Promise(res => s.emit(ev, d || {}, res));
  c.hello = async (extra) => { const r = await c.call('hello', Object.assign({ name, avatar: i }, extra)); c.id = r.playerId; c.token = r.token || c.token; return r; };
  return c;
}
async function until(fn, ms = 4000) { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error('timeout'); await sleep(20); } }

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const cs = ['Ala', 'Bartek', 'Celina', 'Darek'].map((n, i) => client(n, i, port));
  for (const c of cs) await c.hello();
  const [host, ...rest] = cs;
  const cr = await host.call('room:create', { name: 'Ala', avatar: 0, settings: { rounds: 2, answerTime: 15 } });
  assert(cr.ok); const code = cr.code;
  assert.equal((await rest[0].call('room:join', { code: 'ZZZZZ', name: 'x' })).ok, false);
  for (const c of rest) assert((await c.call('room:join', { code, name: c.name, avatar: 1 })).ok);
  await until(() => host.state && host.state.players.length === 4);
  // non-host cannot start / change settings
  assert.equal((await rest[0].call('room:start')).ok, false);
  assert.equal((await rest[0].call('room:settings', { settings: { rounds: 6 } })).ok, false);
  assert.equal((await host.call('room:start')).ok, false, 'not all ready');
  for (const c of rest) await c.call('room:ready', { ready: true });
  // kick + rejoin blocked
  const extra = client('Ewa', 5, port); await extra.hello();
  await extra.call('room:join', { code, name: 'Ewa' });
  assert((await host.call('room:kick', { playerId: extra.id })).ok);
  assert.equal((await extra.call('room:join', { code, name: 'Ewa' })).ok, false);
  extra.s.close();
  const st = await host.call('room:start');
  assert(st.ok, st.error);
  await until(() => cs.every(c => c.state.phase === 'reveal' && c.priv));
  // privacy: no client receives anyone else's role or the word unless it is theirs
  const impostors = cs.filter(c => c.priv.kind === 'impostor');
  assert.equal(impostors.length, 1);
  const word = cs.find(c => c.priv.kind === 'civilian').priv.word;
  for (const c of impostors) assert(!c.raw.join('').includes(word), 'impostor received the word!');
  for (const c of cs) assert(!c.raw.join('').includes('"roles"'));
  for (const c of cs) await c.call('game:confirmReveal');
  await until(() => host.state.phase === 'answers');
  // wrong player cannot answer
  let guard = 0;
  while (host.state.phase === 'answers' && guard++ < 20) {
    const cur = host.state.game.currentPlayerId;
    const other = cs.find(c => c.id !== cur);
    assert.equal((await other.call('game:answer', { text: 'hack' })).ok, false);
    const c = cs.find(x => x.id === cur);
    if (c.priv.word) assert.equal((await c.call('game:answer', { text: c.priv.word })).ok, false);
    const r = await c.call('game:answer', { text: 'skoj ' + guard });
    assert(r.ok, r.error);
    await until(() => host.state.game.answers.length >= guard || host.state.phase !== 'answers');
  }
  await until(() => host.state.phase === 'voting');
  const imp = impostors[0];
  for (const c of cs) {
    const target = c === imp ? cs.find(x => x !== c).id : imp.id;
    assert.equal((await c.call('game:vote', { targetId: c.id })).ok, false, 'self vote');
    assert((await c.call('game:vote', { targetId: target })).ok);
    assert.equal((await c.call('game:vote', { targetId: target })).ok, false, 'double vote');
  }
  await until(() => host.state.phase === 'lastchance');
  assert(imp.priv.mustGuess);
  assert.equal((await cs.find(c => c !== imp).call('game:guess', { text: word })).ok, false);
  // reconnect in the middle of last chance
  imp.s.close();
  const imp2 = client(imp.name, 0, port);
  const hr = await imp2.hello({ playerId: imp.id, token: imp.token });
  assert.equal(hr.roomCode, code, 'resume');
  await until(() => imp2.priv && imp2.priv.mustGuess);
  const live = cs.map(c => (c === imp ? imp2 : c));
  const H = live[0], R = live.slice(1);
  assert((await imp2.call('game:guess', { text: 'zupełnie nie to' })).ok);
  await until(() => H.state.phase === 'results');
  const res = H.state.game.results;
  assert.equal(res.winner, 'civilians');
  assert.equal(res.correctVoters.length, 3);
  const stats = await live.find(c => c !== imp2).call('stats:get');
  assert.equal(stats.stats.games, 1); assert.equal(stats.stats.wins, 1);
  const rk = await H.call('ranking:get');
  assert(rk.list.length >= 4);
  assert((await H.call('room:playAgain')).ok);
  await until(() => H.state.phase === 'lobby');
  // host leaves -> transfer
  await H.call('room:leave', { newHostId: R[1].id });
  await until(() => R[0].state.hostId === R[1].id);
  console.log('online OK');
  for (const c of [...cs, imp2]) c.s.close();
  server.close();
  require('fs').rmSync(process.env.DATA_FILE, { force: true });
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
