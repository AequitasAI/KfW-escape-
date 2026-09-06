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

import { FIRST_BUILDER, HUHI_LINES, REGIONS } from './lore.js';

export const GAME_TITLE = 'Die Brücke zur Zwei-Programme-Welt';
export const GAME_SUBTITLE = 'Ein Fantasy-Escape-Adventure für das KBS-BA-Team';

/**
 * Das Intro wird vorgelesen und von der Spielleitung weitergeklickt, nicht von
 * einer Stoppuhr fortgeschoben. Es darf deshalb Luft haben - und die Zeile über
 * die Uhr ist keine Verzierung, sondern eine echte Regel, die man kennen sollte.
 */
export const INTRO_LINES: readonly string[] = [
  'Vor langer Zeit beschloss man den Wiederaufbau.',
  'Man prüfte. Man bewilligte. Man baute eine Brücke zur Zwei-Programme-Welt.',
  `${FIRST_BUILDER.name}, ${FIRST_BUILDER.epithet}, soll gesagt haben, man müsse sie von beiden Seiten bauen.`,
  'Dann legte man sie ordnungsgemäß ab – und vergaß, wo.',
  'Seither ist sie versiegelt. Fünf Siegel, fünf Prüfungen, keine Ausnahmegenehmigung.',
  `Zwischen euch und ihr liegen das Archiv der Bestände, ${REGIONS.wohnlande}, ${REGIONS.studoria}`,
  'und die Minen des Betriebs, in denen ein Zwerg wartet, der jeden Release seit dem Wiederaufbau',
  'gesehen hat und entsprechend gut gelaunt ist.',
  `Am Horizont ${REGIONS.huhi}. Da geht heute niemand hin.`,
  'Ihr habt zehn Minuten. Die Uhr läuft erst, wenn die erste Prüfung beginnt –',
  'so viel Kulanz muss sein.',
  'Immer nur eine Person darf bedienen. Alle anderen dürfen reden. Laut.',
  'Wählt eure Gefährten. Öffnet die Tore. Vollendet den Release.',
];

/** Steht unter dem Vorspann, solange noch nicht alle weitergeklickt haben. */
export const INTRO_WAIT_LINE =
  'Lest in Ruhe. Wer so weit ist, geht schon vor – die erste Prüfung öffnet, sobald alle da sind.';

export const LOBBY_HEADLINE = 'Die Reisegruppe versammelt sich';
export const LOBBY_SUBLINE =
  `Tretet der Reisegruppe bei und wartet auf das Zeichen der Spielleitung. Draussen liegt die Karte: ${REGIONS.wohnlande}, ${REGIONS.studoria} – und weit hinten ${REGIONS.huhi}.`;

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
  progress: 'Hm. Es greift schon ein Stück. Das war vermutlich Absicht.',
  almost: 'Fast. Ein Anschluss fehlt noch. Und jetzt bloß nicht kreativ werden.',
  success: 'ES LÄUFT! JETZT BLOSS NICHTS MEHR ANFASSEN!',
} as const;

/**
 * Was der Zwerg sagt, solange er nichts Nettes zu melden hat. Ausgewählt wird
 * nach der Zahl der Züge - also serverseitig für alle gleich, und langsam genug,
 * dass man den Spruch auch zu Ende lesen kann.
 */
export const DWARF_IDLE_LINES: readonly string[] = [
  'Wer hat euch denn hier runtergelassen?',
  'Bestand ist Bestand. Auch nach dem dritten Zeitalter.',
  'Freitags keine neuen Expeditionen. Steht am Schild. Seit Zeitaltern.',
  `Der Stollen nach HuHi? Gesperrt. ${HUHI_LINES[1] as string}`,
  'Vorsicht. Das Ding ist älter als die meisten Vorschriften.',
  'Zapfen ins Loch. Nicht Loch auf Zapfen. Das ist schon der ganze Trick.',
  'Ich hab das mal dokumentiert. Liegt im Archiv. Irgendwo.',
  'Der Letzte, der hier war, wollte das agil machen.',
  'Dreht ruhig weiter. Kaputter wird es nicht. Wahrscheinlich.',
  'Früher gab es dafür ein Formular. Das war auch nicht besser.',
  'Fünf Räder. Vier davon bewegen sich. Den Rest macht die Mathematik.',
  'Ich sag ja nichts. Ich schau nur zu und denke mir meinen Teil.',
  'Wenn ihr fertig seid, sagt Bescheid. Ich bin dann in der Pause.',
  'Das Antriebsrad ist fest verbaut. Aus Gründen. Fragt nicht.',
  'Sortiert das mal jemand von links nach rechts? Wie beim Aktenzeichen.',
];

/** Züge, die derselbe Spruch stehen bleibt. */
export const DWARF_LINE_EVERY_MOVES = 3;

export function dwarfIdleLine(moves: number): string {
  const step = Math.floor(Math.max(0, moves) / DWARF_LINE_EVERY_MOVES);
  return DWARF_IDLE_LINES[step % DWARF_IDLE_LINES.length] as string;
}

