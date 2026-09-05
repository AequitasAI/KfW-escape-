import { useState } from 'react';
import {
  DIFF_COUNT,
  DIFF_FIELDS,
  DIFF_HOTSPOTS,
  DIFF_PLAN_HEIGHT,
  DIFF_PLAN_WIDTH,
  TESTMASTER_LINE,
} from '@kfw-escape/shared';
import type { TestmastersDiffState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { sound } from '../lib/sound.js';

type Side = 'left' | 'right';

/**
 * Zwei Prüfpläne, fünf Abweichungen.
 *
 * Gezeichnet statt fotografiert: Beide Pläne sind dasselbe SVG, einmal als
 * Urfassung und einmal als Prüfexemplar. Nur an fünf Stellen entscheidet die
 * Seite, was gezeichnet wird - alles andere ist zeichengleich, weil es
 * buchstäblich derselbe Code ist. Ein Suchbild aus zwei Bilddateien wäre an
 * dieser Stelle nicht zu halten: Jede spätere Änderung müsste man in beiden
 * Dateien identisch nachziehen, und genau da entstehen Abweichungen, die
 * niemand gewollt hat.
 *
 * Getroffen wird ein Prüffeld, kein Pixel. Die Felder kommen samt Geometrie aus
 * `@kfw-escape/shared`, damit Zeichnung, Lösungsanzeige der Spielleitung und
 * Tests dieselbe Quelle lesen.
 */
export function TestmastersDiff({
  state,
  interactive,
  onAction,
  size,
}: PuzzleProps<TestmastersDiffState>): JSX.Element {
  const [note, setNote] = useState<{ side: Side; x: number; y: number; key: number } | null>(null);
  const found = new Set(state.found);

  const inspect = (side: Side, field: string, hotspotId: string | null, x: number, y: number): void => {
    if (!interactive) return;
    if (hotspotId && !found.has(hotspotId)) {
      sound.play('stamp');
      onAction({ type: 'hit', hotspotId });
      return;
    }
    // ohne Befund: kurz quittieren, keine Zeitstrafe
    setNote({ side, x, y, key: Date.now() });
    onAction({ type: 'miss' });
  };

  return (
    <div className={`puzzle puzzle--diff puzzle--${size}${state.solved ? ' is-approved' : ''}`}>
      <p className="diff__npc">„{TESTMASTER_LINE}“</p>

      <div className="diff__plans">
        {(['left', 'right'] as const).map((side) => (
          <figure key={side} className="diff__plan">
            <figcaption className="diff__caption">
              {side === 'left' ? 'Bauplan A · Urfassung' : 'Bauplan B · Prüfexemplar'}
            </figcaption>
            <div className="diff__canvas">
              <svg
                viewBox={`0 0 ${DIFF_PLAN_WIDTH} ${DIFF_PLAN_HEIGHT}`}
                className={`diff__svg${interactive ? ' is-interactive' : ''}`}
                role="group"
                aria-label={
                  side === 'left'
                    ? 'Bauplan A, Urfassung'
                    : 'Bauplan B, Prüfexemplar – hier stimmt fünfmal etwas nicht'
                }
                onClick={(event) => {
                  // ein Klick neben jedes Prüffeld ist auch eine Prüfung
                  if (event.target !== event.currentTarget || !interactive) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  setNote({
                    side,
                    x: ((event.clientX - rect.left) / rect.width) * 100,
                    y: ((event.clientY - rect.top) / rect.height) * 100,
                    key: Date.now(),
                  });
                  onAction({ type: 'miss' });
                }}
              >
                <PlanArt side={side} />

                {DIFF_FIELDS.map((entry) => {
                  const isFound = entry.hotspotId !== null && found.has(entry.hotspotId);
                  const centreX = ((entry.area.x + entry.area.w / 2) / DIFF_PLAN_WIDTH) * 100;
                  const centreY = ((entry.area.y + entry.area.h / 2) / DIFF_PLAN_HEIGHT) * 100;
                  return (
                    <g
                      key={entry.field}
                      className={`diff-field${isFound ? ' is-found' : ''}`}
                      data-field={entry.field}
                      role="button"
                      tabIndex={interactive ? 0 : -1}
                      aria-disabled={!interactive}
                      aria-label={
                        isFound
                          ? `Prüffeld ${entry.field}: Abweichung vermerkt`
                          : `Prüffeld ${entry.field} prüfen`
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        inspect(side, entry.field, entry.hotspotId, centreX, centreY);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        inspect(side, entry.field, entry.hotspotId, centreX, centreY);
                      }}
                    >
                      <rect
                        className="diff-field__hit"
                        x={entry.area.x}
                        y={entry.area.y}
                        width={entry.area.w}
                        height={entry.area.h}
                        rx="6"
                      />
                      {isFound ? (
                        <>
                          <rect
                            className="diff-field__ring"
                            x={entry.area.x}
                            y={entry.area.y}
                            width={entry.area.w}
                            height={entry.area.h}
                            rx="6"
                          />
                          <text
                            className="diff-field__mark"
                            x={entry.area.x + entry.area.w - 8}
                            y={entry.area.y + 18}
                            textAnchor="end"
                          >
                            ✓
                          </text>
                        </>
                      ) : null}
                    </g>
                  );
                })}

                {state.solved ? <ApprovalStamp /> : null}
              </svg>

              {note?.side === side ? (
                <span
                  key={note.key}
                  className="diff__note"
                  style={{ left: `${note.x}%`, top: `${note.y}%` }}
                  aria-hidden="true"
                >
                  ohne Befund
                </span>
              ) : null}
            </div>
          </figure>
        ))}
      </div>

      <ol className="diff__protocol" aria-label="Prüfprotokoll">
        {DIFF_HOTSPOTS.map((hotspot, index) => {
          const done = found.has(hotspot.id);
          return (
            <li key={hotspot.id} className={`diff__protocol-item${done ? ' is-found' : ''}`}>
              <span className="diff__protocol-mark" aria-hidden="true">
                {done ? '✓' : index + 1}
              </span>
              <span className="diff__protocol-text">
                {done ? (
                  <>
                    <strong>{hotspot.label}</strong> · A: {hotspot.left} · B: {hotspot.right}
                  </>
                ) : (
                  'offen'
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="puzzle__status" role="status" aria-live="polite">
        {state.solved
          ? 'Alle Abweichungen vermerkt. Die Prüfmeister stempeln.'
          : `${state.found.length} von ${DIFF_COUNT} Abweichungen gefunden`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Der Plan                                                            */
/* ------------------------------------------------------------------ */

/**
 * Alles, was auf dem Papier steht. `side` entscheidet an genau fünf Stellen -
 * sie sind unten einzeln als ABWEICHUNG ausgewiesen.
 */
function PlanArt({ side }: { side: Side }): JSX.Element {
  const original = side === 'left';
  return (
    <>
      <Paper side={side} />
      <TitleBlock side={side} />
      <RuneBand complete={original} />
      <Compass />
      <Boiler />
      <MainConduit />
      <Valve flowsRight={original} />
      <Gauge />
      <Crossing bridged={original} />
      <Distributor />
      <BigGear spokes={original ? 6 : 5} />
      <SmallGear />
      <Riser connected={original} />
      <Vessel />
      <StampField />
      <ScaleBar />
      <NoteBlock />
      <Fittings />
    </>
  );
}

function Paper({ side }: { side: Side }): JSX.Element {
  // eigene Verlaufs-Kennung je Blatt: zwei SVGs im selben Dokument dürfen sich
  // keine id teilen
  const age = `plan-age-${side}`;
  return (
    <>
      <defs>
        <radialGradient id={age} cx="50%" cy="45%" r="72%">
          <stop offset="0%" stopColor="#f0e3c4" />
          <stop offset="62%" stopColor="#e3d2ac" />
          <stop offset="100%" stopColor="#c8b184" />
        </radialGradient>
      </defs>
      <rect
        className="plan__paper"
        x="0"
        y="0"
        width={DIFF_PLAN_WIDTH}
        height={DIFF_PLAN_HEIGHT}
        rx="6"
        fill={`url(#${age})`}
      />
      <g className="plan__grid" aria-hidden="true">
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={20 + i * 40} y1="16" x2={20 + i * 40} y2="404" />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`h${i}`} x1="16" y1={20 + i * 40} x2="544" y2={20 + i * 40} />
        ))}
      </g>
      <rect className="plan__frame" x="10" y="10" width="540" height="400" rx="4" />
      <rect className="plan__frame plan__frame--inner" x="16" y="16" width="528" height="388" rx="2" />
      {[
        [22, 22],
        [538, 22],
        [22, 398],
        [538, 398],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} className="plan__nail" cx={x} cy={y} r="3.5" />
      ))}
    </>
  );
}

function TitleBlock({ side }: { side: Side }): JSX.Element {
  return (
    <g>
      <rect className="plan__cartouche" x="190" y="26" width="180" height="40" rx="3" />
      <text className="plan__title" x="280" y="44" textAnchor="middle">
        PRÜFPLAN · GROSSE HALLE
      </text>
      <text className="plan__subtitle" x="280" y="58" textAnchor="middle">
        BLATT III · MASSSTAB I:IV · {side === 'left' ? 'URFASSUNG' : 'PRÜFEXEMPLAR'}
      </text>
    </g>
  );
}

/** ABWEICHUNG III: dem Prüfexemplar fehlt die mittlere Rune. */
function RuneBand({ complete }: { complete: boolean }): JSX.Element {
  const glyphs = ['M 0 -7 L 7 7 L -7 7 Z', 'M -7 -7 L 7 -7 L 0 7 Z', 'M 0 -8 L 8 0 L 0 8 L -8 0 Z',
    'M -7 -7 L 7 7 M 7 -7 L -7 7', 'M 0 -8 L 0 8 M -6 -3 L 6 -3'];
  return (
    <g>
      {glyphs.map((path, index) => {
        const x = 40 + index * 32;
        const missing = !complete && index === 2;
        return (
          <g key={index}>
            <rect className="plan__rune-tile" x={x} y="84" width="26" height="26" rx="3" />
            {missing ? null : (
              <path className="plan__rune" d={path} transform={`translate(${x + 13} 97)`} />
            )}
          </g>
        );
      })}
      <text className="plan__note" x="40" y="120">
        SIEGELBAND
      </text>
    </g>
  );
}

function Compass(): JSX.Element {
  return (
    <g transform="translate(496 96)">
      <circle className="plan__part" r="24" />
      <circle className="plan__part plan__part--thin" r="17" />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            className="plan__line plan__line--thin"
            x1={Math.cos(angle) * 17}
            y1={Math.sin(angle) * 17}
            x2={Math.cos(angle) * 24}
            y2={Math.sin(angle) * 24}
          />
        );
      })}
      <path className="plan__rune" d="M 0 -20 L 6 0 L 0 6 L -6 0 Z" />
      <text className="plan__note" x="0" y="-26" textAnchor="middle">
        N
      </text>
    </g>
  );
}

