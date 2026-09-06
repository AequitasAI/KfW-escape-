import type { PuzzleAction, PuzzleId, PuzzleStateUnion } from '../types.js';
import { createArchiveRunesState, reduceArchiveRunes } from './archiveRunes.js';
import { createCableLabyrinthState, reduceCableLabyrinth } from './cableLabyrinth.js';
import { createTestmastersDiffState, reduceTestmastersDiff } from './testmastersDiff.js';
import { createOperationsGearsState, reduceOperationsGears } from './operationsGears.js';
import { createBlackGateState, reduceBlackGate } from './blackGate.js';
import { createRuneMasterState, reduceRuneMaster } from './runeMaster.js';

export * from './archiveRunes.js';
export * from './cableLabyrinth.js';
export * from './testmastersDiff.js';
export * from './operationsGears.js';
export * from './blackGate.js';
export * from './runeMaster.js';

export interface PuzzleDefinition {
  index: number;
  id: PuzzleId;
  station: string;
  /**
   * Der Flügel, in dem die Prüfung liegt. Steht klein neben der Station und ist
   * reines Weltgebäude - wer die Namen wiedererkennt, freut sich; wer nicht,
   * liest einen Ortsnamen.
   */
  hall?: string;
  title: string;
  /** short in-world instruction shown to every client */
  task: string;
  /**
   * One atmospheric line shown when the room opens. Derived from the
   * "Atmosphäre:" fields in 02_story/STORY_AND_COPY.md, so the world gets a
   * voice without inventing lore beyond the spec.
   */
  atmosphere: string;
  hint: string;
  successLine: string;
  /**
   * Prüfungen, die im Fortschrittspfad erst auftauchen, wenn sie dran sind.
   *
   * Die letzte Prüfung soll die Gruppe überraschen. Stünde sie von Anfang an im
   * Pfad, wäre der falsche Sieg keiner mehr - man zählt die Stationen und weiss
   * Bescheid.
   */
  hidden?: boolean;
}

/** The five trials in their fixed linear order. Source: 02_story/STORY_AND_COPY.md */
export const PUZZLES: readonly PuzzleDefinition[] = Object.freeze([
  {
    index: 0,
    id: 'archive_runes',
    station: 'Station 1/5',
    hall: 'Flügel der Bildung · Bestände',
    title: 'Das Archiv der alten Bestände',
    task: 'Ordnet die fünf Runen in die richtige Reihenfolge.',
    atmosphere:
      'Schwebende Register: Chroniken der Bildung, Bestände der Wohnlande, und ganz hinten die Gewölbe der Altschulden, in denen Verpflichtungen aus vergangenen Zeitaltern verwahrt werden. Manche überdauern selbst Königreiche.',
    hint: 'Fangt beim sichersten Posten an: Der Fluss steht ganz rechts fest. Danach bleibt für Hammer und Mond nur eine Möglichkeit.',
    successLine: 'Der Bestand ist geordnet. Das erste Siegel ist geborgen.',
  },
  {
    index: 1,
    id: 'cable_labyrinth',
    station: 'Station 2/5',
    hall: 'Werk der Wohnlande',
    title: 'Die verlorene Verbindung',
    task: 'Schiebt die Platten, bis die Energie von der Quelle bis in die Fassung läuft.',
    atmosphere:
      'Ein Werk der Wohnlande: sanierte Türme, neue Höfe, und dazwischen tote Kanäle. Die Energie erwacht links im Runenstein und sucht rechts ihre Fassung – eine Schnittstelle ist auch nur eine Brücke mit Kabeln.',
    hint: 'Schiebt zuerst am rechten Rand Platz – von dort aus lässt sich die Leitung nach hinten aufrollen.',
    successLine: 'Die Verbindung steht. Energie fließt wieder durch die alten Leitungen.',
  },
  {
    index: 2,
    id: 'testmasters_diff',
    station: 'Station 3/5',
    hall: 'Kammer der Nachweise',
    title: 'Die Halle der Prüfmeister',
    task: 'Findet die fünf Fehler im Prüfexemplar.',
    atmosphere:
      'Hier wird nichts durchgewunken. Hier wird geprüft – zweimal, und dann noch einmal. Ohne Nachweis kein Siegel.',
    hint: 'Geht den Plan in Abschnitten durch statt kreuz und quer: Siegelband oben, Ventil und Kreuzung in der Mitte, das grosse Rad unten links, und ganz rechts die Steigleitung bis zum Behälter.',
    successLine: 'Kein Fehler bleibt verborgen. Die Prüfmeister stempeln – das dritte Siegel ist euer.',
  },
  {
    index: 3,
    id: 'operations_gears',
    station: 'Station 4/5',
    hall: 'Stollen der Bestandsführung',
    title: 'Die Minen des Betriebs',
    task: 'Dreht die Zahnräder, bis alle Verbindungen passen.',
    atmosphere:
      'Serverglut, Zahnräder – und ein Zwerg, der jeden Release seit dem Wiederaufbau gesehen hat. Der Seitenstollen nach HuHi ist gesperrt; fragt besser nicht, wer den Schlüssel hat.',
    hint: 'Ein Zapfen fasst nur in eine Kerbe derselben Form. Fangt beim Motor an – dort passen mehrere Stellungen, aber nur eine trägt bis zum Tor.',
    successLine: 'Die Maschine läuft. Der Betrieb nickt knapp. Das vierte Siegel gehört euch.',
  },
  {
    index: 4,
    id: 'black_gate_code',
    station: 'Station 5/5',
    hall: 'Wacht der Berechtigungen',
    title: 'Das Schwarze Tor',
    task: 'Ermittelt den dreistelligen Code aus den fünf Aussagen des Wächters.',
    atmosphere:
      'Der letzte Wächter. Er ist nicht euer Feind – aber ohne vollständige Unterlagen passiert hier niemand.',
    hint: 'Die Zeile 738 schließt drei Ziffern vollständig aus. Und der Code darf mit einer Null beginnen.',
    successLine: 'Eure Unterlagen sind vollständig. Das Tor gibt den Weg frei.',
  },
  {
    index: 5,
    id: 'rune_master',
    station: 'Die letzte Prüfung',
    hall: 'Auf der Brücke',
    title: 'Die Prüfung des Runenmeisters',
    task: 'Nennt das Tor, das den Weg freigibt – und die Inschrift, die als einzige wahr ist.',
    atmosphere:
      'Drei Tore aus der Zeit vor dem Wiederaufbau, mitten auf der Brücke. Genau eine der drei Inschriften spricht wahr.',
    hint: 'Nehmt der Reihe nach jedes Tor als den richtigen Weg an und zählt, wie viele Inschriften dann wahr wären. Nur bei einem Tor ist es genau eine.',
    successLine: 'Das letzte Tor gibt nach. Die Brücke vollendet sich.',
    hidden: true,
  },
]);

