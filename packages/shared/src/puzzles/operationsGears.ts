import type { OperationsGearsAction, OperationsGearsState } from '../types.js';

/**
 * Die Minen des Betriebs - ein Kettenrätsel.
 *
 * Fünf drehbare Räder stehen zwischen einem festen Motor links und dem Tor
 * rechts. Der Rand jedes Rades ist normal verzahnt; an einzelnen Sektoren
 * sitzen zusätzlich mechanische Anschlüsse in vier Formen, jeweils als Zapfen
 * (steht heraus) oder Kerbe (nimmt auf).
 *
 * Zwei Anschlüsse greifen ineinander, wenn sie dieselbe Form haben und
 * entgegengesetzt ausgeprägt sind: Dreieck-Zapfen passt in Dreieck-Kerbe,
 * Dreieck-Zapfen passt nicht in Kreis-Kerbe.
 *
 * Der Witz des Rätsels ist die lokale Mehrdeutigkeit. Rad I etwa trägt drei
 * Dreieck-Kerben, nimmt den Motor also in drei verschiedenen Stellungen auf -
 * aber je nachdem welche davon links liegt, steht rechts ein anderer Zapfen.
 * Ein Kontakt für sich zu lösen bringt daher nichts; nur eine Kombination aller
 * fünf Stellungen verbindet Motor und Tor durchgehend.
 *
 * Aufbauwissen, das man braucht, um am Layout zu schrauben: Links- und
 * Rechtsanschluss eines Rades liegen immer genau gegenüber, also vier Sektoren
 * auseinander. Ein Rad ist damit nichts als vier gegenüberliegende Paare - und
 * genau darüber steuert man, wie viele Eingänge lokal passen und was dabei
 * rechts herauskommt.
 */

export const GEAR_STEPS = 8;
export const GEAR_COUNT = 5;

export type ConnectorShape = 'triangle' | 'circle' | 'square' | 'diamond';
/** peg steht heraus, socket nimmt auf. */
export type ConnectorPolarity = 'peg' | 'socket';

export interface Connector {
  readonly shape: ConnectorShape;
  readonly polarity: ConnectorPolarity;
}

/** null bedeutet: an dieser Stelle nur die normale Verzahnung. */
export type GearSector = Connector | null;

export const CONNECTOR_SHAPES: readonly ConnectorShape[] = Object.freeze([
  'triangle',
  'circle',
  'square',
  'diamond',
]);

export const SHAPE_LABELS: Record<ConnectorShape, string> = {
  triangle: 'Dreieck',
  circle: 'Kreis',
  square: 'Quadrat',
  diamond: 'Diamant',
};

const SHAPE_BY_CODE: Record<string, ConnectorShape> = {
  T: 'triangle',
  C: 'circle',
  S: 'square',
  D: 'diamond',
};

/**
 * Kompaktschreibweise, damit das Layout am Stück lesbar bleibt:
 * `T+` Dreieck-Zapfen, `T-` Dreieck-Kerbe, `.` nur Verzahnung.
 */
function sector(code: string): GearSector {
  if (code === '.') return null;
  const shape = SHAPE_BY_CODE[code[0] as string];
  if (!shape) throw new Error(`Unbekannte Form: ${code}`);
  if (code[1] !== '+' && code[1] !== '-') throw new Error(`Unbekannte Ausprägung: ${code}`);
  return Object.freeze({ shape, polarity: code[1] === '+' ? 'peg' : 'socket' });
}

function ring(spec: string): readonly GearSector[] {
  const sectors = spec.trim().split(/\s+/).map(sector);
  if (sectors.length !== GEAR_STEPS) throw new Error(`Ring braucht ${GEAR_STEPS} Sektoren`);
  return Object.freeze(sectors);
}

/**
 * Das Layout. Bewiesen eindeutig durch enumerateGearSolutions(), das alle
 * 8^5 = 32768 Stellungskombinationen durchgeht.
 *
 * Rad I nimmt den Motor in drei Stellungen auf und liefert dabei drei
 * verschiedene Anschlüsse nach rechts - dort entsteht die Mehrdeutigkeit, die
 * das Tor am Ende wieder auflöst.
 */
export const GEAR_RINGS: readonly (readonly GearSector[])[] = Object.freeze([
  ring('.  T-  T-  T-  .   S+  D+  T+'),
  ring('.  S-  T-  D-  .   D-  T-  T+'),
  ring('T- C-  D-  .   S+  C-  D+  . '),
  ring('S- S-  S-  .   D+  C+  C+  . '),
  ring('.  D-  D-  D-  .   S+  T+  T+'),
]);

/** Fester Anschluss des Motors, gerichtet auf Rad I. */
export const MOTOR_CONNECTOR: Connector = sector('T+') as Connector;
/** Fester Anschluss des Tors, gerichtet auf Rad V. */
export const GATE_CONNECTOR: Connector = sector('S-') as Connector;