function Boiler(): JSX.Element {
  return (
    <g>
      <path className="plan__part" d="M 46 164 Q 90 140 134 164 L 134 250 L 46 250 Z" />
      <g className="plan__hatch" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i} x1={52 + i * 14} y1="250" x2={52 + i * 14 + 18} y2="196" />
        ))}
      </g>
      {Array.from({ length: 5 }, (_, i) => (
        <circle key={i} className="plan__rivet" cx="52" cy={180 + i * 16} r="2" />
      ))}
      <text className="plan__note" x="90" y="242" textAnchor="middle">
        KESSEL I
      </text>
      <line className="plan__line" x1="134" y1="186" x2="150" y2="186" />
    </g>
  );
}

/** Die Hauptleitung; die Kreuzung bei x=372 zeichnet sich selbst. */
function MainConduit(): JSX.Element {
  return (
    <g>
      <line className="plan__line" x1="150" y1="186" x2="356" y2="186" />
      <line className="plan__line" x1="388" y1="186" x2="468" y2="186" />
      <line className="plan__line plan__line--thin" x1="468" y1="186" x2="512" y2="186" />
      <line className="plan__line" x1="508" y1="178" x2="508" y2="194" />
    </g>
  );
}

/** ABWEICHUNG VI: die Flussrichtung am Hauptventil ist gespiegelt. */
function Valve({ flowsRight }: { flowsRight: boolean }): JSX.Element {
  return (
    <g>
      <path className="plan__part" d="M 232 174 L 232 198 L 266 174 L 266 198 Z" />
      <line className="plan__line" x1="228" y1="170" x2="228" y2="202" />
      <line className="plan__line" x1="270" y1="170" x2="270" y2="202" />
      <g className="plan__arrow">
        <line className="plan__line plan__line--thin" x1="224" y1="158" x2="274" y2="158" />
        {flowsRight ? (
          <path className="plan__rune" d="M 274 158 L 264 153 L 264 163 Z" />
        ) : (
          <path className="plan__rune" d="M 224 158 L 234 153 L 234 163 Z" />
        )}
      </g>
      <text className="plan__note" x="249" y="214" textAnchor="middle">
        VENTIL II
      </text>
    </g>
  );
}

