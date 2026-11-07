/*
 * IMPOSTOR – baza słów.
 * Format wpisu: "Słowo|Słowo podobne (tryb podobnych słów)|Delikatna podpowiedź dla Impostora"
 * Plik działa zarówno w Node.js (require), jak i w przeglądarce (window.ImpostorWords).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ImpostorWords = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CATEGORIES = {
    jedzenie: {
      name: 'Jedzenie', icon: '🍕',
      easy: ['Pizza|Zapiekanka|Jedzone na imprezach', 'Hamburger|Hot dog|Fast food', 'Lody|Sorbet|Najlepsze latem', 'Jabłko|Gruszka|Rośnie na drzewie', 'Banan|Ananas|Owoc', 'Czekolada|Cukierek|Coś słodkiego', 'Chleb|Bułka|Piekarnia', 'Spaghetti|Pierogi|Danie obiadowe', 'Frytki|Chipsy|Coś słonego', 'Jajko|Omlet|Śniadanie', 'Ser|Masło|Z lodówki', 'Arbuz|Melon|Owoc'],
      medium: ['Pierogi|Uszka|Polska tradycja', 'Sushi|Onigiri|Azja', 'Rosół|Żurek|Niedzielny obiad', 'Naleśnik|Gofr|Na słodko lub słono', 'Kebab|Tortilla|Jedzone na mieście', 'Bigos|Gulasz|Długo się gotuje', 'Popcorn|Nachos|Przekąska', 'Sernik|Szarlotka|Deser', 'Schabowy|Mielony|Obiad', 'Kanapka|Tost|Szybki posiłek', 'Barszcz|Krupnik|Coś gorącego', 'Pączek|Drożdżówka|Słodkie wypieki'],
      hard: ['Tiramisu|Panna cotta|Deser', 'Hummus|Guacamole|Do maczania', 'Kawior|Ostrygi|Luksus', 'Risotto|Paella|Danie z garnka', 'Ogórek kiszony|Kapusta kiszona|Fermentacja', 'Croissant|Bagietka|Francja', 'Fondue|Raclette|Szwajcaria', 'Ramen|Pho|Gorąca miska', 'Tatar|Carpaccio|Na surowo', 'Oscypek|Bryndza|Góry', 'Falafel|Kotlet sojowy|Wegetariańskie', 'Kimchi|Sauerkraut|Ostre i kwaśne']
    },
    zwierzeta: {
      name: 'Zwierzęta', icon: '🐾',
      easy: ['Kot|Pies|Zwierzę domowe', 'Pies|Wilk|Najlepszy przyjaciel', 'Słoń|Nosorożec|Coś dużego', 'Lew|Tygrys|Dzikie', 'Krowa|Koza|Wieś', 'Koń|Osioł|Gospodarstwo', 'Ryba|Żaba|Woda', 'Królik|Chomik|Małe i puszyste', 'Małpa|Goryl|Dżungla', 'Żyrafa|Zebra|Sawanna', 'Kura|Kaczka|Ptak gospodarski', 'Mysz|Szczur|Małe'],
      medium: ['Pingwin|Foka|Zimno', 'Delfin|Wieloryb|Ocean', 'Sowa|Orzeł|Ptak', 'Wiewiórka|Kuna|Las', 'Krokodyl|Jaszczurka|Gad', 'Kangur|Koala|Australia', 'Wąż|Dżdżownica|Bez nóg', 'Pszczoła|Osa|Owad', 'Motyl|Ćma|Skrzydła', 'Żółw|Ślimak|Powolne', 'Papuga|Paw|Kolorowe', 'Niedźwiedź|Borsuk|Las'],
      hard: ['Kameleon|Gekon|Zmienia się', 'Ośmiornica|Kałamarnica|Głębina', 'Pancernik|Jeż|Ochrona', 'Leniwiec|Mrówkojad|Ameryka Południowa', 'Dziobak|Kolczatka|Nietypowy ssak', 'Flaming|Ibis|Egzotyczny ptak', 'Hiena|Szakal|Afryka', 'Meduza|Ukwiał|Morze', 'Nietoperz|Sowa|Noc', 'Lemur|Wyrak|Madagaskar', 'Alpaka|Lama|Wełna', 'Szop pracz|Skunks|Ameryka']
    },
    sport: {
      name: 'Sport', icon: '⚽',
      easy: ['Piłka nożna|Koszykówka|Drużynowy', 'Pływanie|Nurkowanie|Woda', 'Tenis|Badminton|Gra we dwoje', 'Rower|Hulajnoga|Jazda', 'Bieganie|Chodzenie|Kondycja', 'Narty|Snowboard|Zima', 'Siatkówka|Piłka ręczna|Hala', 'Boks|Karate|Walka', 'Łyżwy|Wrotki|Ślisko', 'Gimnastyka|Akrobatyka|Elastyczność', 'Bramkarz|Obrońca|Boisko', 'Medal|Puchar|Nagroda'],
      medium: ['Skoki narciarskie|Biathlon|Polska zima', 'Hokej|Curling|Lód', 'Golf|Minigolf|Spokojny sport', 'Szachy|Warcaby|Plansza', 'Maraton|Triatlon|Wytrzymałość', 'Surfing|Kitesurfing|Fale', 'Wspinaczka|Alpinizm|Wysokość', 'Kręgle|Bilard|Kule', 'Rzut oszczepem|Pchnięcie kulą|Lekkoatletyka', 'Siłownia|Crossfit|Mięśnie', 'Sędzia|Trener|Mecz', 'Formuła 1|Rajdy|Prędkość'],
      hard: ['Szermierka|Kendo|Maska', 'Rugby|Futbol amerykański|Owalna', 'Krykiet|Baseball|Kij', 'Polo|Jeździectwo|Konie', 'Kajakarstwo|Wioślarstwo|Rzeka', 'Sumo|Zapasy|Japonia', 'Parkour|Freerun|Miasto', 'Dziesięciobój|Pięciobój|Wiele dyscyplin', 'Spadochroniarstwo|Paralotniarstwo|Niebo', 'Squash|Tenis stołowy|Ściana', 'Darts|Snooker|Precyzja', 'Bobsleje|Saneczkarstwo|Lodowy tor']
    },
    gry: {
      name: 'Gry komputerowe', icon: '🎮',
      easy: ['Minecraft|Roblox|Klocki', 'Fortnite|PUBG|Strzelanie', 'Mario|Sonic|Platformówka', 'Pokemon|Digimon|Stworki', 'Tetris|Pac-Man|Klasyka', 'Konsola|Pad|Granie', 'FIFA|NBA 2K|Sport', 'GTA|Mafia|Miasto', 'Among Us|Fall Guys|Imprezowa gra', 'The Sims|Animal Crossing|Życie', 'Angry Birds|Cut the Rope|Telefon', 'Counter-Strike|Valorant|Drużyny'],
      medium: ['Wiedźmin|Skyrim|Fantasy', 'League of Legends|Dota|Arena', 'Zelda|Final Fantasy|Przygoda', 'Call of Duty|Battlefield|Wojna', 'Clash Royale|Brawl Stars|Telefon', 'Subway Surfers|Temple Run|Bieganie', 'Overwatch|Team Fortress|Bohaterowie', 'Rocket League|FIFA|Gol', 'Terraria|Stardew Valley|Pikselowe', 'Speedrun|Walkthrough|Szybko', 'Boss|Potwór|Koniec poziomu', 'Save|Checkpoint|Postęp'],
      hard: ['Dark Souls|Elden Ring|Trudne', 'Cyberpunk 2077|Deus Ex|Przyszłość', 'Hollow Knight|Celeste|Indie', 'Portal|The Talos Principle|Zagadki', 'StarCraft|Age of Empires|Strategia', 'Half-Life|Doom|Klasyka', 'Lag|Ping|Internet', 'Respawn|Game over|Śmierć', 'Mod|Patch|Zmiana', 'Easter egg|Sekret|Ukryte', 'Grind|Farmienie|Powtarzanie', 'Noob|Pro|Gracz']
    },
    filmy: {
      name: 'Filmy', icon: '🎬',
      easy: ['Harry Potter|Władca Pierścieni|Magia', 'Titanic|Pearl Harbor|Romans', 'Shrek|Madagaskar|Animacja', 'Gwiezdne wojny|Star Trek|Kosmos', 'Spider-Man|Batman|Superbohater', 'Kino|Teatr|Wieczór', 'Avengers|Liga Sprawiedliwości|Drużyna', 'Kevin sam w domu|Grinch|Święta', 'Król Lew|Księga dżungli|Afryka', 'Jurassic Park|King Kong|Coś wielkiego', 'Piraci z Karaibów|Hook|Morze', 'Aktor|Reżyser|Plan filmowy'],
      medium: ['Matrix|Incepcja|Rzeczywistość', 'Szybcy i wściekli|Need for Speed|Samochody', 'Rocky|Creed|Ring', 'Joker|Venom|Złoczyńca', 'Gladiator|Troja|Starożytność', 'Avatar|Diuna|Inna planeta', 'Terminator|Robocop|Roboty', 'Indiana Jones|Mumia|Przygoda', 'Miś|Rejs|Komedia PRL', 'Kiler|Chłopaki nie płaczą|Polska komedia', 'Oscar|Złota Palma|Nagroda', 'Zwiastun|Plakat|Reklama'],
      hard: ['Pulp Fiction|Wściekłe psy|Kultowe', 'Ojciec chrzestny|Człowiek z blizną|Mafia', 'Lśnienie|To|Horror', 'Interstellar|Grawitacja|Kosmos', 'Forrest Gump|Big Fish|Życie', 'Psychoza|Ptaki|Klasyka', 'Parasite|Oldboy|Nagrodzony', 'Casablanca|Przeminęło z wiatrem|Klasyk', 'Kryminał|Thriller|Gatunek', 'Napisy końcowe|Czołówka|Film', 'Kaskader|Dubler|Niebezpieczne', 'Montaż|Scenariusz|Produkcja']
    },
    bajki: {
      name: 'Bajki', icon: '🧸',
      easy: ['Kopciuszek|Śpiąca Królewna|Księżniczka', 'Królewna Śnieżka|Roszpunka|Las', 'Czerwony Kapturek|Jaś i Małgosia|Las', 'Pinokio|Piotruś Pan|Chłopiec', 'Smerfy|Muminki|Wioska', 'Kubuś Puchatek|Miś Uszatek|Przyjaciele', 'Myszka Miki|Kaczor Donald|Disney', 'Bolek i Lolek|Reksio|Polska bajka', 'Kraina Lodu|Zaplątani|Siostry', 'Świnka Peppa|Psi Patrol|Dla maluchów', 'Smok|Rycerz|Zamek', 'Wróżka|Czarodziejka|Magia'],
      medium: ['Scooby-Doo|Tom i Jerry|Kreskówka', 'SpongeBob|Gdzie jest Nemo|Pod wodą', 'Gumisie|Smerfy|Lata 80', 'Pszczółka Maja|Muchomorek|Łąka', 'Toy Story|Auta|Pixar', 'Mała Syrenka|Gdzie jest Nemo|Ocean', 'Alicja w Krainie Czarów|Czarnoksiężnik z Oz|Kraina', 'Kot w butach|Shrek|Przygoda', 'Złota rybka|Dżin|Życzenia', 'Brzydkie kaczątko|Żabi król|Przemiana', 'Calineczka|Dziewczynka z zapałkami|Baśń', 'Dzwoneczek|Wróżka Zębuszka|Małe skrzydła'],
      hard: ['Baba Jaga|Czarownica|Chatka', 'Krasnoludki|Elfy|Małe istoty', 'Smok Wawelski|Szewczyk Dratewka|Kraków', 'Królowa Śniegu|Pani Zima|Zima', 'Dziadek do orzechów|Ołowiany żołnierzyk|Święta', 'Pan Kleks|Doktor Dolittle|Nauczyciel', 'Koziołek Matołek|Reksio|Polska', 'Mulan|Pocahontas|Wojowniczka', 'Aladyn|Sindbad|Pustynia', 'Herkules|Tarzan|Siła', 'Morał|Puenta|Zakończenie', 'Za siedmioma górami|Dawno temu|Początek']
    },
    postacie: {
      name: 'Postacie', icon: '🦸',
      easy: ['Święty Mikołaj|Zajączek wielkanocny|Prezenty', 'Superman|Spider-Man|Bohater', 'Pirat|Wiking|Statek', 'Królowa|Księżniczka|Korona', 'Wampir|Wilkołak|Noc', 'Czarodziej|Czarownica|Magia', 'Rycerz|Żołnierz|Miecz', 'Kosmita|Robot|Kosmos', 'Klaun|Mim|Cyrk', 'Ninja|Samuraj|Japonia', 'Duch|Zombie|Strach', 'Elf|Krasnal|Uszy'],
      medium: ['Sherlock Holmes|Herkules Poirot|Śledztwo', 'Batman|Iron Man|Bogacz', 'Joker|Harley Quinn|Złoczyńca', 'Dracula|Frankenstein|Horror', 'Gandalf|Dumbledore|Broda', 'Pikachu|Sonic|Maskotka', 'Mario|Luigi|Wąsy', 'Kopernik|Galileusz|Naukowiec', 'Maria Skłodowska-Curie|Albert Einstein|Nauka', 'Chopin|Mozart|Muzyka', 'Lewandowski|Messi|Piłka', 'Hermiona|Ron Weasley|Szkoła magii'],
      hard: ['Kleopatra|Nefretete|Egipt', 'Napoleon|Juliusz Cezar|Wódz', 'Robin Hood|Janosik|Legenda', 'Don Kichot|Sancho Pansa|Rycerz', 'Leonardo da Vinci|Michał Anioł|Renesans', 'Nikola Tesla|Thomas Edison|Elektryczność', 'Pan Twardowski|Faust|Legenda', 'Lara Croft|Indiana Jones|Poszukiwacz', 'Geralt|Aragorn|Miecz', 'Jan III Sobieski|Bolesław Chrobry|Król', 'Darth Vader|Voldemort|Złoczyńca', 'Hamlet|Romeo|Dramat']
    },
    miejsca: {
      name: 'Miejsca', icon: '🗺️',
      easy: ['Plaża|Basen|Woda', 'Szkoła|Przedszkole|Nauka', 'Szpital|Przychodnia|Zdrowie', 'Zoo|Cyrk|Zwierzęta', 'Kino|Teatr|Wieczór', 'Lotnisko|Dworzec|Podróż', 'Kościół|Klasztor|Cisza', 'Sklep|Bazar|Zakupy', 'Las|Park|Drzewa', 'Restauracja|Kawiarnia|Jedzenie', 'Góry|Wulkan|Wysoko', 'Biblioteka|Księgarnia|Spokój'],
      medium: ['Paryż|Rzym|Europa', 'Kraków|Gdańsk|Polska', 'Egipt|Grecja|Wakacje', 'Muzeum|Galeria|Sztuka', 'Stadion|Hala sportowa|Kibice', 'Więzienie|Komisariat|Prawo', 'Bank|Kantor|Pieniądze', 'Siłownia|Sala gimnastyczna|Wysiłek', 'Cmentarz|Kaplica|Zaduma', 'Lunapark|Aquapark|Zabawa', 'Statek|Prom|Morze', 'Wieża Eiffla|Krzywa Wieża|Zabytek'],
      hard: ['Machu Picchu|Chichen Itza|Ruiny', 'Antarktyda|Arktyka|Biel', 'Wenecja|Amsterdam|Romantyczne', 'Sahara|Gobi|Piasek', 'Watykan|Monako|Mały kraj', 'Wielki Mur Chiński|Mur Berliński|Granica', 'Las Vegas|Monte Carlo|Światła', 'Atlantyda|Eldorado|Legenda', 'Stacja kosmiczna|Łódź podwodna|Ciasno', 'Latarnia morska|Wieża ciśnień|Wysoka budowla', 'Kopalnia soli|Jaskinia|Pod ziemią', 'Bermudy|Malediwy|Wyspy']
    },
    przedmioty: {
      name: 'Przedmioty', icon: '📦',
      easy: ['Krzesło|Stół|Meble', 'Parasol|Kurtka|Pogoda', 'Telefon|Tablet|Codziennie', 'Klucz|Kłódka|Drzwi', 'Okulary|Soczewki|Wzrok', 'Zegarek|Bransoletka|Nadgarstek', 'Lampa|Świeca|Światło', 'Łóżko|Kanapa|Wygodne', 'Kubek|Szklanka|Picie', 'Plecak|Torba|Noszenie', 'Nożyczki|Nóż|Ostre', 'Szczoteczka do zębów|Grzebień|Łazienka'],
      medium: ['Lustro|Okno|Szkło', 'Poduszka|Kołdra|Sen', 'Drabina|Schody|Wysoko', 'Portfel|Skarbonka|Pieniądze', 'Mikrofon|Głośnik|Dźwięk', 'Kalendarz|Zegar|Czas', 'Konewka|Wiadro|Ogród', 'Młotek|Śrubokręt|Narzędzia', 'Pędzel|Wałek|Malowanie', 'Kompas|Mapa|Kierunek', 'Patelnia|Garnek|Kuchnia', 'Żarówka|Latarka|Prąd'],
      hard: ['Klepsydra|Metronom|Czas', 'Lupa|Mikroskop|Powiększenie', 'Wachlarz|Wentylator|Lato', 'Termometr|Barometr|Pomiar', 'Żyrandol|Abażur|Dom', 'Monokl|Lornetka|Oko', 'Hamak|Leżak|Relaks', 'Kowadło|Imadło|Warsztat', 'Pozytywka|Katarynka|Melodia', 'Samowar|Czajnik|Coś gorącego', 'Spinacz|Zszywacz|Biuro', 'Pałeczki|Sztućce|Jedzenie']
    },
    technologia: {
      name: 'Technologia', icon: '💻',
      easy: ['Komputer|Laptop|Ekran', 'Smartfon|Smartwatch|Dotyk', 'Telewizor|Monitor|Oglądanie', 'Słuchawki|Głośnik|Muzyka', 'Aparat|Kamera|Zdjęcia', 'Robot|Dron|Maszyna', 'Ładowarka|Powerbank|Prąd', 'Drukarka|Skaner|Papier', 'Myszka|Klawiatura|Biurko', 'Pilot|Joystick|Przyciski', 'Wi-Fi|Bluetooth|Bez kabla', 'Bateria|Akumulator|Energia'],
      medium: ['Sztuczna inteligencja|Robot|Przyszłość', 'Wirtualna rzeczywistość|Rozszerzona rzeczywistość|Inny świat', 'Pendrive|Dysk twardy|Dane', 'Procesor|Karta graficzna|Wnętrze komputera', 'Hasło|PIN|Bezpieczeństwo', 'Aplikacja|Program|Instalacja', 'Satelita|Rakieta|Orbita', 'Drukarka 3D|Ploter|Tworzenie', 'Router|Modem|Sieć', 'Nawigacja|Kompas|Droga', 'Hulajnoga elektryczna|Rower elektryczny|Miasto', 'Kod QR|Kod kreskowy|Skanowanie'],
      hard: ['Blockchain|Kryptowaluta|Zdecentralizowane', 'Algorytm|Instrukcja|Kroki', 'Chmura|Serwer|Przechowywanie', 'Hologram|Projektor|Obraz', 'Nanotechnologia|Mikroelektronika|Coś małego', 'Komputer kwantowy|Superkomputer|Moc', 'Haker|Wirus|Atak', 'Firewall|Antywirus|Ochrona', 'Open source|Freeware|Darmowe', 'Tranzystor|Półprzewodnik|Elektronika', 'Laser|Światłowód|Wiązka', 'Big Data|Statystyka|Liczby']
    },
    internet: {
      name: 'Internet', icon: '🌐',
      easy: ['YouTube|TikTok|Filmiki', 'Mem|GIF|Śmieszne', 'Emoji|Naklejka|Czat', 'Selfie|Zdjęcie grupowe|Telefon', 'Instagram|Facebook|Social media', 'Lajk|Komentarz|Reakcja', 'Hasło|Login|Konto', 'Google|Wikipedia|Szukanie', 'Youtuber|Streamer|Kamera', 'E-mail|SMS|Wiadomość', 'Hashtag|Wzmianka|Symbol', 'Netflix|Disney+|Seriale'],
      medium: ['Influencer|Celebryta|Obserwujący', 'Spam|Reklama|Irytujące', 'Transmisja na żywo|Webinar|Kamera', 'Discord|Messenger|Rozmowy', 'Podcast|Audiobook|Słuchanie', 'Fake news|Plotka|Nieprawda', 'Clickbait|Nagłówek|Kliknij', 'Hejt|Trolling|Negatywne', 'Subskrypcja|Abonament|Płatność', 'Unboxing|Recenzja|Produkt', 'Viral|Trend|Popularne', 'Challenge|Trend|Naśladowanie'],
      hard: ['Phishing|Scam|Oszustwo', 'Algorytm|Rekomendacja|Dopasowanie', 'Cookies|Historia przeglądania|Śledzenie', 'VPN|Proxy|Ukrywanie', 'Darknet|Deep web|Ukryte', 'Captcha|Weryfikacja|Test', 'NFT|Bitcoin|Cyfrowe', 'Ghosting|Ban|Ignorowanie', 'Doomscrolling|Binge-watching|Za długo', 'Cringe|Żenada|Niezręczne', 'Boomer|Zoomer|Pokolenie', 'Avatar|Nick|Tożsamość']
    },
    szkola: {
      name: 'Szkoła', icon: '🎒',
      easy: ['Nauczyciel|Dyrektor|Klasa', 'Tablica|Kreda|Ściana', 'Piórnik|Plecak|Przybory', 'Długopis|Ołówek|Pisanie', 'Zeszyt|Podręcznik|Notatki', 'Przerwa|Wakacje|Odpoczynek', 'Matematyka|Fizyka|Przedmiot', 'Kartkówka|Sprawdzian|Stres', 'WF|Taniec|Ruch', 'Dzwonek|Alarm|Dźwięk', 'Ławka|Krzesło|Siedzenie', 'Linijka|Ekierka|Mierzenie'],
      medium: ['Świadectwo|Dyplom|Koniec roku', 'Wycieczka szkolna|Zielona szkoła|Wyjazd', 'Woźny|Ochroniarz|Korytarz', 'Dziennik|Oceny|Wpisy', 'Stołówka|Sklepik szkolny|Jedzenie', 'Ściąga|Podpowiedź|Oszukiwanie', 'Biologia|Chemia|Przedmiot', 'Apel|Akademia|Uroczystość', 'Wywiadówka|Zebranie|Rodzice', 'Szatnia|Korytarz|Buty', 'Samorząd|Przewodniczący|Wybory', 'Globus|Mapa|Geografia'],
      hard: ['Matura|Egzamin ósmoklasisty|Ważny test', 'Olimpiada przedmiotowa|Konkurs|Najlepsi', 'Erasmus|Wymiana|Zagranica', 'Wagary|Spóźnienie|Nieobecność', 'Kujon|Prymus|Uczeń', 'Korepetycje|Kółko zainteresowań|Dodatkowe', 'Rozprawka|Wypracowanie|Pisanie', 'Tablica interaktywna|Rzutnik|Prezentacja', 'Internat|Akademik|Mieszkanie', 'Legitymacja|Indeks|Dokument', 'Poprawka|Promocja|Wyniki', 'Pedagog|Psycholog|Rozmowa']
    },
    zawody: {
      name: 'Zawody', icon: '👷',
      easy: ['Lekarz|Pielęgniarka|Szpital', 'Strażak|Policjant|Pomoc', 'Kucharz|Kelner|Restauracja', 'Pilot|Steward|Samolot', 'Fryzjer|Kosmetyczka|Wygląd', 'Rolnik|Ogrodnik|Ziemia', 'Listonosz|Kurier|Dostawa', 'Piekarz|Cukiernik|Wypieki', 'Weterynarz|Hodowca|Zwierzęta', 'Kierowca|Taksówkarz|Auto', 'Piosenkarz|Muzyk|Scena', 'Malarz|Rzeźbiarz|Sztuka'],
      medium: ['Prawnik|Sędzia|Sąd', 'Architekt|Inżynier|Projekt', 'Dentysta|Ortodonta|Uśmiech', 'Programista|Grafik|Komputer', 'Dziennikarz|Prezenter|Media', 'Ratownik|Ochroniarz|Bezpieczeństwo', 'Mechanik|Elektryk|Naprawa', 'Astronauta|Pilot|Wysoko', 'Aktor|Model|Sława', 'Księgowy|Bankier|Liczby', 'Fotograf|Operator kamery|Obraz', 'Żołnierz|Policjant|Mundur'],
      hard: ['Archeolog|Paleontolog|Wykopaliska', 'Notariusz|Adwokat|Dokumenty', 'Sommelier|Barman|Smak', 'Saper|Pirotechnik|Niebezpieczne', 'Anestezjolog|Chirurg|Operacja', 'Geodeta|Kartograf|Pomiary', 'Ambasador|Dyplomata|Polityka', 'Dietetyk|Trener personalny|Zdrowie', 'Kominiarz|Dekarz|Dach', 'Tłumacz|Lektor|Języki', 'Florysta|Ogrodnik|Kwiaty', 'Zegarmistrz|Jubiler|Precyzja']
    },
    trudne: {
      name: 'Trudne słowa', icon: '🧠',
      easy: ['Echo|Cień|Powtórzenie', 'Sen|Marzenie|Noc', 'Wiatr|Burza|Pogoda', 'Tęcza|Zorza polarna|Kolory', 'Cisza|Spokój|Brak', 'Czas|Wiek|Zegar', 'Muzyka|Taniec|Rytm', 'Miłość|Przyjaźń|Uczucie', 'Strach|Wstyd|Emocja', 'Ogień|Dym|Ciepło', 'Lód|Śnieg|Zimno', 'Gwiazda|Planeta|Niebo'],
      medium: ['Grawitacja|Magnetyzm|Siła', 'Demokracja|Monarchia|Władza', 'Nostalgia|Tęsknota|Przeszłość', 'Déjà vu|Przeczucie|Dziwne uczucie', 'Inflacja|Kryzys|Ekonomia', 'Ewolucja|Mutacja|Zmiana', 'Horoskop|Tarot|Przyszłość', 'Paradoks|Zagadka|Logika', 'Iluzja|Miraż|Złudzenie', 'Recykling|Kompost|Ekologia', 'Sumienie|Instynkt|Wnętrze', 'Karma|Przeznaczenie|Los'],
      hard: ['Entropia|Chaos|Nieład', 'Prokrastynacja|Lenistwo|Odkładanie', 'Hipokryzja|Kłamstwo|Fałsz', 'Metafora|Porównanie|Język', 'Empatia|Współczucie|Uczucie', 'Utopia|Raj|Ideał', 'Synestezja|Halucynacja|Zmysły', 'Absurd|Groteska|Dziwność', 'Ironia|Sarkazm|Ton', 'Biurokracja|Formalność|Papiery', 'Melancholia|Smutek|Nastrój', 'Archetyp|Stereotyp|Wzór']
    }
  };

  const DIFFICULTIES = {
    easy: 'Łatwy',
    medium: 'Średni',
    hard: 'Trudny',
    mixed: 'Mieszany'
  };

  function parse(entry) {
    const [word, similar, hint] = entry.split('|');
    return { word, similar: similar || '', hint: hint || '' };
  }

  function countWords() {
    let n = 0;
    for (const k in CATEGORIES) n += CATEGORIES[k].easy.length + CATEGORIES[k].medium.length + CATEGORIES[k].hard.length;
    return n;
  }

  return { CATEGORIES, DIFFICULTIES, parse, countWords };
});
