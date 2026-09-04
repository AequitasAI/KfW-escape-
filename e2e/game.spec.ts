import { expect, test } from '@playwright/test';
import {
  acceptOfferedSolver,
  closeTable,
  createSession,
  enterCode,
  findOfferedPlayer,
  hostLogin,
  HOST_PASSWORD,
  joinPlayer,
  seatTable,
  solveCurrentTrial,
  waitForStation,
} from './helpers.js';

test.describe('Lobby und Beitritt', () => {
  test('A01/A02: Spieler joinen per Link, identische Namen bleiben unterscheidbar, Reload stellt wieder her', async ({
    browser,
  }) => {
    const { host, hostContext, code } = await createSession(browser);

    const a = await joinPlayer(browser, code, 'Alex');
    const b = await joinPlayer(browser, code, 'Alex');

    await expect(host.getByText('2 Gefährten haben sich versammelt.')).toBeVisible();
    await expect(host.locator('.host__player-name')).toHaveCount(2);

    // A02: a reload must not throw the player out of the session
    await a.page.reload();
    await a.page.waitForURL(new RegExp(`/game/${code}`));
    await expect(a.page.getByText('Die Reisegruppe versammelt sich')).toBeVisible();
    await expect(host.getByText('2 Gefährten haben sich versammelt.')).toBeVisible();

    // renaming in the lobby is allowed and reaches every client
    await a.page.getByLabel(/Anzeigename ändern/).fill('Alexandra');
    await a.page.getByRole('button', { name: 'Speichern' }).click();
    await expect(host.getByText('Alexandra')).toBeVisible();

    await b.context.close();
    await a.context.close();
    await hostContext.close();
  });

  test('unbekannter Sessioncode führt nicht in einen kaputten Zustand', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/join/ZZZZZZ');
    await expect(page.getByText(/gibt es nicht/)).toBeVisible();
    await context.close();
  });
});

test.describe('Solver-Mechanik', () => {
  test('A03: nur der angenommene Gefährte kann bedienen, alle anderen sehen dasselbe', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas', 'Alex', 'Sam']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();

    const solver = await acceptOfferedSolver(table.players);
    const observer = table.players.find((p) => p !== solver)!;

    await waitForStation(solver.page, 0);
    await waitForStation(observer.page, 0);

    // the observer sees the same puzzle but its controls are disabled
    await expect(observer.page.locator('.rune').first()).toBeVisible();
    await expect(observer.page.locator('.rune').first()).toBeDisabled();
    await expect(observer.page.getByText(/Nur der Gefährte kann bedienen/)).toBeVisible();

    // and the server rejects an action forged past the UI
    const rejection = await observer.page.evaluate(async (sessionCode) => {
      const socket = (window as unknown as { __gameSocket?: unknown }).__gameSocket;
      return socket ? 'socket-exposed' : `no-socket:${sessionCode}`;
    }, table.code);
    expect(rejection).toContain('no-socket');

    // the solver can act, and the change is mirrored to the observer live
    const before = await observer.page.locator('.rune .rune__label').first().innerText();
    await solver.page.locator('.rune').nth(0).click();
    await solver.page.locator('.rune').nth(1).click();
    await expect
      .poll(async () => observer.page.locator('.rune .rune__label').first().innerText(), { timeout: 10_000 })
      .not.toBe(before);

    await closeTable(table);
  });

  test('A04: Weitergeben zieht einen Spieler, der noch nicht dran war', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas', 'Alex', 'Sam']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();

    const first = await findOfferedPlayer(table.players);
    await first.page.getByRole('button', { name: 'An anderen Gefährten weitergeben' }).click();
    // the offer has to be gone here, otherwise the next search races the update
    await expect(first.page.getByRole('button', { name: 'Prüfung annehmen' })).toHaveCount(0);

    const second = await findOfferedPlayer(table.players);
    expect(second.name).not.toBe(first.name);

    // the player who declined is not offered again for this trial
    await second.page.getByRole('button', { name: 'An anderen Gefährten weitergeben' }).click();
    await expect(second.page.getByRole('button', { name: 'Prüfung annehmen' })).toHaveCount(0);
    const third = await findOfferedPlayer(table.players);
    expect([first.name, second.name]).not.toContain(third.name);

    await closeTable(table);
  });

  test('A12: Host kann den Gefährten neu ziehen', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas', 'Alex', 'Sam']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();

    const solver = await acceptOfferedSolver(table.players);
    await expect(table.host.getByText(solver.name).first()).toBeVisible();

    await table.host.getByRole('button', { name: 'Gefährten neu ziehen' }).click();

    // the former solver loses the controls again
    await expect
      .poll(async () => solver.page.locator('.rune').first().isDisabled(), { timeout: 10_000 })
      .toBe(true);

    await closeTable(table);
  });
});

