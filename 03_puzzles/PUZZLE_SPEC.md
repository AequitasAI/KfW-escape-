# Puzzle Spec

## Gemeinsame Regeln

- Alle sehen das Rätsel.
- Nur der akzeptierte Solver kann interagieren.
- Jede Aktion wird live an alle Clients gespiegelt.
- Kein "Prüfen"-Button, wenn kontinuierliches Feedback sinnvoller ist.
- Rätsel dürfen keinen KfW-Fachwissenstest darstellen.
- Alle Lösungen müssen deterministisch und automatisiert testbar sein.
- Kein zufälliges Rätsel in V1.
- Animation darf nie die Eingabelogik blockieren, außer während einer kurzen Erfolgstransition.
- Bei Reload muss der Puzzle-State wiederhergestellt werden.

---

## P1 – Archiv: Reihenfolge der fünf Runen

### Mechanik
Fünf Runen per Drag & Drop oder Tap-then-Tap in fünf Sockel sortieren.

### Runen
- Flamme
- Berg
- Hammer
- Mond
- Fluss

### Hinweise
1. Der Fluss liegt am äußersten rechten Ende.
2. Der Hammer steht unmittelbar links vom Mond.
3. Flamme, Berg und Hammer bilden – in genau dieser Reihenfolge – eine zusammenhängende Dreiergruppe.

### Eindeutige Lösung
`Flamme – Berg – Hammer – Mond – Fluss`

### Erfolg
Sockel leuchten nacheinander auf → erstes Siegel erscheint.

### Accessibility
Neben Drag & Drop immer Tap-Auswahl und "links/rechts verschieben" ermöglichen.

---

## P2 – Die verlorene Verbindung: Kabel-Labyrinth

### Mechanik
4×4 Sliding-Tile-Puzzle mit einem leeren Feld.
Ein Serveranschluss liegt links außen, das Zielsystem rechts außen.
Kacheln enthalten feste Kabelgeometrien (Gerade, Kurve, T-Stück, optional Kreuzung).
Kacheln werden **verschoben, nicht gedreht**.

### Live-Feedback
Nach jeder Bewegung:
1. vom Quellanschluss aus Graph-Traversal berechnen
2. alle tatsächlich verbundenen Kabelsegmente erhalten animierten Energiefluss
3. nicht verbundene Segmente bleiben dunkel
4. sobald Ziel erreicht: Puzzle automatisch gelöst

### V1-Anforderung
Startzustand NICHT frei erfinden.
Implementierung soll:
- einen festen Sollzustand enthalten
- daraus durch eine fest definierte Folge legaler Sliding-Moves den Startzustand erzeugen
- automatisiert beweisen, dass der Startzustand lösbar ist
- idealerweise kürzesten Lösungsweg bestimmen und auf sinnvolle Schwierigkeit prüfen

Ziel: ca. 8–16 optimale Schiebezüge.

### Erfolg
Energie erreicht Zielserver → Server fährt hoch → zweites Siegel.

---

## P3 – Halle der Prüfmeister: Vier Fehler finden

### Mechanik
Zwei nebeneinander gerenderte Fantasy-Systempläne als SVG/HTML.
Genau vier Unterschiede.
Solver klickt Unterschiede an.
Gefundene Unterschiede werden auf beiden Plänen markiert.

### Unterschiede – verbindlich
1. Rune oben links: Dreieck vs. Diamant
2. mittlere Verbindung: Pfeilrichtung rechts vs. links
3. unteres Zahnrad: 6 Speichen vs. 5 Speichen
4. Beschriftung eines Behälters: `IV` vs. `VI`

### Falschklick
- kurzer visueller "Prüfmeister"-Hinweis
- KEIN globaler Zeitabzug in V1
- optional 750 ms Input-Cooldown gegen Spam

### Erfolg
Alle vier gefunden → Prüfmeister stempelt Plan → drittes Siegel.

