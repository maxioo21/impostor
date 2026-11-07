/*
 * IMPOSTOR – serwer gry online (Express + Socket.IO).
 * Serwer jest jedynym źródłem prawdy: losuje słowa i role, pilnuje tur, czasu i głosów.
 * Każdy klient dostaje wyłącznie publiczny stan pokoju i swój prywatny widok roli.
 */
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const E = require('../shared/engine.js');
const store = require('./store.js');

const PORT = +process.env.PORT || 3000;
const AVATAR_COUNT = 32;
const REVEAL_MS = 30000;
const VOTE_MS = 60000;
const GUESS_MS = 30000;
const HOST_GRACE_MS = 20000;
const LOBBY_DROP_MS = 90000;
const EMPTY_ROOM_MS = 10 * 60000;

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "base-uri 'none'",
    "frame-ancestors 'none'"
  ].join('; '));
  next();
});
const staticOpts = {
  setHeaders(res, file) {
    if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=300');
  }
};
app.use('/shared', express.static(path.join(__dirname, '..', 'shared'), staticOpts));
app.use(express.static(path.join(__dirname, '..', 'public'), staticOpts));
app.get('/health', (req, res) => res.json({ ok: true, rooms: rooms.size }));

const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 8000, maxHttpBufferSize: 64 * 1024 });

/* ------------------------------------------------------------------ */
const rooms = new Map();       // code -> room
const playerRoom = new Map();  // playerId -> code
const sockets = new Map();     // playerId -> socket

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 5; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}
const cleanName = n => E.cleanText(n, 16) || 'Gracz';
const cleanAvatar = a => { a = parseInt(a, 10); return Number.isInteger(a) && a >= 0 && a < AVATAR_COUNT ? a : 0; };

function roomOf(pid) { const c = playerRoom.get(pid); return c ? rooms.get(c) : null; }
function gameActive(room) { return !!room.game && room.game.phase !== 'results'; }

function publicSettings(s) {
  const o = Object.assign({}, s);
  o.custom = s.custom ? { name: s.custom.name, count: s.custom.words.length } : null;
  o.categoryLabel = E.categoryLabel(s);
  return o;
}
function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.game ? room.game.phase : 'lobby',
    settings: publicSettings(room.settings),
    players: [...room.players.values()].map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, ready: p.ready, connected: p.connected, isHost: p.id === room.hostId
    })),
    game: room.game ? room.game.publicState() : null,
    tournament: room.tournament,
    serverNow: Date.now()
  };
}
function broadcastNow(room) {
  room.bcScheduled = false;
  if (!rooms.has(room.code)) return;
  const pub = publicRoom(room);
  for (const p of room.players.values()) {
    const s = sockets.get(p.id);
    if (!s) continue;
    s.emit('state', { room: pub, priv: room.game ? room.game.privateState(p.id) : null });
  }
}
function broadcast(room) {
  if (room.bcScheduled) return;
  room.bcScheduled = true;
  queueMicrotask(() => broadcastNow(room));
}
function toastRoom(room, text, kind) {
  for (const p of room.players.values()) { const s = sockets.get(p.id); if (s) s.emit('toast', { text, kind: kind || 'info' }); }
}
function destroyRoom(room) {
  if (room.game) room.game.destroy();
  for (const pid of room.players.keys()) if (playerRoom.get(pid) === room.code) playerRoom.delete(pid);
  rooms.delete(room.code);
}
function setHost(room, pid, announce) {
  if (!room.players.has(pid) || room.hostId === pid) return;
  room.hostId = pid;
  room.players.get(pid).ready = true;
  if (announce) toastRoom(room, `${room.players.get(pid).name} jest teraz hostem pokoju.`);
}
function uniqueName(room, name, selfId) {
  const taken = new Set([...room.players.values()].filter(p => p.id !== selfId).map(p => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let i = 2; i < 99; i++) { const n = (name.slice(0, 13) + ' ' + i); if (!taken.has(n.toLowerCase())) return n; }
  return name;
}

function leaveRoom(pid, newHostId) {
  const room = roomOf(pid);
  if (!room) return;
  const p = room.players.get(pid);
  room.players.delete(pid);
  playerRoom.delete(pid);
  if (room.game && room.game.phase !== 'results') room.game.markLeft(pid);
  if (room.players.size === 0) return destroyRoom(room);
  if (p) toastRoom(room, `${p.name} opuścił(a) pokój.`);
  if (room.hostId === pid) {
    const next = (newHostId && room.players.has(newHostId) && newHostId)
      || ([...room.players.values()].find(x => x.connected) || [...room.players.values()][0]).id;
    room.hostId = null;
    setHost(room, next, true);
  }
  broadcast(room);
}

function onGameEnd(room, r) {
  store.recordGame(r);
  if (room.tournament) {
    const t = room.tournament;
    for (const pl of r.players) {
      t.scores[pl.id] = (t.scores[pl.id] || 0) + (r.points[pl.id] || 0);
      t.names[pl.id] = { name: pl.name, avatar: pl.avatar };
    }
    t.results.push({ gameNo: t.gameNo, word: r.word, winner: r.winner });
    if (t.gameNo >= t.total) {
      t.finished = true;
      const best = Math.max(...Object.values(t.scores));
      t.champions = Object.keys(t.scores).filter(id => t.scores[id] === best);
    }
  }
  broadcast(room);
}

/* ------------------------------------------------------------------ */
function rateLimiter() {
  let tokens = 30, last = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(30, tokens + ((now - last) / 1000) * 12);
    last = now;
    if (tokens < 1) return false;
    tokens--;
    return true;
  };
}

