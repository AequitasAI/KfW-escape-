import type { OperationsGearsAction, OperationsGearsState } from '../types.js';

/** Source: 03_puzzles/operations_gears.json */
export const GEAR_STEPS = 8;
export const GEAR_COUNT = 5;

/**
 * Eight discrete contact sectors per gear with tooth profile values 1/2/3.
 * Two touching sectors mesh when their profile values add up to 4.
 */
export const GEAR_PROFILES: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([1, 1, 2, 2, 1, 1, 2, 1]), // gear 0 - motor, fixed
  Object.freeze([1, 3, 2, 1, 1, 2, 1, 1]),
  Object.freeze([3, 2, 1, 1, 3, 3, 3, 1]),
  Object.freeze([3, 2, 2, 3, 2, 2, 1, 2]),
  Object.freeze([3, 1, 1, 3, 1, 2, 3, 3]),
]);

export const GEAR_SOLUTION: readonly number[] = Object.freeze([0, 3, 3, 6, 7]);

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

/** Profile value that the gear presents to its right hand neighbour. */
export function rightContactProfile(gear: number, orientation: number): number {
  const profile = GEAR_PROFILES[gear];
  if (!profile) throw new Error(`Unknown gear ${gear}`);
  return profile[mod(-orientation, GEAR_STEPS)] as number;
}

/** Profile value that the gear presents to its left hand neighbour. */
export function leftContactProfile(gear: number, orientation: number): number {
  const profile = GEAR_PROFILES[gear];
  if (!profile) throw new Error(`Unknown gear ${gear}`);
  return profile[mod(4 - orientation, GEAR_STEPS)] as number;
}

export function isContactMeshed(orientations: readonly number[], contact: number): boolean {
  const left = orientations[contact];
  const right = orientations[contact + 1];
  if (left === undefined || right === undefined) return false;
  return rightContactProfile(contact, left) + leftContactProfile(contact + 1, right) === 4;
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