### Wichtig
Nicht zwei Rasterbilder verwenden, wenn die Unterschiede als SVG-Komponenten sauberer und responsiver umgesetzt werden können.

---

## P4 – Minen des Betriebs: Fünf Zahnräder

### Zielbild
Fünf asymmetrische Zahnräder liegen horizontal zwischen Motor und Tor.
Motor links ist fix.
Vier Folgeräder können in diskreten Schritten gedreht werden.

### Nutzererlebnis
- Klick/Tap auf ein Rad → um einen diskreten Schritt drehen
- wenn ein Kontaktpaar geometrisch korrekt ist, Kontaktstelle leuchtet
- wenn vom Motor aus ein zusammenhängender korrekter Strang entsteht, dürfen diese Räder bereits "unter Spannung" visualisiert werden
- sobald ALLE vier Kontaktstellen korrekt sind:
  - Eingaben sperren
  - `KLACK`
  - alle fünf Räder synchron animieren, abwechselnd im/gegen Uhrzeigersinn
  - Maschine startet
  - Zwerg reagiert
  - Tor öffnet
  - viertes Siegel

### Logisches Modell
Keine Physikengine erforderlich.
Jedes Zahnrad hat 8 diskrete lokale Kontaktsektoren mit Profilwerten 1/2/3.
Zwei berührende Sektoren greifen ineinander, wenn ihre Profilwerte zusammen 4 ergeben.

Festes Profilset:
- Gear 0 (Motor, fix): `[1,1,2,2,1,1,2,1]`
- Gear 1: `[1,3,2,1,1,2,1,1]`
- Gear 2: `[3,2,1,1,3,3,3,1]`
- Gear 3: `[3,2,2,3,2,2,1,2]`
- Gear 4: `[3,1,1,3,1,2,3,3]`

Orientierungen: 0..7.
Gear 0 bleibt auf 0.

Kontaktmodell:
- rechter Weltkontakt eines linken Rads: lokaler Sektor `(-orientation) mod 8`
- linker Weltkontakt eines rechten Rads: lokaler Sektor `(4-orientation) mod 8`
- kompatibel iff `leftProfile + rightProfile == 4`

Eindeutige Gesamtlösung:
`[0,3,3,6,7]`

### Visuelle Umsetzung
Die Profilwerte müssen sich sichtbar in der Zahn-/Kerbgeometrie widerspiegeln:
- 1 = flacher/kleiner Sektor
- 2 = mittlerer Sektor
- 3 = tiefer/großer Gegenbereich
Nicht nur unsichtbare Datenprüfung.

### Automatisierter Test
Alle `8^4 = 4096` Konfigurationen der vier beweglichen Räder testen.
Es muss genau eine globale Lösung existieren: `[0,3,3,6,7]`.

---

## P5 – Schwarzes Tor: Dreistelliger Code

### Hinweise
- `682` → Eine Ziffer ist korrekt und an der richtigen Stelle.
- `614` → Eine Ziffer ist korrekt, aber an der falschen Stelle.
- `206` → Zwei Ziffern sind korrekt, aber beide falsch platziert.
- `738` → Keine Ziffer ist korrekt.
- `780` → Eine Ziffer ist korrekt, aber falsch platziert.

### Semantik
Die Aussagen sind im üblichen Mastermind-Sinn **exakt** zu verstehen:
- nicht genannte weitere Ziffern aus derselben Zeile sind nicht Bestandteil des Codes
- Code darf mit 0 beginnen

### Eindeutige Lösung
`042`

### Interaktion
Großer 0–9 Nummernblock, Löschen, Eingabe.
Bei falschem Code: kurze Tor-Reaktion, danach erneut versuchen.
Kein zusätzlicher Zeitabzug.

### Erfolg
Ritter senkt Schwert:
> Eure Unterlagen sind vollständig.

Tor öffnet → fünftes Siegel → Finale.