function Gauge(): JSX.Element {
  return (
    <g transform="translate(372 108)">
      <circle className="plan__part" r="15" />
      <circle className="plan__part plan__part--thin" r="11" />
      <line className="plan__line plan__line--thin" x1="0" y1="0" x2="7" y2="-8" />
      <circle className="plan__rivet" r="1.8" />
      <line className="plan__line" x1="0" y1="15" x2="0" y2="24" />
    </g>
  );
}

/**
 * ABWEICHUNG VII: In der Urfassung führt die Hauptleitung als Brücke über die
 * Steigleitung hinweg, im Prüfexemplar sind beide miteinander verbunden.
 */
function Crossing({ bridged }: { bridged: boolean }): JSX.Element {
  return (
    <g>
      <line className="plan__line" x1="372" y1="124" x2="372" y2="292" />
      {bridged ? (
        <path className="plan__line plan__line--open" d="M 356 186 Q 372 162 388 186" />
      ) : (
        <>
          <line className="plan__line" x1="356" y1="186" x2="388" y2="186" />
          <circle className="plan__junction" cx="372" cy="186" r="4.5" />
        </>
      )}
    </g>
  );
}

function Distributor(): JSX.Element {
  return (
    <g>
      <rect className="plan__part" x="344" y="292" width="56" height="32" rx="3" />
      {[356, 372, 388].map((x) => (
        <line key={x} className="plan__line plan__line--thin" x1={x} y1="324" x2={x} y2="332" />
      ))}
      <text className="plan__note" x="372" y="312" textAnchor="middle">
        VERTEILER
      </text>
    </g>
  );
}

