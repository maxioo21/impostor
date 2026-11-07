/* IMPOSTOR – efekty dźwiękowe syntetyzowane w Web Audio (bez plików). */
let ctx = null;
let master = null;
let enabled = true;
try { const p = JSON.parse(localStorage.getItem('imp.prefs') || '{}'); enabled = p.sound !== false; } catch { /* */ }

export function setSoundEnabled(v) { enabled = !!v; }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { if (enabled) ac(); }, { once: true, passive: true }));

function tone(freq, start, dur, { type = 'sine', vol = 0.3, slide = 0, attack = 0.005 } = {}) {
  const c = ctx;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function noise(start, dur, { vol = 0.2, freq = 1200, q = 0.8, type = 'bandpass', sweep = 0 } = {}) {
  const c = ctx;
  const t = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const SOUNDS = {
  click() { tone(720, 0, 0.06, { type: 'triangle', vol: 0.12, slide: 1.3 }); },
  tick() { tone(1250, 0, 0.05, { type: 'square', vol: 0.06 }); },
  join() { tone(660, 0, 0.12, { vol: 0.2 }); tone(990, 0.08, 0.18, { vol: 0.2 }); },
  submit() { tone(520, 0, 0.1, { type: 'triangle', vol: 0.25 }); tone(780, 0.07, 0.16, { type: 'triangle', vol: 0.25 }); },
  turn() { tone(880, 0, 0.12, { vol: 0.25 }); tone(1320, 0.1, 0.22, { vol: 0.22 }); },
  whoosh() { noise(0, 0.5, { vol: 0.25, freq: 300, sweep: 8, q: 1.2 }); },
  shuffle() { for (let i = 0; i < 8; i++) tone(400 + Math.random() * 600, i * 0.08, 0.06, { type: 'square', vol: 0.05 }); },
  reveal() { noise(0, 0.4, { vol: 0.18, freq: 2000, sweep: 0.3 }); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12 + i * 0.07, 0.35, { type: 'triangle', vol: 0.18 })); },
  impostor() { tone(110, 0, 0.9, { type: 'sawtooth', vol: 0.18, slide: 0.7 }); tone(165, 0.05, 0.9, { type: 'sawtooth', vol: 0.12, slide: 0.7 }); noise(0, 0.6, { vol: 0.15, freq: 200, type: 'lowpass' }); },
  vote() { tone(200, 0, 0.18, { type: 'square', vol: 0.15, slide: 0.5 }); noise(0, 0.12, { vol: 0.2, freq: 900 }); },
  drum() { for (let i = 0; i < 18; i++) noise(i * 0.06, 0.08, { vol: 0.08 + i * 0.008, freq: 180, type: 'lowpass' }); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.45, { type: 'triangle', vol: 0.2 })); tone(1568, 0.6, 0.8, { vol: 0.12 }); },
  lose() { [440, 392, 349, 262].forEach((f, i) => tone(f, i * 0.16, 0.42, { type: 'sawtooth', vol: 0.1 })); },
  error() { tone(180, 0, 0.18, { type: 'square', vol: 0.12 }); tone(140, 0.12, 0.2, { type: 'square', vol: 0.12 }); },
  start() { [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.3, { type: 'triangle', vol: 0.18 })); }
};

export function sfx(name) {
  if (!enabled) return;
  try { if (!ac()) return; const f = SOUNDS[name]; if (f) f(); } catch { /* audio niedostępne */ }
}
