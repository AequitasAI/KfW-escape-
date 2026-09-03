import type { BlackGateAction, BlackGateState } from '../types.js';

export interface GateClue {
  guess: string;
  text: string;
  /** digits correct and in the right place */
  bulls: number;
  /** digits correct but in the wrong place */
  cows: number;
}

/** Source: 03_puzzles/black_gate_code.json */
export const GATE_SOLUTION = '042';
export const GATE_CODE_LENGTH = 3;

export const GATE_CLUES: readonly GateClue[] = [
  { guess: '682', text: 'Eine Ziffer ist korrekt und an der richtigen Stelle.', bulls: 1, cows: 0 },
  { guess: '614', text: 'Eine Ziffer ist korrekt, aber an der falschen Stelle.', bulls: 0, cows: 1 },
  { guess: '206', text: 'Zwei Ziffern sind korrekt, aber beide falsch platziert.', bulls: 0, cows: 2 },
  { guess: '738', text: 'Keine Ziffer ist korrekt.', bulls: 0, cows: 0 },
  { guess: '780', text: 'Eine Ziffer ist korrekt, aber falsch platziert.', bulls: 0, cows: 1 },
];

/** Standard mastermind scoring over three digit strings. */
export function scoreGuess(guess: string, code: string): { bulls: number; cows: number } {
  let bulls = 0;
  const guessRest: string[] = [];
  const codeRest: string[] = [];

  for (let i = 0; i < code.length; i += 1) {
    if (guess[i] === code[i]) bulls += 1;
    else {
      guessRest.push(guess[i] as string);
      codeRest.push(code[i] as string);
    }
  }

  let cows = 0;
  const pool = [...codeRest];
  for (const digit of guessRest) {
    const at = pool.indexOf(digit);
    if (at >= 0) {
      cows += 1;
      pool.splice(at, 1);
    }
  }

  return { bulls, cows };
}

export function matchesAllClues(code: string): boolean {
  return GATE_CLUES.every((clue) => {
    const { bulls, cows } = scoreGuess(clue.guess, code);
    return bulls === clue.bulls && cows === clue.cows;
  });
}

/** Enumerates 000..999. Used by the uniqueness test. */
export function enumerateGateSolutions(): string[] {
  const found: string[] = [];
  for (let n = 0; n < 1000; n += 1) {
    const code = String(n).padStart(GATE_CODE_LENGTH, '0');
    if (matchesAllClues(code)) found.push(code);
  }
  return found;
}

export function createBlackGateState(): BlackGateState {
  return { kind: 'black_gate_code', entry: '', attempts: [], lastRejected: null, solved: false };
}

export function reduceBlackGate(state: BlackGateState, action: BlackGateAction): BlackGateState | null {
  if (state.solved) return null;

  switch (action.type) {
    case 'digit': {
      if (!Number.isInteger(action.digit) || action.digit < 0 || action.digit > 9) return null;
      if (state.entry.length >= GATE_CODE_LENGTH) return null;
      return { ...state, entry: state.entry + String(action.digit), lastRejected: null };
    }
    case 'backspace': {
      if (state.entry.length === 0) return null;
      return { ...state, entry: state.entry.slice(0, -1), lastRejected: null };
    }
    case 'clear': {
      if (state.entry.length === 0) return null;
      return { ...state, entry: '', lastRejected: null };
    }
    case 'submit': {
      if (state.entry.length !== GATE_CODE_LENGTH) return null;
      const entry = state.entry;
      if (entry === GATE_SOLUTION) {
        return { ...state, attempts: [...state.attempts, entry], lastRejected: null, solved: true };
      }
      return { ...state, entry: '', attempts: [...state.attempts, entry], lastRejected: entry };
    }
    default:
      return null;
  }
}