/** ABWEICHUNG VIII: dem Prüfexemplar fehlt eine Speiche. */
function BigGear({ spokes }: { spokes: number }): JSX.Element {
  return (
    <g transform="translate(176 322)">
      <circle className="plan__part" r="44" />
      <circle className="plan__part plan__part--thin" r="36" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6;
        return (
          <line
            key={i}
            className="plan__line"
            x1={Math.cos(angle) * 44}
            y1={Math.sin(angle) * 44}
            x2={Math.cos(angle) * 52}
            y2={Math.sin(angle) * 52}
          />
        );
      })}
      {Array.from({ length: spokes }, (_, i) => {
        const angle = (i / spokes) * Math.PI * 2 - Math.PI / 2;
        return (
          <line
            key={i}
            className="plan__line"
            x1={Math.cos(angle) * 11}
            y1={Math.sin(angle) * 11}
            x2={Math.cos(angle) * 36}
            y2={Math.sin(angle) * 36}
          />
        );
      })}
      <circle className="plan__part" r="11" />
      <circle className="plan__rivet" r="2.5" />
      <text className="plan__note" x="0" y="54" textAnchor="middle">
        RAD A
      </text>
    </g>
  );
}

function SmallGear(): JSX.Element {
  return (
    <g>
      <line className="plan__line plan__line--thin" x1="214" y1="330" x2="240" y2="336" />
      <g transform="translate(262 338)">
        <circle className="plan__part" r="24" />
        <circle className="plan__part plan__part--thin" r="18" />
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              className="plan__line plan__line--thin"
              x1={Math.cos(angle) * 24}
              y1={Math.sin(angle) * 24}
              x2={Math.cos(angle) * 30}
              y2={Math.sin(angle) * 30}
            />
          );
        })}
        {Array.from({ length: 4 }, (_, i) => {
          const angle = (i * Math.PI) / 2;
          return (
            <line
              key={i}
              className="plan__line plan__line--thin"
              x1={Math.cos(angle) * 7}
              y1={Math.sin(angle) * 7}
              x2={Math.cos(angle) * 18}
              y2={Math.sin(angle) * 18}
            />
          );
        })}
        <circle className="plan__part" r="7" />
      </g>
    </g>
  );
}