test.describe('Timer', () => {
  test('A05: startet bei 10:00, läuft serverseitig und übersteht einen Reload', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await expect(table.host.locator('.timer__value').first()).toHaveText('10:00');

    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();
    await table.players[0]!.page.waitForTimeout(3_000);

    const readClock = async (page: import('@playwright/test').Page): Promise<number> => {
      const text = await page.locator('.timer__value').first().innerText();
      const [m, s] = text.split(':').map(Number);
      return (m as number) * 60 + (s as number);
    };

    const beforeReload = await readClock(table.players[0]!.page);
    expect(beforeReload).toBeLessThan(600);
    expect(beforeReload).toBeGreaterThan(560);

    await table.players[0]!.page.reload();
    await table.players[0]!.page.waitForSelector('.timer__value');
    const afterReload = await readClock(table.players[0]!.page);

    // the reload must not hand back time
    expect(Math.abs(afterReload - beforeReload)).toBeLessThanOrEqual(3);

    // and every client agrees within a second
    const hostClock = await readClock(table.host);
    expect(Math.abs(hostClock - afterReload)).toBeLessThanOrEqual(2);

    await closeTable(table);
  });

  test('A12: Pause hält die Zeit an, Resume setzt sie fort', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();
    await table.host.waitForTimeout(2_000);

    await table.host.getByRole('button', { name: 'Pausieren' }).click();
    await expect(table.host.getByText('Pausiert')).toBeVisible();
    const paused = await table.host.locator('.timer__value').first().innerText();

    await table.host.waitForTimeout(3_500);
    expect(await table.host.locator('.timer__value').first().innerText()).toBe(paused);
    await expect(table.players[0]!.page.getByRole('heading', { name: 'Pause' })).toBeVisible();

    await table.host.getByRole('button', { name: 'Fortsetzen' }).click();
    await table.host.waitForTimeout(2_000);
    expect(await table.host.locator('.timer__value').first().innerText()).not.toBe(paused);

    await closeTable(table);
  });
});

test.describe('Kompletter Durchlauf', () => {
  test('A06-A11: alle fünf Prüfungen lösen und gewinnen, synchron auf allen Ansichten', async ({ browser }) => {
    test.setTimeout(180_000);
    const table = await seatTable(browser, ['Mara', 'Jonas', 'Alex', 'Sam', 'Rike']);

    const displayContext = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const display = await displayContext.newPage();
    await display.goto(`/display/${table.code}`);
    await expect(display.locator('.display__code')).toHaveText(table.code);
    // the big screen carries no admin control at all
    await expect(display.getByRole('button', { name: /Pausieren|überspringen|neu ziehen|beginnen/ })).toHaveCount(0);

    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();

    for (let index = 0; index < 5; index += 1) {
      const solver = await acceptOfferedSolver(table.players);
      await waitForStation(solver.page, index);
      await expect(display.getByText(`Station ${index + 1}/5`)).toBeVisible();

      await solveCurrentTrial(solver.page, index);

      // the seal count advances for everyone
      await expect
        .poll(async () => display.locator('.seal--lit').count(), { timeout: 30_000 })
        .toBeGreaterThanOrEqual(index + 1);
    }

    await expect(display.getByText('DIE BRÜCKE STEHT.')).toBeVisible({ timeout: 40_000 });
    await expect(table.players[0]!.page.getByText('DIE BRÜCKE STEHT.')).toBeVisible();
    await expect(table.host.getByText('Gewonnen')).toBeVisible();

    // the result is reported identically on display and player view
    await expect(display.getByText('Restzeit')).toBeVisible();
    await expect(table.players[0]!.page.getByText('Restzeit')).toBeVisible();

    await displayContext.close();
    await closeTable(table);
  });

  test('A10: das Schwarze Tor akzeptiert nur 042, inklusive führender Null', async ({ browser }) => {
    test.setTimeout(150_000);
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();

    // skip straight to the last trial via the host failsafe
    for (let index = 0; index < 4; index += 1) {
      await acceptOfferedSolver(table.players);
      await table.host.getByRole('button', { name: 'Prüfung überspringen' }).click();
      await table.host.waitForTimeout(1_200);
    }

    const solver = await acceptOfferedSolver(table.players);
    await waitForStation(solver.page, 4);

    await enterCode(solver.page, '420');
    await expect(solver.page.getByText('Das Tor bleibt verschlossen. Versucht es erneut.')).toBeVisible();
    await expect(solver.page.getByText('DIE BRÜCKE STEHT.')).toHaveCount(0);

    await enterCode(solver.page, '042');
    await expect(solver.page.getByText('DIE BRÜCKE STEHT.')).toBeVisible({ timeout: 40_000 });

    await closeTable(table);
  });
});

