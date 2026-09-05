import type { TestmastersDiffAction, TestmastersDiffState } from '../types.js';

/**
 * Die Halle der Prüfmeister - zwei Prüfpläne im Vergleich.
 *
 * Auf dem Tisch liegen zwei Ausfertigungen desselben Bauplans: die Urfassung
 * und das Prüfexemplar. Sie sehen auf den ersten Blick gleich aus. Fünf Stellen
 * sind es nicht.
 *
 * Die Abweichungen sind bewusst technischer Natur - eine Leitung, die an der
 * Kreuzung anders läuft; eine fehlende Speiche; ein umgedrehter Pfeil; eine
 * fehlende Rune; eine Leitung, die blind endet. Kein Suchbild mit vertauschten
 * Farben, sondern das, wonach eine Prüfstelle tatsächlich sucht.
 *
 * Zwei Dinge halten das Rätsel fair:
 *
 * 1. Getroffen wird ein Prüffeld, nicht ein Pixel. Jede Abweichung sitzt in
 *    einem grosszügigen Feld; wer sie gesehen hat, trifft sie auch auf dem
 *    Telefon.
 * 2. Es gibt mehr Prüffelder als Abweichungen. Die Felder heissen neutral
 *    (`Prüffeld VII`), damit weder die Bedienhilfe noch die Tab-Reihenfolge
 *    verrät, wo etwas zu finden ist.
 *
 * Ein Fehlgriff kostet keine Zeit - er wird nur kurz quittiert. Die Sperre
 * unten verhindert lediglich, dass jemand die Fläche mit Klicks flutet.
 */

export interface DiffArea {
  /** Koordinaten im Planraster, siehe DIFF_PLAN_WIDTH/HEIGHT. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface DiffHotspot {
  readonly id: string;
  /** neutraler Name des Prüffelds, so heisst es in der Bedienhilfe */
  readonly field: string;
  /** was abweicht - erst nach dem Fund und in der Lösung der Spielleitung */
  readonly label: string;
  /** Urfassung (Plan A) */
  readonly left: string;
  /** Prüfexemplar (Plan B) */
  readonly right: string;
  readonly area: DiffArea;
}

export interface DiffDecoy {
  readonly field: string;
  /** nur für die Lösung der Spielleitung, nie für Spielende */
  readonly note: string;
  readonly area: DiffArea;
}

/** Beide Pläne werden in diesem Raster gezeichnet. */
export const DIFF_PLAN_WIDTH = 560;
export const DIFF_PLAN_HEIGHT = 420;

/**
 * Die fünf Abweichungen. Reihenfolge ist Lesereihenfolge auf dem Plan, oben
 * links beginnend - so liest sich auch die Lösung der Spielleitung.
 */
export const DIFF_HOTSPOTS: readonly DiffHotspot[] = Object.freeze([
  {
    id: 'rune_missing',
    field: 'III',
    label: 'Runenband über dem Titel',
    left: 'fünf Runen',
    right: 'die mittlere Rune fehlt',
    area: { x: 32, y: 74, w: 172, h: 48 },
  },
  {
    id: 'valve_arrow',
    field: 'VI',
    label: 'Flussrichtung am Hauptventil',
    left: 'Pfeil nach rechts',
    right: 'Pfeil nach links',
    area: { x: 212, y: 148, w: 74, h: 62 },
  },
  {
    id: 'crossing_route',
    field: 'VII',
    label: 'Kreuzung der Hauptleitung',
    left: 'die Hauptleitung führt über die Steigleitung hinweg',
    right: 'beide Leitungen sind verbunden',
    area: { x: 336, y: 150, w: 74, h: 74 },
  },
  {
    id: 'gear_spoke',
    field: 'VIII',
    label: 'Speichen des grossen Rads',
    left: 'sechs Speichen',
    right: 'fünf Speichen',
    area: { x: 122, y: 268, w: 108, h: 108 },
  },
  {
    id: 'blind_end',
    field: 'IX',
    label: 'Anschluss des Sammelbehälters',
    left: 'die Leitung sitzt am Flansch',
    right: 'die Leitung endet blind darüber',
    area: { x: 430, y: 272, w: 92, h: 96 },
  },
]);

