# Game Spec – V1

## Titel

**Die Brücke zur Zwei-Programme-Welt**

Untertitel optional:
**Ein Fantasy-Escape-Adventure für das KBS-BA-Team**

## Elevator Pitch

Die große Umstellung steht bevor, doch die Brücke zur Zwei-Programme-Welt ist versiegelt. Das BA-Team muss fünf Prüfungen bestehen, fünf Siegel bergen und den letzten Wächter passieren. Die gesamte Gruppe hat genau 10 Minuten.

## Spielerzahl

Optimiert für **8–30 Personen**, technisch mindestens 2–50 unterstützen.

## Rollen

### Host / Spielleiter
- erstellt Session
- zeigt `/display/:code` per Teams/Beamer
- startet Spiel
- kann pausieren
- kann Solver neu ziehen
- kann Rätsel im Notfall überspringen
- kann Session zurücksetzen

### Spieler
- joinen per QR-Code oder Kennung
- geben nur Anzeigenamen ein
- bekommen browserlokale Player-ID/Cookie
- sehen den aktuellen Spielzustand
- beraten gemeinsam

### Solver / Gefährte
- pro Rätsel genau ein aktiver Spieler
- wird zufällig aus Spielern ausgewählt, die noch nicht Solver waren
- sieht zunächst die Prüfung, kann aber noch nicht interagieren
- kann **"Prüfung annehmen"** oder **"An anderen Gefährten weitergeben"**
- nach Annahme: nur dieser Client darf Rätselaktionen senden
- Weitergabe: bisherigen Kandidaten für dieses Spiel als "declined" markieren; neuen unbenutzten Spieler ziehen
- wenn keine unbenutzten Spieler mehr vorhanden: bereits eingesetzte Spieler wieder zulassen

## Zeit

- ein **globaler Countdown von 10:00 Minuten**
- startet erst mit Host-Button "Abenteuer beginnen"
- läuft über alle fünf Rätsel hinweg
- keine separaten 2-Minuten-Zwangstimer
- Zielschwierigkeit pro Rätsel: 45–100 Sekunden
- ab 75 Sekunden in demselben Rätsel kann ein Hinweis angeboten werden
- bei 00:00 sofort Niederlagen-Ende

## Spielablauf

Lobby
→ Intro
→ Prüfung 1
→ kurze Übergangsanimation
→ Prüfung 2
→ Übergang
→ Prüfung 3
→ Übergang
→ Prüfung 4
→ Übergang
→ Prüfung 5
→ Finale / Brücke
→ Sieg oder Niederlage

Keine Branches.

## Sieg

Alle fünf Prüfungen vor Ablauf des globalen Timers lösen.

## Niederlage

Countdown erreicht 00:00 bevor Prüfung 5 abgeschlossen ist.

## Host-Failsafes

Immer sichtbar, aber nicht im `/display`:
- Pause/Resume
- Solver neu ziehen
- aktuelles Rätsel überspringen
- +30 Sekunden (optional, nur Debug/Notfall; deutlich als Host-Eingriff markieren)
- Session beenden
- Session zurücksetzen

## Reconnect

Browserrefresh darf einen Spieler nicht aus der Session werfen.
Cookie/local persistent ID → Player wiederherstellen.
Name darf in der Lobby bis Spielstart geändert werden.
