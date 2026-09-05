import type { RuneMasterAction, RuneMasterState } from '../types.js';

/**
 * Die Prüfung des Runenmeisters - drei Tore, eine wahre Inschrift.
 *
 * Auf der Brücke stehen drei uralte Steintore. Jedes trägt eine Inschrift.
 * Genau eine dieser drei Inschriften spricht wahr; die beiden anderen lügen.
 * Wer hindurchgehen will, muss zweierlei benennen: das Tor, das den Weg
 * freigibt, und die Inschrift, die als einzige wahr ist.
 *
 * Warum beides? Weil drei Tore allein zu wenig sind. Die Gruppe könnte raten
 * und hätte in einem von drei Fällen recht - für die letzte Hürde eines
 * Abends zu billig. Mit der zweiten Angabe sind es neun Möglichkeiten, und die
 * eine richtige davon nennt nur, wer die Aussagen tatsächlich gegeneinander
 * geprüft hat. Genau darin besteht die Prüfung: nicht das Tor zu finden,
 * sondern zu wissen, warum es das Tor ist.
 *
 * Die Lösung steht hier nicht als Zahl im Code, sondern wird ausgerechnet -
 * und `enumerateRuneMasterSolutions()` beweist im Test, dass es genau eine
 * gibt.
 */

export interface RuneGate {
  readonly id: string;
  readonly name: string;
  /** Kurzform für Anzeige und Auswahl. */
  readonly sigil: string;
  readonly inscription: string;
}

export const RUNE_GATES: readonly RuneGate[] = Object.freeze([
  {
    id: 'gate_i',
    name: 'Das erste Tor',
    sigil: 'I',
    inscription: 'Der Weg führt durch dieses Tor.',
  },
  {
    id: 'gate_ii',
    name: 'Das zweite Tor',
    sigil: 'II',
    inscription: 'Der Weg führt nicht durch dieses Tor.',
  },
  {
    id: 'gate_iii',
    name: 'Das dritte Tor',
    sigil: 'III',
    inscription: 'Der Weg führt nicht durch das erste Tor.',
  },
]);

export const RUNE_GATE_COUNT = RUNE_GATES.length;

/** Nach einer falschen Antwort bleibt das Tor kurz verschlossen. */
export const RUNE_MASTER_COOLDOWN_MS = 3_000;

/**
 * Gilt die Inschrift von Tor `gate`, wenn der Weg durch Tor `path` führt?
 *
 * Bewusst als Tabelle über die Toridentität und nicht als Text-Auswertung: Was
 * eine Inschrift behauptet, gehört in den Code, nicht in eine Grammatik.
 */
export function inscriptionHolds(gate: number, path: number): boolean {
  switch (gate) {
    case 0:
      return path === 0;
    case 1:
      return path !== 1;
    case 2:
      return path !== 0;
    default:
      return false;
  }
}

/** Wie viele Inschriften wahr wären, wenn der Weg durch `path` führte. */
export function trueInscriptionCount(path: number): number {
  let count = 0;
  for (let gate = 0; gate < RUNE_GATE_COUNT; gate += 1) {
    if (inscriptionHolds(gate, path)) count += 1;
  }
  return count;
}

export interface RuneMasterAnswer {
  readonly gate: number;
  readonly inscription: number;
}

/**
 * Alle Antworten, die zur Regel passen: Der Weg führt durch `gate`, und unter
 * dieser Annahme ist genau eine Inschrift wahr - nämlich `inscription`.
 *
 * Grundlage des Eindeutigkeitsbeweises. Findet dieser Aufruf mehr oder weniger
 * als eine Antwort, ist die Prüfung kaputt.
 */
export function enumerateRuneMasterSolutions(): RuneMasterAnswer[] {
  const answers: RuneMasterAnswer[] = [];
  for (let gate = 0; gate < RUNE_GATE_COUNT; gate += 1) {
    if (trueInscriptionCount(gate) !== 1) continue;
    for (let inscription = 0; inscription < RUNE_GATE_COUNT; inscription += 1) {
      if (inscriptionHolds(inscription, gate)) answers.push({ gate, inscription });
    }
  }
  return answers;
}

const [only] = enumerateRuneMasterSolutions();
if (!only) throw new Error('Die Prüfung des Runenmeisters hat keine Lösung');
export const RUNE_MASTER_SOLUTION: RuneMasterAnswer = Object.freeze(only);

export function isRuneMasterAnswerCorrect(gate: number, inscription: number): boolean {
  return gate === RUNE_MASTER_SOLUTION.gate && inscription === RUNE_MASTER_SOLUTION.inscription;
}

export function createRuneMasterState(): RuneMasterState {
  return {
    kind: 'rune_master',
    gate: null,
    inscription: null,
    attempts: 0,
    lastRejected: null,
    lastRejectedAt: null,
    solved: false,
  };
}

export function reduceRuneMaster(
  state: RuneMasterState,
  action: RuneMasterAction,
  now: number,
): RuneMasterState | null {
  if (state.solved) return null;

  if (action.type === 'pick') {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= RUNE_GATE_COUNT) {
      return null;
    }
    if (action.slot === 'gate') {
      if (state.gate === action.index) return null;
      return { ...state, gate: action.index, lastRejected: null };
    }
    if (action.slot === 'inscription') {
      if (state.inscription === action.index) return null;
      return { ...state, inscription: action.index, lastRejected: null };
    }
    return null;
  }

  if (action.type !== 'attempt') return null;
  if (state.gate === null || state.inscription === null) return null;

  /*
   * Nach einer falschen Antwort bleibt das Tor kurz zu. Das ist keine
   * Zeitstrafe - die Uhr läuft ohnehin -, sondern der Grund, warum sich
   * Durchprobieren nicht lohnt.
   */
  if (state.lastRejectedAt !== null && now - state.lastRejectedAt < RUNE_MASTER_COOLDOWN_MS) {
    return null;
  }

  if (isRuneMasterAnswerCorrect(state.gate, state.inscription)) {
    return { ...state, attempts: state.attempts + 1, lastRejected: null, solved: true };
  }

  return {
    ...state,
    attempts: state.attempts + 1,
    lastRejected: [state.gate, state.inscription],
    lastRejectedAt: now,
  };
}
