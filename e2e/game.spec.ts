import { expect, test } from '@playwright/test';
import {
  GEAR_LABELS,
  GEAR_SOLUTION,
  MOTOR_CONNECTOR,
  connectorsFit,
  leftConnector,
} from '@kfw-escape/shared';
import {
  acceptOfferedSolver,
  closeTable,
  createSession,
  enterCode,
  findOfferedPlayer,
  hostLogin,
  HOST_PASSWORD,
  playerIdOf,
  startAdventure,
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
    await startAdventure(table.host);

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
    await startAdventure(table.host);

    const first = await findOfferedPlayer(table.players);
    // Weitergeben öffnet jetzt eine Auswahl; der Zufallsknopf darin ist das alte Verhalten
    await first.page.getByRole('button', { name: 'An anderen Gefährten weitergeben' }).click();
    await first.page.getByRole('button', { name: 'Zufällig auswählen' }).click();
    // the offer has to be gone here, otherwise the next search races the update
    await expect(first.page.getByRole('button', { name: 'Prüfung annehmen' })).toHaveCount(0);

    const second = await findOfferedPlayer(table.players);
    expect(second.name).not.toBe(first.name);

    // the player who declined is not offered again for this trial
    await second.page.getByRole('button', { name: 'An anderen Gefährten weitergeben' }).click();
    await second.page.getByRole('button', { name: 'Zufällig auswählen' }).click();
    await expect(second.page.getByRole('button', { name: 'Prüfung annehmen' })).toHaveCount(0);
    const third = await findOfferedPlayer(table.players);
    expect([first.name, second.name]).not.toContain(third.name);

    await closeTable(table);
  });

  test('A12: Host kann den Gefährten neu ziehen', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas', 'Alex', 'Sam']);
    await startAdventure(table.host);

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

    await startAdventure(table.host);
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
    await startAdventure(table.host);
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

    await startAdventure(table.host);

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

    /*
     * Fünf Siegel - und trotzdem noch nicht gewonnen. Zwischen dem Schwarzen
     * Tor und dem Sieg liegt der falsche Sieg und danach die letzte Prüfung.
     */
    await expect(display.locator('.fv')).toBeVisible({ timeout: 30_000 });
    await expect(display.getByText('DIE BRÜCKE STEHT.')).toHaveCount(0);

    const last = await acceptOfferedSolver(table.players);
    await waitForStation(last.page, 5);
    await solveCurrentTrial(last.page, 5);

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
    await startAdventure(table.host);

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

    /*
     * Der richtige Code öffnet das Tor - aber noch nicht die Brücke. Was folgt,
     * ist der falsche Sieg und danach die Prüfung des Runenmeisters.
     */
    await enterCode(solver.page, '042');
    await expect(solver.page.locator('.fv')).toBeVisible({ timeout: 40_000 });

    const last = await acceptOfferedSolver(table.players);
    await waitForStation(last.page, 5);
    await expect(last.page.getByText('DIE BRÜCKE STEHT.')).toHaveCount(0);
    await solveCurrentTrial(last.page, 5);
    await expect(last.page.getByText('DIE BRÜCKE STEHT.')).toBeVisible({ timeout: 40_000 });

    await closeTable(table);
  });
});

