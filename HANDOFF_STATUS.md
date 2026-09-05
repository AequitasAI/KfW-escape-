# HANDOFF STATUS

## Letzter stabiler Commit
Siehe `git log -1` auf `claude/mvp-build`.

## Aktueller Stand
- [x] Phase 0 Repo Setup
- [x] Phase 1 Multiplayer Foundation
- [x] Phase 2 Puzzle Engine
- [x] Phase 3 Game Flow
- [x] Phase 4 UI / Game Feel
- [x] Phase 5 Hardening
- [x] Branding-Entscheidung dokumentiert und umgesetzt (`docs/BRANDING_INTEGRATION.md`)
- [x] Fantasy-Ebene als SVG (Szenen, Betriebszwerg, Schwarzer Wächter)
- [x] Acht gerenderte Szenen-Illustrationen eingebunden
- [x] Gemalte Figuren-Illustrationen (Zwerg 3 Stimmungen, Wächter 2 Zustände)
- [x] Art Direction auf warme Märchenfantasy umgestellt (kein Cyan, Cinzel/EB Garamond, KfW-Flavour)
- [x] Login der Spielleitung (`HOST_PASSWORD`), Steuerung von jedem Gerät aus
- [x] Dreissig Sigel der Gefährten, serverseitig und dopplungsfrei vergeben
- [x] Rätsel 4 als Kettenrätsel mit Steckverbindungen, Eindeutigkeit bewiesen
- [x] Vorspann mit 30 s Lesezeit; jeder geht selbst vor, das Rätsel öffnet für alle gemeinsam
- [x] Prüfung bleibt nie ohne Gefährten stehen (Zusicherung im Tick statt Einmalangebot)
- [x] Gezielte Übergabe der Prüfung durch Gefährte und Spielleitung
- [x] Rätsel 2 zeigt Ein- und Austritt am Brett statt nur im Hinweistext
- [x] Übungsraum `/demo`: alle fünf Prüfungen ohne Session, ohne Anmeldung, ohne Gefährten
- [x] Rätsel 4 lesbar (Steintafel statt blanker Glut) und ohne Seitenüberlauf auf dem Telefon
- [x] Rätsel 3 als Fehlersuche in zwei gezeichneten Prüfplänen, fünf subtile Abweichungen
- [x] Rätsel 4 auf die Maschine reduziert: kein Erklärtext, Drehen am Rad, zwei Kettenlagen
- [x] Falscher Sieg nach dem Schwarzen Tor und eine sechste, verborgene Prüfung
- [x] Lore-Pass: die Förderwelt als Landkarte, rund zwanzig Anspielungen im Hintergrund

## Funktioniert

**Multiplayer**
- Session erstellen, QR-Code (SVG), Join-Link, Beitritt ohne Login (nur Anzeigename).
- Identität über servergenerierte UUID + Token, HttpOnly-Cookie plus localStorage-Spiegel.
- Reload/Reconnect stellt Spieler und Spielzustand wieder her.
- Serverneustart: laufende Sessions werden aus SQLite geladen und pausiert, damit keine
  Zeit verloren geht; ein Klick auf „Fortsetzen“ läuft weiter.
- 30 gleichzeitige Clients getestet (`packages/server/test/load.test.ts`).

**Spielleitung**
- Optionaler Login über `HOST_PASSWORD`. Ist er gesetzt, kann die Spielleitung sich von jedem
  Gerät anmelden, laufende Sessions auflisten und übernehmen – der Host-Schlüssel ist dann nicht
  mehr an den erstellenden Browser gebunden. Ohne Passwort bleibt das alte Verhalten.
- Mit Login setzt auch das Anlegen einer Session die Anmeldung voraus.
- Signaturschlüssel liegt in SQLite, ein Neustart meldet die Spielleitung also nicht ab.
- Zehn **Fehlversuche** pro fünf Minuten und Quell-IP sperren den Login; erfolgreiche Anmeldungen
  zählen nicht mit, sonst sperrt sich ein Büro hinter einem NAT selbst aus. Passwortvergleich in
  konstanter Zeit, Token HMAC-signiert und nach 12 Stunden abgelaufen.