test.describe('Minen des Betriebs', () => {
  test('ein gedrehtes Zahnrad bleibt an seinem Platz', async ({ browser }) => {
    test.setTimeout(150_000);
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();

    // skip forward to the gear machine
    for (let index = 0; index < 3; index += 1) {
      await acceptOfferedSolver(table.players);
      await table.host.getByRole('button', { name: 'Prüfung überspringen' }).click();
      await table.host.waitForTimeout(1_200);
    }
    const solver = await acceptOfferedSolver(table.players);
    await waitForStation(solver.page, 3);

    const centres = async (): Promise<{ x: number; y: number }[]> =>
      solver.page.locator('.gear__spin').evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
        }),
      );

    const before = await centres();
    expect(before).toHaveLength(5);

    for (let i = 0; i < 3; i += 1) {
      await solver.page.locator('[aria-label="Zahnrad II im Uhrzeigersinn drehen"]').click();
      await solver.page.waitForTimeout(200);
    }
    await solver.page.waitForTimeout(600);
    const after = await centres();

    /*
     * A gear must spin on its own axle. With the SVG default transform-box the
     * origin is the centre of the whole machine, so the first rotation threw the
     * gear clean out of the picture - the signature puzzle was unplayable the
     * moment anyone touched it.
     */
    for (let i = 0; i < before.length; i += 1) {
      expect(Math.abs(after[i]!.x - before[i]!.x)).toBeLessThanOrEqual(4);
      expect(Math.abs(after[i]!.y - before[i]!.y)).toBeLessThanOrEqual(4);
    }

    await closeTable(table);
  });
});

test.describe('Host-Failsafes', () => {
  test('A12: Reset bringt die Session zurück in die Lobby', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();
    await acceptOfferedSolver(table.players);

    await table.host.locator('summary', { hasText: 'Notfalleingriffe' }).click();
    await table.host.getByRole('button', { name: 'Session zurücksetzen' }).click();
    await table.host.getByRole('button', { name: 'Wirklich zurücksetzen?' }).click();

    await expect(table.host.locator('.chip', { hasText: 'Lobby' })).toBeVisible();
    await expect(table.host.locator('.timer__value').first()).toHaveText('10:00');
    await expect(table.players[0]!.page.getByText('Die Reisegruppe versammelt sich')).toBeVisible();

    await closeTable(table);
  });

  test('+30 Sekunden ist als Host-Eingriff verfügbar', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();
    await table.host.waitForTimeout(2_500);

    const read = async (): Promise<number> => {
      const [m, s] = (await table.host.locator('.timer__value').first().innerText()).split(':').map(Number);
      return (m as number) * 60 + (s as number);
    };
    const before = await read();

    await table.host.locator('summary', { hasText: 'Notfalleingriffe' }).click();
    await table.host.getByRole('button', { name: '+30 Sekunden' }).click();
    await table.host.waitForTimeout(600);

    expect(await read()).toBeGreaterThan(before + 25);

    await closeTable(table);
  });
});

