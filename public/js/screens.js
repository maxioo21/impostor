/* IMPOSTOR – ekrany: menu główne, dołączanie, ustawienia, statystyki, ranking, historia, zasady, własne słowa. */
import { S, store, profile, saveProfile, prefs, savePrefs, esc, defineScreen, act, go, rerender, toast, showModal, closeModal,
  refreshModal, confirmBox, emptyLocalStats, statPoints } from './core.js';
import * as U from './ui.js';
import { setSoundEnabled, sfx } from './sound.js';
import { O, createRoom, joinRoom, pushProfile, fetchStats, fetchRanking, meId } from './online.js';
import { openLocalSetup, hasLocalSave, resumeLocal } from './local.js';

const E = window.ImpostorEngine;
const W = window.ImpostorWords;
const { icon, avatar } = U;
const SA = !!window.IMPOSTOR_STANDALONE;
const APP = !!(window.IMPOSTOR_APP || window.IMPOSTOR_PWA);
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { return false; } };
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = () => /android/i.test(navigator.userAgent);
const canOfferInstall = () => !window.IMPOSTOR_APP && (!window.IMPOSTOR_STANDALONE || window.IMPOSTOR_PWA) && !isStandalone() && (window.__installPrompt || isIOS() || isAndroid());

/* ================= MENU GŁÓWNE ================= */
defineScreen('home', () => {
  const games = store.get('gamesPlayed', 0) || 0;
  const roomBanner = O.roomCode ? `<button class="resume-banner" data-action="resumeRoom">${icon('login')}<div class="grow"><b>Wróć do pokoju ${esc(O.roomCode)}</b><span class="small muted">Gra online wciąż na ciebie czeka</span></div>${icon('play', 'sm')}</button>` : '';
  const localBanner = hasLocalSave() ? `<button class="resume-banner" data-action="resumeLocal">${icon('phone')}<div class="grow"><b>Wznów grę na jednym telefonie</b><span class="small muted">Przerwana rozgrywka została zapisana</span></div>${icon('play', 'sm')}</button>` : '';
  return `
  <div class="topbar">
    <button class="profile-chip" data-action="goProfile">${avatar(profile.avatar, 'sm')}<div style="min-width:0;text-align:left"><div class="nm ellipsis">${esc(profile.name || 'Ustaw nick')}</div><div class="sub">Twój profil</div></div></button>
    <div class="row" style="gap:8px">
      <button class="icon-btn" data-action="goRules" aria-label="Zasady gry">${icon('book')}</button>
      <button class="icon-btn" data-action="toggleSound" aria-label="Dźwięk">${icon(prefs.sound ? 'volume' : 'volumeX')}</button>
    </div>
  </div>
  <div class="logo-wrap">
    ${U.logoMark()}
    <div class="logo-text" data-text="IMPOSTOR">IMPOSTOR</div>
    <div class="tagline">Wszyscy znają słowo. <b>Prawie wszyscy.</b></div>
  </div>
  ${roomBanner}${localBanner}
  ${canOfferInstall() ? `<button class="resume-banner" data-action="installApp">${icon('phone')}<div class="grow"><b>Zainstaluj na telefonie</b><span class="small muted">Ikona na ekranie głównym, działa bez internetu</span></div>${icon('plus', 'sm')}</button>` : ''}
  <div class="stack" style="gap:12px;margin-top:6px">
    <button class="btn block xl pulse" data-action="openPlay">${icon('play')} Graj</button>
    ${SA ? '' : `<button class="btn red block md" data-action="goJoin">${icon('login')} Dołącz do pokoju</button>`}
    <div class="btn-grid">
      <button class="tile-btn" data-action="goProfile">${icon('sliders')} Ustawienia</button>
      <button class="tile-btn" data-action="goStats">${icon('chart')} Statystyki</button>
    </div>
  </div>
  <div class="mt-auto footer-note" style="padding-top:18px">
    <span>${icon('trophy', 'xs')} Rozegrane gry: <b>${games}</b></span>
    <span><i class="status-dot ${O.authed || SA ? 'on' : ''}"></i>${SA ? 'Gra na jednym telefonie' : O.authed ? 'Serwer online' : O.unavailable ? 'Tryb offline' : 'Łączenie…'}</span>
    <span>${W.countWords()} słów w bazie</span>
  </div>`;
});

