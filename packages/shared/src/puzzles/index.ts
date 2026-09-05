import type { PuzzleAction, PuzzleId, PuzzleStateUnion } from '../types.js';
import { createArchiveRunesState, reduceArchiveRunes } from './archiveRunes.js';
import { createCableLabyrinthState, reduceCableLabyrinth } from './cableLabyrinth.js';
import { createTestmastersDiffState, reduceTestmastersDiff } from './testmastersDiff.js';
import { createOperationsGearsState, reduceOperationsGears } from './operationsGears.js';
import { createBlackGateState, reduceBlackGate } from './blackGate.js';

export * from './archiveRunes.js';
export * from './cableLabyrinth.js';
export * from './testmastersDiff.js';
export * from './operationsGears.js';
export * from './blackGate.js';

export interface PuzzleDefinition {
  index: number;
  id: PuzzleId;
  station: string;
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
}

/** The five trials in their fixed linear order. Source: 02_story/STORY_AND_COPY.md */
export const PUZZLES: readonly PuzzleDefinition[] = Object.freeze([
  {
    index: 0,
    id: 'archive_runes',
    station: 'Station 1/5',
    title: 'Das Archiv der alten Bestände',
    task: 'Ordnet die fünf Runen in die richtige Reihenfolge.',
    atmosphere:
      'Schwebende Register, uralte Bestände – und irgendwo darin die Ordnung, die alles zusammenhält.',
    hint: 'Fangt beim sichersten Posten an: Der Fluss steht ganz rechts fest. Danach bleibt für Hammer und Mond nur eine Möglichkeit.',
    successLine: 'Der Bestand ist geordnet. Das erste Siegel ist geborgen.',
  },
  {
    index: 1,
    id: 'cable_labyrinth',
    station: 'Station 2/5',
    title: 'Die verlorene Verbindung',
    task: 'Schiebt die Platten, bis die Energie von der Quelle bis in die Fassung läuft.',
    atmosphere:
      'Die Energie erwacht links im Runenstein und sucht rechts ihre Fassung. Zwei Welten, getrennt durch tote Kanäle – eine Schnittstelle ist auch nur eine Brücke mit Kabeln.',
    hint: 'Schiebt zuerst am rechten Rand Platz – von dort aus lässt sich die Leitung nach hinten aufrollen.',
    successLine: 'Die Verbindung steht. Energie fließt wieder durch die alten Leitungen.',
  },
  {
    index: 2,
    id: 'testmasters_diff',
    station: 'Station 3/5',
    title: 'Die Halle der Prüfmeister',
    task: 'Findet die vier Unterschiede zwischen den beiden Bauplänen.',
    atmosphere: 'Hier wird nichts durchgewunken. Hier wird geprüft – zweimal, und dann noch einmal.',
    hint: 'Achtet auf die Rune oben links, die Pfeilrichtung in der Mitte, die Speichen des unteren Zahnrads und die Beschriftung des Behälters.',
    successLine: 'Kein Fehler bleibt verborgen. Die Prüfmeister stempeln – das dritte Siegel ist euer.',
  },
  {
    index: 3,
    id: 'operations_gears',
    station: 'Station 4/5',
    title: 'Die Minen des Betriebs',
    task: 'Dreht die vier beweglichen Räder, bis der Antrieb vom Motor bis zum Tor durchgreift.',
    atmosphere: 'Serverglut, Zahnräder – und ein Zwerg, der jeden Release seit dem Wiederaufbau gesehen hat.',
    hint: 'Jedes treibende Rad hat genau einen Zapfen. Dreht ihn zum rechten Nachbarn – und sorgt dafür, dass dort ein Loch steht. Fangt links an.',
    successLine: 'Die Maschine läuft. Der Betrieb nickt knapp. Das vierte Siegel gehört euch.',
  },
  {
    index: 4,
    id: 'black_gate_code',
    station: 'Station 5/5',
    title: 'Das Schwarze Tor',
    task: 'Ermittelt den dreistelligen Code aus den fünf Aussagen des Wächters.',
    atmosphere:
      'Der letzte Wächter. Er ist nicht euer Feind – aber ohne vollständige Unterlagen passiert hier niemand.',
    hint: 'Die Zeile 738 schließt drei Ziffern vollständig aus. Und der Code darf mit einer Null beginnen.',
    successLine: 'Eure Unterlagen sind vollständig. Das Tor gibt den Weg frei.',
  },
]);

export const PUZZLE_COUNT = PUZZLES.length;

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
    default: {
      const exhaustive: never = state;
      throw new Error(`Unknown puzzle state ${JSON.stringify(exhaustive)}`);
    }
  }
}