- Teilnehmende sind davon unberührt: weiterhin nur Anzeigename, kein Konto.

**Sigel**
- Dreissig Sigel, vom Server zufällig und ohne Dopplung vergeben, in Lobby, Hostliste,
  Grossbildansicht und Gefährten-Einblendung identisch.
- Als SVG gezeichnet; gemalte Wappen lassen sich einzeln darüberlegen.

**Autorisierung**
- Jede `puzzle:action` durchläuft serverseitig die fünf Prüfungen aus WEBSOCKET_EVENTS.md.
- Nicht-Solver werden serverseitig abgewiesen, auch wenn sie das Event direkt senden.
- Host-Aktionen erfordern das Host-Secret aus der Socket-Auth.
- Rate-Limits auf Join, Session-Anlage, Socket-Controls und Puzzle-Aktionen.

**Timer**
- Serverautoritär aus `startedAt` / `totalPausedMs` / `bonusMs`.
- Reload, Tab-Wechsel und Backgrounding verändern die verbleibende Zeit nicht (E2E-geprüft).
- Pause/Resume, +30 s als markierter Host-Eingriff, harter Verlust bei 00:00.

**Rätsel** – alle fünf vollständig, alle Lösungen automatisiert bewiesen:
| # | Beweis | Ergebnis |
|---|---|---|
| 1 | 120 Permutationen gegen die drei Hinweise | genau eine Lösung |
| 2 | Startzustand aus 15 legalen Slides erzeugt, BFS-Solver | lösbar in 13 optimalen Zügen (Ziel 8–16) |
| 3 | Hotspot-Registry | genau vier, jeder einmal zählbar |
| 4 | alle 8⁵ = 32768 Konfigurationen enumeriert | genau eine Lösung `[2,1,4,4,3]`, Verzweigung 3→5→3→4→4→1 |
| 5 | alle 1000 Codes gegen die fünf Aussagen | genau einer (`042`) |

**Views**
- `/`, `/host`, `/host/:code`, `/join/:code`, `/game/:code`, `/display/:code`.
- Display-Ansicht ohne jede Adminsteuerung, ohne Debugdetails, ohne rohe Zustände (E2E-geprüft).
- Host-Ansicht mit allen Failsafes plus technischem Status inkl. aktiver Token-Quelle.

**Game Feel**
- Alle Pflichtanimationen umgesetzt, sämtlich über Motion-Tokens, die
  `prefers-reduced-motion` respektieren.
- Soundarchitektur ohne Audio-Assets (kurze WebAudio-Cues), Mute jederzeit erreichbar,
  kein Autoplay vor einer Nutzerinteraktion.
- Mobile-first ab 320 px, keine horizontale Seiten-Scrollbar; das Zahnradpuzzle scrollt
  auf schmalen Geräten in seinem eigenen Container.
- Accessibility: Tastaturbedienung, sichtbare Fokuszustände, 44-px-Touchziele,
  Tap-/Keyboard-Alternative zu jeder Drag-Interaktion, Status nie nur über Farbe.

## Bewusste Abweichung von der Spec: Rätsel 4 (Stand 2)

`03_puzzles/PUZZLE_SPEC.md` gibt Profilwerte 1/2/3 mit der Regel „Summe 4" vor. Auf Ansage des
Auftraggebers ist daraus ein echtes **Kettenrätsel mit Steckverbindungen** geworden:

- Vier Formen – Dreieck, Kreis, Quadrat, Diamant – je als **Zapfen** und als **Kerbe**.
  Es greift nur gleiche Form mit entgegengesetzter Ausprägung.
- Fünf drehbare Räder zwischen einem **festen Motor** links und dem **festen Tor** rechts.
  Sechs Kontakte. Die festen Enden verankern die Kette und verhindern Drehsymmetrie.
- **Lokale Mehrdeutigkeit ist Absicht.** Rad I trägt drei Dreieck-Kerben, nimmt den Motor also in
  drei Stellungen auf – gegenüber sitzen aber drei verschiedene Zapfen, sodass rechts einmal
  Quadrat, einmal Diamant, einmal Dreieck herauskommt. Ein Kontakt für sich zu lösen bringt nichts.