function ensureNick(then) {
  if (profile.name && profile.name.trim().length >= 2) return then();
  showModal(() => `<div class="sheet-head"><h2>Jak się nazywasz?</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
    <div class="stack">
      <div class="row center">${avatar(profile.avatar, 'lg')}</div>
      <input class="input" id="nick-quick" maxlength="16" placeholder="Twój nick" value="${esc(profile.name)}" data-enter="saveQuickNick" data-autofocus autocomplete="nickname">
      <button class="btn block" data-action="saveQuickNick">${icon('check')} Zapisz i kontynuuj</button>
    </div>`);
  act({
    saveQuickNick() {
      const v = E.cleanText(document.getElementById('nick-quick').value, 16);
      if (v.length < 2) return toast('Nick musi mieć co najmniej 2 znaki.', 'error');
      profile.name = v; saveProfile(); pushProfile(); closeModal(); then();
    }
  });
}

act({
  goHome() { go('home'); },
  goProfile() { go('profile'); },
  goStats() { go('stats', { tab: 'me' }); },
  goRules() { go('rules'); },
  goJoin() { ensureNick(() => go('join', {})); },
  toggleSound() { prefs.sound = !prefs.sound; savePrefs(); setSoundEnabled(prefs.sound); if (prefs.sound) sfx('click'); rerender(); },
  resumeRoom() { go('online'); },
  resumeLocal() { resumeLocal(); },
  openPlay() {
    showModal(() => `<div class="sheet-head"><h2>Wybierz tryb rozgrywki</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
      <div class="stack">
        ${SA ? '' : `<button class="choice-card" data-action="playOnline"><span class="cc-ic">${icon('globe')}</span><span class="grow"><span class="cc-t">Gra online</span><br><span class="cc-d">Stwórz pokój, wyślij znajomym kod i grajcie na swoich telefonach.</span></span></button>`}
        <button class="choice-card" data-action="playLocal"><span class="cc-ic red">${icon('phone')}</span><span class="grow"><span class="cc-t">Jeden telefon</span><br><span class="cc-d">Przekazujcie sobie telefon po kolei. Działa bez internetu.</span></span></button>
        ${APP ? `<button class="choice-card" data-action="playLan"><span class="cc-ic">${icon('globe')}</span><span class="grow"><span class="cc-t">Gra online przez Wi-Fi</span><br><span class="cc-d">Połącz się z grą uruchomioną na komputerze. Każdy gra na swoim telefonie.</span></span></button>` : ''}
        ${SA ? '' : `<button class="choice-card" data-action="playJoin"><span class="cc-ic">${icon('login')}</span><span class="grow"><span class="cc-t">Mam kod pokoju</span><br><span class="cc-d">Dołącz do gry stworzonej przez znajomego.</span></span></button>`}
        ${SA && !APP ? `<p class="small muted" style="margin:0">Ta wersja działa na jednym urządzeniu. Grę online, w której każdy gra na swoim telefonie, uruchomisz z paczki na komputer.</p>` : ''}
      </div>`);
  },
  playOnline() { closeModal(); ensureNick(() => createRoom()); },
  playLocal() { closeModal(); openLocalSetup(); },
  async installApp() {
    const p = window.__installPrompt;
    if (p) {
      p.prompt();
      try { const r = await p.userChoice; if (r && r.outcome === 'accepted') toast('Gra zainstalowana! Ikona IMPOSTOR jest na ekranie głównym.', 'success'); } catch { /* */ }
      window.__installPrompt = null;
      rerender();
      return;
    }
    const steps = isIOS()
      ? `<li>Dotknij przycisku <b>Udostępnij</b> (kwadrat ze strzałką) na dole Safari.</li><li>Wybierz <b>Do ekranu początkowego</b>.</li><li>Dotknij <b>Dodaj</b>.</li>`
      : `<li>Dotknij menu przeglądarki <b>⋮</b> (prawy górny róg).</li><li>Wybierz <b>Zainstaluj aplikację</b> lub <b>Dodaj do ekranu głównego</b>.</li><li>Potwierdź <b>Zainstaluj</b>.</li>`;
    showModal(() => `<div class="sheet-head"><h2>Zainstaluj IMPOSTOR</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
      <div class="stack"><ol class="rules" style="margin:0;padding-left:20px;line-height:1.7">${steps}</ol>
      <p class="small muted" style="margin:0">Gra pojawi się z ikoną na ekranie głównym i będzie działać bez internetu. Nie trzeba niczego pobierać ani zezwalać.</p>
      <button class="btn block" data-action="closeModal">${icon('check')} Rozumiem</button></div>`);
  },
  playLan() {
    closeModal();
    setTimeout(() => showModal(() => `<div class="sheet-head"><h2>Gra online przez Wi-Fi</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
      <div class="stack">
        <p class="small muted" style="margin:0">Na komputerze uruchom grę z paczki IMPOSTOR (plik GRAJ.bat). W czarnym oknie zobaczysz adres dla telefonów, np. <b style="color:#fff">192.168.1.15:3000</b>. Telefon musi być w tym samym Wi-Fi.</p>
        <div class="field"><label for="lan-addr">Adres gry</label>
          <input class="input" id="lan-addr" value="${esc(store.get('lanAddr', ''))}" placeholder="192.168.1.15:3000" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" data-enter="lanGo" data-autofocus></div>
        <button class="btn block" data-action="lanGo">${icon('login')} Połącz</button>
      </div>`), 220);
  },
  lanGo() {
    let v = (document.getElementById('lan-addr').value || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(v)) return toast('Wpisz adres w formacie 192.168.1.15:3000', 'error');
    if (!/:\d+$/.test(v)) v += ':3000';
    store.set('lanAddr', v);
    toast('Łączenie z ' + v + '…');
    location.href = 'http://' + v + '/';
  },
  playJoin() { closeModal(); ensureNick(() => go('join', {})); }
});