export const GEAR_SOLUTION: readonly number[] = Object.freeze([2, 1, 4, 4, 3]);
export const GEAR_START_ORIENTATIONS: readonly number[] = Object.freeze([0, 0, 0, 0, 0]);

export const GEAR_LABELS: readonly string[] = Object.freeze([
  'Rad I',
  'Rad II',
  'Rad III',
  'Rad IV',
  'Rad V',
]);

/** Kontakte: Motor↔I, I↔II, II↔III, III↔IV, IV↔V, V↔Tor. */
export const CONTACT_COUNT = GEAR_COUNT + 1;

function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}

export function connectorLabel(connector: GearSector): string {
  if (!connector) return 'nur Verzahnung';
  return `${SHAPE_LABELS[connector.shape]}-${connector.polarity === 'peg' ? 'Zapfen' : 'Kerbe'}`;
}

/** Anschluss, den ein Rad seinem rechten Nachbarn zuwendet. */
export function rightConnector(gear: number, orientation: number): GearSector {
  const sectors = GEAR_RINGS[gear];
  if (!sectors) throw new Error(`Unbekanntes Rad ${gear}`);
  return sectors[mod(-orientation, GEAR_STEPS)] ?? null;
}

/** Anschluss, den ein Rad seinem linken Nachbarn zuwendet. */
export function leftConnector(gear: number, orientation: number): GearSector {
  const sectors = GEAR_RINGS[gear];
  if (!sectors) throw new Error(`Unbekanntes Rad ${gear}`);
  return sectors[mod(4 - orientation, GEAR_STEPS)] ?? null;
}

/** Gleiche Form, entgegengesetzte Ausprägung - sonst nichts. */
export function connectorsFit(a: GearSector, b: GearSector): boolean {
  if (!a || !b) return false;
  return a.shape === b.shape && a.polarity !== b.polarity;
}

/** Was an Kontakt `contact` von links kommt (Kontakt 0 ist der Motor). */
export function incomingAt(orientations: readonly number[], contact: number): GearSector {
  if (contact === 0) return MOTOR_CONNECTOR;
  const orientation = orientations[contact - 1];
  if (orientation === undefined) return null;
  return rightConnector(contact - 1, orientation);
}

/** Was an Kontakt `contact` von rechts kommt (letzter Kontakt ist das Tor). */
export function outgoingAt(orientations: readonly number[], contact: number): GearSector {
  if (contact === GEAR_COUNT) return GATE_CONNECTOR;
  const orientation = orientations[contact];
  if (orientation === undefined) return null;
  return leftConnector(contact, orientation);
}

export function isContactMeshed(orientations: readonly number[], contact: number): boolean {
  return connectorsFit(incomingAt(orientations, contact), outgoingAt(orientations, contact));
}

export function computeContacts(orientations: readonly number[]): boolean[] {
  const contacts: boolean[] = [];
  for (let i = 0; i < CONTACT_COUNT; i += 1) contacts.push(isContactMeshed(orientations, i));
  return contacts;
}

/** Wie weit der Antrieb vom Motor aus ununterbrochen durchgreift. */
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
  if (!Number.isInteger(gear) || gear < 0 || gear >= GEAR_COUNT) return null;
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

/**
 * Geht alle 8^5 Stellungskombinationen durch. Grundlage des Eindeutigkeits-
 * beweises: Findet dieser Aufruf mehr als eine Lösung, ist das Layout kaputt.
 */
export function enumerateGearSolutions(): number[][] {
  const solutions: number[][] = [];
  const orientations = [0, 0, 0, 0, 0];
  const walk = (gear: number): void => {
    if (gear === GEAR_COUNT) {
      if (isGearsSolved(orientations)) solutions.push([...orientations]);
      return;
    }
    for (let o = 0; o < GEAR_STEPS; o += 1) {
      orientations[gear] = o;
      walk(gear + 1);
    }
  };
  walk(0);
  return solutions;
}

/**
 * Wie viele Teilketten nach jedem Kontakt noch leben. Beleg dafür, dass das
 * Rätsel lokal mehrdeutig ist und nicht Rad für Rad abgehakt werden kann.
 */
export function chainBranching(): number[] {
  let live: number[][] = [[]];
  const counts: number[] = [];
  for (let gear = 0; gear < GEAR_COUNT; gear += 1) {
    const next: number[][] = [];
    for (const prefix of live) {
      const incoming = gear === 0 ? MOTOR_CONNECTOR : rightConnector(gear - 1, prefix[gear - 1] as number);
      for (let o = 0; o < GEAR_STEPS; o += 1) {
        if (connectorsFit(incoming, leftConnector(gear, o))) next.push([...prefix, o]);
      }
    }
    live = next;
    counts.push(live.length);
  }
  counts.push(
    live.filter((o) => connectorsFit(rightConnector(GEAR_COUNT - 1, o[GEAR_COUNT - 1] as number), GATE_CONNECTOR))
      .length,
  );
  return counts;
}
