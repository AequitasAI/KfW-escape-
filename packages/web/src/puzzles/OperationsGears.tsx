import { useEffect, useState } from 'react';
import { DWARF_LINES, FLAT, GEAR_LABELS, GEAR_PROFILES, GEAR_STEPS } from '@kfw-escape/shared';
import type { OperationsGearsState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { Dwarf } from '../components/Chrome.js';
import { sound } from '../lib/sound.js';

const GEAR_RADIUS = 90;
/*
 * Der Abstand ist kein Layoutwert, sondern die Regel selbst: Ein Zapfen reicht
 * genau bis in ein Loch des Nachbarn. Zapfen gegen glatten Rand überlappt
 * sichtbar, glatter Rand gegen Loch lässt eine Lücke - man sieht also, dass es
 * nicht passt, ohne dass irgendetwas leuchten müsste.
 *
 *   Zapfen (90) + Loch (26) = 116  ~ GEAR_GAP, sie berühren sich
 *   Zapfen (90) + Rand (44) = 134  > GEAR_GAP, sie stossen ineinander
 *   Rand   (44) + Loch (26) =  70  < GEAR_GAP, es klafft
 */
const GEAR_GAP = 118;

/**
 * Ab wie vielen greifenden Kontakten die Maschine überhaupt etwas verrät.
 *
 * Gezählt werden Kontakte, angezeigt werden Räder - zwei Kontakte bedeuten drei
 * laufende Räder. Diese Unterscheidung ist keine Wortklauberei: sie stand als
 * Zählfehler in der Statuszeile und liess vier laufende Räder wie drei aussehen.
 *
 * Absicht der Schwelle: Ein Signal pro Paar macht das Rätsel überflüssig - man
 * dreht jedes Rad blind durch, bis es aufleuchtet, und sieht die Formen nie an.
 * Erst eine durchgehende Kette zeigt sich, und die entsteht nur durch Hinsehen.
 */
const REVEAL_CHAIN_AT = 2;

/**
 * The signature puzzle. Each gear carries eight discrete contact sectors with
 * profile values 1/2/3, and the geometry actually shows them: a 1 is a shallow
 * nub, a 2 a normal tooth, a 3 a deep notch. Two touching sectors mesh when the
 * values add up to 4, which is therefore visible before it is confirmed.
 */
export function OperationsGears({
  state,
  interactive,
  onAction,
  size,
}: PuzzleProps<OperationsGearsState>): JSX.Element {
  const [justSolved, setJustSolved] = useState(false);

  useEffect(() => {
    if (!state.solved) {
      setJustSolved(false);
      return undefined;
    }
    setJustSolved(true);
    sound.play('machine');
    const timeout = window.setTimeout(() => sound.play('gate'), 900);
    return () => window.clearTimeout(timeout);
  }, [state.solved]);

  const rotate = (gear: number, dir: -1 | 1): void => {
    if (!interactive || state.solved) return;
    sound.play('clunk');
    onAction({ type: 'rotate', gear, dir });
  };

  /*
   * Die Kette vom Motor aus ist die einzige Information, die nach aussen geht -
   * und auch die erst ab REVEAL_CHAIN_AT. Wie viele Paare einzeln greifen,
   * erfährt niemand.
   */
  const chain = state.poweredUpTo;
  const revealed = chain >= REVEAL_CHAIN_AT;
  const dwarfLine = state.solved
    ? DWARF_LINES.success
    : chain >= 3
      ? DWARF_LINES.almost
      : revealed
        ? DWARF_LINES.progress
        : DWARF_LINES.start;
  const dwarfMood = state.solved ? 'happy' : revealed ? 'skeptical' : 'neutral';

  const width = 120 + GEAR_LABELS.length * GEAR_GAP + 120;

  return (
    <div className={`puzzle puzzle--gears puzzle--${size}${state.solved ? ' is-running' : ''}`}>
      <div className="gears__machine">
        <svg
          viewBox={`0 0 ${width} 260`}
          className="gears__svg"
          role="group"
          aria-label="Fünf Zahnräder zwischen Motor und Tor"
        >
          <defs>
            {/* dull iron until the drive reaches a gear, then hot forged brass */}
            <linearGradient id="gear-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8e8574" />
              <stop offset="55%" stopColor="#5f5748" />
              <stop offset="100%" stopColor="#3b352b" />
            </linearGradient>
            <linearGradient id="gear-live" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd88a" />
              <stop offset="55%" stopColor="#e0a337" />
              <stop offset="100%" stopColor="#9a6a18" />
            </linearGradient>
          </defs>

          {/* motor housing on the left */}
          {/* auch der Motor verrät die erste Paarung nicht */}
          <g className={`gears__motor${revealed ? ' is-live' : ''}`}>
            <rect x="10" y="82" width="86" height="96" rx="12" />
            <circle cx="53" cy="130" r="26" className="gears__motor-core" />
          </g>

          {/* drive shafts between gears */}
          {state.contacts.map((_live, index) => (
            <line
              key={index}
              className={`gears__shaft${revealed && index < chain ? ' is-powered' : ''}`}
              x1={150 + index * GEAR_GAP + GEAR_RADIUS - 8}
              y1="130"
              x2={150 + (index + 1) * GEAR_GAP - GEAR_RADIUS + 8}
              y2="130"
            />
          ))}

          {state.orientations.map((orientation, gearIndex) => {
            const cx = 150 + gearIndex * GEAR_GAP;
            const powered = revealed && gearIndex <= chain;
            const fixed = gearIndex === 0;
            const canTurn = interactive && !fixed && !state.solved;
            const direction = gearIndex % 2 === 0 ? 'cw' : 'ccw';

            return (
              <g key={gearIndex} transform={`translate(${cx} 130)`}>
                <g
                  className={`gear${powered ? ' is-powered' : ''}${fixed ? ' gear--fixed' : ''}${
                    state.solved ? ` gear--running gear--${direction}` : ''
                  }${canTurn ? ' is-turnable' : ''}`}
                  role="button"
                  tabIndex={canTurn ? 0 : -1}
                  aria-disabled={!canTurn}
                  aria-label={
                    fixed
                      ? 'Antriebsrad, fest verbaut'
                      : `${GEAR_LABELS[gearIndex]}, Stellung ${orientation + 1} von ${GEAR_STEPS}${
                          powered ? ', unter Spannung' : ''
                        }`
                  }
                  onClick={() => rotate(gearIndex, 1)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      rotate(gearIndex, 1);
                    }
                    if (event.key === 'ArrowLeft') {
                      event.preventDefault();
                      rotate(gearIndex, -1);
                    }
                    if (event.key === 'ArrowRight') {
                      event.preventDefault();
                      rotate(gearIndex, 1);
                    }
                  }}
                >
                  <g className="gear__spin" style={{ transform: `rotate(${orientation * 45}deg)` }}>
                    {/*
                      Pins the bounding box symmetric around the gear centre.
                      Tooth tips reach different radii per profile, so without
                      this the fill-box centre drifts and the gear wobbles as it
                      turns instead of spinning on its axle.
                    */}
                    <circle r={GEAR_RADIUS} fill="none" stroke="none" />
                    <path className="gear__teeth" d={gearPath(gearIndex)} />
                    <circle className="gear__hub" r="20" />
                    {/* orientation marker so the current step is never colour only */}
                    <line className="gear__marker" x1="0" y1="-20" x2="0" y2="-42" />
                  </g>
                  <circle className="gear__bore" r="7" />
                </g>

                {gearIndex < state.contacts.length ? (
                  /*
                   * Zustandslos. Der Rahmen sagt nur, wo die beiden Zahnformen
                   * aufeinandertreffen - ob sie passen, muss man selbst sehen.
                   */
                  <g className="gear__focus" aria-hidden="true">
                    <path d={`M ${GEAR_GAP / 2 - 9} -22 h -5 v 44 h 5`} />
                    <path d={`M ${GEAR_GAP / 2 + 9} -22 h 5 v 44 h -5`} />
                  </g>
                ) : null}
              </g>
            );
          })}

          {/* the gate on the right */}
          <g className={`gears__gate${state.solved ? ' is-open' : ''}`}>
            <rect x={width - 104} y="52" width="94" height="156" rx="10" className="gears__gate-frame" />
            <rect className="gears__gate-door gears__gate-door--l" x={width - 98} y="60" width="42" height="140" />
            <rect className="gears__gate-door gears__gate-door--r" x={width - 52} y="60" width="42" height="140" />
          </g>
        </svg>

        <div className="gears__dwarf">
          <Dwarf line={dwarfLine} mood={dwarfMood} />
        </div>
      </div>

      {interactive && !state.solved ? (
        /*
         * Die Regler liegen bewusst ausserhalb der Zeichnung. Im SVG schrumpfen
         * sie mit ihr mit, und auf einem Telefon, auf dem fünf Räder
         * nebeneinander passen müssen, bleiben davon keine bedienbaren
         * Tippziele übrig.
         */
        <div className="gears__controls">
          {GEAR_LABELS.map((label, gearIndex) =>
            gearIndex === 0 ? null : (
              <div className="gears__control" key={gearIndex}>
                <span className="gears__control-label">{label}</span>
                <div className="gears__control-row">
                  <button
                    type="button"
                    className="gears__turn"
                    aria-label={`${label} gegen den Uhrzeigersinn drehen`}
                    onClick={() => rotate(gearIndex, -1)}
                  >
                    ↺
                  </button>
                  <button
                    type="button"
                    className="gears__turn"
                    aria-label={`${label} im Uhrzeigersinn drehen`}
                    onClick={() => rotate(gearIndex, 1)}
                  >
                    ↻
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      ) : null}

      <div className="gears__legend" aria-hidden="true">
        <span className="gears__legend-item">
          <i className="gears__legend-swatch gears__legend-swatch--3" /> Zapfen
        </span>
        <span className="gears__legend-item">
          <i className="gears__legend-swatch gears__legend-swatch--1" /> Loch
        </span>
        <span className="gears__legend-item">
          <i className="gears__legend-swatch gears__legend-swatch--2" /> glatter Rand
        </span>
        <span className="gears__legend-note">
          Ein Rad treibt seinen rechten Nachbarn, wenn es ihm einen Zapfen zuwendet und der Nachbar
          dort ein Loch anbietet. Glatter Rand passt zu nichts.
        </span>
      </div>

      <p className="puzzle__status" role="status" aria-live="polite">
        {justSolved
          ? 'KLACK. Die Maschine läuft, das Tor öffnet sich.'
          : revealed
            ? `Der Antrieb greift bis zum ${chain + 1}. von ${GEAR_LABELS.length} Rädern.`
            : 'Die Maschine steht still. Vergleicht Zapfen und Löcher dort, wo die Räder sich berühren.'}
      </p>
    </div>
  );
}

/**
 * Zeichnet den Rand eines Rades aus seinen Sektorwerten - die Daten, nach denen
 * gewertet wird, sind buchstäblich die Form auf dem Schirm. Sektor k liegt bei
 * k * 45 Grad, das ganze Rad wird um orientation * 45 gedreht; das ist genau
 * die Zuordnung, die auch die Kontaktregel benutzt.
 *
 * Alle Räder sind gleich gross. Unterschiedlich ist nur, wo Zapfen, Löcher und
 * glatter Rand sitzen - deshalb sehen sie wie Maschinenteile aus und nicht wie
 * zufällig zerkaute Scheiben.
 *
 *   HOLE (1) Kerbe in den Rand, breit genug für einen Zapfen
 *   FLAT (2) glatter Rand auf Grundradius
 *   PEG  (3) langer, schmaler Zapfen
 */
const ROOT_RADIUS = 44;
/*
 * Bewusst kräftig: Auf einem Telefon stehen fünf Räder nebeneinander, die
 * Zeichnung ist dort auf etwa die Hälfte skaliert. Eine flache Kerbe wäre dann
 * ein paar Pixel tief und praktisch unsichtbar.
 */
const TIP_RADIUS: Record<number, number> = { 1: 26, 2: ROOT_RADIUS, 3: 90 };
/* Der Zapfen muss schmal genug sein, um in das breitere Loch zu fassen. */
const SECTOR_WIDTH: Record<number, number> = { 1: 0.42, 2: 0.5, 3: 0.24 };

function gearPath(gearIndex: number): string {
  const profile = GEAR_PROFILES[gearIndex] ?? [];
  const sector = (Math.PI * 2) / GEAR_STEPS;

  const at = (angle: number, radius: number): string =>
    `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;

  const parts: string[] = [];
  for (let i = 0; i < GEAR_STEPS; i += 1) {
    const centre = i * sector;
    const value = profile[i] ?? FLAT;
    const rootStart = centre - sector / 2;
    const rootEnd = centre + sector / 2;

    if (i === 0) parts.push(`M ${at(rootStart, ROOT_RADIUS)}`);

    if (value === FLAT) {
      // glatter Rand: ein einziger Bogen, kein Merkmal
      parts.push(`A ${ROOT_RADIUS} ${ROOT_RADIUS} 0 0 1 ${at(rootEnd, ROOT_RADIUS)}`);
      continue;
    }

    const tip = TIP_RADIUS[value] ?? ROOT_RADIUS;
    const half = sector * (SECTOR_WIDTH[value] ?? 0.3);
    // Bogen bis zur Flanke, hinein oder hinaus, wieder zurück auf den Grundkreis
    parts.push(`A ${ROOT_RADIUS} ${ROOT_RADIUS} 0 0 1 ${at(centre - half, ROOT_RADIUS)}`);
    parts.push(`L ${at(centre - half * 0.78, tip)}`);
    parts.push(`L ${at(centre + half * 0.78, tip)}`);
    parts.push(`L ${at(centre + half, ROOT_RADIUS)}`);
    parts.push(`A ${ROOT_RADIUS} ${ROOT_RADIUS} 0 0 1 ${at(rootEnd, ROOT_RADIUS)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}
