/*
 * Trwałe przechowywanie profili graczy i statystyk (plik JSON, zapis atomowy).
 * Tokeny są przechowywane wyłącznie jako skrót SHA-256.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'db.json');
let db = { profiles: {} };
let saveTimer = null;

function load() {
  try {
    if (fs.existsSync(FILE)) db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (!db.profiles) db.profiles = {};
  } catch (e) {
    console.error('[store] Nie udało się wczytać bazy, zaczynam od nowa:', e.message);
    db = { profiles: {} };
  }
}
function saveNow() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, FILE);
  } catch (e) { console.error('[store] Błąd zapisu:', e.message); }
}
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveNow(); }, 1000);
}

const hash = t => crypto.createHash('sha256').update(String(t)).digest('hex');

function emptyStats() {
  return { games: 0, wins: 0, losses: 0, impostorGames: 0, impostorWins: 0, detections: 0, streak: 0, bestStreak: 0, jesterWins: 0 };
}

function createIdentity(name, avatar) {
  const id = 'u_' + crypto.randomBytes(9).toString('base64url');
  const token = crypto.randomBytes(24).toString('base64url');
  db.profiles[id] = { tokenHash: hash(token), name, avatar, stats: emptyStats(), createdAt: Date.now(), lastSeen: Date.now() };
  save();
  return { id, token };
}

function auth(id, token) {
  if (typeof id !== 'string' || typeof token !== 'string') return null;
  const p = db.profiles[id];
  if (!p) return null;
  const a = Buffer.from(p.tokenHash, 'hex');
  const b = Buffer.from(hash(token), 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return p;
}

function updateProfile(id, name, avatar) {
  const p = db.profiles[id];
  if (!p) return;
  p.name = name; p.avatar = avatar; p.lastSeen = Date.now();
  save();
}

function points(s) { return s.wins * 10 + s.detections * 5 + s.impostorWins * 5 + s.jesterWins * 5; }

function statsOf(id) {
  const p = db.profiles[id];
  if (!p) return null;
  const s = p.stats;
  return Object.assign({}, s, { points: points(s), winrate: s.games ? Math.round((s.wins / s.games) * 100) : 0 });
}

function recordGame(r) {
  for (const pl of r.players) {
    const p = db.profiles[pl.id];
    if (!p) continue;
    const s = p.stats;
    const won = r.winners.includes(pl.id);
    s.games++;
    if (won) { s.wins++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); }
    else { s.losses++; s.streak = 0; }
    if (pl.team === 'impostors') { s.impostorGames++; if (won) s.impostorWins++; }
    if (r.correctVoters.includes(pl.id)) s.detections++;
    if (pl.role === 'jester' && won) s.jesterWins++;
  }
  save();
}

function ranking(meId, limit) {
  const list = Object.entries(db.profiles)
    .filter(([, p]) => p.stats.games > 0)
    .map(([id, p]) => Object.assign({ id, name: p.name, avatar: p.avatar }, statsOf(id)))
    .sort((a, b) => b.points - a.points || b.winrate - a.winrate || b.games - a.games);
  const myRank = list.findIndex(x => x.id === meId);
  return { list: list.slice(0, limit || 100), myRank: myRank >= 0 ? myRank + 1 : null, total: list.length };
}

load();
process.on('SIGINT', () => { saveNow(); process.exit(0); });
process.on('SIGTERM', () => { saveNow(); process.exit(0); });

module.exports = { createIdentity, auth, updateProfile, statsOf, recordGame, ranking, saveNow };
