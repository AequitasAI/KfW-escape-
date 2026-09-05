/**
 * Die Förderwelt als Landkarte.
 *
 * Alles in dieser Datei ist Beiwerk: kleine Marken, die in den Szenen im
 * Hintergrund stehen. Keine davon wird erklärt, keine ist Teil einer Aufgabe,
 * und keine muss man kennen, um das Spiel zu gewinnen. Wer den Kontext hat,
 * erkennt sie; wer nicht, sieht Fantasy - so herum, nicht andersherum.
 *
 * Grundsatz für die Dosis: ein bis drei erkennbare Marken pro Bild. Die
 * Zeichnung bleibt die Hauptsache, die Anspielung ist die Belohnung fürs
 * Hinsehen.
 *
 * Quellen sind ausschliesslich öffentlich bekannte Programmnummern und
 * Aufgabenbereiche sowie die im Projekt vorgegebenen internen Kürzel. Keine
 * Kunden-, Vertrags- oder Produktionsdaten, keine echten Dokumente, keine
 * Behörden mit womöglich überholter Zuständigkeit - Erlasse kommen hier von
 * „der Hauptstadt", nicht von einem Ministerium mit Namen.
 */

/** Szenen, in denen Marken stehen können. Deckungsgleich mit SceneId im Web. */
export type LoreScene =
  | 'lobby'
  | 'archive'
  | 'connection'
  | 'testmasters'
  | 'mine'
  | 'gate'
  | 'bridge';

export type LoreMarkKind =
  /** ein eingemeisselter Stein mit einer Zahl */
  | 'runestone'
  /** ein Turm in der Ferne */
  | 'tower'
  /** Häuser, Höfe, Baustellen */
  | 'estate'
  /** Akademie, Bibliothek, Herberge */
  | 'academy'
  /** ein dunkles Gebirge am Horizont */
  | 'massif'
  /** ein Schild am Weg */
  | 'sign'
  /** ein versiegelter Seitentrakt */
  | 'vault'
  /** Kisten, Fässer, Loren */
  | 'crate';

export interface LoreMark {
  readonly id: string;
  readonly scene: LoreScene;
  readonly kind: LoreMarkKind;
  /** Ort in Prozent der Szene, von links oben. */
  readonly x: number;
  readonly y: number;
  /** Grösse relativ zur Grundgrösse der Marke. */
  readonly scale?: number;
  /** Was eingemeisselt ist - fast immer eine Programmnummer. */
  readonly rune?: string;
  /** Der Name des Ortes, klein darunter. */
  readonly label?: string;
  /** Eine Zeile, die nur an ganz wenigen Stellen steht. */
  readonly line?: string;
  /** Auf schmalen Geräten weglassen, damit das Bild nicht zuwächst. */
  readonly wideOnly?: boolean;
}

/**
 * Die Marken, nach Szenen sortiert.
 *
 * Die Zahlen sind öffentlich bekannte Programmnummern; sie stehen hier ohne
 * Erklärung, weil eine Erklärung den Witz erledigen würde.
 */
