import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { companionsGathered, GEAR_LABELS, GEAR_SOLUTION } from '@kfw-escape/shared';

export interface PlayerHandle {
  name: string;
  page: Page;
  context: BrowserContext;
}

export interface Table {
  host: Page;
  hostContext: BrowserContext;
  code: string;
  players: PlayerHandle[];
}

/** Matches HOST_PASSWORD in playwright.config.ts. */
export const HOST_PASSWORD = 'e2e-spielleitung';

/** Passes the game master login if this installation has one configured. */
export async function hostLogin(page: Page): Promise<void> {
  /*
   * The host view shows a placeholder until it knows whether a login exists.
   * Probing for the password field before that races: it is legitimately absent
   * for a moment, the login gets skipped, and the failure only surfaces later
   * as a missing control - in whichever test happened to lose the race.
   */
  await expect(page.locator('.host-boot')).toHaveCount(0);

  const field = page.getByLabel('Passwort');
  if (!(await field.isVisible().catch(() => false))) return;
  await field.fill(HOST_PASSWORD);
  await page.getByRole('button', { name: /^Anmelden$/ }).click();
  await expect(field).toHaveCount(0);
}

export async function createSession(browser: Browser): Promise<{ host: Page; hostContext: BrowserContext; code: string }> {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const host = await hostContext.newPage();
  await host.goto('/host');
  await hostLogin(host);
  await host.getByRole('button', { name: /Neue Session erstellen/ }).click();
  await host.waitForURL(/\/host\/[A-Z0-9]{6}/);
  const code = host.url().split('/').pop() as string;
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  return { host, hostContext, code };
}

export async function joinPlayer(browser: Browser, code: string, name: string): Promise<PlayerHandle> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`/join/${code}`);
  await page.getByLabel('Anzeigename').fill(name);
  await page.getByRole('button', { name: /Der Reisegruppe beitreten/ }).click();
  await page.waitForURL(new RegExp(`/game/${code}`));
  return { name, page, context };
}

export async function seatTable(browser: Browser, names: string[]): Promise<Table> {
  const { host, hostContext, code } = await createSession(browser);
  const players: PlayerHandle[] = [];
  for (const name of names) players.push(await joinPlayer(browser, code, name));
  // the app says "1 Gefährte" in the singular, so use the same helper it does
  await expect(host.getByText(companionsGathered(names.length))).toBeVisible();
  return { host, hostContext, code, players };
}

/**
 * Startet die Runde und klickt den Vorspann weiter.
 *
 * Das Intro wartet bewusst auf die Spielleitung statt auf eine Stoppuhr - ohne
 * diesen zweiten Klick beginnt keine Prüfung und die Spieluhr läuft nicht an.
 */
export async function startAdventure(host: Page): Promise<void> {
  await host.getByRole('button', { name: 'Abenteuer beginnen' }).click();
  const onward = host.getByRole('button', { name: 'Weiter zur ersten Prüfung' });
  await expect(onward).toBeVisible({ timeout: 20_000 });
  await onward.click();
  await expect(onward).toHaveCount(0);
}

/**
 * Die Kennung einer Person aus ihrer eigenen Ansicht.
 *
 * Über den Namen zu klicken ist unzuverlässig: In einer Auswahlzeile stehen
 * ausser dem Namen auch die Bezeichnung des Sigels und mögliche
 * Kennzeichnungen.
 */
export async function playerIdOf(player: PlayerHandle): Promise<string> {
  const code = player.page.url().split('/').pop() as string;
  const raw = await player.page.evaluate(
    (key) => window.localStorage.getItem(key),
    `kfw-escape:player:${code.toUpperCase()}`,
  );
  return (JSON.parse(raw as string) as { playerId: string }).playerId;
}

export async function closeTable(table: Table): Promise<void> {
  for (const player of table.players) await player.context.close();
  await table.hostContext.close();
}

