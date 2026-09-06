/**
 * Die Förderwelt in der Sprache des Spiels.
 *
 * Diese Namen stehen in den Texten - im Vorspann, in den Atmosphärezeilen, in
 * den Sprüchen der Figuren. Sie liegen nicht als Marken über den gemalten
 * Bildern: Dort sahen sie aus wie aufgeklebt, und ein gemaltes Artwork verträgt
 * keine Beschriftung, die nicht mitgemalt wurde. Wer die Welt reicher machen
 * will, schreibt hier einen Namen dazu und benutzt ihn in einer Zeile - oder
 * malt ihn beim nächsten Artwork gleich mit hinein.
 *
 * Quellen sind ausschliesslich öffentlich bekannte Programmnummern und
 * Aufgabenbereiche sowie die im Projekt vorgegebenen internen Kürzel. Keine
 * Kunden-, Vertrags- oder Produktionsdaten, keine echten Dokumente, keine
 * Behörde mit Namen - Erlasse kommen aus „der Hauptstadt".
 */

/** Die Regionen der Karte. Sie werden genannt, nicht erklärt. */
export const REGIONS = {
  wohnlande: 'die Wohnlande',
  studoria: 'die Akademien von Studoria',
  altschulden: 'die Gewölbe der Altschulden',
  aufstieg: 'die Gilde des Aufstiegs',
  huhi: 'die uralten Hallen von HuHi',
} as const;

/**
 * Die uralten Hallen von HuHi.
 *
 * Der Witz gilt ausschliesslich dem Alter der Anwendung und dem Aufwand, sie zu
 * pflegen - nie dem Zweck der Stiftung und nie den Menschen, um die es dort
 * geht. Deshalb betritt man diese Hallen in diesem Spiel auch nicht: Sie liegen
 * am Horizont, alle sehen sie, und alle sind froh, heute woanders zu sein.
 */
export const HUHI_LINES: readonly string[] = Object.freeze([
  'Nur wenige kennen noch alle Wege durch diese Hallen.',
  'Man sagt, jeder Umbau weckt drei weitere Abhängigkeiten.',
  'Die Chroniken reichen weiter zurück als jede bekannte Release-Dokumentation.',
]);

/**
 * Der Erste Baumeister. Vorname und Beiname wie in einer Sage - kein Nachname,
 * kein Amt, kein Abbild. Die zweite Zeile ist für die, die das alliterierende
 * Vorstandsformat kennen.
 */
export const FIRST_BUILDER = {
  name: 'Stefan der Weise',
  epithet: 'Erster Baumeister der Brücke',
  saying: 'Man müsse eine Brücke von beiden Seiten bauen, soll er gesagt haben.',
  invitation: 'Er lädt zum Met mit dem Meister, jeden Mondwechsel.',
} as const;
