# IMPOSTOR 🎭

Gra towarzyska w skojarzenia: wszyscy znają tajne słowo — prawie wszyscy. Gra działa w przeglądarce na telefonach i komputerach (można ją też „zainstalować” jako aplikację PWA), online lub na jednym telefonie.

## Uruchomienie

Wymagany Node.js 18+.

```bash
npm install
```

```bash
npm start
```

Gra działa pod adresem `http://localhost:3000`. Aby grać ze znajomymi przez internet, uruchom serwer na hostingu z obsługą Node.js i WebSocketów (np. Render, Railway, Fly.io, VPS). Port ustawia zmienna `PORT`, a plik z profilami i statystykami zmienna `DATA_FILE` (domyślnie `data/db.json`).

### Wdrożenie na Render (za darmo)

1. Wgraj ten folder do repozytorium na GitHubie.
2. Zaloguj się na [render.com](https://render.com) kontem GitHub.
3. **New → Blueprint** → wybierz repozytorium → **Apply**. Render sam odczyta plik `render.yaml`.
4. Po kilku minutach gra działa pod adresem `https://impostor-xxxx.onrender.com` — ten link wysyłasz znajomym.

Na darmowym planie serwer zasypia po ok. 15 min bez ruchu (pierwsze wejście trwa wtedy ~30–60 s), a statystyki online zerują się przy każdym ponownym wdrożeniu. Dołączony `Dockerfile` pozwala wdrożyć grę także na Railway, Fly.io lub własnym serwerze.

Testy (silnik gry + pełna rozgrywka online na 4 klientach):

```bash
npm test
```

## Funkcje

- **Gra online** – pokoje z 5-znakowym kodem, link z zaproszeniem, lobby ze statusem gotowości, usuwanie graczy, przekazywanie hosta (także automatycznie, gdy host się rozłączy), powrót do gry po rozłączeniu lub odświeżeniu strony.
- **Jeden telefon** – ekrany przekazywania telefonu przed każdą prywatną chwilą (rola, tura, tajny głos, ostatnia szansa), zapis przerwanej gry.
- **3–20 graczy**, 1+ Impostorów, 1–6 rund, 15/30/45/60 s na odpowiedź, 14 kategorii + losowa, 3 poziomy trudności (+ mieszany), podpowiedź dla Impostora, tryb turniejowy.
- **Tryby**: Klasyczny, Podobne słowa, Mr. White, Chaos (Detektyw i Błazen).
- **Rundy skojarzeń** z licznikiem czasu, automatycznym przejściem po upływie czasu, tablicą odpowiedzi i blokadą wpisania własnego słowa.
- **Tajne głosowanie** – bez głosu na siebie, bez zmiany głosu, dogrywka przy remisie, ostatnia szansa Impostora (tolerancja literówek i polskich znaków).
- **Wyniki** z animacjami i dźwiękami: Impostor, tajne słowo, odpowiedzi, wyniki głosowania, zwycięzcy, trafne głosy.
- **Statystyki** (online na serwerze i lokalne), **ranking** globalny i lokalny z porównaniem graczy, **historia gier**.
- **Własne zestawy słów**, wybór nicku i awatara, dźwięki (Web Audio) i wibracje.

## Bezpieczeństwo i uczciwość

- W trybie online słowo i role losuje i przechowuje wyłącznie serwer (kryptograficzne losowanie). Każdy klient dostaje tylko publiczny stan pokoju i **swoją** rolę – inne role i słowo trafiają do wszystkich dopiero na ekranie wyników.
- Serwer pilnuje kolejności tur, czasu, jednego głosu na gracza, uprawnień hosta i limitu żądań.
- Tożsamość gracza to losowy token przechowywany w przeglądarce; serwer zapisuje tylko jego skrót SHA-256.
- Kod pokoju i adres strony nie zawierają żadnych informacji o rolach.

## Struktura

```
server/index.js    serwer Express + Socket.IO (pokoje, synchronizacja)
server/store.js    profile i statystyki (plik JSON)
shared/engine.js   silnik gry – wspólny dla serwera i trybu lokalnego
shared/words.js    baza 504 polskich słów
public/            aplikacja kliencka (HTML/CSS/JS, bez kroku budowania)
test/              testy silnika i rozgrywki online
```