/* ================= DOŁĄCZ ================= */
defineScreen('join', p => `
  <div class="topbar"><button class="icon-btn" data-action="goHome">${icon('back')}</button><h1>Dołącz do pokoju</h1><span class="spacer-44"></span></div>
  <div class="logo-wrap" style="margin:4px 0">${U.logoMark()}</div>
  <div class="card glow stack">
    <div class="field"><label for="join-code">Kod pokoju</label>
      <input class="input code" id="join-code" data-persist maxlength="5" placeholder="•••••" value="${esc(p.code || '')}" autocomplete="off" autocapitalize="characters" spellcheck="false" data-enter="doJoin" data-input="codeInput" data-autofocus inputmode="text"></div>
    <div class="row">${avatar(profile.avatar, 'md')}<div class="grow"><div class="small muted">Dołączysz jako</div><b>${esc(profile.name)}</b></div><button class="btn ghost sm" data-action="goProfile">${icon('edit', 'xs')} Zmień</button></div>
    <button class="btn red block md" data-action="doJoin">${icon('login')} Dołącz</button>
  </div>
  <p class="small muted center">Kod otrzymasz od osoby, która utworzyła pokój. Możesz też otworzyć link z zaproszeniem.</p>`);

act({
  codeInput(el) { const v = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); if (v !== el.value) el.value = v; },
  doJoin() { const el = document.getElementById('join-code'); joinRoom(el ? el.value : ''); }
});