test.describe('Minen des Betriebs', () => {
  test('ein gedrehtes Zahnrad bleibt an seinem Platz', async ({ browser }) => {
    test.setTimeout(150_000);
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await startAdventure(table.host);

    // skip forward to the gear machine
    for (let index = 0; index < 3; index += 1) {
      await acceptOfferedSolver(table.players);
      await table.host.getByRole('button', { name: 'Prüfung überspringen' }).click();
      await table.host.waitForTimeout(1_200);
    }
    const solver = await acceptOfferedSolver(table.players);
    await waitForStation(solver.page, 3);

    /*
     * Gemessen wird innerhalb der Maschine, nicht im Fenster: Die Seite scrollt
     * beim Bedienen, und Fensterkoordinaten würden dann eine Verschiebung
     * melden, die keine ist. Der Bezugspunkt ist deshalb die Zeichnung selbst.
     */
    const centres = async (): Promise<{ x: number; y: number }[]> =>
      solver.page.locator('.gears__svg').evaluate((svg) =>
        [...svg.querySelectorAll('.gear__spin')].map((n) => {
          const r = n.getBoundingClientRect();
          const base = svg.getBoundingClientRect();
          return {
            x: Math.round(r.x + r.width / 2 - base.x),
            y: Math.round(r.y + r.height / 2 - base.y),
          };
        }),
      );

    const before = await centres();
    expect(before).toHaveLength(5);

    for (let i = 0; i < 3; i += 1) {
      await solver.page
        .locator(`[aria-label="${GEAR_LABELS[1]} im Uhrzeigersinn drehen"]`)
        .click();
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
    await startAdventure(table.host);
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
    await startAdventure(table.host);
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
    await startAdventure(table.host);
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
    await startAdventure(page);

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

test.describe('Anmeldung ohne speicherbares Cookie', () => {
  test('sagt, warum die Anmeldung nicht haelt, statt stumm neu zu fragen', async ({ browser }) => {
    /*
     * Reproduziert den Fall aus dem Betrieb: das Passwort stimmt, aber die
     * Kennung landet nie im Browser - ueber http:// bei gesetztem
     * COOKIE_SECURE, oder weil Cookies blockiert sind. Frueher kam das
     * Formular wortlos zurueck und man suchte den Fehler beim Passwort.
     */
    const context = await browser.newContext();
    const page = await context.newPage();

    // der Login gelingt, das Cookie erreicht den Browser aber nicht
    await page.route('**/api/host/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/host');
    await hostLogin(page).catch(() => undefined);

    await expect(page.getByRole('alert')).toContainText(/nicht gespeichert werden/);
    await expect(page.getByLabel('Passwort')).toBeVisible();

    await context.close();
  });
});

test.describe('Allein in der Reisegruppe', () => {
  test('bietet kein Weitergeben an, wenn es niemanden gibt', async ({ browser }) => {
    /*
     * Aus dem Betrieb: ein einzelner Spieler drückt "weitergeben", der Server
     * bietet dieselbe Person wieder an, auf dem Schirm passiert nichts - die
     * Prüfung wirkte eingefroren.
     */
    const table = await seatTable(browser, ['Markus']);
    await startAdventure(table.host);

    const player = table.players[0]!.page;
    await expect(player.getByRole('button', { name: /Prüfung annehmen/ })).toBeVisible({
      timeout: 30_000,
    });
    await expect(player.getByRole('button', { name: /weitergeben/ })).toHaveCount(0);
    await expect(player.getByText(/allein unterwegs/)).toBeVisible();

    // annehmen geht weiterhin, die Prüfung ist also nicht blockiert
    await player.getByRole('button', { name: /Prüfung annehmen/ }).click();
    await waitForStation(player, 0);

    await closeTable(table);
  });
});

test.describe('Lösung für die Spielleitung', () => {
  test('zeigt die Lösung der laufenden Prüfung, eingeklappt', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await startAdventure(table.host);
    const solver = await acceptOfferedSolver(table.players);
    await waitForStation(solver.page, 0);

    // eingeklappt: der Inhalt steht nicht offen auf dem Schirm
    await expect(table.host.getByText('Flamme', { exact: true })).toHaveCount(0);

    await table.host.locator('summary', { hasText: 'Lösung dieser Prüfung' }).click();
    const solution = table.host.locator('.host__solution-body');
    await expect(solution).toContainText('Flamme');
    await expect(solution).toContainText('Berg');
    await expect(solution).toContainText('Fluss');

    // und die Spielenden bekommen davon nichts zu sehen
    await expect(solver.page.locator('.host__solution')).toHaveCount(0);

    await closeTable(table);
  });
});

test.describe('Minen des Betriebs: Kette statt Einzelkontakte', () => {
  test('ein passender Kontakt leuchtet, ohne dass die Maschine läuft', async ({ browser }) => {
    test.setTimeout(180_000);
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await startAdventure(table.host);

    for (let station = 0; station < 3; station += 1) {
      const solver = await acceptOfferedSolver(table.players);
      await waitForStation(solver.page, station);
      await solveCurrentTrial(solver.page, station);
    }

    const atGears = await acceptOfferedSolver(table.players);
    await waitForStation(atGears.page, 3);

    // Ausgangslage: nichts greift
    await expect(atGears.page.locator('.gears__contact')).toHaveCount(0);

    /*
     * Rad I nimmt den Motor in mehreren Stellungen auf. Sobald eine davon
     * eingestellt ist, leuchtet dieser eine Kontakt - und nur dieser. Genau
     * daran hängt das Rätsel: lokal richtig heisst hier nicht global richtig.
     */
    const first = GEAR_LABELS[0] as string;
    for (let i = 0; i < (GEAR_SOLUTION[0] as number); i += 1) {
      await atGears.page.locator(`[aria-label="${first} im Uhrzeigersinn drehen"]`).click();
      await atGears.page.waitForTimeout(150);
    }

    await expect(atGears.page.locator('.gears__contact')).toHaveCount(1);
    await expect(atGears.page.locator('.gears__pip.is-live')).toHaveCount(1);
    // die Maschine läuft deswegen noch lange nicht
    await expect(atGears.page.locator('.puzzle--gears.is-running')).toHaveCount(0);

    /*
     * Wegdrehen löscht den Kontakt - aber nicht schon nach einem Schritt: Rad I
     * hat drei Dreieck-Kerben, mehrere benachbarte Stellungen nehmen den Motor
     * also an. Genau das ist die gewollte Mehrdeutigkeit, deshalb wird bis zur
     * ersten Stellung gedreht, die wirklich nicht passt.
     */
    const accepting = new Set<number>();
    for (let o = 0; o < 8; o += 1) {
      if (connectorsFit(MOTOR_CONNECTOR, leftConnector(0, o))) accepting.add(o);
    }
    expect(accepting.size).toBeGreaterThanOrEqual(3);

    let orientation = GEAR_SOLUTION[0] as number;
    do {
      await atGears.page.locator(`[aria-label="${first} im Uhrzeigersinn drehen"]`).click();
      await atGears.page.waitForTimeout(150);
      orientation = (orientation + 1) % 8;
    } while (accepting.has(orientation));

    await expect(atGears.page.locator('.gears__contact')).toHaveCount(0);

    /*
     * Und die vollständige Kette: alle sechs Kontakte greifen, die Maschine
     * läuft an. Dass das überhaupt zu sehen ist, hängt an der kurzen Nachschau
     * nach dem Lösen - vorher hat der Übergang die Animation im selben Moment
     * überschrieben, in dem sie begann.
     */
    for (let gear = 0; gear < GEAR_SOLUTION.length; gear += 1) {
      const label = GEAR_LABELS[gear] as string;
      const target = GEAR_SOLUTION[gear] as number;
      const current = gear === 0 ? orientation : 0;
      const steps = (target - current + 8) % 8;
      for (let i = 0; i < steps; i += 1) {
        await atGears.page.locator(`[aria-label="${label} im Uhrzeigersinn drehen"]`).click();
        await atGears.page.waitForTimeout(120);
      }
    }

    await expect(atGears.page.locator('.puzzle--gears.is-running')).toHaveCount(1);
    await expect(atGears.page.locator('.gears__contact')).toHaveCount(6);
    await expect(atGears.page.locator('.gears__gate.is-open')).toHaveCount(1);
    // gesperrt: die Greifflächen verschwinden, sobald die Maschine läuft
    await expect(atGears.page.locator('.gear-grip__half')).toHaveCount(0);

    await closeTable(table);
  });
});

test.describe('Vorspann', () => {
  test('wartet auf die Spielleitung und kostet keine Spielzeit', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();

    const player = table.players[0]!.page;
    await expect(player.getByText('Vor langer Zeit beschloss man den Wiederaufbau.')).toBeVisible();
    await expect(player.getByText(/Wer so weit ist, geht schon vor/)).toBeVisible();

    // die Uhr steht: nach mehreren Sekunden immer noch die volle Zeit
    await expect(player.locator('.timer__value')).toHaveText('10:00');
    await player.waitForTimeout(4_000);
    await expect(player.locator('.timer__value')).toHaveText('10:00');

    // erst der Klick der Spielleitung öffnet die erste Prüfung und startet die Uhr
    await table.host.getByRole('button', { name: 'Weiter zur ersten Prüfung' }).click();
    await expect(player.getByText('Station 1/5')).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(async () => player.locator('.timer__value').innerText(), { timeout: 20_000 })
      .not.toBe('10:00');

    await closeTable(table);
  });
});

test.describe('Der Betriebszwerg', () => {
  test('wechselt seine Sprüche, während gedreht wird', async ({ browser }) => {
    test.setTimeout(180_000);
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await startAdventure(table.host);

    for (let station = 0; station < 3; station += 1) {
      const solver = await acceptOfferedSolver(table.players);
      await waitForStation(solver.page, station);
      await solveCurrentTrial(solver.page, station);
    }

    const atGears = await acceptOfferedSolver(table.players);
    await waitForStation(atGears.page, 3);

    const bubble = atGears.page.locator('.dwarf__bubble');
    const first = await bubble.innerText();
    // ein Spruch hält ein paar Züge, dann kommt der nächste
    for (let i = 0; i < 4; i += 1) {
      await atGears.page
        .locator(`[aria-label="${GEAR_LABELS[GEAR_LABELS.length - 1]} im Uhrzeigersinn drehen"]`)
        .click();
      await atGears.page.waitForTimeout(200);
    }
    await expect.poll(async () => bubble.innerText(), { timeout: 10_000 }).not.toBe(first);

    await closeTable(table);
  });
});

test.describe('Vorspann: jeder geht selbst vor', () => {
  test('das Rätsel öffnet erst, wenn alle weitergeklickt haben', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await table.host.getByRole('button', { name: 'Abenteuer beginnen' }).click();

    const [first, second] = table.players as [(typeof table.players)[0], (typeof table.players)[0]];
    const weiter = /Gelesen – weiter zur ersten Halle/;

    await expect(first.page.getByRole('button', { name: weiter })).toBeVisible({ timeout: 20_000 });
    await first.page.getByRole('button', { name: weiter }).click();

    // vorgegangen: schon in der Halle, aber ohne Rätsel und ohne Gefährten
    await expect(first.page.getByText('Das Archiv der alten Bestände')).toBeVisible();
    await expect(first.page.getByText(/Es fehlt noch ein Gefährte/)).toBeVisible();
    await expect(first.page.getByText('Station 1/5')).toHaveCount(0);
    await expect(first.page.getByRole('button', { name: 'Prüfung annehmen' })).toHaveCount(0);

    // die zweite Person liest noch
    await expect(second.page.getByRole('button', { name: weiter })).toBeVisible();

    // sobald sie nachzieht, öffnet die erste Prüfung für alle
    await second.page.getByRole('button', { name: weiter }).click();
    await expect(first.page.getByText('Station 1/5')).toBeVisible({ timeout: 20_000 });
    await expect(second.page.getByText('Station 1/5')).toBeVisible();

    await closeTable(table);
  });
});

test.describe('Gezielte Übergabe', () => {
  test('der Gefährte wählt aus, wer übernimmt', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas', 'Alex']);
    await startAdventure(table.host);

    const offered = await findOfferedPlayer(table.players);
    const others = table.players.filter((p) => p.name !== offered.name);
    const chosen = others[0]!;

    await offered.page.getByRole('button', { name: /weitergeben/ }).click();
    /*
     * Die Auswahl zeigt die anderen Verbundenen, nicht einen selbst. Geprüft
     * wird innerhalb der Auswahl - der eigene Name steht auch im Banner
     * darüber, eine Suche über die ganze Seite fände also immer etwas.
     */
    await expect(offered.page.locator('.handover__name')).toHaveCount(2);
    await expect(
      offered.page.locator('.handover__name', { hasText: offered.name }),
    ).toHaveCount(0);

    await offered.page.locator(`.handover__pick[data-player="${await playerIdOf(chosen)}"]`).click();

    // die gewählte Person bekommt das Angebot, die vorherige verliert es
    await expect(chosen.page.getByRole('button', { name: 'Prüfung annehmen' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(offered.page.getByRole('button', { name: 'Prüfung annehmen' })).toHaveCount(0);
    // und alle Ansichten nennen dieselbe Person
    await expect(table.host.locator('.host__solver')).toHaveText(chosen.name);

    await chosen.page.getByRole('button', { name: 'Prüfung annehmen' }).click();
    await waitForStation(chosen.page, 0);

    await closeTable(table);
  });

  test('die Spielleitung kann den Gefährten gezielt setzen', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await startAdventure(table.host);

    const offered = await findOfferedPlayer(table.players);
    const other = table.players.find((p) => p.name !== offered.name)!;

    /*
     * Erst wenn die Spielleitungsansicht den Kandidaten kennt, ist die Auswahl
     * stabil. Sonst listet sie kurz alle Verbundenen, ordnet sich unter dem
     * Klick neu - und der Klick landet auf der falschen Zeile.
     */
    await expect(table.host.locator('.host__solver')).toHaveText(offered.name);

    await table.host.getByRole('button', { name: 'Gefährten auswählen' }).click();
    await expect(table.host.locator('.handover__name')).toHaveCount(1);
    await table.host.locator(`.handover__pick[data-player="${await playerIdOf(other)}"]`).click();

    await expect(other.page.getByRole('button', { name: 'Prüfung annehmen' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(offered.page.getByRole('button', { name: 'Prüfung annehmen' })).toHaveCount(0);
    await expect(table.host.locator('.host__solver')).toHaveText(other.name);

    await closeTable(table);
  });
});

test.describe('Die verlorene Verbindung', () => {
  test('zeigt Ein- und Austritt auf der richtigen Höhe', async ({ browser }) => {
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await startAdventure(table.host);
    const solver = await acceptOfferedSolver(table.players);
    await waitForStation(solver.page, 0);
    await solveCurrentTrial(solver.page, 0);

    const next = await acceptOfferedSolver(table.players);
    await waitForStation(next.page, 1);

    /*
     * Quelle und Fassung liegen im selben SVG wie das Brett - und zwar auf der
     * Höhe ihrer Reihe. Vorher standen sie vertikal zentriert daneben, sodass
     * die Einspeisehöhe nur im Hinweistext stand.
     */
    const source = next.page.locator('.cable__source');
    const target = next.page.locator('.cable__target');
    await expect(source).toBeVisible();
    await expect(target).toBeVisible();

    const box = async (sel: string): Promise<{ y: number; h: number }> => {
      const b = await next.page.locator(sel).boundingBox();
      return { y: b?.y ?? 0, h: b?.height ?? 0 };
    };
    const src = await box('.cable__source');
    const tgt = await box('.cable__target');
    const row2 = await box('[aria-label^="Kachel Zeile 2 Spalte 1"]');
    const row3 = await box('[aria-label^="Kachel Zeile 3 Spalte 4"]');

    // Quelle auf Höhe von Reihe 2, Fassung auf Höhe von Reihe 3
    expect(Math.abs(src.y + src.h / 2 - (row2.y + row2.h / 2))).toBeLessThan(row2.h);
    expect(Math.abs(tgt.y + tgt.h / 2 - (row3.y + row3.h / 2))).toBeLessThan(row3.h);
    // und sie liegen nicht auf derselben Höhe, sonst sagt der Test nichts
    expect(Math.abs(src.y - tgt.y)).toBeGreaterThan(row2.h * 0.5);

    await closeTable(table);
  });
});

test.describe('Der falsche Sieg', () => {
  /*
   * Die Dramaturgie des Abends hängt an dieser Sequenz: Nach dem Schwarzen Tor
   * sieht alles nach Sieg aus - Brücke, fünf Siegel, „Der Weg ist frei" -, und
   * dann steht mitten darauf doch noch ein Tor. Der Test hält beide Schläge
   * fest und dass die letzte Prüfung erst danach kommt.
   */
  test('zwischen Tor und Brücke steht eine letzte Prüfung', async ({ browser }) => {
    test.setTimeout(180_000);
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    const displayContext = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const display = await displayContext.newPage();
    await display.goto(`/display/${table.code}`);

    await startAdventure(table.host);
    for (let index = 0; index < 4; index += 1) {
      await acceptOfferedSolver(table.players);
      await table.host.getByRole('button', { name: 'Prüfung überspringen' }).click();
      await table.host.waitForTimeout(1_200);
    }

    const solver = await acceptOfferedSolver(table.players);
    await waitForStation(solver.page, 4);
    await enterCode(solver.page, '042');

    // erster Schlag: gewonnen
    await expect(display.getByText('Die Brücke erwacht')).toBeVisible({ timeout: 40_000 });
    // zweiter Schlag: doch nicht
    await expect(display.getByText('Eine letzte Prüfung bleibt')).toBeVisible({ timeout: 20_000 });
    await expect(display.locator('.fv--twist')).toHaveCount(1);

    // erst danach öffnet die Prüfung des Runenmeisters
    const last = await acceptOfferedSolver(table.players);
    await waitForStation(last.page, 5);
    await expect(
      last.page.getByRole('heading', { name: 'Die Prüfung des Runenmeisters' }),
    ).toBeVisible();
    // und der Fortschrittspfad zeigt sie jetzt erst
    await expect
      .poll(async () => display.locator('.trail__item').count(), { timeout: 20_000 })
      .toBe(6);

    /*
     * Raten hilft nicht, und es kostet den Abend: das richtige Tor mit falscher
     * Inschrift ist eine falsche Antwort, und es gibt nur eine. (Tor II ist der
     * Weg, wahr ist die Inschrift von Tor III.)
     */
    await last.page.getByRole('button', { name: 'Das zweite Tor als Weg wählen' }).click();
    await last.page.getByRole('button', { name: /Inschrift des Das erste Tor/ }).click();
    await last.page.getByRole('button', { name: 'Das Tor durchschreiten' }).click();

    // vor der Abgabe wird einmal nachgefragt - mit der Folge im Klartext
    await expect(last.page.getByText(/Eine falsche Angabe beendet das Abenteuer/)).toBeVisible();
    await last.page.getByRole('button', { name: 'Ja – durchschreiten' }).click();

    // und dann ist es vorbei, unterscheidbar von einer abgelaufenen Uhr
    await expect(last.page.getByText('DER STEIN HAT GESPROCHEN.')).toBeVisible({ timeout: 20_000 });
    await expect(display.getByText('DER STEIN HAT GESPROCHEN.')).toBeVisible();
    await expect(last.page.getByText('DIE BRÜCKE STEHT.')).toHaveCount(0);

    await displayContext.close();
    await closeTable(table);
  });

  test('die Spielleitung kann die Zwischensequenz überspringen', async ({ browser }) => {
    test.setTimeout(180_000);
    const table = await seatTable(browser, ['Mara', 'Jonas']);
    await startAdventure(table.host);
    for (let index = 0; index < 4; index += 1) {
      await acceptOfferedSolver(table.players);
      await table.host.getByRole('button', { name: 'Prüfung überspringen' }).click();
      await table.host.waitForTimeout(1_200);
    }
    const solver = await acceptOfferedSolver(table.players);
    await waitForStation(solver.page, 4);
    await enterCode(solver.page, '042');

    await table.host
      .getByRole('button', { name: 'Weiter zur letzten Prüfung' })
      .click({ timeout: 40_000 });
    await waitForStation(solver.page, 5);

    await closeTable(table);
  });
});