- Ein passender Kontakt **leuchtet einzeln**, auch wenn die Gesamtlösung falsch ist. Das ist hier
  unbedenklich, weil lokal richtig nicht mehr global richtig heisst.

Nachgewiesen durch `enumerateGearSolutions()` über alle 8^5 = 32 768 Stellungen: **genau eine
Lösung** `[2,1,4,4,3]`. `chainBranching()` belegt die Mehrdeutigkeit: 3 → 5 → 3 → 4 → 4 → 1
lebende Teilketten. Beides ist Test, nicht Kommentar.

Aufbauwissen für spätere Änderungen: Links- und Rechtsanschluss eines Rades liegen immer genau
gegenüber (vier Sektoren auseinander). Ein Rad ist damit nichts als vier gegenüberliegende Paare –
darüber steuert man, wie viele Eingänge lokal passen und was dabei rechts herauskommt. Eine
Zufallssuche über Millionen Layouts fand **kein einziges** brauchbares: Ein exakter Treffer aus Form
*und* Ausprägung ist pro Anschluss nur 1:8. Das Layout ist deshalb konstruiert und anschliessend
bewiesen, nicht gesucht.

### Vorgänger: Zapfen-und-Loch-Fassung

`03_puzzles/PUZZLE_SPEC.md` gibt fünf Räder mit Profilwerten 1/2/3 und der Regel „Summe 4" vor,
Lösung `[0,3,3,6,7]`. Diese Regel bildet sich **nicht zeichnen**: `2+2` ergibt laut Regel einen
Treffer, gezeichnet stossen dort aber zwei gleich lange Zähne zusammen. Man konnte also optisch
nichts erkennen und hat nur auf die Kontaktlampen geschaut – womit das Rätsel darauf hinauslief,
jedes Rad einmal blind durchzudrehen.

Auf ausdrückliche Ansage des Auftraggebers ist die Mechanik jetzt eine echte:

- drei Sorten Rand statt Zahlenwerten – **Zapfen**, **Loch**, **glatter Rand**
- ein Rad treibt seinen rechten Nachbarn, wenn es ihm einen Zapfen zuwendet und dort ein Loch steht
- alle Räder sind gleich gross; unterschiedlich ist nur, wo die Merkmale sitzen

Die Eindeutigkeit hängt an einer nachweisbaren Eigenschaft: Jedes treibende Rad hat **genau einen
Zapfen**, wodurch „Zapfen zeigt nach rechts" seine Stellung festlegt; das Torrad hat genau ein Loch.
Mit der alten Summenregel war Eindeutigkeit bei mehr als einem Loch je Rad nachweislich unmöglich –
eine Zufallssuche über 400 000 Radsätze fand keinen einzigen passenden. Neue Lösung `[0,3,6,2,5]`,
zehn Drehungen ab Start, weiterhin durch vollständige Aufzählung aller 4096 Zustände bewiesen.

## Offen / bewusst nicht gemacht
- **Figuren-Illustrationen.** Die acht Szenen sind als gerenderte WebP eingebunden. Betriebszwerg
  und Schwarzer Wächter laufen noch als SVG und fallen gegen die gemalten Hintergründe sichtbar ab.
  Der Austausch ist vollständig vorbereitet: `character_operations_dwarf[_neutral|_skeptical|_happy]`
  und `character_black_guard[_open]` nach `packages/web/public/art/characters/` legen, freigestellt
  mit Transparenz – mehr nicht. Existiert nur eine Zwergendatei, nutzen alle drei Stimmungen sie,
  damit nie eine Zeichnung neben einer Illustration steht.
- **Hintergrund zum Artwork.** Das Handoff-Paket enthielt kein produktives Artwork – nur
  zwei als Mood-Referenz deklarierte PNGs; `ASSET_BRIEF.md` untersagt in Zeile 1 sogar ausdrücklich,
  vor abgestimmter Art Direction finale Illustrationen zu erzeugen. Die Fantasy-Ebene ist deshalb
  vollständig als handgezeichnetes SVG umgesetzt (acht Szenen, Betriebszwerg mit drei Stimmungen,
  Schwarzer Wächter). Für gerenderte Bilder liegt eine Drop-in-Pipeline bereit: Datei unter dem
  vorgegebenen Namen nach `packages/web/public/art/` legen, fertig – eine fehlende Datei zeigt nie
  ein kaputtes Bild. Fertige Generierungs-Prompts: `08_assets/IMAGE_PROMPTS.md`,
  Ablauf: `docs/ARTWORK.md`.