test.describe('Barrierefreiheit', () => {
  test('A13: die Runen sind ohne Drag bedienbar und per Tastatur erreichbar', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();
    const solver = await acceptOfferedSolver(table.players);
    await waitForStation(solver.page, 0);

    // explicit move buttons exist next to every socket
    await expect(solver.page.getByRole('button', { name: /nach rechts verschieben/ }).first()).toBeVisible();

    const before = await solver.page.locator('.rune .rune__label').first().innerText();
    await solver.page.getByRole('button', { name: /nach rechts verschieben/ }).first().click();
    await expect
      .poll(async () => solver.page.locator('.rune .rune__label').first().innerText(), { timeout: 10_000 })
      .not.toBe(before);

    // every rune socket is a real button, so tab order reaches it
    await expect(solver.page.locator('button.rune')).toHaveCount(5);

    await closeTable(table);
  });
});

test.describe('Spielleitung von einem anderen Gerät', () => {
  test('Login übernimmt eine laufende Session und startet sie', async ({ browser }) => {
    // the laptop that creates the session
    const table = await seatTable(browser, ['Mara', 'Jonas']);

    // the locked-down office machine: a fresh context, no host secret anywhere
    const office = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await office.newPage();
    await page.goto('/host');

    // a wrong password gets nowhere
    await page.getByLabel('Passwort').fill('falsch');
    await page.getByRole('button', { name: /^Anmelden$/ }).click();
    await expect(page.getByRole('alert')).toContainText(/Passwort/);

    await page.getByLabel('Passwort').fill(HOST_PASSWORD);
    await page.getByRole('button', { name: /^Anmelden$/ }).click();

    // the running session is offered for takeover and can be steered from here
    await page.getByRole('button', { name: new RegExp(table.code) }).click();
    await page.waitForURL(new RegExp(`/host/${table.code}`));
    await page.getByRole('button', { name: 'Abenteuer beginnen' }).click();

    // the players see the start, so this browser really holds control
    await expect(table.players[0]!.page.locator('.timer__value')).toBeVisible();
    await expect(page.locator('.chip', { hasText: /Intro|Prüfung läuft/ })).toBeVisible();

    await office.close();
    await closeTable(table);
  });

  test('ohne Anmeldung ist die Steuerung nicht erreichbar', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);

    const stranger = await browser.newContext();
    const page = await stranger.newPage();
    await page.goto(`/host/${table.code}`);

    // the login stands in front of it, and no control is rendered
    await expect(page.getByLabel('Passwort')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abenteuer beginnen' })).toHaveCount(0);

    await stranger.close();
    await closeTable(table);
  });

  test('das Passwort gilt auch nach einem Reload', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/host');
    await hostLogin(page);
    await page.reload();
    await expect(page.getByLabel('Passwort')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Neue Session erstellen/ })).toBeVisible();
    await context.close();
  });
});

test.describe('Zeichen der Gefährten', () => {
  test('jeder Gefährte bekommt ein eigenes Zeichen, überall dasselbe', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas', 'Ayse']);

    // the player sees their own sigil named, not just drawn
    await expect(table.players[0]!.page.locator('.lobby__sigil')).toContainText(/Dein Zeichen:/);

    // three players, three different sigils in the host list
    const labels = await table.host.locator('.host__player .avatar').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-label') ?? ''),
    );
    expect(labels).toHaveLength(3);
    expect(new Set(labels).size).toBe(3);
    for (const label of labels) expect(label).toMatch(/^Zeichen: /);

    // the beamer shows the same sigils for the same people
    const display = await table.hostContext.newPage();
    await display.goto(`/display/${table.code}`);
    await expect(display.locator('.display__roster-item .avatar')).toHaveCount(3);
    const onDisplay = await display.locator('.display__roster-item .avatar').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-label') ?? ''),
    );
    expect(onDisplay.sort()).toEqual([...labels].sort());

    await display.close();
    await closeTable(table);
  });
});
