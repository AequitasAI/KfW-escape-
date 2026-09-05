import { expect, test } from '@playwright/test';
import { PUZZLES } from '@kfw-escape/shared';
import { solveCurrentTrial } from './helpers.js';

/**
 * Der Übungsraum ist die Werkbank für die Rätsel: keine Session, keine
 * Anmeldung, kein Spielleiter. Genau das prüfen diese Tests - dass alle fünf
 * Prüfungen allein aus dem Browser heraus spielbar sind und dieselbe Logik
 * greift wie im Abenteuer.
 */
test.describe('Übungsraum', () => {
  test('spielt alle fünf Prüfungen ohne Session durch', async ({ page }) => {
    await page.goto('/demo');

    for (const [index, puzzle] of PUZZLES.entries()) {
      // die letzte Prüfung heisst nicht „Station 6/5" - sie zählt bewusst nicht mit
      await expect(page.getByText(puzzle.station).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: puzzle.title })).toBeVisible();

      await solveCurrentTrial(page, index);
      await expect(page.getByText(puzzle.successLine)).toBeVisible({ timeout: 15_000 });

      // gelöst heisst weiter, ohne Knopf - genau wie im Abenteuer
      if (index < PUZZLES.length - 1) {
        await expect(page.getByText(PUZZLES[index + 1]!.station).first()).toBeVisible({
          timeout: 15_000,
        });
      }
    }

    // Letzte Station: Der Weiterknopf hat kein Ziel mehr.
    await expect(page.getByRole('button', { name: 'Nächste Prüfung' })).toBeDisabled();
    await expect(page.getByText('Alle Prüfungen durchgespielt.')).toBeVisible();
  });

  test('springt über die URL direkt in eine Prüfung und setzt sie zurück', async ({ page }) => {
    await page.goto('/demo/4');
    await expect(page.getByText('Station 4/5')).toBeVisible();

    await solveCurrentTrial(page, 3);
    await expect(page.getByText(PUZZLES[3]!.successLine)).toBeVisible({ timeout: 15_000 });

    // Zurücksetzen greift, solange die Nachschau läuft - danach ist man weiter
    await page.getByRole('button', { name: 'Prüfung zurücksetzen' }).click();
    await expect(page.getByText(PUZZLES[3]!.successLine)).toHaveCount(0);
    await expect(page.getByText('Station 4/5')).toBeVisible();
  });

  /*
   * Im Übungsraum aufgefallen: Der Betriebszwerg samt Sprechblase war breiter
   * als ein Telefon und schob die ganze Seite seitlich, die fünf Regler
   * ebenso. Auf einem Handy stand die Hälfte des Rätsels ausserhalb des Bildes.
   */
  test('Die Minen des Betriebs laufen auf einem Telefon nicht aus dem Bild', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/demo/4');
    await expect(page.getByText('Station 4/5')).toBeVisible();

    // schmal heisst senkrecht: fünf Räder nebeneinander wären auf dem Telefon
    // nicht mehr zu bedienen
    await expect(page.locator('.gears--column')).toHaveCount(1);

    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);

    // gedreht wird am Rad selbst, und das ist daumengross
    const grip = await page.locator('.gear-grip__hit').first().boundingBox();
    expect(grip?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(grip?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('am Rechner liegt dieselbe Kette waagerecht', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/demo/4');
    await expect(page.locator('.gears--row')).toHaveCount(1);
    // und ohne Erklärabsatz darunter: eine Zeile Text, sonst Maschine
    await expect(page.locator('.gears__legend')).toHaveCount(0);
  });

  /*
   * Die fünf Abweichungen stecken zwischen zwölf Prüffeldern. Ein Feld ohne
   * Befund darf nichts weiterzählen - sonst wäre das Rätsel durch Abklicken
   * gelöst statt durch Vergleichen.
   */
  test('die Halle der Prüfmeister zählt nur echte Abweichungen', async ({ page }) => {
    await page.goto('/demo/3');
    const plan = page.locator('.diff__plan').first();

    for (const field of ['V', 'X']) {
      await plan.locator(`[data-field="${field}"]`).click();
      // die Sperre gegen Klickfluten läuft serverseitig 750 ms
      await page.waitForTimeout(900);
    }
    await expect(page.getByText('0 von 5 Abweichungen gefunden')).toBeVisible();

    await solveCurrentTrial(page, 2);
    await expect(page.getByText(PUZZLES[2]!.successLine)).toBeVisible({ timeout: 15_000 });
    // der Stempel der Prüfmeister liegt auf beiden Plänen
    await expect(page.locator('.plan__approval')).toHaveCount(2);
  });

  /*
   * Der Übungsraum ist der einzige Ort, an dem man den einen Versuch gefahrlos
   * verspielen kann - genau dafür ist er da.
   */
  test('die letzte Prüfung verzeiht keinen Fehlgriff', async ({ page }) => {
    await page.goto('/demo/6');
    await expect(page.getByRole('button', { name: /Zuerst ein Tor wählen/ })).toBeDisabled();

    await page.getByRole('button', { name: 'Das erste Tor als Weg wählen' }).click();
    await expect(page.getByRole('button', { name: /Jetzt die wahre Inschrift benennen/ })).toBeDisabled();
    await page.getByRole('button', { name: /Inschrift des Das erste Tor/ }).click();

    const go = page.getByRole('button', { name: 'Das Tor durchschreiten' });
    await expect(go).toBeEnabled();
    await go.click();

    // erst zurück, dann doch
    await page.getByRole('button', { name: 'Noch einmal nachdenken' }).click();
    await expect(page.getByText(/Eine falsche Angabe beendet das Abenteuer/)).toHaveCount(0);
    await go.click();
    await page.getByRole('button', { name: 'Ja – durchschreiten' }).click();

    await expect(
      page.getByText('Der Stein schliesst sich. Es gab nur diesen einen Versuch.'),
    ).toBeVisible();
    // kein zweiter Anlauf: die Tore nehmen nichts mehr an
    await expect(page.getByRole('button', { name: 'Das zweite Tor als Weg wählen' })).toBeDisabled();
  });

  test('ist ohne Anmeldung von der Startseite aus erreichbar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Zum Übungsraum' }).click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByText('Station 1/5')).toBeVisible();
    // kein Sessioncode, kein Spielleitungs-Login unterwegs
    await expect(page.locator('.demo__badge')).toHaveText('Übungsraum');
  });
});
