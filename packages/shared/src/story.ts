/**
 * All player facing copy. Source: 02_story/STORY_AND_COPY.md
 * Kept in shared so display, host and player views never drift apart.
 */

export const GAME_TITLE = 'Die Brücke zur Zwei-Programme-Welt';
export const GAME_SUBTITLE = 'Ein Fantasy-Escape-Adventure für das KBS-BA-Team';

export const INTRO_LINES: readonly string[] = [
  'Die große Umstellung steht bevor.',
  'Doch die Brücke zur Zwei-Programme-Welt ist versiegelt.',
  'Fünf Prüfungen liegen zwischen euch und dem großen Übergang.',
  'Nur das KBS-BA-Team kann die verlorenen Siegel zurückholen.',
  'Ihr habt zehn Minuten.',
  'Wählt eure Gefährten. Öffnet die Tore. Vollendet den Release.',
];

export const LOBBY_HEADLINE = 'Die Reisegruppe versammelt sich';
export const LOBBY_SUBLINE = 'Tretet der Reisegruppe bei und wartet auf das Zeichen der Spielleitung.';

export function companionsGathered(count: number): string {
  if (count === 0) return 'Noch niemand hat sich versammelt.';
  if (count === 1) return '1 Gefährte hat sich versammelt.';
  return `${count} Gefährten haben sich versammelt.`;
}

/** Betriebszwerg – a side character, never a depiction of a real person. */
export const DWARF_LINES = {
  start: 'Wer hat euch denn hier runtergelassen?',
  progress: 'Hm.',
  almost: 'Gar nicht völlig unfähig.',
  success: 'ES LÄUFT! JETZT BLOSS NICHTS MEHR ANFASSEN!',
} as const;

export const TESTMASTER_LINE = 'Nur was geprüft wurde, darf diese Halle verlassen.';

export const GUARD_LINES = {
  start: 'HALT.',
  continue:
    'Ihr habt geprüft. Ihr habt die Maschinen erweckt. Doch ohne das letzte Siegel überschreitet niemand diese Brücke.',
  success: 'Eure Unterlagen sind vollständig.',
} as const;

export const SOLVER_REVEAL_PREFIX = 'Der nächste Gefährte wird bestimmt …';

export const WIN_LINES: readonly string[] = [
  'DIE BRÜCKE STEHT.',
  'Die fünf Siegel erwachen.',
  'Die Zwei-Programme-Welt ist erreicht.',
  'Mission erfüllt.',
];

export const LOSE_LINES: readonly string[] = [
  'ZU SPÄT.',
  'Die Brücke bleibt versiegelt.',
  'Der große Übergang muss warten.',
  'Morgen ist auch noch ein Release-Tag.',
];

export const LOSE_GAG = 'Der Betriebszwerg behauptet, er habe es gleich gesagt.';

export const FINALE_LINE = 'Die Siegel erwachen. Die Brücke formt sich aus Runen und Energie.';