export const LORE_MARKS: readonly LoreMark[] = Object.freeze([
  /* --- Die Reisekarte in der Vorhalle ------------------------------- */
  {
    id: 'lobby-studoria',
    scene: 'lobby',
    kind: 'academy',
    x: 7,
    y: 70,
    rune: '174',
    label: 'Akademien von Studoria',
  },
  {
    id: 'lobby-wohnlande',
    scene: 'lobby',
    kind: 'estate',
    x: 93,
    y: 74,
    rune: '124',
    label: 'Die Wohnlande',
  },
  {
    id: 'lobby-huhi',
    scene: 'lobby',
    kind: 'massif',
    x: 88,
    y: 24,
    label: 'HuHi – Altbestand',
    scale: 1.2,
  },

  /* --- Das Archiv --------------------------------------------------- */
  {
    id: 'archive-bildung',
    scene: 'archive',
    kind: 'sign',
    x: 15,
    y: 22,
    rune: '173 · 174',
    label: 'Bildung – laufende Chroniken',
  },
  {
    id: 'archive-zeitalter',
    scene: 'archive',
    kind: 'sign',
    x: 84,
    y: 25,
    rune: '170',
    label: 'Bestände vergangener Zeitalter',
    wideOnly: true,
  },
  {
    id: 'archive-altschulden',
    scene: 'archive',
    kind: 'vault',
    x: 88,
    y: 62,
    label: 'Gewölbe der Altschulden',
    line: 'Manche Verpflichtungen überdauern selbst Königreiche.',
  },

  /* --- Die verlorene Verbindung ------------------------------------- */
  {
    id: 'connection-turm',
    scene: 'connection',
    kind: 'tower',
    x: 8,
    y: 32,
    rune: '261',
    label: 'Der sanierte Turm',
  },
  {
    id: 'connection-neubau',
    scene: 'connection',
    kind: 'estate',
    x: 92,
    y: 38,
    rune: '297 · 298',
    label: 'Neue Höfe',
    wideOnly: true,
  },

  {
    id: 'connection-herberge',
    scene: 'connection',
    kind: 'academy',
    x: 91,
    y: 72,
    rune: '173',
    label: 'Herberge der Studentenwerke',
    wideOnly: true,
  },

  /* --- Die Halle der Prüfmeister ------------------------------------ */
  {
    id: 'testmasters-erlass',
    scene: 'testmasters',
    kind: 'sign',
    x: 10,
    y: 22,
    label: 'Erlass aus der Hauptstadt',
  },
  {
    id: 'testmasters-bnd',
    scene: 'testmasters',
    kind: 'sign',
    x: 90,
    y: 20,
    rune: 'BnD',
    label: 'Siegel der Durchführung',
    wideOnly: true,
  },

  /* --- Die Minen des Betriebs --------------------------------------- */
  {
    id: 'mine-schild',
    scene: 'mine',
    kind: 'sign',
    x: 11,
    y: 66,
    label: 'Freitags keine neuen Expeditionen.',
  },
  {
    id: 'mine-loren',
    scene: 'mine',
    kind: 'crate',
    x: 24,
    y: 70,
    rune: 'BnD',
    label: 'Bestand',
    wideOnly: true,
  },
  {
    id: 'mine-gilde',
    scene: 'mine',
    kind: 'runestone',
    x: 6,
    y: 42,
    rune: '172',
    label: 'Gilde des Aufstiegs',
    wideOnly: true,
  },

  /* --- Das Schwarze Tor --------------------------------------------- */
  {
    id: 'gate-pult',
    scene: 'gate',
    kind: 'crate',
    x: 10,
    y: 66,
    rune: 'BnD',
    label: 'Pult der Nachweise',
  },

  {
    id: 'gate-kreditbuch',
    scene: 'gate',
    kind: 'sign',
    x: 90,
    y: 30,
    label: 'Das offene Kreditbuch',
    wideOnly: true,
  },

  /* --- Die Brücke ---------------------------------------------------- */
  {
    id: 'bridge-huhi',
    scene: 'bridge',
    kind: 'massif',
    x: 12,
    y: 40,
    label: 'HuHi – Altbestand',
    line: 'Nur wenige kennen noch alle Wege durch diese Hallen.',
    wideOnly: true,
  },
  {
    id: 'bridge-studoria',
    scene: 'bridge',
    kind: 'academy',
    x: 88,
    y: 62,
    rune: '173',
    label: 'Studoria',
    wideOnly: true,
  },
]);

export function loreMarksFor(scene: LoreScene): readonly LoreMark[] {
  return LORE_MARKS.filter((mark) => mark.scene === scene);
}

/**
 * Die uralten Hallen von HuHi.
 *
 * Der Witz gilt ausschliesslich dem Alter der Anwendung und dem Aufwand, sie zu
 * pflegen - nie dem Zweck der Stiftung und nie den Menschen, um die es dort
 * geht. Deshalb betritt man diese Hallen in diesem Spiel auch nicht: Sie stehen
 * als dunkles Gebirge am Horizont, alle sehen sie, und alle sind froh, heute
 * woanders zu sein.
 */
export const HUHI_LINES: readonly string[] = Object.freeze([
  'Nur wenige kennen noch alle Wege durch diese Hallen.',
  'Man sagt, jeder Umbau weckt drei weitere Abhängigkeiten.',
  'Die Chroniken reichen weiter zurück als jede bekannte Release-Dokumentation.',
]);