io.on('connection', socket => {
  const allow = rateLimiter();
  const me = () => socket.data.pid;

  function on(event, fn) {
    socket.on(event, (data, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!allow()) return ack({ ok: false, error: 'Za dużo żądań — zwolnij trochę.' });
      if (event !== 'hello' && !me()) return ack({ ok: false, error: 'Brak sesji — odśwież aplikację.' });
      try { ack(fn(data && typeof data === 'object' ? data : {}) || { ok: true }); }
      catch (e) { console.error(`[${event}]`, e); ack({ ok: false, error: 'Błąd serwera. Spróbuj ponownie.' }); }
    });
  }
  function myRoom() { return me() ? roomOf(me()) : null; }
  function needHost(room) { return room && room.hostId === me(); }

  on('hello', d => {
    const name = cleanName(d.name);
    const avatar = cleanAvatar(d.avatar);
    let id = d.playerId, token = null;
    if (!store.auth(d.playerId, d.token)) { const ident = store.createIdentity(name, avatar); id = ident.id; token = ident.token; }
    const old = sockets.get(id);
    if (old && old !== socket) { old.emit('session:replaced'); old.data.pid = null; old.disconnect(true); }
    socket.data.pid = id;
    sockets.set(id, socket);
    store.updateProfile(id, name, avatar);
    const room = roomOf(id);
    if (room) {
      const p = room.players.get(id);
      p.connected = true; p.dcAt = null;
      if (!gameActive(room)) { p.avatar = avatar; }
      broadcast(room);
    }
    return { ok: true, playerId: id, token, roomCode: room ? room.code : null, stats: store.statsOf(id) };
  });

  on('profile:update', d => {
    const name = cleanName(d.name), avatar = cleanAvatar(d.avatar);
    store.updateProfile(me(), name, avatar);
    const room = myRoom();
    if (room && !room.game) {
      const p = room.players.get(me());
      p.name = uniqueName(room, name, me()); p.avatar = avatar;
      broadcast(room);
    }
    return { ok: true };
  });

  on('room:create', d => {
    if (myRoom()) leaveRoom(me());
    const code = newCode();
    const room = {
      code, hostId: me(), players: new Map(), settings: E.sanitizeSettings(d.settings), game: null,
      used: [], kicked: new Set(), tournament: null, createdAt: Date.now(), bcScheduled: false
    };
    room.players.set(me(), { id: me(), name: cleanName(d.name), avatar: cleanAvatar(d.avatar), ready: true, connected: true, dcAt: null });
    rooms.set(code, room);
    playerRoom.set(me(), code);
    broadcast(room);
    return { ok: true, code };
  });

  on('room:join', d => {
    const code = String(d.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    const room = rooms.get(code);
    if (!room) return { ok: false, error: 'Nie znaleziono pokoju o tym kodzie.' };
    if (room.players.has(me())) { broadcast(room); return { ok: true, code }; }
    if (room.kicked.has(me())) return { ok: false, error: 'Host usunął cię z tego pokoju.' };
    if (room.game) return { ok: false, error: 'W tym pokoju trwa gra. Poczekaj, aż wrócą do lobby.' };
    if (room.players.size >= room.settings.maxPlayers) return { ok: false, error: 'Pokój jest pełny.' };
    if (myRoom()) leaveRoom(me());
    const name = uniqueName(room, cleanName(d.name), me());
    room.players.set(me(), { id: me(), name, avatar: cleanAvatar(d.avatar), ready: false, connected: true, dcAt: null });
    playerRoom.set(me(), code);
    toastRoom(room, `${name} dołączył(a) do pokoju.`, 'join');
    broadcast(room);
    return { ok: true, code };
  });

  on('room:leave', d => { leaveRoom(me(), d.newHostId); return { ok: true }; });

  on('room:ready', d => {
    const room = myRoom();
    if (!room || room.game) return { ok: false, error: 'Teraz nie można zmienić gotowości.' };
    room.players.get(me()).ready = !!d.ready || room.hostId === me();
    broadcast(room);
    return { ok: true };
  });

  on('room:settings', d => {
    const room = myRoom();
    if (!needHost(room)) return { ok: false, error: 'Tylko host może zmieniać ustawienia.' };
    if (room.game) return { ok: false, error: 'Ustawienia można zmieniać tylko w lobby.' };
    const s = E.sanitizeSettings(d.settings || {}, room.settings);
    s.maxPlayers = Math.max(s.maxPlayers, room.players.size);
    if (!s.tournament || s.tournamentGames !== room.settings.tournamentGames) room.tournament = null;
    room.settings = s;
    broadcast(room);
    return { ok: true };
  });

  on('room:kick', d => {
    const room = myRoom();
    if (!needHost(room)) return { ok: false, error: 'Tylko host może usuwać graczy.' };
    if (room.game) return { ok: false, error: 'Graczy można usuwać tylko w lobby.' };
    if (d.playerId === me() || !room.players.has(d.playerId)) return { ok: false, error: 'Nieprawidłowy gracz.' };
    const name = room.players.get(d.playerId).name;
    room.kicked.add(d.playerId);
    room.players.delete(d.playerId);
    playerRoom.delete(d.playerId);
    const s = sockets.get(d.playerId);
    if (s) s.emit('room:kicked', { code: room.code });
    toastRoom(room, `${name} został(a) usunięty(a) z pokoju.`);
    broadcast(room);
    return { ok: true };
  });

  on('room:transferHost', d => {
    const room = myRoom();
    if (!needHost(room)) return { ok: false, error: 'Tylko host może przekazać hostowanie.' };
    if (!room.players.has(d.playerId) || d.playerId === me()) return { ok: false, error: 'Nieprawidłowy gracz.' };
    setHost(room, d.playerId, true);
    broadcast(room);
    return { ok: true };
  });

  on('room:start', () => {
    const room = myRoom();
    if (!needHost(room)) return { ok: false, error: 'Tylko host może rozpocząć grę.' };
    if (room.game) return { ok: false, error: 'Gra już trwa.' };
    const players = [...room.players.values()].filter(p => p.connected);
    const min = E.minPlayersFor(room.settings.mode);
    if (players.length < min) return { ok: false, error: `Potrzeba co najmniej ${min} graczy online.` };
    if (players.some(p => !p.ready && p.id !== room.hostId)) return { ok: false, error: 'Nie wszyscy gracze są gotowi.' };
    // gracze rozłączeni w lobby nie biorą udziału w tej rundzie
    for (const p of [...room.players.values()]) if (!p.connected) { room.players.delete(p.id); playerRoom.delete(p.id); }
    if (room.settings.tournament) {
      if (!room.tournament || room.tournament.finished) {
        room.tournament = { total: room.settings.tournamentGames, gameNo: 0, scores: {}, names: {}, results: [], finished: false, champions: [] };
      }
      room.tournament.gameNo++;
    } else room.tournament = null;
    const game = new E.GameCore({
      players: players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
      settings: room.settings,
      used: room.used,
      options: {
        manual: false, revealTimeout: REVEAL_MS, voteTimeout: VOTE_MS, guessTimeout: GUESS_MS,
        onChange: () => broadcast(room), onEnd: r => onGameEnd(room, r)
      }
    });
    room.used.push(game.word.word);
    if (room.used.length > 150) room.used.shift();
    room.game = game;
    for (const p of room.players.values()) p.ready = p.id === room.hostId;
    game.start();
    return { ok: true };
  });

  const gameCall = fn => d => {
    const room = myRoom();
    if (!room || !room.game) return { ok: false, error: 'Gra nie trwa.' };
    return fn(room.game, d, room);
  };
  on('game:confirmReveal', gameCall(g => g.confirmReveal(me())));
  on('game:answer', gameCall((g, d) => g.submitAnswer(me(), d.text)));
  on('game:detect', gameCall((g, d) => g.detectPlayer(me(), String(d.targetId || ''))));
  on('game:vote', gameCall((g, d) => g.vote(me(), String(d.targetId || ''))));
  on('game:guess', gameCall((g, d) => g.submitGuess(me(), d.text)));

  on('room:playAgain', () => {
    const room = myRoom();
    if (!needHost(room)) return { ok: false, error: 'Tylko host może rozpocząć kolejną grę.' };
    if (!room.game || room.game.phase !== 'results') return { ok: false, error: 'Gra jeszcze się nie skończyła.' };
    room.game.destroy();
    room.game = null;
    if (room.tournament && room.tournament.finished) room.tournament = null;
    for (const p of room.players.values()) p.ready = p.id === room.hostId;
    broadcast(room);
    return { ok: true };
  });

  on('stats:get', () => ({ ok: true, stats: store.statsOf(me()) }));
  on('ranking:get', () => Object.assign({ ok: true }, store.ranking(me(), 100)));

  socket.on('disconnect', () => {
    const pid = me();
    if (!pid || sockets.get(pid) !== socket) return;
    sockets.delete(pid);
    const room = roomOf(pid);
    if (room && room.players.has(pid)) {
      const p = room.players.get(pid);
      p.connected = false; p.dcAt = Date.now();
      broadcast(room);
    }
  });
});

/* Sprzątanie: przekazanie hosta, usuwanie rozłączonych z lobby, kasowanie pustych pokoi */
setInterval(() => {
  const now = Date.now();
  for (const room of [...rooms.values()]) {
    const list = [...room.players.values()];
    const connected = list.filter(p => p.connected);
    if (!connected.length) {
      room.emptySince = room.emptySince || now;
      if (now - room.emptySince > EMPTY_ROOM_MS) destroyRoom(room);
      continue;
    }
    room.emptySince = null;
    const host = room.players.get(room.hostId);
    if (host && !host.connected && now - host.dcAt > HOST_GRACE_MS) { setHost(room, connected[0].id, true); broadcast(room); }
    if (!gameActive(room)) {
      for (const p of list) if (!p.connected && now - p.dcAt > LOBBY_DROP_MS) leaveRoom(p.id);
    }
  }
}, 5000);

if (require.main === module) {
  server.listen(PORT, () => console.log(`IMPOSTOR działa na http://localhost:${PORT}`));
}
module.exports = { server, io, rooms };
