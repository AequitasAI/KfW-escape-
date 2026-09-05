/** Total run length of a session. Source: 01_product/GAME_SPEC.md */
export const GAME_DURATION_MS = 10 * 60 * 1000;

/**
 * Lesezeit für den Vorspann, kein Taktgeber für die Gruppe.
 *
 * Wer fertig gelesen hat, klickt selbst weiter und steht dann schon in der
 * ersten Halle. Die erste Prüfung öffnet, sobald alle so weit sind - spätestens
 * aber nach dieser Zeit, damit eine unaufmerksame Runde nicht hängen bleibt.
 * Die Spieluhr läuft während des Vorspanns nicht, er kostet also keine Spielzeit.
 */
export const INTRO_DURATION_MS = 30_000;

/**
 * Wie lange eine gelöste Prüfung noch stehen bleibt, bevor der Übergang kommt.
 *
 * Ohne diese Pause überschreibt der Siegel-Bildschirm die Erfolgsanimation im
 * selben Moment, in dem sie beginnt: Die Maschine läuft an, das Tor öffnet
 * sich, die Energie fliesst - und niemand sieht davon ein einziges Bild. Die
 * Eingabe ist währenddessen bereits gesperrt.
 */
export const SOLVED_HOLD_MS = 2_600;

/** Seal reveal / room change between two trials. */
export const TRANSITION_DURATION_MS = 4_000;

/**
 * Der falsche Sieg zwischen dem Schwarzen Tor und der letzten Prüfung.
 *
 * Kurz genug, dass niemand ungeduldig wird, lang genug für beide Schläge: erst
 * „geschafft", dann „doch nicht". Die Spielleitung kann jederzeit weiterklicken.
 */
export const FALSE_VICTORY_DURATION_MS = 6_500;

/** Ab hier kippt der Triumph - Grollen, Flackern, das letzte Tor steigt auf. */
export const FALSE_VICTORY_TWIST_AT_MS = 3_000;

/** Bridge finale before the win screen. */
export const FINALE_DURATION_MS = 6_500;

/**
 * Siegel gibt es für die fünf Hallen. Die letzte Prüfung auf der Brücke bringt
 * kein sechstes - sie ist die Bedingung dafür, die fünf überhaupt zu behalten.
 * Der Fortschrittspfad zeigt deshalb bis zuletzt fünf Stationen.
 */
export const SEAL_COUNT = 5;

/** A hint can be offered after this much time in the same trial. */
export const HINT_AFTER_MS = 75_000;

/** Emergency host bonus, clearly marked as a host intervention in the UI. */
export const HOST_BONUS_TIME_MS = 30_000;

/** Session code alphabet without visually ambiguous characters. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export const MAX_DISPLAY_NAME_LENGTH = 24;
export const MIN_DISPLAY_NAME_LENGTH = 2;

/** Timer broadcast interval. Clients interpolate between these snapshots. */
export const TIMER_SYNC_INTERVAL_MS = 1_000;