/* ================= USTAWIENIA / PROFIL ================= */
defineScreen('profile', () => {
  const sets = U.customSets();
  return `
  <div class="topbar"><button class="icon-btn" data-action="goHome">${icon('back')}</button><h1>Ustawienia</h1><span class="spacer-44"></span></div>
  <div class="card">
    <div class="card-title">${icon('smile')} Profil gracza</div>
    <div class="row" style="gap:14px;margin-bottom:14px">${avatar(profile.avatar, 'lg')}
      <div class="field grow"><label for="nick">Nick</label><input class="input" id="nick" maxlength="16" value="${esc(profile.name)}" placeholder="Twój nick" data-input="nickInput" autocomplete="nickname"></div></div>
    <div class="field"><label>Awatar</label>
      <div class="av-grid">${Array.from({ length: U.AVATAR_COUNT }, (_, i) => `<button class="av-pick ${profile.avatar === i ? 'active' : ''}" data-action="pickAvatar" data-av="${i}" aria-label="Awatar ${i + 1}">${avatar(i, 'md')}</button>`).join('')}</div></div>
  </div>
  <div class="card">
    <div class="card-title">${icon('volume')} Dźwięk i wibracje</div>
    <div class="opt-row"><div class="lbl">Efekty dźwiękowe<small>Dźwięki przycisków, licznika i wyników</small></div><button class="switch ${prefs.sound ? 'on' : ''}" data-action="prefToggle" data-key="sound" aria-label="Dźwięk"></button></div>
    <div class="opt-row"><div class="lbl">Wibracje<small>Na telefonach, które je obsługują</small></div><button class="switch ${prefs.vibrate ? 'on' : ''}" data-action="prefToggle" data-key="vibrate" aria-label="Wibracje"></button></div>
  </div>
  <div class="card">
    <div class="card-title">${icon('pen')} Własne zestawy słów</div>
    <p class="small muted" style="margin-top:0">Twórz prywatne kategorie i używaj ich w grze online oraz na jednym telefonie.</p>
    <div class="menu-list">${sets.map(cs => `<div class="menu-item"><span class="ce" style="font-size:20px">✏️</span><div class="grow"><div>${esc(cs.name)}</div><div class="small muted">${cs.words.length} słów</div></div>
      <button class="icon-btn sm" data-action="editSet" data-id="${esc(cs.id)}" aria-label="Edytuj">${icon('edit', 'sm')}</button>
      <button class="icon-btn sm danger" data-action="delSet" data-id="${esc(cs.id)}" aria-label="Usuń">${icon('trash', 'sm')}</button></div>`).join('') || '<div class="small muted">Nie masz jeszcze własnych zestawów.</div>'}</div>
    <button class="btn ghost block md" style="margin-top:12px" data-action="editSet">${icon('plus')} Nowy zestaw słów</button>
  </div>
  <div class="card">
    <div class="card-title">${icon('info')} Inne</div>
    <div class="menu-list">
      <button class="menu-item" data-action="goRules">${icon('book')} Zasady gry</button>
      <button class="menu-item" data-action="goStats">${icon('chart')} Statystyki i historia</button>
      <button class="menu-item danger" data-action="resetLocal">${icon('trash')} Wyczyść lokalne statystyki i historię</button>
    </div>
    <p class="tiny muted center" style="margin:14px 0 0">IMPOSTOR v1.0 · ${W.countWords()} słów w ${Object.keys(W.CATEGORIES).length} kategoriach</p>
  </div>`;
});

let nickTimer = null;
act({
  nickInput(el) {
    const v = E.cleanText(el.value, 16);
    profile.name = v; saveProfile();
    clearTimeout(nickTimer);
    nickTimer = setTimeout(pushProfile, 600);
  },
  pickAvatar(el) { profile.avatar = +el.dataset.av; saveProfile(); pushProfile(); rerender(); },
  prefToggle(el) {
    const k = el.dataset.key;
    prefs[k] = !prefs[k]; savePrefs();
    if (k === 'sound') setSoundEnabled(prefs.sound);
    if (k === 'vibrate' && prefs.vibrate && navigator.vibrate) navigator.vibrate(60);
    rerender();
  },
  async resetLocal() {
    const ok = await confirmBox({ title: 'Wyczyścić dane?', text: 'Usunie to lokalne statystyki, ranking tego urządzenia i historię gier. Statystyki online pozostaną.', ok: 'Wyczyść', danger: true });
    if (!ok) return;
    ['localStats', 'myLocalStats', 'history', 'gamesPlayed'].forEach(k => store.del(k));
    toast('Dane lokalne wyczyszczone.', 'success');
    rerender();
  }
});