/**
 * ABWEICHUNG IX: In der Urfassung sitzt die Steigleitung am Flansch des
 * Sammelbehälters, im Prüfexemplar endet sie blind darüber.
 */
function Riser({ connected }: { connected: boolean }): JSX.Element {
  return (
    <g>
      <line className="plan__line" x1="468" y1="186" x2="468" y2={connected ? 302 : 284} />
      {connected ? null : <line className="plan__line" x1="460" y1="284" x2="476" y2="284" />}
      <text className="plan__note" x="480" y="252">
        STEIG-
      </text>
      <text className="plan__note" x="480" y="264">
        LEITUNG
      </text>
    </g>
  );
}

function Vessel(): JSX.Element {
  return (
    <g>
      <rect className="plan__part" x="456" y="300" width="24" height="6" rx="1" />
      <rect className="plan__part" x="438" y="306" width="72" height="54" rx="6" />
      <g className="plan__hatch" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <line key={i} x1={444 + i * 16} y1="360" x2={444 + i * 16 + 14} y2="318" />
        ))}
      </g>
      <text className="plan__label" x="474" y="342" textAnchor="middle">
        IV
      </text>
    </g>
  );
}

function StampField(): JSX.Element {
  return (
    <g>
      <rect className="plan__stamp-field" x="302" y="340" width="120" height="58" rx="3" />
      <text className="plan__note" x="362" y="356" textAnchor="middle">
        PRÜFSTEMPEL
      </text>
    </g>
  );
}

function ScaleBar(): JSX.Element {
  return (
    <g>
      <rect className="plan__part plan__part--thin" x="34" y="386" width="76" height="8" />
      {[0, 19, 38, 57].map((x) => (
        <rect key={x} className="plan__scale-fill" x={34 + x} y="386" width="9.5" height="8" />
      ))}
      <text className="plan__note" x="34" y="382">
        0
      </text>
      <text className="plan__note" x="104" y="382">
        XX
      </text>
    </g>
  );
}

/** Vermerke unten links - Beiwerk, das den Plan nach Prüfstelle aussehen lässt. */
function NoteBlock(): JSX.Element {
  return (
    <g>
      <line className="plan__line plan__line--thin" x1="34" y1="340" x2="112" y2="340" />
      <text className="plan__note" x="34" y="352">
        PRÜFUNG NACH
      </text>
      <text className="plan__note" x="34" y="363">
        ORDNUNG XIV §II
      </text>
      <text className="plan__note" x="34" y="374">
        GEZ. MEISTER HALVAR
      </text>
    </g>
  );
}

/** Rohrschellen und ein Mass am Kessel; beidseitig gleich. */
function Fittings(): JSX.Element {
  return (
    <g>
      {[200, 430].map((x) => (
        <path key={x} className="plan__line plan__line--thin" d={`M ${x - 7} 178 L ${x - 7} 172 L ${x + 7} 172 L ${x + 7} 178`} />
      ))}
      <line className="plan__line plan__line--thin" x1="46" y1="262" x2="134" y2="262" />
      <line className="plan__line plan__line--thin" x1="46" y1="258" x2="46" y2="266" />
      <line className="plan__line plan__line--thin" x1="134" y1="258" x2="134" y2="266" />
      <text className="plan__note" x="90" y="274" textAnchor="middle">
        XII
      </text>
    </g>
  );
}

/**
 * Der Stempel der Prüfmeister, sobald alle fünf Abweichungen vermerkt sind.
 *
 * Zwei Gruppen, und das mit Absicht: Die Animation setzt eine CSS-Transform, und
 * die schlägt die transform-Eigenschaft im Attribut. Stünden Ort und Animation
 * an derselben Gruppe, landete der Stempel in der Ecke des Blattes statt im
 * Stempelfeld.
 */
function ApprovalStamp(): JSX.Element {
  return (
    <g transform="translate(362 369) rotate(-11)" aria-hidden="true">
      <g className="plan__approval">
        <rect className="plan__approval-box" x="-62" y="-24" width="124" height="48" rx="4" />
        <rect className="plan__approval-box plan__approval-box--inner" x="-56" y="-19" width="112" height="38" rx="3" />
        <text className="plan__approval-text" x="0" y="6" textAnchor="middle">
          GEPRÜFT
        </text>
      </g>
    </g>
  );
}