/** Waits until one of the players is offered the trial, then accepts. */
export async function acceptOfferedSolver(players: PlayerHandle[]): Promise<PlayerHandle> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    for (const player of players) {
      const button = player.page.getByRole('button', { name: 'Prüfung annehmen' });
      if ((await button.count()) > 0) {
        await button.click();
        await expect(player.page.getByRole('button', { name: /^Prüfung annehmen$/ })).toHaveCount(0);
        return player;
      }
    }
    await players[0]!.page.waitForTimeout(250);
  }
  throw new Error('No companion was offered the trial');
}

export async function findOfferedPlayer(players: PlayerHandle[]): Promise<PlayerHandle> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    for (const player of players) {
      if ((await player.page.getByRole('button', { name: 'Prüfung annehmen' }).count()) > 0) return player;
    }
    await players[0]!.page.waitForTimeout(250);
  }
  throw new Error('No companion was offered the trial');
}

export async function waitForStation(page: Page, index: number): Promise<void> {
  await expect(page.getByText(`Station ${index + 1}/5`)).toBeVisible({ timeout: 45_000 });
}

/* ------------------------------------------------------------------ */
/* Puzzle solutions, driven purely through the UI                      */
/* ------------------------------------------------------------------ */

export async function solveRunes(page: Page): Promise<void> {
  const swap = async (a: number, b: number): Promise<void> => {
    const runes = page.locator('.rune');
    await runes.nth(a).click();
    await runes.nth(b).click();
    await page.waitForTimeout(250);
  };
  // frozen start order: moon, river, flame, hammer, mountain
  await swap(0, 2);
  await swap(1, 4);
  await swap(2, 3);
}

/** Optimal slide sequence for the frozen start board, proven by the BFS test. */
export const CABLE_SOLUTION = [2, 3, 7, 11, 10, 14, 15, 11, 7, 6, 10, 11, 15];

export async function solveCableBoard(page: Page): Promise<void> {
  for (const index of CABLE_SOLUTION) {
    const row = Math.floor(index / 4) + 1;
    const col = (index % 4) + 1;
    await page.locator(`[aria-label^="Kachel Zeile ${row} Spalte ${col}"]`).click();
    await page.waitForTimeout(180);
  }
}

export const DIFF_LABELS = [
  'Rune oben links',
  'Pfeilrichtung der mittleren Verbindung',
  'Speichen des unteren Zahnrads',
  'Beschriftung des Behälters',
];

export async function solveDiff(page: Page): Promise<void> {
  for (const label of DIFF_LABELS) {
    await page.locator(`[aria-label="Auffälligkeit prüfen: ${label}"]`).first().click();
    await page.waitForTimeout(300);
  }
}

/**
 * Aus der Lösung abgeleitet statt abgeschrieben - sonst geht der Plan beim
 * nächsten Umbau des Rätsels still daneben. Motor und Tor sind fest, alle fünf
 * Räder drehen.
 */
export const GEAR_PLAN: [string, number][] = GEAR_SOLUTION.map((orientation, index) => [
  GEAR_LABELS[index] as string,
  orientation,
]);

export async function solveGears(page: Page): Promise<void> {
  for (const [label, turns] of GEAR_PLAN) {
    for (let i = 0; i < turns; i += 1) {
      await page.locator(`[aria-label="${label} im Uhrzeigersinn drehen"]`).click();
      await page.waitForTimeout(140);
    }
  }
}

export async function enterCode(page: Page, code: string): Promise<void> {
  for (const digit of code.split('')) {
    await page.getByRole('button', { name: digit, exact: true }).click();
    await page.waitForTimeout(120);
  }
  await page.getByRole('button', { name: 'Code prüfen' }).click();
}

export async function solveCurrentTrial(page: Page, index: number): Promise<void> {
  switch (index) {
    case 0:
      return solveRunes(page);
    case 1:
      return solveCableBoard(page);
    case 2:
      return solveDiff(page);
    case 3:
      return solveGears(page);
    case 4:
      return enterCode(page, '042');
    default:
      throw new Error(`Unknown trial ${index}`);
  }
}