/* ================= WŁASNE ZESTAWY SŁÓW ================= */
function parseWords(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const parts = l.split(/\s*[;/|]\s*/);
    return { word: E.cleanText(parts[0], 30), similar: E.cleanText(parts[1] || '', 30) };
  }).filter(w => w.word);
}
function openSetEditor(id, back) {
  const sets = U.customSets();
  const cur = sets.find(s => s.id === id) || { id: null, name: '', words: [] };
  const text = cur.words.map(w => w.similar ? `${w.word} ; ${w.similar}` : w.word).join('\n');
  showModal(() => `<div class="sheet-head"><h2>${cur.id ? 'Edytuj zestaw' : 'Nowy zestaw słów'}</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
    <div class="stack">
      <div class="field"><label for="set-name">Nazwa kategorii</label><input class="input" id="set-name" maxlength="24" value="${esc(cur.name)}" placeholder="np. Nasza klasa" data-autofocus></div>
      <div class="field"><label for="set-words">Słowa (jedno w linii)</label>
        <textarea class="input" id="set-words" placeholder="Pizza ; Zapiekanka&#10;Kot ; Pies&#10;Wakacje">${esc(text)}</textarea>
        <div class="small muted">Opcjonalnie po średniku podaj słowo podobne — używane w trybie „Podobne słowa”. Minimum 3 słowa.</div></div>
      <button class="btn block" data-action="saveSet" data-id="${esc(cur.id || '')}" data-back="${back || ''}">${icon('check')} Zapisz zestaw</button>
    </div>`);
}
act({
  openWordSets() { closeModal(); setTimeout(() => openSetEditor(null, S.screen), 220); },
  editSet(el) { openSetEditor(el.dataset.id || null); },
  saveSet(el) {
    const name = E.cleanText(document.getElementById('set-name').value, 24);
    const words = parseWords(document.getElementById('set-words').value);
    const c = E.sanitizeCustom({ name: name || 'Własna kategoria', words });
    if (!name) return toast('Podaj nazwę kategorii.', 'error');
    if (!c) return toast('Zestaw musi mieć co najmniej 3 różne słowa.', 'error');
    const sets = U.customSets();
    const id = el.dataset.id || 'cs' + Date.now().toString(36);
    const entry = { id, name: c.name, words: c.words };
    const i = sets.findIndex(s => s.id === id);
    if (i >= 0) sets[i] = entry; else sets.push(entry);
    store.set('customSets', sets);
    closeModal();
    toast(`Zapisano zestaw „${c.name}” (${c.words.length} słów).`, 'success');
    rerender();
  },
  async delSet(el) {
    const sets = U.customSets();
    const s = sets.find(x => x.id === el.dataset.id);
    if (!s) return;
    const ok = await confirmBox({ title: 'Usunąć zestaw?', text: `Zestaw „${esc(s.name)}” zostanie trwale usunięty.`, ok: 'Usuń', danger: true });
    if (!ok) return;
    store.set('customSets', sets.filter(x => x.id !== s.id));
    rerender();
  }
});

/* ================= ZASADY ================= */
defineScreen('rules', () => `
  <div class="topbar"><button class="icon-btn" data-action="goHome">${icon('back')}</button><h1>Zasady gry</h1><span class="spacer-44"></span></div>
  <div class="card rules">
    <h3>${icon('sparkles')} O co chodzi?</h3>
    <p>Wszyscy gracze dostają to samo <b>tajne słowo</b> — oprócz <b>Impostora</b>, który go nie zna. Gracze po kolei wpisują skojarzenia, a na końcu głosują, kto jest Impostorem.</p>
    <div class="example">Tajne słowo: <b>PIZZA</b><br>Gracze piszą: <i>Ser, Włochy, Pomidor, Ciasto</i>.<br>Impostor nie zna słowa — musi zgadywać tak, by nie wzbudzić podejrzeń.</div>
  </div>
  <div class="card rules">
    <h3>${icon('list')} Przebieg</h3>
    <ol>
      <li><b>Losowanie ról</b> — każdy prywatnie sprawdza swoją kartę.</li>
      <li><b>Skojarzenia</b> — w każdej rundzie gracze po kolei wpisują jedno słowo lub krótkie skojarzenie. Czas jest ograniczony, a wysłanej odpowiedzi nie da się zmienić.</li>
      <li><b>Głosowanie</b> — każdy tajnie wskazuje Impostora. Nie można głosować na siebie. Przy remisie odbywa się dogrywka.</li>
      <li><b>Ostatnia szansa</b> — zdemaskowany Impostor może odgadnąć tajne słowo. Jeśli trafi — wygrywa!</li>
      <li><b>Wyniki</b> — wygrywają gracze, jeśli złapią Impostora, który nie odgadnie słowa. Jeśli wytypują niewinną osobę — wygrywa Impostor.</li>
    </ol>
  </div>
  <div class="card rules">
    <h3>${icon('layers')} Tryby gry</h3>
    <ul>${Object.values(E.MODES).map(m => `<li><b>${m.icon} ${m.name}</b> — ${m.desc}</li>`).join('')}</ul>
    <p><b>Detektyw</b> raz w grze sprawdza, czy wybrana osoba jest Impostorem. <b>Błazen</b> zna słowo, ale wygrywa samodzielnie, jeśli zostanie wytypowany.</p>
    <p><b>Turniej</b> — seria gier z punktacją: wygrana Impostora +3 pkt, wygrana graczy +2 pkt, wygrana Błazna +4 pkt, trafny głos +1 pkt.</p>
  </div>
  <div class="card rules">
    <h3>${icon('shield')} Uczciwa gra</h3>
    <p>W grze online tajne słowo i role zna wyłącznie serwer — każdy telefon dostaje tylko swoją rolę. Serwer pilnuje kolejności, czasu i tego, by każdy zagłosował tylko raz. Gracze, którzy znają słowo, nie mogą go wpisać jako skojarzenia.</p>
  </div>`);