export const PUZZLE_COUNT = PUZZLES.length;

/**
 * Wie viele Prüfungen die Gruppe kennt, bevor die letzte auftaucht. Alles, was
 * Stationen zählt oder anzeigt, rechnet mit dieser Zahl - nicht mit PUZZLE_COUNT.
 */
export const VISIBLE_PUZZLE_COUNT = PUZZLES.filter((puzzle) => puzzle.hidden !== true).length;

export function getPuzzle(index: number): PuzzleDefinition {
  const puzzle = PUZZLES[index];
  if (!puzzle) throw new Error(`No puzzle at index ${index}`);
  return puzzle;
}

export function createPuzzleState(id: PuzzleId): PuzzleStateUnion {
  switch (id) {
    case 'archive_runes':
      return createArchiveRunesState();
    case 'cable_labyrinth':
      return createCableLabyrinthState();
    case 'testmasters_diff':
      return createTestmastersDiffState();
    case 'operations_gears':
      return createOperationsGearsState();
    case 'black_gate_code':
      return createBlackGateState();
    case 'rune_master':
      return createRuneMasterState();
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown puzzle ${String(exhaustive)}`);
    }
  }
}

/**
 * Single entry point for every puzzle mutation. Returns null when the action is
 * rejected, which the server turns into an `error:public` without touching state.
 */
export function reducePuzzle(
  state: PuzzleStateUnion,
  action: PuzzleAction,
  now: number,
): PuzzleStateUnion | null {
  switch (state.kind) {
    case 'archive_runes':
      if (action.type !== 'swap' && action.type !== 'shift') return null;
      return reduceArchiveRunes(state, action);
    case 'cable_labyrinth':
      if (action.type !== 'slide') return null;
      return reduceCableLabyrinth(state, action);
    case 'testmasters_diff':
      if (action.type !== 'hit' && action.type !== 'miss') return null;
      return reduceTestmastersDiff(state, action, now);
    case 'operations_gears':
      if (action.type !== 'rotate') return null;
      return reduceOperationsGears(state, action);
    case 'black_gate_code':
      if (
        action.type !== 'digit' &&
        action.type !== 'backspace' &&
        action.type !== 'clear' &&
        action.type !== 'submit'
      ) {
        return null;
      }
      return reduceBlackGate(state, action);
    case 'rune_master':
      if (action.type !== 'pick' && action.type !== 'attempt') return null;
      return reduceRuneMaster(state, action, now);
    default: {
      const exhaustive: never = state;
      throw new Error(`Unknown puzzle state ${JSON.stringify(exhaustive)}`);
    }
  }
}
