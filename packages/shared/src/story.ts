/**
 * All player facing copy. Source: 02_story/STORY_AND_COPY.md
 * Kept in shared so display, host and player views never drift apart.
 *
 * Tone, per the story spec: epic but self-ironic, fantasy first, KfW and BA
 * references only as flavour. No real organisational unit is the villain, no
 * real person appears as a figure, no internal process detail is used.
 *
 * The house flavour leans on the one word the institution hands us for free:
 * Wiederaufbau. A bridge being rebuilt so two programmes can reach each other
 * is the story and the day job at the same time - that is the whole joke, and
 * it stays affectionate.
 */

export const GAME_TITLE = 'Die Brücke zur Zwei-Programme-Welt';
export const GAME_SUBTITLE = 'Ein Fantasy-Escape-Adventure für das KBS-BA-Team';

export const INTRO_LINES: readonly string[] = [
  'Die große Umstellung steht bevor.',
  'Doch die Brücke zur Zwei-Programme-Welt ist versiegelt.',
  'Vor langer Zeit wurde sie bewilligt, geprüft und erbaut – dann vergaß man, sie zu pflegen.',
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
/**
 * Der Zwerg ist die einzige Rückmeldung an der Maschine. Einzelne Paare
 * verraten sich bewusst nicht - sonst dreht man jedes Rad blind durch, bis es
 * aufleuchtet, und schaut die Zahnformen nie an. Er meldet sich erst, wenn der
 * Antrieb wirklich durch mehrere Räder greift.
 */
export const DWARF_LINES = {
  start: 'Wer hat euch denn hier runtergelassen?',
  progress: 'Hm. Drei Räder greifen ineinander. Weiter so.',
  almost: 'Vier. Eins fehlt. Verkorkst es jetzt nicht.',
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
  'Wiederaufbau abgeschlossen. Mission erfüllt.',
];

export const LOSE_LINES: readonly string[] = [
  'ZU SPÄT.',
  'Die Brücke bleibt versiegelt.',
  'Der große Übergang muss warten.',
  'Morgen ist auch noch ein Release-Tag.',
];

export const LOSE_GAG = 'Der Betriebszwerg behauptet, er habe es gleich gesagt.';

export const FINALE_LINE = 'Die Siegel erwachen. Die Brücke formt sich aus Runen und Energie.';

/* ------------------------------------------------------------------ */
/* House flavour                                                       */
/* ------------------------------------------------------------------ */

/**
 * Short in-world lines with a light institutional wink, shown while a room is
 * on screen. Deliberately about the craft - reviewing, funding, rebuilding,
 * keeping records - never about a real team, product or process.
 */
export const SEAL_NAMES: readonly string[] = [
  'Siegel der Bestandsführung',
  'Siegel der Verbindung',
  'Siegel der Prüfung',
  'Siegel des Betriebs',
  'Siegel der Bewilligung',
];

export function sealEarned(index: number): string {
  return SEAL_NAMES[index] ?? 'Ein Siegel';
}

/** Shown on the victory screen, under the statistics. */
export const WIN_FOOTNOTE =
  'Ein Vorhaben, ordnungsgemäß geprüft, bewilligt und in Betrieb genommen. Der Wiederaufbau kann weitergehen.';

export const LOSE_FOOTNOTE =
  'Das Vorhaben wird zurückgestellt. Die Unterlagen bleiben erhalten – wie immer.';