- **Echte openKfW-Tokens.** Das npm-Paket ist EOL und leer, Repository und Demo-Seite waren aus
  der Build-Umgebung nicht erreichbar. Statt eines von der Spec verbotenen Pins auf eine
  deprecated Version liegt ein austauschbarer Token-Contract vor. Einspielen: ein Import,
  siehe `docs/BRANDING_INTEGRATION.md`.
- **Docker-Image nicht gebaut.** In dieser Umgebung läuft kein Docker-Daemon
  (`/var/run/docker.sock` fehlt). Dockerfile und Compose-Datei sind vollständig, der
  Produktionsmodus wurde stattdessen direkt verifiziert: ein Node-Prozess liefert SPA,
  Deep-Links, Assets und API auf einem Port aus. Der Image-Build ist auf dem Zielhost
  einmal auszuführen (`docker compose up --build -d`).
- Safari iOS ist nicht getestet, in dieser Umgebung steht nur Chromium zur Verfügung.

## Behobener Fehler: Prüfung ohne Gefährten

**Beobachtung.** Mit genau einer Person in der Session wurde nach dem Start niemand als Gefährte
gewählt. Nur „Gefährten neu ziehen" von Hand kam da wieder heraus.

**Ursache.** Das Angebot wurde genau **einmal** ausgesprochen – beim Öffnen der Prüfung in
`enterPuzzle()`. War in diesem Augenblick niemand verbunden, lieferte `choose()` `null`, der Status
blieb auf `WAITING_FOR_SOLVER`, und **nichts versuchte es je wieder**. Die Absenz-Erkennung im Tick
griff nicht, weil sie einen vorhandenen, aber getrennten Gefährten voraussetzt (`active &&
!active.connected`) – bei gar keinem Gefährten lief sie in den `else`-Zweig.

Bei einer einzelnen Person genügt eine Sekunde ohne Verbindung: Bildschirmsperre, Tabwechsel,
Reload oder Netzwechsel genau im Übergang. Deshalb trat es sporadisch auf und liess sich schwer
nachstellen.

**Behebung.** Zwei Stellen, beide an der Ursache:

1. `tick()` hält jetzt die Zusicherung aufrecht: *läuft eine Prüfung, gibt es einen Gefährten* –
   angeboten oder angenommen. Fehlt er und ist jemand verbunden, wird neu angeboten. Ein Verweis auf
   eine inzwischen verschwundene Person zählt dabei als „keiner".
2. `setConnected(…, true)` bietet die Prüfung sofort an, wenn sie ohne Gefährten dasteht – ohne auf
   den nächsten Tick zu warten.

Kein Workaround im Client, keine Sonderbehandlung für eine einzelne Person.

**Tests.** Sieben neue Fälle: eine Person, mehrere Personen, Abbruch genau im Übergang mit
Wiederverbinden, Auffangen durch den Tick ohne Wiederverbinden, gar niemand verbunden (kein
Absturz, Erholung danach), Ablehnen zieht sofort nach, kurzer Verbindungsabbruch verliert den
Gefährten nicht.

## Gezielte Übergabe der Prüfung

Der Gefährte kann die Prüfung jetzt **gezielt** weitergeben statt nur zufällig. Die Auswahl zeigt
alle verbundenen Personen ausser einem selbst; wer noch nicht dran war, steht oben, wer schon dran
war oder abgelehnt hat, bleibt sichtbar und wird gekennzeichnet – in einer kleinen Runde ist
irgendwann jeder einmal dran gewesen, und dann darf die Liste nicht leer sein. „Zufällig auswählen"
bleibt daneben bestehen. Die Spielleitung hat dieselbe Auswahl.

