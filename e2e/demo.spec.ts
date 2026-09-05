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
      await expect(page.getByText(`Station ${index + 1}/5`)).toBeVisible();
      await expect(page.getByRole('heading', { name: puzzle.title })).toBeVisible();

      await solveCurrentTrial(page, index);
      await expect(page.getByText(puzzle.successLine)).toBeVisible({ timeout: 15_000 });

      if (index < PUZZLES.length - 1) {
        await page.getByRole('button', { name: 'Nächste Prüfung' }).click();
      }
    }

    // Letzte Station: Der Weiterknopf hat kein Ziel mehr.
    await expect(page.getByRole('button', { name: 'Nächste Prüfung' })).toBeDisabled();
  });

  test('springt über die URL direkt in eine Prüfung und setzt sie zurück', async ({ page }) => {
    await page.goto('/demo/4');
    await expect(page.getByText('Station 4/5')).toBeVisible();

    await solveCurrentTrial(page, 3);
    await expect(page.getByText(PUZZLES[3]!.successLine)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Prüfung zurücksetzen' }).click();
    await expect(page.getByText(PUZZLES[3]!.successLine)).toHaveCount(0);
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
