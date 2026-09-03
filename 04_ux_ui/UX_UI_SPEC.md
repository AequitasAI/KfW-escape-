# UX / UI / Animation Spec

## Designprinzip

**Professionelle Corporate-UI × absurde Fantasywelt.**

Die Bedienoberfläche soll sauber, reduziert, responsiv und barrierearm wirken.
Fantasy lebt in Hintergründen, Figuren, Raumvisuals, Übergängen und Rätselillustrationen.
Keine "mittelalterliche Fantasy-Font" für Interface-Texte.

## Ansichten

### `/host`
Kontrollzentrum nur für Spielleiter.
- Session erstellen
- Join-Code
- QR-Code
- Teilnehmerliste
- Start/Pause
- aktueller Solver
- neu ziehen
- Puzzle überspringen
- Debug-/Statusanzeige

### `/join/:code`
- Sessioncode sichtbar
- Anzeigename
- "Der Reisegruppe beitreten"
- keine Passwort-/Mailfelder

### `/game/:code`
Spieleransicht.
- globaler Timer
- Station 1/5
- Solverstatus
- Rätsel
- bei Nicht-Solver: Interaktion disabled, aber alles sichtbar
- bei angebotenem Solver:
  - `PRÜFUNG ANNEHMEN`
  - `AN ANDEREN GEFÄHRTEN WEITERGEBEN`

### `/display/:code`
Für Teams-Screenshare/Beamer:
- keinerlei Adminbuttons
- große Typografie
- Timer
- Story/Rätsel
- Solvername
- animierter Fortschritt
- QR in Lobby, später ausblenden

## Lobby

Fantasy-"Reisegruppe".
Teilnehmernamen erscheinen live.
Beispiel:
> 17 Gefährten haben sich versammelt.

Host startet.

## Solver Reveal

Kurze 1–2 s Sequenz:
> Der nächste Gefährte wird bestimmt …
> **MARKUS**

Nicht blockierend länger als 2 s.
`prefers-reduced-motion` beachten.

## Timer

- immer sichtbar
- Server-authoritativ
- ab 02:00 visuell dringlicher
- ab 00:30 dezente Puls-/Alarmwirkung
- kein hektisches Dauerblinken
- Mute-Schalter für Sounds

## Animationen

Pflicht:
- Raum-/Stationsübergang
- Siegel erscheint
- Kabel-Energiefluss
- Prüfmeister-Stempel
- Zahnrad-Finale
- Tor öffnet
- Brückenfinale
- Sieg/Niederlage

Animationen sollen Feedback geben, nicht nur Dekoration sein.

## Sound

Optional, lokal abgespielt:
- kurzer UI-Klick
- `clunk` bei korrektem Zahnradkontakt
- Maschinenstart
- Prüfmeister-Stempel
- Tor
- Finale
- Mute immer verfügbar
- nie Autoplay-Audio vor Nutzerinteraktion erzwingen

## Responsive

Mobile-first.
Minimum: 320 CSS px.
Displayansicht auf 16:9 optimieren, aber nicht daran koppeln.
Keine horizontale Seiten-Scrollbar.
Rätsel dürfen lokal scrollen, wenn unbedingt nötig.

## Barrierefreiheit

- Tastaturbedienung
- sichtbare Fokuszustände
- Touch-Ziele ca. 44 px
- keine Information nur durch Farbe
- Kontrast nach aktuellem internen Brand-Guide bzw. mindestens WCAG/BITV-tauglich
- Drag-Interaktionen immer mit Tap/Keyboard-Alternative