Geprüft wird serverseitig und vollständig (`handOverTo`): Ziel existiert, gehört zur Session, ist
verbunden, ist nicht schon aktiv, und die auslösende Person hält die Prüfung tatsächlich. Ein
früheres Ablehnen der Zielperson wird durch die gezielte Wahl aufgehoben.

## Rätsel 2: Ein- und Austritt sind jetzt sichtbar

**Ursache der Unklarheit.** Quelle und Ziel waren HTML-Kästen **neben** dem Brett und vertikal
zentriert. Sie zeigten damit prinzipbedingt nicht auf ihre Reihe – die Einspeisehöhe stand nur im
Hinweistext, und der musste sie deshalb ansagen.

**Jetzt.** Beide liegen im selben SVG wie das Brett, auf der Höhe ihrer tatsächlichen Reihe:
ein glühender Runenstein links mit Kanal ins Startfeld, eine versiegelte Kristallfassung rechts am
Austrittsfeld. Die betroffenen Reihen sind zusätzlich am Rahmen markiert. Die Platten sind Stein mit
eingelassener Fase und vergoldeten Runenkanälen statt nackter Kacheln; die Energie fliesst sichtbar
von der Quelle bis in die Fassung.

Der Hinweistext konnte dadurch von einer Wegbeschreibung auf einen Tipp zur Vorgehensweise
zurückgenommen werden.

## Übungsraum: `/demo`

**Zweck.** Die Rätsel testen und verbessern, ohne jedes Mal eine Session anzulegen, sich als
Spielleitung anzumelden und Gefährten zu verteilen. `/demo` öffnet direkt die erste Prüfung,
`/demo/1` bis `/demo/5` springen gezielt hinein.

**Bauart.** Der Übungsraum baut nichts nach. Die Rätsellogik liegt als reines
`createPuzzleState` / `reducePuzzle` in `@kfw-escape/shared` – derselbe Code, den der Server im
echten Spiel fährt. `DemoView` hält diesen Zustand einfach im React-State statt in einer Session
und rendert dieselbe `PuzzleHost`-Komponente wie Spieler-, Host- und Grossbildansicht. Damit kann
der Übungsraum gar nicht vom Spiel abweichen: Was hier funktioniert, funktioniert am Spieleabend
genauso.

Kein Socket, keine Uhr, keine Solver-Prüfung – `interactive` ist immer wahr. Es gibt also auch
nichts zu autorisieren: Die Route berührt weder Sessions noch den Host-Schlüssel und kann keine
laufende Runde beeinflussen. Sie ist bewusst auch in der Produktion erreichbar, weil genau dort
getestet wird; von der Startseite führt ein kleiner Link unten hinein, damit er am Spieleabend
nicht mit dem Beitritt verwechselt wird.

**Werkbank.** Unter der Bühne: Prüfung zurücksetzen, Hinweis ein-/ausblenden, vor und zurück,
Sprungleiste über alle fünf Stationen (gelöste tragen ein Häkchen) und dieselbe eingeklappte
Lösung, die die Spielleitung sieht. `SolutionPanel` nimmt dafür jetzt den Rätselzustand statt
eines Snapshots entgegen – die Demo hat keinen.

Anders als die Gefährtenleiste im Spiel klebt diese Leiste nicht am unteren Rand: Sie ist deutlich
höher und hätte auf dem Telefon sonst das halbe Rätsel verdeckt.

## Rätsel 4: Lesbarkeit und Telefon

Beim Testen im Übungsraum aufgefallen.

