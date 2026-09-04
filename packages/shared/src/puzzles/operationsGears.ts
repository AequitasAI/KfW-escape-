import type { OperationsGearsAction, OperationsGearsState } from '../types.js';

/** Source: 03_puzzles/operations_gears.json */
export const GEAR_STEPS = 8;
export const GEAR_COUNT = 5;

/**
 * Acht Sektoren je Rad, und nur drei Sorten Rand:
 *
 *   PEG  (3) ein langer Zapfen
 *   HOLE (1) ein Loch, das genau einen Zapfen aufnimmt
 *   FLAT (2) glatter Rand, der zu nichts passt
 *
 * Der Antrieb läuft von links nach rechts: ein Rad treibt seinen Nachbarn,
 * wenn es ihm einen Zapfen zuwendet und der Nachbar ein Loch anbietet.
 *
 * Warum genau ein Zapfen je treibendem Rad: Die Bedingung „Zapfen zeigt nach
 * rechts" legt die Stellung des Rades damit eindeutig fest. Gäbe es zwei
 * Zapfen, hätte das Rätsel mehrere Lösungen - was mit der alten Summenregel
 * nachweislich der Fall war, sobald mehr als ein Loch je Rad vorkam. Das
 * Torrad hat entsprechend genau ein Loch, denn nach ihm kommt nichts mehr.
 * Zusätzliche Löcher sind harmlos und dienen dem Aussehen.
 */
export const PEG = 3;
export const HOLE = 1;
export const FLAT = 2;

export const GEAR_PROFILES: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([3, 2, 1, 2, 2, 1, 2, 2]), // 0 Antriebsrad, fest - Zapfen auf 0
  Object.freeze([2, 1, 2, 1, 2, 3, 2, 1]), // 1 - Zapfen auf 5, Loch gegenüber auf 1
  Object.freeze([1, 2, 3, 2, 1, 2, 1, 2]), // 2 - Zapfen auf 2, Loch gegenüber auf 6
  Object.freeze([2, 1, 1, 2, 2, 1, 3, 2]), // 3 - Zapfen auf 6, Loch gegenüber auf 2
  Object.freeze([2, 3, 2, 2, 3, 2, 2, 1]), // 4 Torrad - einziges Loch auf 7
]);

/** Bewiesen eindeutig durch enumerateGearSolutions(); zehn Drehungen ab Start. */
export const GEAR_SOLUTION: readonly number[] = Object.freeze([0, 3, 6, 2, 5]);

/** Fixed, non random start. Gear 0 is the motor and never moves. */
export const GEAR_START_ORIENTATIONS: readonly number[] = Object.freeze([0, 0, 0, 0, 0]);

export const GEAR_LABELS: readonly string[] = Object.freeze([
  'Antriebsrad',
  'Zahnrad II',
  'Zahnrad III',
  'Zahnrad IV',
  'Torrad',
]);

function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}

/** Sector value the gear presents to its right hand neighbour. */
export function rightContactProfile(gear: number, orientation: number): number {
  const profile = GEAR_PROFILES[gear];
  if (!profile) throw new Error(`Unknown gear ${gear}`);
  return profile[mod(-orientation, GEAR_STEPS)] as number;
}

/** Sector value the gear presents to its left hand neighbour. */
export function leftContactProfile(gear: number, orientation: number): number {
  const profile = GEAR_PROFILES[gear];
  if (!profile) throw new Error(`Unknown gear ${gear}`);
  return profile[mod(4 - orientation, GEAR_STEPS)] as number;
}

/**
 * Der Kontakt greift, wenn das linke Rad einen Zapfen anbietet und das rechte
 * ein Loch. Glatter Rand passt zu nichts - genau so, wie es auf dem Schirm
 * aussieht.
 */
export function isContactMeshed(orientations: readonly number[], contact: number): boolean {
  const left = orientations[contact];
  const right = orientations[contact + 1];
  if (left === undefined || right === undefined) return false;
  return (
    rightContactProfile(contact, left) === PEG && leftContactProfile(contact + 1, right) === HOLE
  );
}

export function computeContacts(orientations: readonly number[]): boolean[] {
  const contacts: boolean[] = [];
  for (let i = 0; i < GEAR_COUNT - 1; i += 1) contacts.push(isContactMeshed(orientations, i));
  return contacts;
}

/**
 * Index of the last gear that is still driven by the motor through an
 * uninterrupted chain of meshed contacts.
 */
export function poweredUpTo(contacts: readonly boolean[]): number {
  let reach = 0;
  for (const meshed of contacts) {
    if (!meshed) break;
    reach += 1;
  }
  return reach;
}

export function isGearsSolved(orientations: readonly number[]): boolean {
  return computeContacts(orientations).every(Boolean);
}

export function createOperationsGearsState(): OperationsGearsState {
  const orientations = [...GEAR_START_ORIENTATIONS];
  const contacts = computeContacts(orientations);
  return {
    kind: 'operations_gears',
    orientations,
    contacts,
    poweredUpTo: poweredUpTo(contacts),
    moves: 0,
    solved: false,
  };
}

export function reduceOperationsGears(
  state: OperationsGearsState,
  action: OperationsGearsAction,
): OperationsGearsState | null {
  if (state.solved) return null;
  if (action.type !== 'rotate') return null;
  const { gear, dir } = action;
  if (!Number.isInteger(gear) || gear < 1 || gear >= GEAR_COUNT) return null; // gear 0 is fixed
  if (dir !== 1 && dir !== -1) return null;

  const orientations = [...state.orientations];
  orientations[gear] = mod((orientations[gear] as number) + dir, GEAR_STEPS);
  const contacts = computeContacts(orientations);

  return {
    ...state,
    orientations,
    contacts,
    poweredUpTo: poweredUpTo(contacts),
    moves: state.moves + 1,
    solved: contacts.every(Boolean),
  };
}

/** Enumerates all 8^4 movable configurations. Used by the uniqueness test. */
export function enumerateGearSolutions(): number[][] {
  const solutions: number[][] = [];
  for (let a = 0; a < GEAR_STEPS; a += 1) {
    for (let b = 0; b < GEAR_STEPS; b += 1) {
      for (let c = 0; c < GEAR_STEPS; c += 1) {
        for (let d = 0; d < GEAR_STEPS; d += 1) {
          const candidate = [0, a, b, c, d];
          if (isGearsSolved(candidate)) solutions.push(candidate);
        }
      }
    }
  }
  return solutions;
}