export const TESTMASTER_LINE =
  'Nur was geprüft wurde, darf diese Halle verlassen. Fünf Abweichungen, und wir zählen mit. Danach gibt es das Siegel der Durchführung – vorher nicht.';

export const GUARD_LINES = {
  start: 'HALT.',
  continue:
    'Ihr habt geprüft. Ihr habt die Maschinen erweckt. Doch ohne das letzte Siegel überschreitet niemand diese Brücke. Auch nicht mit Termindruck.',
  success:
    'Dann dürft ihr passieren. Eure Unterlagen sind vollständig – das kommt seltener vor, als ihr denkt.',
} as const;

/**
 * Was der Wächter bei einem falschen Code sagt. Ein Wort pro Versuch, in dieser
 * Reihenfolge - er ist nicht der Gegner, er macht nur seine Arbeit.
 */
export const GUARD_CHALLENGES: readonly string[] = Object.freeze([
  'Nachweis?',
  'Berechtigung?',
  'Dokumentiert?',
]);

export function guardChallenge(attempts: number): string {
  const index = Math.max(0, attempts - 1) % GUARD_CHALLENGES.length;
  return GUARD_CHALLENGES[index] as string;
}

export const SOLVER_REVEAL_PREFIX = 'Der nächste Gefährte wird bestimmt …';

export const WIN_LINES: readonly string[] = [
  'DIE BRÜCKE STEHT.',
  'Die fünf Siegel erwachen.',
  'Die Zwei-Programme-Welt ist erreicht.',
  'Bestände geführt, Nachweise erbracht, Brücke abgenommen.',
  'Wiederaufbau abgeschlossen. Mission erfüllt.',
];

export const LOSE_LINES: readonly string[] = [
  'ZU SPÄT.',
  'Die Brücke bleibt versiegelt.',
  'Der große Übergang wird auf das nächste Wartungsfenster verschoben.',
  'Morgen ist auch noch ein Release-Tag.',
];

/**
 * Verloren an der letzten Prüfung statt an der Uhr. Der Ton bleibt ernst: Die
 * Gruppe hat sich entschieden, und die Entscheidung war falsch - darüber macht
 * man sich nicht lustig, dafür war der Abend zu lang.
 */
export const LOSE_FINAL_TRIAL_LINES: readonly string[] = Object.freeze([
  'DER STEIN HAT GESPROCHEN.',
  'Das falsche Tor. Die Brücke bleibt versiegelt.',
  'Der Runenmeister fragt nur einmal – so war es abgemacht.',
  'Fünf Siegel, zehn Schritte vor dem Ziel. Das nächste Mal.',
]);

export const LOSE_GAG =
  'Der Betriebszwerg behauptet, er habe es gleich gesagt. Er hat es nicht gleich gesagt.';

export const FINALE_LINE = 'Die Siegel erwachen. Die Brücke formt sich aus Runen und Energie.';

/**
 * Der falsche Sieg.
 *
 * Zwei Schläge in einer Sequenz: Erst hat die Gruppe gewonnen - fünf Siegel,
 * offenes Tor, die Brücke fährt aus. Dann grollt es, die Brücke steht still,
 * und mitten darauf steigt ein Tor aus dem Stein, das auf keinem Plan steht.
 * Der Ton bleibt ernst; der Witz liegt im Umschlag, nicht in der Sprache.
 */
export const FALSE_VICTORY = {
  triumphTitle: 'Die Brücke erwacht',
  triumphLine: 'Fünf Siegel, ein offenes Tor. Der Weg in die Zwei-Programme-Welt liegt frei.',
  triumphNote: 'Mission fast erfüllt.',
  twistTitle: 'Eine letzte Prüfung bleibt',
  twistLine: 'Nicht jeder, der die Brücke erreicht, darf sie auch überschreiten.',
  twistNote: 'Mitten auf der Brücke steigt ein Tor aus dem Stein. Auf keinem Plan ist es verzeichnet.',
} as const;

/** Der Runenmeister spricht nur einmal - und hilft dabei nicht. */
export const RUNE_MASTER_LINE =
  'Drei Tore. Drei Inschriften. Genau eine sagt die Wahrheit – und ich verrate nicht, welche.';

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
  'Siegel der Durchführung',
  'Siegel des Betriebs',
  'Siegel der Bewilligung',
];

export function sealEarned(index: number): string {
  return SEAL_NAMES[index] ?? 'Ein Siegel';
}

/** Shown on the victory screen, under the statistics. */
export const WIN_FOOTNOTE =
  'Ein Vorhaben, ordnungsgemäß geprüft, bewilligt und in Betrieb genommen – und das ohne eine einzige Nachforderung. Der Wiederaufbau kann weitergehen.';

export const LOSE_FOOTNOTE =
  'Das Vorhaben wird zurückgestellt. Die Unterlagen bleiben erhalten – wie immer. Aufbewahrungsfrist: auf unbestimmte Zeit.';