**Lesbar.** Erklärtext und Kontaktliste lagen blank auf dem Minen-Hintergrund – Glut, Streben und
Fackeln unter kleiner Schrift. Sie liegen jetzt auf derselben Steintafel wie die Inschrift im
Archiv und die Aussagen des Wächters (fast deckend plus Weichzeichner, weil die Glut sonst
durchschlägt); die Schlusszeile („Die Maschine steht still.") bekommt dieselbe Fläche, damit sie
nicht als einzige wieder auf dem Feuer liegt.

**Telefon.** Die Seite liess sich auf einem Handy seitlich schieben, ein Teil des Rätsels stand
ausserhalb des Bildes. Zwei Ursachen, beide gemessen statt geraten:
1. Der Betriebszwerg war absolut positioniert (`right: 0`), seine Sprechblase aber breiter als der
   Kasten – er ragte 151 px nach rechts heraus. Unter 40 rem steht er jetzt im Fluss unter der
   Maschine.
2. Fünf Regler nebeneinander brauchen mindestens 480 px. Unter 40 rem brechen sie um
   (`auto-fit`, drei plus zwei) statt zu schrumpfen; die Knöpfe bleiben 44 px.
   Wichtig dabei: Die Reglerreihe ist ein Flex-Element und wird sonst nur so breit wie ihr Inhalt –
   ohne `width: 100%` fällt `auto-fit` auf eine einzige Spalte zurück.

Ein E2E-Test hält das fest: `/demo/4` bei 360 px Breite, `scrollWidth <= clientWidth`, Knopfgrösse
mindestens 44 px.

## Der falsche Sieg und die letzte Prüfung

**Dramaturgie.** Nach dem Schwarzen Tor glaubt die Gruppe, gewonnen zu haben: fünf Siegel, offenes
Tor, die Brücke baut sich auf, „Die Brücke erwacht – der Weg liegt frei". Nach drei Sekunden kippt
es: Grollen, die Energie steht still, mitten auf der Brücke steigt ein Tor aus dem Stein, „Eine
letzte Prüfung bleibt". Erst danach öffnet die Prüfung des Runenmeisters.

**Als Phase, nicht als Animation.** `FALSE_VICTORY` ist ein eigener Sitzungszustand (6,5 s), getaktet
vom Server über `phaseEndsAt`. Ein lokaler Timer je Gerät würde um Sekunden auseinanderlaufen – und
genau in dieser Sekunde liegt der ganze Effekt. Die Spielleitung kann überspringen („Weiter zur
letzten Prüfung"); bei `prefers-reduced-motion` bleiben beide Bilder ohne Fahrt stehen, der Umschlag
selbst bleibt.

**Warum die sechste Station unsichtbar bleibt.** Prüfungen können `hidden` sein; der Server nimmt sie
aus `snapshot.puzzles`, bis die Gruppe bei ihnen ankommt. Stünde die sechste Station von Anfang an im
Fortschrittspfad, zählte man sie ab und der falsche Sieg wäre keiner. Aus demselben Grund zählt die
letzte Prüfung nicht als Siegel: `SEAL_COUNT` bleibt 5, nach dem Schwarzen Tor sind alle fünf da –
das ist Teil der Täuschung. Sie heisst deshalb auch „Die letzte Prüfung" und nicht „Station 6/5".

**Das Rätsel.** Drei Tore, drei Inschriften, genau eine davon wahr. Verlangt werden zwei Angaben: das
Tor, das den Weg freigibt, **und** die Inschrift, die als einzige wahr ist. Mit nur einer Angabe wäre
die letzte Hürde des Abends ein Ratespiel mit drei Feldern; mit beiden sind es neun Möglichkeiten,
und die richtige nennt nur, wer die Aussagen gegeneinander geprüft hat. Nach einer falschen Antwort
bleibt der Stein drei Sekunden stumm – keine Zeitstrafe, aber der Grund, warum sich Durchprobieren
nicht lohnt. Die Lösung steht nicht als Zahl im Code, sondern wird aus der Regel ausgerechnet;
`enumerateRuneMasterSolutions()` beweist im Test, dass es genau eine gibt.

## Lore-Pass: die Förderwelt als Landkarte

**Dosis.** Ein bis drei erkennbare Anspielungen pro Bild, alles andere bleibt Fantasy. Nichts davon
wird erklärt, nichts ist Teil einer Aufgabe, nichts muss man kennen, um zu gewinnen. Wer den Kontext
hat, erkennt es; wer nicht, sieht eine Kulisse.

**Wo sie stehen.** `packages/shared/src/lore.ts` hält alle Marken samt Ort in Prozent, Text und
Sichtbarkeit – neue Anspielungen brauchen keine Zeile Code, nur einen Eintrag. Gezeichnet werden sie
von `SceneLore` als eigene Ebene über dem Szenenbild und unter der Vignette.

Diese Ebene ist nötig, nicht bequem: Wo ein gemaltes Artwork liegt, verdeckt es das generierte
Szenen-SVG vollständig. Marken darin wären ausgerechnet in den Räumen unsichtbar, die am Spieleabend
tatsächlich zu sehen sind.

| Szene | Anspielungen |
|---|---|
| Vorhalle | Akademien von Studoria (174), Die Wohnlande (124), HuHi als dunkles Gebirge am Horizont |
| Archiv | Bildung – laufende Chroniken (173 · 174), Bestände vergangener Zeitalter (170), Gewölbe der Altschulden |
| Verbindung | Der sanierte Turm (261), Neue Höfe (297 · 298) |
| Prüfmeister | Erlass aus der Hauptstadt, BnD – Siegel der Durchführung; auf den Plänen „BAUREIHE 261", „AKTE 174", „PRÜFSTEMPEL · BnD" |
| Minen | „Freitags keine neuen Expeditionen.", Loren mit BnD/Bestand, Gilde des Aufstiegs (172) |
| Schwarzes Tor | Pult der Nachweise (BnD); der Wächter fragt bei jedem Fehlversuch knapper: „Nachweis?", „Berechtigung?", „Dokumentiert?" |
| Brücke | HuHi am Horizont, Studoria (173) |

**Regeln, die dabei galten.** Nur öffentlich bekannte Programmnummern und Aufgabenbereiche sowie die
im Projekt vorgegebenen Kürzel; keine Kunden-, Vertrags- oder Produktionsdaten; keine echten
Dokumente. Erlasse kommen von „der Hauptstadt" und nicht von einem Ministerium mit Namen – die
Zuständigkeiten haben sich zuletzt verschoben, und ein überholtes Kürzel wäre schlicht falsch.

**HuHi.** Der Witz gilt ausschliesslich dem Alter der Anwendung und dem Pflegeaufwand, nie dem Zweck
der Stiftung und nie den Menschen, um die es dort geht. Deshalb betritt man diese Hallen im Spiel
auch nicht. Erkennbar sind sie an drei Stellen: als „Die uralten Hallen von HuHi" am Horizont der
Vorhalle und der Brücke, und als gesperrter Stollen in den Minen. Dazu je eine Zeile über das Alter
der Wege – „Die Chroniken reichen weiter zurück als jede bekannte Release-Dokumentation.", „Nur
wenige kennen noch alle Wege durch diese Hallen.", „Man sagt, jeder Umbau weckt drei weitere
Abhängigkeiten." – und ein Spruch des Betriebszwergs über den gesperrten Stollen. Der Zweck der
Stiftung kommt nirgends vor, weder als Witz noch als Erklärung. Die Schreibweise bleibt „HuHi": aus
Versalien würde ein Wort, das niemandem etwas sagt.

**Der Erste Baumeister.** Ein Standbild in der Vorhalle, ohne Namen, mit einer freundlichen Zeile
(„Er soll gesagt haben, man müsse eine Brücke von beiden Seiten bauen."). Eine reale Person mit Namen
steht bewusst in keinem Artefakt dieses Repos – wer den Namen dennoch will, ändert eine Zeile in
`lore.ts`.

**Auch in der Sprache.** Jede Prüfung liegt jetzt in einem benannten Flügel, klein unter der Station:
Flügel der Bildung · Bestände, Werk der Wohnlande, Kammer der Nachweise, Stollen der
Bestandsführung, Wacht der Berechtigungen, Auf der Brücke. Der Vorspann benennt die Landkarte
(Chroniken der Bildung, Register der Wohnlande, die Gewölbe für Verpflichtungen aus vergangenen
Zeitaltern), das dritte Siegel heisst „Siegel der Durchführung", die Prüfmeister sagen, dass es das
erst nach der Prüfung gibt, und der Betriebszwerg hat zwei Sprüche dazubekommen („Bestand ist
Bestand. Auch nach dem dritten Zeitalter.").

**Auf dem Telefon** bleiben die Marken nur dort stehen, wo ohnehin gewartet wird – Vorhalle und
Brücke. In den Rätselräumen gehört der Platz dem Rätsel.

## Bekannte Bugs
- keine offenen

Beim Durchspielen im echten Browser gefunden und behoben:
1. Der Solver-Reveal verschwand nie – die Elternkomponente rendert im Sekundentakt neu,
   wodurch der Dismiss-Timer bei jedem Tick neu startete.
2. Der Betriebszwerg lag über den Zahnradreglern und fing auf dem Handy die Klicks ab.
3. Das Kabelbrett lief auf der Großbildansicht unter die Falz.
4. Das Join-Rate-Limit (20/min pro IP) hätte ein echtes Event zerstört: 30 Personen hinter
   einem Büro-NAT teilen sich eine IP, ab Person 21 wäre der Beitritt blockiert gewesen.
   Jetzt 120/min, über `JOIN_RATE_LIMIT` konfigurierbar.
5. `*.tsbuildinfo` lag neben `tsconfig.json` und war nicht ignoriert. Ein veralteter Stand im
   Docker-Kontext hätte `tsc -b` das Emittieren überspringen lassen – das Image wäre ohne
   Servercode ausgeliefert worden. Der Cache liegt jetzt in `dist/` und ist ignoriert.

## Tests
- `npm run verify` (Typecheck strict + Vitest): **96/96 grün**
  - 24 Rätsel-Unit-Tests inkl. der vier Eindeutigkeits-/Lösbarkeitsbeweise
  - 27 Server-Tests: Autorisierung, Solver-Regeln, Timer, kompletter Durchlauf, Failsafes,
    Identität, Neustart-Wiederherstellung
  - 1 Lasttest mit 30 gleichzeitigen Socket-Clients
  - 15 Tests zu Spielleitungs-Login (Token, Ablauf, Neustart, Sperre) und Sigel-Vergabe
- `npm run test:e2e` (Playwright gegen den echten Produktions-Build, mit gesetztem
  `HOST_PASSWORD`): **31/31 grün**
  - Beitritt, gleiche Namen, Reload-Wiederherstellung
  - Solver-Autorisierung, Weitergabe, Host-Reroll
  - Timer inkl. Reload und Pause/Resume
  - kompletter Durchlauf über alle fünf Prüfungen bis zum Sieg, synchron auf Player,
    Host und Display
  - `042` inkl. führender Null, falsche Codes ohne Zeitstrafe
  - Host-Failsafes, Barrierefreiheit der Runen ohne Drag
  - Anmeldung der Spielleitung von einem fremden Browser, Übernahme einer laufenden Session,
    Abweisung ohne Anmeldung, Anmeldung übersteht einen Reload
  - dreissig Sigel: eigenes Zeichen benannt, drei Spieler drei verschiedene Zeichen,
    identisch auf Host- und Grossbildansicht
  - Übungsraum: alle fünf Prüfungen ohne Session durchgespielt, Direktsprung über die URL,
    Zurücksetzen, Erreichbarkeit von der Startseite ohne jede Anmeldung
  - Rätsel 4 auf 360 px Breite ohne Seitenüberlauf, Regler bleiben 44 px

## Nächste Schritte
1. Auf dem Zielhost `docker compose up --build -d` ausführen und `PUBLIC_BASE_URL` setzen
   (siehe `docs/DEPLOYMENT.md`) – das ist der einzige noch nicht in dieser Umgebung
   ausführbare Schritt.
2. Sobald der maintained openKfW-Token-Build vorliegt: als
   `packages/web/src/styles/kfw-tokens.vendor.css` ablegen und in `styles/index.css`
   vor dem Contract importieren.
3. Optional finale Fantasy-Artworks nach `07_branding/approved_assets/` bzw. als
   Szenen-Hintergründe ergänzen und `--scene-image` je Szene setzen.

## Resume
Der MVP ist funktionsfähig, getestet, committet und gepusht. Für den nächsten Arbeitsschritt:

```bash
git checkout claude/mvp-build
npm install
npm run verify          # 87 Tests
npm run test:e2e        # 31 E2E-Tests, baut und startet die App selbst
npm run dev             # Host: http://localhost:5173/host
```