/* ================= STATYSTYKI ================= */
const statsState = { tab: 'me', rankMode: SA ? 'local' : 'online', ranking: null, rankingErr: null, loading: false, compare: [] };

function statTiles(s) {
  const wr = s.games ? Math.round((s.wins / s.games) * 100) : 0;
  const C = 2 * Math.PI * 45;
  return `<div class="winrate" style="margin-bottom:14px">
      <div class="donut"><svg viewBox="0 0 110 110" width="110" height="110"><circle cx="55" cy="55" r="45" stroke="rgba(148,120,255,.15)"/><circle cx="55" cy="55" r="45" stroke="url(#tg)" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - wr / 100)}"/></svg><div class="dv">${wr}%</div></div>
      <div><div class="kicker">Procent wygranych</div><div style="font-family:var(--display);font-size:22px;font-weight:800">${s.wins} / ${s.games}</div><div class="small muted">wygranych gier</div></div>
    </div>
    <div class="stat-grid">
      <div class="stat hi">${icon('play', 'sm')}<span class="sv">${s.games}</span><span class="sl">Rozegrane gry</span></div>
      <div class="stat">${icon('trophy', 'sm')}<span class="sv">${s.wins}</span><span class="sl">Zwycięstwa</span></div>
      <div class="stat">${icon('x', 'sm')}<span class="sv">${s.losses}</span><span class="sl">Porażki</span></div>
      <div class="stat">${icon('eye', 'sm')}<span class="sv">${s.impostorGames}</span><span class="sl">Gry jako Impostor</span></div>
      <div class="stat">${icon('target', 'sm')}<span class="sv">${s.detections}</span><span class="sl">Wykryci Impostorzy</span></div>
      <div class="stat">${icon('flame', 'sm')}<span class="sv">${s.bestStreak}</span><span class="sl">Najlepsza seria</span></div>
      <div class="stat">${icon('sparkles', 'sm')}<span class="sv">${s.streak}</span><span class="sl">Obecna seria</span></div>
      <div class="stat">${icon('crown', 'sm')}<span class="sv">${statPoints(s)}</span><span class="sl">Punkty rankingowe</span></div>
    </div>`;
}

function localRanking() {
  const ls = store.get('localStats', {});
  return Object.entries(ls).map(([k, v]) => Object.assign({ id: 'loc:' + k, name: v.name, avatar: v.avatar }, v.stats, {
    points: statPoints(v.stats), winrate: v.stats.games ? Math.round((v.stats.wins / v.stats.games) * 100) : 0
  })).sort((a, b) => b.points - a.points || b.winrate - a.winrate);
}

async function loadRanking() {
  statsState.loading = true; statsState.rankingErr = null;
  const r = await fetchRanking();
  statsState.loading = false;
  if (r.ok) statsState.ranking = r; else statsState.rankingErr = r.error;
  if (S.screen === 'stats') rerender();
}
async function loadMyStats() {
  const r = await fetchStats();
  if (r.ok) { O.stats = r.stats; if (S.screen === 'stats') rerender(); }
}

