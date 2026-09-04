/** Total run length of a session. Source: 01_product/GAME_SPEC.md */
export const GAME_DURATION_MS = 10 * 60 * 1000;

/**
 * Notausgang, kein Taktgeber: Normalerweise klickt die Spielleitung das Intro
 * weiter, wenn sie es vorgelesen hat. Diese Dauer verhindert nur, dass eine
 * vergessene Session ewig im Vorspann steht.
 *
 * Sie darf grosszügig sein, weil die Spieluhr erst mit der ersten Prüfung
 * anläuft - das Intro kostet keine Spielzeit.
 */
export const INTRO_DURATION_MS = 3 * 60 * 1000;

/** Seal reveal / room change between two trials. */
export const TRANSITION_DURATION_MS = 4_000;

/** Bridge finale before the win screen. */
export const FINALE_DURATION_MS = 6_500;

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
