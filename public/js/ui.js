/* IMPOSTOR – komponenty interfejsu (ikony, awatary, panele, plansze, wyniki). */
import { esc, store } from './core.js';

const E = window.ImpostorEngine;
const W = window.ImpostorWords;

/* ---------- ikony (SVG, styl liniowy) ---------- */
const P = {
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.2-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  crown: '<path d="m2 6 4 11h12l4-11-6 5-4-7-4 7z"/><path d="M6 21h12"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61M2 2l20 20"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  volumeX: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 18h.01"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bulb: '<path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  userMinus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM20 17v5H6.5A2.5 2.5 0 0 1 4 19.5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
  shuffle: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22M18 2l4 4-4 4M2 6h1.9c1.5 0 2.9.9 3.6 2.2M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8M18 14l4 4-4 4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  more: '<circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>',
  fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4M14 13.12c0 2.38 0 6.38-1 8.88M17.29 21.02c.12-.6.43-2.3.5-3.02M2 12a10 10 0 0 1 18-6M2 16h.01M21.8 16c.2-2 .131-5.354 0-6M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2M8.65 22c.21-.66.45-1.32.57-2M9 6.8a6 6 0 0 1 9 5.2v2"/>',
  layers: '<path d="m12 2 10 6-10 6L2 8z"/><path d="m2 16 10 6 10-6M2 12l10 6 10-6"/>',
  vote: '<path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7z"/><path d="M22 19H2"/>',
  wifiOff: '<path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76M16.85 11.25a10 10 0 0 1 2.22 1.68M5 13a10 10 0 0 1 5.24-2.76M12 20h.01"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  vibrate: '<rect x="7" y="4" width="10" height="16" rx="2"/><path d="m2 8 2 2-2 2 2 2M22 8l-2 2 2 2-2 2"/>'
};
export function icon(name, cls) {
  return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

/* ---------- awatary ---------- */
const AV_EMOJI = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐲', '👽', '🤖', '👻', '🎃', '🦉', '🐺', '🐨', '🐵', '🦖', '🐧', '🦋', '🐝', '🍄', '🌵', '🔥', '⚡', '🌙', '⭐', '💎', '🎩', '👑', '🧠', '🍕', '🎲'];
const AV_GRAD = [['#a855f7', '#6d28d9'], ['#f43f5e', '#9f1239'], ['#22d3ee', '#1d4ed8'], ['#f59e0b', '#c2410c'], ['#34d399', '#047857'], ['#ec4899', '#7e22ce'], ['#818cf8', '#3730a3'], ['#fb7185', '#ea580c']];
export const AVATAR_COUNT = AV_EMOJI.length;
export function avatar(i, size, opts) {
  i = ((parseInt(i, 10) || 0) % AVATAR_COUNT + AVATAR_COUNT) % AVATAR_COUNT;
  const g = AV_GRAD[(i * 3) % AV_GRAD.length];
  const o = opts || {};
  const dot = o.dot != null ? `<span class="dot ${o.dot ? '' : 'off'}"></span>` : '';
  return `<div class="av ${size || 'md'} ${o.off ? 'off' : ''}" style="--a1:${g[0]};--a2:${g[1]}">${AV_EMOJI[i]}${dot}</div>`;
}

export const botBadge = p => (p && p.bot ? '<span class="badge bot">🤖 bot</span>' : '');

export function logoMark() {
  return `<svg class="logo-mark" viewBox="0 0 128 128" aria-hidden="true">
    <defs>
      <linearGradient id="lgm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c084fc"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#ef4444"/></linearGradient>
      <radialGradient id="lgs" cx=".35" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <path d="M64 10c-26 0-42 17-42 44 0 27 18 52 42 62 24-10 42-35 42-62 0-27-16-44-42-44z" fill="url(#lgm)"/>
    <path d="M64 10c-26 0-42 17-42 44 0 27 18 52 42 62 24-10 42-35 42-62 0-27-16-44-42-44z" fill="url(#lgs)"/>
    <g class="eyes"><path d="M34 58c9-8 20-8 27 2-8 7-19 7-27-2zM94 58c-9-8-20-8-27 2 8 7 19 7 27-2z" fill="#07060f"/>
    <circle cx="48" cy="59" r="2.6" fill="#ff4d5e"/><circle cx="80" cy="59" r="2.6" fill="#ff4d5e"/></g>
    <path d="M52 88c8 4 16 4 24 0" stroke="#07060f" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>
  </svg>`;
}

/* ---------- licznik ---------- */
export function timer(deadline, totalMs, o) {
  o = o || {};
  if (!deadline) return `<div class="timer ${o.size || ''}"><svg viewBox="0 0 74 74"><circle class="ring-bg" cx="37" cy="37" r="32" pathLength="100"/></svg><span class="timer-num">${Math.round(totalMs / 1000)}</span></div>`;
  return `<div class="timer ${o.size || ''}" data-deadline="${deadline}" data-total="${totalMs}" ${o.tick ? `data-tick="${o.tick}"` : ''} ${o.local ? 'data-clock="local"' : ''}>
    <svg viewBox="0 0 74 74"><circle class="ring-bg" cx="37" cy="37" r="32" pathLength="100"/><circle class="ring-fg" cx="37" cy="37" r="32" pathLength="100"/></svg>
    <span class="timer-num">${Math.round(totalMs / 1000)}</span></div>`;
}
export function timerBar(deadline, totalMs, o) {
  o = o || {};
  if (!deadline) return '';
  return `<div data-deadline="${deadline}" data-total="${totalMs}" ${o.local ? 'data-clock="local"' : ''}><div class="timer-bar"><i></i></div></div>`;
}

export function progressDots(total, done, cur) {
  let s = '';
  for (let i = 0; i < total; i++) s += `<i class="${i < done ? 'done' : ''} ${i === cur ? 'cur' : ''}"></i>`;
  return `<div class="progress-dots">${s}</div>`;
}

/* ---------- ustawienia gry ---------- */
export function customSets() { return store.get('customSets', []); }

export function settingsPanel(s, o) {
  const ctx = o.ctx;
  const ed = !!o.editable;
  const dis = ed ? '' : 'disabled';
  const opt = (key, val, label, active) => `<button ${dis} class="${active ? 'active' : ''}" data-action="opt" data-ctx="${ctx}" data-key="${key}" data-val="${esc(String(val))}">${label}</button>`;
  const n = o.playerCount;
  const maxImp = E.maxImpostors(n, s.mode);
  const imps = Math.min(s.impostors, maxImp);
  const modes = Object.entries(E.MODES).map(([k, m]) =>
    `<button ${dis} class="mode-card ${s.mode === k ? 'active' : ''}" data-action="opt" data-ctx="${ctx}" data-key="mode" data-val="${k}">
      <span class="mi">${m.icon}</span><span class="mn">${m.name}</span><span class="md">${m.desc}</span></button>`).join('');
  const cats = [['random', '🎲', 'Losowa']].concat(Object.entries(W.CATEGORIES).map(([k, c]) => [k, c.icon, c.name]));
  let catHtml = cats.map(([k, ic, nm]) => `<button ${dis} class="cat-chip ${s.category === k ? 'active' : ''}" data-action="opt" data-ctx="${ctx}" data-key="category" data-val="${k}"><span class="ce">${ic}</span><span class="ellipsis">${esc(nm)}</span></button>`).join('');
  const sets = customSets();
  const activeCustomName = s.category === 'custom' && s.custom ? s.custom.name : null;
  catHtml += sets.map(cs => `<button ${dis} class="cat-chip ${activeCustomName === cs.name ? 'active' : ''}" data-action="optCustom" data-ctx="${ctx}" data-id="${esc(cs.id)}"><span class="ce">✏️</span><span class="ellipsis">${esc(cs.name)}</span></button>`).join('');
  if (s.category === 'custom' && s.custom && !sets.some(cs => cs.name === activeCustomName)) {
    catHtml += `<button disabled class="cat-chip active"><span class="ce">✏️</span><span class="ellipsis">${esc(s.custom.name)}</span></button>`;
  }
  if (ed) catHtml += `<button class="cat-chip" data-action="openWordSets"><span class="ce">➕</span><span>Własne słowa</span></button>`;

  const playersRow = ctx === 'local'
    ? `<div class="opt-row"><div class="lbl">Liczba graczy<small>Od 3 do 20 osób</small></div>
        <div class="stepper"><button data-action="lpCount" data-delta="-1" ${n <= 3 ? 'disabled' : ''} aria-label="Mniej">${icon('minus', 'sm')}</button><span class="val">${n}</span><button data-action="lpCount" data-delta="1" ${n >= 20 ? 'disabled' : ''} aria-label="Więcej">${icon('plus', 'sm')}</button></div></div>`
    : `<div class="opt-row"><div class="lbl">Maks. liczba graczy<small>W pokoju: ${o.inRoom || 1}</small></div>
        <div class="stepper"><button ${dis} data-action="optStep" data-ctx="${ctx}" data-key="maxPlayers" data-delta="-1" ${s.maxPlayers <= Math.max(3, o.inRoom || 3) ? 'disabled' : ''}>${icon('minus', 'sm')}</button><span class="val">${s.maxPlayers}</span><button ${dis} data-action="optStep" data-ctx="${ctx}" data-key="maxPlayers" data-delta="1" ${s.maxPlayers >= 20 ? 'disabled' : ''}>${icon('plus', 'sm')}</button></div></div>`;

  return `
  <div class="opt-block"><div class="lbl">Tryb gry</div><div class="mode-grid">${modes}</div>
    ${s.mode === 'chaos' ? `<div class="small muted">Tryb Chaos wymaga min. 4 graczy (Impostor, Detektyw, Błazen i gracze).</div>` : ''}</div>
  <div class="opt-row"><div class="lbl">Liczba rund<small>Ile razy każdy wpisze skojarzenie (1–${E.MAX_ROUNDS})</small></div>
    <div class="stepper"><button ${dis} data-action="optStep" data-ctx="${ctx}" data-key="rounds" data-delta="-1" ${s.rounds <= 1 ? 'disabled' : ''} aria-label="Mniej rund">${icon('minus', 'sm')}</button><span class="val">${s.rounds}</span><button ${dis} data-action="optStep" data-ctx="${ctx}" data-key="rounds" data-delta="1" ${s.rounds >= E.MAX_ROUNDS ? 'disabled' : ''} aria-label="Więcej rund">${icon('plus', 'sm')}</button></div></div>
  ${o.hasBots ? `<div class="opt-block"><div class="lbl">Poziom botów</div><div class="seg">${[['easy', 'Łatwe'], ['medium', 'Średnie'], ['hard', 'Trudne']].map(([k, v]) => opt('botLevel', k, v, (s.botLevel || 'medium') === k)).join('')}</div></div>` : ''}
  ${playersRow}
  <div class="opt-row"><div class="lbl">Liczba Impostorów<small>Maks. ${maxImp} przy ${n} graczach</small></div>
    <div class="stepper"><button ${dis} data-action="optStep" data-ctx="${ctx}" data-key="impostors" data-delta="-1" ${imps <= 1 ? 'disabled' : ''}>${icon('minus', 'sm')}</button><span class="val">${imps}</span><button ${dis} data-action="optStep" data-ctx="${ctx}" data-key="impostors" data-delta="1" ${imps >= maxImp ? 'disabled' : ''}>${icon('plus', 'sm')}</button></div></div>
  <div class="opt-block"><div class="lbl">Czas na odpowiedź</div><div class="seg red">${E.ANSWER_TIMES.map(t => opt('answerTime', t, t + 's', s.answerTime === t)).join('')}</div></div>
  <div class="opt-block"><div class="lbl">Kategoria słów</div><div class="cat-grid">${catHtml}</div></div>
  <div class="opt-block"><div class="lbl">Poziom trudności</div><div class="seg">${Object.entries(W.DIFFICULTIES).map(([k, v]) => `<button ${dis || (s.category === 'custom' ? 'disabled' : '')} class="${s.difficulty === k ? 'active' : ''}" data-action="opt" data-ctx="${ctx}" data-key="difficulty" data-val="${k}">${v}</button>`).join('')}</div></div>
  <div class="opt-row"><div class="lbl">Podpowiedź dla Impostora<small>Kategoria i luźna wskazówka</small></div>
    <button ${dis} class="switch ${s.impostorHint ? 'on' : ''}" data-action="optToggle" data-ctx="${ctx}" data-key="impostorHint" aria-label="Podpowiedź"></button></div>
  <div class="opt-row"><div class="lbl">Tryb turniejowy<small>Seria gier z punktacją</small></div>
    <button ${dis} class="switch ${s.tournament ? 'on' : ''}" data-action="optToggle" data-ctx="${ctx}" data-key="tournament" aria-label="Turniej"></button></div>
  ${s.tournament ? `<div class="opt-block"><div class="lbl">Liczba gier w turnieju</div><div class="seg">${[3, 5, 7].map(g => opt('tournamentGames', g, g + ' gry', s.tournamentGames === g).replace('7 gry', '7 gier').replace('5 gry', '5 gier')).join('')}</div></div>` : ''}`;
}

export function settingsSummary(s, playerCount, hasBots) {
  const m = E.MODES[s.mode];
  const imps = Math.min(s.impostors, E.maxImpostors(Math.max(3, playerCount), s.mode));
  const cat = s.categoryLabel || E.categoryLabel(s);
  return `<div class="chips">
    <span class="chip">${m.icon} ${m.name}</span>
    <span class="chip red">${icon('users')} ${imps} ${imps === 1 ? 'Impostor' : 'Impostorów'}</span>
    <span class="chip">${icon('refresh')} ${s.rounds} ${s.rounds === 1 ? 'runda' : s.rounds < 5 ? 'rundy' : 'rund'}</span>
    ${hasBots ? `<span class="chip">🤖 Boty: ${{ easy: 'łatwe', medium: 'średnie', hard: 'trudne' }[s.botLevel || 'medium']}</span>` : ''}
    <span class="chip">${icon('clock')} ${s.answerTime}s</span>
    <span class="chip">${icon('layers')} ${esc(cat)}</span>
    ${s.category !== 'custom' ? `<span class="chip">${icon('flame')} ${W.DIFFICULTIES[s.difficulty]}</span>` : ''}
    <span class="chip">${icon('bulb')} Podpowiedź: ${s.impostorHint ? 'tak' : 'nie'}</span>
    ${s.tournament ? `<span class="chip red">${icon('trophy')} Turniej: ${s.tournamentGames} gier</span>` : ''}
  </div>`;
}

/* ---------- karta roli ---------- */
function roleBack(v, nameOf) {
  if (!v) return '<div class="role-face role-back civ"><div class="role-desc">Brak roli</div></div>';
  const cat = v.category ? `<span class="chip">${icon('layers')} ${esc(v.category)}</span>` : '';
  const hint = (v.kind === 'impostor' || v.kind === 'mrwhite') && (v.category || v.clue)
    ? `<div class="role-hint">💡 Podpowiedź: ${v.category ? `kategoria <b>${esc(v.category)}</b>` : ''}${v.clue ? ` · <b>${esc(v.clue)}</b>` : ''}</div>` : '';
  switch (v.kind) {
    case 'impostor':
      return `<div class="role-face role-back imp">
        <div class="role-emoji">🎭</div><div class="role-kicker">Twoja rola</div><div class="role-title">Impostor</div>
        <div class="role-desc">Nie znasz tajnego słowa. Słuchaj skojarzeń innych, wtop się w tłum i nie daj się złapać!</div>
        ${hint}
        ${v.partners && v.partners.length ? `<div class="role-hint">Pozostali Impostorzy: <b>${v.partners.map(id => esc(nameOf(id))).join(', ')}</b></div>` : ''}
      </div>`;
    case 'mrwhite':
      return `<div class="role-face role-back white">
        <div class="role-emoji">👻</div><div class="role-kicker">Twoja rola</div><div class="role-title">Mr. White</div>
        <div class="role-desc">Nie dostajesz żadnego słowa. Odgadnij je ze skojarzeń pozostałych graczy i nie daj się zdemaskować.</div>
        ${hint}
      </div>`;
    case 'detective':
      return `<div class="role-face role-back det">
        <div class="role-emoji">🕵️</div><div class="role-title">Detektyw</div>
        <div class="role-kicker">Tajne słowo</div><div class="role-word">${esc(v.word)}</div>${cat}
        <div class="role-desc">Możesz raz sprawdzić, czy wybrany gracz jest Impostorem.</div>
      </div>`;
    case 'jester':
      return `<div class="role-face role-back jest">
        <div class="role-emoji">🃏</div><div class="role-title">Błazen</div>
        <div class="role-kicker">Tajne słowo</div><div class="role-word">${esc(v.word)}</div>${cat}
        <div class="role-desc">Wygrywasz sam, jeśli gracze zagłosują na ciebie. Bądź podejrzany!</div>
      </div>`;
    default:
      return `<div class="role-face role-back civ">
        <div class="role-kicker">Twoje tajne słowo</div>
        <div class="role-word">${esc(v.word)}</div>${cat}
        <div class="role-desc">Wpisuj skojarzenia, które udowodnią, że znasz słowo — ale nie zdradzaj go Impostorowi!</div>
      </div>`;
  }
}
export function roleCard(v, o) {
  o = o || {};
  return `<div class="role-stage"><div class="role-card ${o.flipped ? 'flipped' : ''}" id="role-card" ${o.flipped ? '' : `data-action="${o.flipAction || 'flipCard'}"`} data-silent="1">
    <div class="role-face role-front">
      ${icon('fingerprint', 'fp')}
      <div class="shuffle-text" id="shuffle-text">???</div>
      <div class="tap">Dotknij, aby odkryć rolę</div>
      <div class="small muted">Upewnij się, że nikt nie patrzy</div>
    </div>
    ${roleBack(v, o.nameOf || (() => '?'))}
  </div></div>`;
}

/** Animacja losowania i odwrócenia karty. */
export function flipCardAnim(onDone, sfx) {
  const card = document.getElementById('role-card');
  if (!card || card.classList.contains('shuffling') || card.classList.contains('flipped')) return;
  card.classList.add('shuffling');
  card.removeAttribute('data-action');
  sfx('shuffle');
  const txt = document.getElementById('shuffle-text');
  const pool = ['IMPOSTOR', '???', 'GRACZ', '🎭', 'SŁOWO', '👻', '🕵️', '🃏', 'KTO?'];
  let i = 0;
  const iv = setInterval(() => { if (txt) txt.textContent = pool[i++ % pool.length]; }, 90);
  setTimeout(() => {
    clearInterval(iv);
    card.classList.remove('shuffling');
    card.classList.add('flipped');
    onDone && onDone();
  }, 1100);
}

/* ---------- detektyw ---------- */
export function detectivePanel(v, players, meId, action) {
  if (!v || v.kind !== 'detective') return '';
  if (v.detectResult) {
    const p = players.find(x => x.id === v.detectResult.targetId);
    return `<div class="card tight ${v.detectResult.isImpostor ? 'glow-red' : 'glow'}"><div class="row">${icon('search')}<div class="grow"><b>${esc(p ? p.name : '?')}</b> ${v.detectResult.isImpostor ? '<span class="badge red">jest Impostorem!</span>' : '<span class="badge ready">nie jest Impostorem</span>'}</div></div></div>`;
  }
  if (!v.canDetect) return '';
  return `<div class="card tight glow"><div class="card-title">${icon('search')} Śledztwo Detektywa</div>
    <div class="small muted" style="margin-bottom:10px">Wybierz jedną osobę do sprawdzenia (tylko raz w grze).</div>
    <div class="chips">${players.filter(p => p.id !== meId && !p.left).map(p => `<button class="chip" data-action="${action}" data-id="${esc(p.id)}">${avatar(p.avatar, 'xs')} ${esc(p.name)}</button>`).join('')}</div></div>`;
}

/* ---------- tablica skojarzeń ---------- */
export function board(g, o) {
  o = o || {};
  const byPlayer = {};
  for (const a of g.answers) (byPlayer[a.playerId] = byPlayer[a.playerId] || []).push(a);
  const players = g.order.map(id => g.players.find(p => p.id === id)).filter(Boolean);
  const rows = players.map(p => {
    const ans = byPlayer[p.id] || [];
    const isTurn = g.phase === 'answers' && g.currentPlayerId === p.id;
    const answeredNow = ans.some(a => a.round === g.round);
    let chips = '';
    for (let r = 1; r <= g.rounds; r++) {
      const a = ans.find(x => x.round === r);
      if (a) chips += a.timedOut ? `<span class="ans timeout"><span class="rn">R${r}</span>${a.left ? 'wyszedł' : 'brak'}</span>` : `<span class="ans"><span class="rn">R${r}</span>${esc(a.text)}</span>`;
      else if (isTurn && r === g.round) chips += `<span class="ans typing"><span class="rn">R${r}</span>${g.waiting ? 'czeka' : 'pisze'}</span>`;
      else if (r <= g.round || o.showAll) chips += `<span class="ans empty"><span class="rn">R${r}</span>—</span>`;
    }
    return `<div class="brow ${isTurn ? 'turn' : ''} ${p.left ? 'left' : ''}">
      ${avatar(p.avatar, 'sm', { off: p.left || (o.offline && o.offline.has(p.id)) })}
      <div style="min-width:0"><div class="bname"><span class="ellipsis">${esc(p.name)}</span>${botBadge(p)}${p.id === o.meId ? '<span class="badge me">ty</span>' : ''}${g.phase === 'answers' && answeredNow ? icon('check', 'xs check-ic') : ''}</div>
      <div class="answers-line">${chips || '<span class="ans empty">—</span>'}</div></div>
    </div>`;
  }).join('');
  return `<div class="board">${rows}</div>`;
}

export function turnHeader(g, o) {
  const cur = g.players.find(p => p.id === g.currentPlayerId);
  const mine = o.mine;
  const order = g.order;
  const pos = order.indexOf(g.currentPlayerId);
  return `<div class="card tight turn-card ${mine ? 'mine' : ''}">
    ${cur ? `<div class="av-ring">${avatar(cur.avatar, 'md')}</div>` : ''}
    <div class="tc-info">
      <div class="row" style="gap:8px;margin-bottom:4px"><span class="round-pill">${icon('refresh', 'xs')} Runda ${g.round}/${g.rounds}</span></div>
      <div class="tc-who ellipsis">${mine ? 'Twoja kolej!' : `Kolej: ${esc(cur ? cur.name : '?')}${cur && cur.bot ? ' 🤖' : ''}`}</div>
      <div class="tc-sub">Gracz ${pos + 1} z ${order.length}</div>
    </div>
    ${timer(g.deadline, g.answerTime * 1000, { tick: mine ? 'turn-' + g.round + '-' + g.turnPos : null, local: o.local })}
  </div>`;
}

export function peekChip(v) {
  if (!v) return '';
  const label = v.word ? esc(v.word) : (v.kind === 'mrwhite' ? 'Mr. White' : 'Impostor');
  return `<button class="peek" data-action="peek" data-silent="1">${icon('eye', 'sm')} <span>Moja rola:</span> <span class="pv blur" id="peek-val">${label}</span></button>`;
}

/* ---------- głosowanie ---------- */
export function voteGrid(g, o) {
  const byPlayer = {};
  for (const a of g.answers) if (!a.timedOut) (byPlayer[a.playerId] = byPlayer[a.playerId] || []).push(a.text);
  const cands = g.candidates.filter(id => id !== o.meId).map(id => g.players.find(p => p.id === id)).filter(Boolean);
  return `<div class="vote-grid">${cands.map((p, i) => `
    <button class="vote-card ${o.selected === p.id ? 'sel' : ''}" style="animation-delay:${i * 0.04}s" data-action="${o.action}" data-id="${esc(p.id)}" ${o.disabled ? 'disabled' : ''}>
      ${icon('target', 'target-ic')}
      ${avatar(p.avatar, 'lg', { off: p.left })}
      <div class="vn ellipsis">${esc(p.name)}${p.bot ? ' 🤖' : ''}</div>
      <div class="va">${(byPlayer[p.id] || []).map(t => `<span>${esc(t)}</span>`).join('') || '<span>brak odpowiedzi</span>'}</div>
    </button>`).join('')}</div>`;
}
export function votedStrip(g) {
  const voters = g.players.filter(p => !p.left);
  return `<div class="voted-strip">${voters.map(p => {
    const done = g.voted.includes(p.id);
    return `<div class="vs ${done ? '' : 'pending'}" title="${esc(p.name)}">${avatar(p.avatar, 'sm')}${done ? `<span class="ok">${icon('check')}</span>` : ''}</div>`;
  }).join('')}</div>`;
}

/* ---------- przekazanie telefonu ---------- */
export function handoff(o) {
  return `<div class="handoff">
    ${o.dots || ''}
    <div class="kicker">${o.kicker || 'Przekaż telefon'}</div>
    ${icon('phone', 'phone-ic')}
    <div class="av-ring">${avatar(o.avatar, 'xl')}</div>
    <div class="who">${esc(o.name)}</div>
    ${o.text ? `<p>${o.text}</p>` : ''}
    ${o.extra || ''}
    <button class="btn block ${o.red ? 'red' : ''}" data-action="${o.action}">${o.btnIcon ? icon(o.btnIcon) : icon('eye')} ${o.btn}</button>
  </div>`;
}

/* ---------- wyniki ---------- */
export function standings(t, lastPoints) {
  if (!t) return '';
  const rows = Object.keys(t.scores).sort((a, b) => t.scores[b] - t.scores[a]);
  return `<div class="card"><div class="card-title">${icon('trophy')} Turniej — gra ${t.gameNo} z ${t.total}</div>
    ${t.finished ? `<div class="runoff-banner" style="margin-bottom:12px"><div class="kicker">Mistrz turnieju</div><div style="font-family:var(--display);font-size:20px">🏆 ${t.champions.map(id => esc((t.names[id] || {}).name || '?')).join(', ')}</div></div>` : ''}
    <div class="standings">${rows.map((id, i) => {
      const n = t.names[id] || { name: '?', avatar: 0 };
      const d = lastPoints && lastPoints[id] ? `<span class="delta">+${lastPoints[id]}</span>` : '';
      return `<div class="stand-row ${i === 0 ? 'first' : ''}"><span class="pos">${i + 1}</span>${avatar(n.avatar, 'sm')}<span class="grow bold ellipsis">${esc(n.name)}</span>${d}<span class="pts">${t.scores[id]} pkt</span></div>`;
    }).join('')}</div></div>`;
}

export function resultsView(r, o) {
  o = o || {};
  const P2 = id => r.players.find(p => p.id === id) || { name: '?', avatar: 0 };
  const imps = r.players.filter(p => p.team === 'impostors');
  const heroCls = r.winner === 'civilians' ? 'civ' : r.winner === 'jester' ? 'jest' : 'imp';
  const heroEmoji = r.winner === 'civilians' ? '🏆' : r.winner === 'jester' ? '🃏' : '🎭';
  const heroTitle = r.winner === 'civilians' ? 'Wygrywają gracze!' : r.winner === 'jester' ? 'Wygrywa Błazen!' : (imps.length > 1 ? 'Wygrywają Impostorzy!' : 'Wygrywa Impostor!');
  let meLine = '';
  if (o.meId && r.players.some(p => p.id === o.meId)) {
    const won = r.winners.includes(o.meId);
    meLine = `<div class="rh-me ${won ? 'win' : 'lose'}">${won ? '🎉 Wygrana!' : 'Przegrana'}</div>`;
  }
  let dl = 0;
  const d = () => `--d:${(dl += 0.35).toFixed(2)}s`;
  const counts = r.firstCounts || {};
  const maxC = Math.max(1, ...Object.values(counts));
  const barRows = (cnts, votes) => {
    const ids = Object.keys(cnts).sort((a, b) => cnts[b] - cnts[a]);
    const max = Math.max(1, ...Object.values(cnts));
    const top = Math.max(...Object.values(cnts));
    return ids.map(id => {
      const p = P2(id);
      const voters = Object.keys(votes).filter(v => votes[v] === id).map(v => avatar(P2(v).avatar, 'xs')).join('');
      return `<div class="bar-row ${cnts[id] === top && top > 0 && id === r.accusedId ? 'top' : ''}">${avatar(p.avatar, 'sm')}
        <div style="min-width:0"><div class="bn"><span class="ellipsis">${esc(p.name)}</span>${p.team === 'impostors' ? '<span class="badge red">Impostor</span>' : p.role === 'jester' ? '<span class="badge wait">Błazen</span>' : ''}</div>
        <div class="bar"><i style="--w:${(cnts[id] / max) * 100}%"></i></div><div class="voters" style="margin-top:4px">${voters}</div></div>
        <span class="bc">${cnts[id]}</span></div>`;
    }).join('');
  };
  void maxC;
  const byPlayer = {};
  for (const a of r.answers) (byPlayer[a.playerId] = byPlayer[a.playerId] || []).push(a);
  const answersTable = r.order.map(id => P2(id)).map(p => `<div class="brow ${p.team === 'impostors' ? 'turn' : ''}" style="${p.team === 'impostors' ? 'border-color:rgba(239,68,68,.5);background:rgba(239,68,68,.08);box-shadow:none' : ''}">
      ${avatar(p.avatar, 'sm')}<div style="min-width:0"><div class="bname"><span class="ellipsis">${esc(p.name)}</span>${p.team === 'impostors' ? '<span class="badge red">' + esc(p.roleName) + '</span>' : ''}</div>
      <div class="answers-line">${(byPlayer[p.id] || []).map(a => a.timedOut ? `<span class="ans timeout" style="animation:none"><span class="rn">R${a.round}</span>brak</span>` : `<span class="ans" style="animation:none"><span class="rn">R${a.round}</span>${esc(a.text)}</span>`).join('') || '<span class="ans empty">—</span>'}</div></div></div>`).join('');
  const acc = r.accusedId ? P2(r.accusedId) : null;

  return `<div class="stack ${o.animate ? 'anim' : ''}">
    <div class="res-hero ${heroCls} reveal-item" style="--d:.1s">
      <div class="rh-emoji">${heroEmoji}</div>
      <div class="kicker">${esc(r.modeName)} · ${esc(r.categoryIcon || '')} ${esc(r.category)}</div>
      <div class="rh-title">${heroTitle}</div>
      <p class="rh-reason">${esc(r.reason)}</p>
      ${meLine}
    </div>

    <div class="card word-reveal reveal-item" style="${d()}">
      <div class="kicker">Tajne słowo</div>
      <div class="wr-word">${esc(r.word)}</div>
      ${r.similar ? `<div class="small muted" style="margin-top:6px">Słowo Impostora: <b style="color:#fca5a5">${esc(r.similar)}</b></div>` : ''}
    </div>

    <div class="card glow-red reveal-item" style="${d()}">
      <div class="card-title">${icon('eye')} ${imps.length > 1 ? 'Impostorami byli' : 'Impostorem był(a)'}</div>
      <div class="imp-list">${imps.map(p => `<div class="imp-item">${avatar(p.avatar, 'lg')}<div class="nm">${esc(p.name)}</div><span class="badge red">${esc(p.roleName)}</span></div>`).join('')}</div>
      ${r.guess != null && acc && acc.team === 'impostors' ? `<div class="divider" style="margin:14px 0 10px"></div><div class="row center small">Ostatnia szansa: <b>„${esc(r.guess || '—')}”</b> ${r.guessCorrect ? (r.guessExact === false ? `<span class="badge ready">trafione mimo literówki</span>` : '<span class="badge ready">trafione</span>') : '<span class="badge red">pudło</span>'}</div>` : ''}
    </div>

    <div class="card reveal-item" style="${d()}">
      <div class="card-title">${icon('vote')} Wyniki głosowania</div>
      <div class="bars">${barRows(r.firstCounts || {}, r.firstVotes || {})}</div>
      ${r.runoff ? `<div class="divider" style="margin:14px 0"></div><div class="card-title">${icon('scale')} Dogrywka</div><div class="bars">${barRows(r.runoff.counts, r.runoff.votes)}</div>` : ''}
      <div class="small muted" style="margin-top:12px">${acc ? `Wytypowano: <b style="color:#fff">${esc(acc.name)}</b> (${esc(acc.roleName)})` : 'Nikt nie został wytypowany.'}</div>
    </div>

    <div class="card reveal-item" style="${d()}">
      <div class="card-title">${icon('target')} Poprawnie wykryli Impostora</div>
      ${r.correctVoters.length ? `<div class="chips">${r.correctVoters.map(id => `<span class="chip green">${avatar(P2(id).avatar, 'xs')} ${esc(P2(id).name)}</span>`).join('')}</div>` : '<div class="muted small">Nikt nie wskazał Impostora.</div>'}
    </div>

    <div class="card reveal-item" style="${d()}">
      <div class="card-title">${icon('users')} Role wszystkich graczy</div>
      <div class="role-list">${r.players.map(p => `<div class="role-item t-${p.team}">${avatar(p.avatar, 'sm')}<div style="min-width:0"><div class="ri-n ellipsis">${esc(p.name)}${p.bot ? ' 🤖' : ''} ${r.winners.includes(p.id) ? '🏅' : ''}</div><div class="ri-r">${esc(p.roleName)}</div></div></div>`).join('')}</div>
    </div>

    <div class="card reveal-item" style="${d()}">
      <div class="card-title">${icon('list')} Wszystkie odpowiedzi</div>
      <div class="board">${answersTable}</div>
    </div>

    ${o.tournament ? `<div class="reveal-item" style="${d()}">${standings(o.tournament, r.points)}</div>` : ''}
    ${o.footer ? `<div class="stack sticky-bottom reveal-item" style="--d:.2s">${o.footer}</div>` : ''}
  </div>`;
}