/**
 * Prüffelder ohne Befund. Sie sind nicht Dekoration, sondern Teil der Aufgabe:
 * Ohne sie stünden in der Tab-Reihenfolge genau die fünf Lösungen.
 */
export const DIFF_DECOYS: readonly DiffDecoy[] = Object.freeze([
  { field: 'I', note: 'Titelkartusche', area: { x: 190, y: 26, w: 180, h: 40 } },
  { field: 'II', note: 'Kompassrose', area: { x: 464, y: 64, w: 64, h: 64 } },
  { field: 'IV', note: 'Manometer', area: { x: 340, y: 92, w: 66, h: 52 } },
  { field: 'V', note: 'Kessel I', area: { x: 32, y: 142, w: 116, h: 116 } },
  { field: 'X', note: 'Verteilerkasten', area: { x: 340, y: 286, w: 66, h: 44 } },
  { field: 'XI', note: 'kleines Rad', area: { x: 234, y: 306, w: 58, h: 62 } },
  { field: 'XII', note: 'Stempelfeld', area: { x: 300, y: 336, w: 124, h: 66 } },
]);

/** Alle anklickbaren Felder in Lesereihenfolge, Abweichung oder nicht. */
export const DIFF_FIELDS: readonly {
  readonly field: string;
  readonly area: DiffArea;
  readonly hotspotId: string | null;
}[] = Object.freeze(
  [
    ...DIFF_HOTSPOTS.map((spot) => ({ field: spot.field, area: spot.area, hotspotId: spot.id })),
    ...DIFF_DECOYS.map((decoy) => ({ field: decoy.field, area: decoy.area, hotspotId: null })),
  ].sort((a, b) => romanValue(a.field) - romanValue(b.field)),
);

export const DIFF_HOTSPOT_IDS: readonly string[] = Object.freeze(DIFF_HOTSPOTS.map((h) => h.id));
export const DIFF_COUNT = DIFF_HOTSPOTS.length;
export const DIFF_ANTI_SPAM_COOLDOWN_MS = 750;
export const DIFF_FALSE_CLICK_PENALTY_MS = 0;

/** Nur für die Sortierung der Prüffelder I..XII. */
function romanValue(numeral: string): number {
  const values: Record<string, number> = { I: 1, V: 5, X: 10 };
  let total = 0;
  for (let i = 0; i < numeral.length; i += 1) {
    const current = values[numeral[i] as string] ?? 0;
    const next = values[numeral[i + 1] as string] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

export function createTestmastersDiffState(): TestmastersDiffState {
  return { kind: 'testmasters_diff', found: [], misses: 0, lastMissAt: null, solved: false };
}

export function reduceTestmastersDiff(
  state: TestmastersDiffState,
  action: TestmastersDiffAction,
  now: number,
): TestmastersDiffState | null {
  if (state.solved) return null;

  // Server side anti spam window; a click during cooldown is silently dropped.
  if (state.lastMissAt !== null && now - state.lastMissAt < DIFF_ANTI_SPAM_COOLDOWN_MS) return null;

  if (action.type === 'miss') {
    return { ...state, misses: state.misses + 1, lastMissAt: now };
  }

  if (action.type !== 'hit') return null;
  if (!DIFF_HOTSPOT_IDS.includes(action.hotspotId)) return null;
  // each hotspot counts exactly once
  if (state.found.includes(action.hotspotId)) return null;

  const found = [...state.found, action.hotspotId];
  return { ...state, found, lastMissAt: null, solved: found.length === DIFF_HOTSPOT_IDS.length };
}