defineScreen('stats', p => {
  if (p.tab) { statsState.tab = p.tab; delete p.tab; }
  const tab = statsState.tab;
  const tabs = `<div class="tabs">
    <button class="${tab === 'me' ? 'active' : ''}" data-action="statsTab" data-tab="me">${icon('smile', 'sm')} Moje</button>
    <button class="${tab === 'rank' ? 'active' : ''}" data-action="statsTab" data-tab="rank">${icon('trophy', 'sm')} Ranking</button>
    <button class="${tab === 'hist' ? 'active' : ''}" data-action="statsTab" data-tab="hist">${icon('history', 'sm')} Historia</button>
  </div>`;
  let body = '';
  if (tab === 'me') {
    const online = O.stats ? Object.assign(emptyLocalStats(), O.stats) : null;
    const local = Object.assign(emptyLocalStats(), store.get('myLocalStats', {}));
    body = `
      ${SA ? '' : `<div class="card"><div class="card-title">${icon('globe')} Statystyki online</div>
        ${online ? statTiles(online) : `<div class="empty-state">${icon('wifiOff')}<div>${O.authed ? 'Ładowanie…' : 'Połącz się z internetem, aby zobaczyć statystyki online.'}</div></div>`}</div>`}
      <div class="card"><div class="card-title">${icon('phone')} Na tym urządzeniu</div>
        <p class="small muted" style="margin-top:0">Gry na jednym telefonie, rozegrane pod nickiem <b>${esc(profile.name || '—')}</b>.</p>
        ${statTiles(local)}</div>`;
    if (O.authed && Date.now() - (statsState.meLoadedAt || 0) > 15000) { statsState.meLoadedAt = Date.now(); setTimeout(loadMyStats); }
  } else if (tab === 'rank') {
    const mode = statsState.rankMode;
    const list = mode === 'online' ? (statsState.ranking ? statsState.ranking.list : null) : localRanking();
    const me = meId();
    if (mode === 'online' && !statsState.ranking && !statsState.loading && !statsState.rankingErr && O.authed) setTimeout(loadRanking);
    const sel = statsState.compare;
    body = `
      ${SA ? '' : `<div class="seg"><button class="${mode === 'online' ? 'active' : ''}" data-action="rankMode" data-mode="online">${icon('globe', 'sm')} Globalny</button><button class="${mode === 'local' ? 'active' : ''}" data-action="rankMode" data-mode="local">${icon('phone', 'sm')} Ten telefon</button></div>`}
      <p class="small muted center" style="margin:0">Dotknij dwóch graczy, aby porównać ich wyniki.</p>
      ${mode === 'online' && statsState.ranking && statsState.ranking.myRank ? `<div class="chip" style="align-self:center">${icon('crown')} Twoja pozycja: #${statsState.ranking.myRank} z ${statsState.ranking.total}</div>` : ''}
      <div class="stack" style="gap:8px">
        ${list == null ? `<div class="empty-state">${icon(O.authed ? 'refresh' : 'wifiOff')}<div>${statsState.rankingErr ? esc(statsState.rankingErr) : O.authed ? 'Ładowanie rankingu…' : 'Ranking globalny wymaga połączenia z serwerem.'}</div></div>`
          : list.length === 0 ? `<div class="empty-state">${icon('trophy')}<div>Brak wyników — rozegraj pierwszą grę!</div></div>`
            : list.map((x, i) => `<button class="rank-row ${sel.includes(x.id) ? 'sel' : ''} ${x.id === me ? 'me' : ''}" data-action="rankPick" data-id="${esc(x.id)}">
                <span class="rp">${i + 1}</span>${avatar(x.avatar, 'sm')}
                <div class="grow" style="min-width:0"><div class="bold ellipsis">${esc(x.name)} ${x.id === me ? '<span class="badge me">ty</span>' : ''}</div><div class="rsub">${x.wins}/${x.games} wygranych · ${x.winrate}% · ${x.detections} wykryć</div></div>
                <div class="rpts">${x.points}<div class="rsub">pkt</div></div></button>`).join('')}
      </div>
      ${sel.length === 2 ? `<div class="sticky-bottom"><button class="btn block" data-action="openCompare">${icon('scale')} Porównaj wybranych</button></div>` : ''}`;
  } else {
    const h = store.get('history', []);
    const winLabel = w => w === 'civilians' ? 'Wygrali gracze' : w === 'jester' ? 'Wygrał Błazen' : 'Wygrał Impostor';
    body = h.length === 0 ? `<div class="card empty-state">${icon('history')}<div>Historia jest pusta. Rozegraj pierwszą grę!</div></div>`
      : `<div class="stack" style="gap:8px">${h.map(e => `
        <details class="hist-item"><summary>
          <span class="res-dot ${e.myResult || 'na'}"></span>
          <div class="grow" style="min-width:0"><div class="hw ellipsis">${esc(e.word)}</div><div class="hd">${new Date(e.ts).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${e.type === 'online' ? 'Online' : 'Jeden telefon'} · ${esc(e.mode)}</div></div>
          <span class="badge ${e.winner === 'civilians' ? 'ready' : e.winner === 'jester' ? 'wait' : 'red'}">${winLabel(e.winner)}</span>
        </summary>
        <div class="hist-body">
          <div class="small">${esc(e.reason)}</div>
          ${e.similar ? `<div class="small muted">Słowo Impostora: <b>${esc(e.similar)}</b></div>` : ''}
          <div class="role-list">${e.players.map(p => `<div class="role-item t-${p.team}">${avatar(p.avatar, 'xs')}<div style="min-width:0"><div class="ri-n ellipsis">${esc(p.name)} ${p.won ? '🏅' : ''}</div><div class="ri-r">${esc(p.roleName)}</div></div></div>`).join('')}</div>
          <div class="board">${e.answers.map(a => `<div class="small"><b>${esc(a.name)}:</b> <span class="muted">${a.list.map(esc).join(', ') || '—'}</span></div>`).join('')}</div>
          <div class="small muted">Wytypowany: <b>${esc(e.accused || 'nikt')}</b> · Trafnie głosowali: ${e.correct.length ? e.correct.map(esc).join(', ') : 'nikt'}</div>
        </div></details>`).join('')}</div>`;
  }
  return `<div class="topbar"><button class="icon-btn" data-action="goHome">${icon('back')}</button><h1>Statystyki</h1><span class="spacer-44"></span></div>${tabs}${body}`;
});

act({
  statsTab(el) { statsState.tab = el.dataset.tab; statsState.compare = []; if (el.dataset.tab === 'rank') { statsState.ranking = null; statsState.rankingErr = null; } rerender(); },
  rankMode(el) { statsState.rankMode = el.dataset.mode; statsState.compare = []; rerender(); },
  rankPick(el) {
    const id = el.dataset.id;
    const c = statsState.compare;
    const i = c.indexOf(id);
    if (i >= 0) c.splice(i, 1); else { c.push(id); if (c.length > 2) c.shift(); }
    rerender();
  },
  openCompare() {
    const list = statsState.rankMode === 'online' ? (statsState.ranking ? statsState.ranking.list : []) : localRanking();
    const [a, b] = statsState.compare.map(id => list.find(x => x.id === id));
    if (!a || !b) return;
    const rows = [['Punkty', 'points'], ['Rozegrane gry', 'games'], ['Zwycięstwa', 'wins'], ['% wygranych', 'winrate', '%'], ['Gry jako Impostor', 'impostorGames'], ['Wygrane jako Impostor', 'impostorWins'], ['Wykryci Impostorzy', 'detections'], ['Najlepsza seria', 'bestStreak']];
    showModal(() => `<div class="sheet-head"><h2>Porównanie</h2><button class="icon-btn sm" data-action="closeModal">${icon('x', 'sm')}</button></div>
      <div class="cmp-head"><div class="stack" style="align-items:center;gap:6px">${avatar(a.avatar, 'lg')}<b class="ellipsis">${esc(a.name)}</b></div><div class="kicker">vs</div><div class="stack" style="align-items:center;gap:6px">${avatar(b.avatar, 'lg')}<b class="ellipsis">${esc(b.name)}</b></div></div>
      <div style="margin-top:10px">${rows.map(([l, k, suf]) => {
        const va = a[k] || 0, vb = b[k] || 0;
        return `<div class="cmp-row"><div class="cv ${va > vb ? 'win' : ''}">${va}${suf || ''}</div><div class="cl">${l}</div><div class="cv ${vb > va ? 'win' : ''}">${vb}${suf || ''}</div></div>`;
      }).join('')}</div>`);
  }
});

export { refreshModal };
