import { useEffect, useState } from 'react';
import { DWARF_LINES, GEAR_LABELS, GEAR_PROFILES, GEAR_STEPS } from '@kfw-escape/shared';
import type { OperationsGearsState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { Dwarf } from '../components/Chrome.js';
import { sound } from '../lib/sound.js';

const GEAR_RADIUS = 84;
/*
 * Der Abstand ist kein Layoutwert, sondern die Regel selbst: Zwei Kontaktflächen
 * greifen, wenn ihre Werte zusammen 4 ergeben - und genau dann berühren sich
 * ihre Zahnspitzen. Passt es nicht, klafft eine Lücke oder die Zähne überlappen
 * sichtbar. Deshalb muss GEAR_GAP zur Summe aus TIP_RADIUS passen.
 */
const GEAR_GAP = 118;

/**
 * Ab wie vielen zusammenhängenden Rädern die Maschine überhaupt etwas verrät.
 *
 * Absicht: Ein Signal pro Paar macht das Rätsel überflüssig - man dreht jedes
 * Rad einmal durch, bis es aufleuchtet, und muss die Zahnformen nie ansehen.
 * Erst eine durchgehende Kette ab drei Rädern zeigt sich, und die entsteht nur
 * durch Hinsehen.
 */
const REVEAL_CHAIN_AT = 3;

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
    : chain >= 4
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

                {canTurn ? (
                  <g className="gear__controls">
                    <GearButton x={-34} label={`${GEAR_LABELS[gearIndex]} gegen den Uhrzeigersinn drehen`} glyph="↺" onClick={() => rotate(gearIndex, -1)} />
                    <GearButton x={34} label={`${GEAR_LABELS[gearIndex]} im Uhrzeigersinn drehen`} glyph="↻" onClick={() => rotate(gearIndex, 1)} />
                  </g>
                ) : null}

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

      <div className="gears__legend" aria-hidden="true">
        <span className="gears__legend-item">
          <i className="gears__legend-swatch gears__legend-swatch--1" /> Kerbe (1)
        </span>
        <span className="gears__legend-item">
          <i className="gears__legend-swatch gears__legend-swatch--2" /> mittlerer Zahn (2)
        </span>
        <span className="gears__legend-item">
          <i className="gears__legend-swatch gears__legend-swatch--3" /> langer Zahn (3)
        </span>
        <span className="gears__legend-note">Zwei Kontaktflächen greifen, wenn sie zusammen 4 ergeben.</span>
      </div>

      <p className="puzzle__status" role="status" aria-live="polite">
        {justSolved
          ? 'KLACK. Die Maschine läuft, das Tor öffnet sich.'
          : revealed
            ? `Der Antrieb greift durch ${chain} Räder.`
            : 'Die Maschine steht still. Vergleicht die Zahnformen dort, wo die Räder sich berühren.'}
      </p>
    </div>
  );
}

function GearButton({
  x,
  glyph,
  label,
  onClick,
}: {
  x: number;
  glyph: string;
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <g
      className="gear-btn"
      role="button"
      tabIndex={0}
      aria-label={label}
      transform={`translate(${x} 84)`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onClick();
        }
      }}
    >
      <circle r="22" />
      <text textAnchor="middle" dy="7">
        {glyph}
      </text>
    </g>
  );
}

/**
 * Builds the tooth outline for one gear from its profile values, so the data the
 * puzzle is scored on is literally the shape on screen. Sector k is drawn at
 * angle k * 45 degrees and the whole gear is rotated by orientation * 45, which
 * is exactly the mapping the contact rule uses - the profile that decides a
 * contact is the one physically facing the neighbour.
 *
 *   1 -> notch cut into the rim, 2 -> medium tooth, 3 -> long tooth
 *
 * The order is what makes the rule visible instead of arithmetic: a long tooth
 * (3) reaches exactly into a notch (1), two medium teeth (2) meet exactly in
 * the middle - both sum to 4 and both touch. Every other pairing either leaves
 * an obvious gap or drives the teeth into each other. Nothing has to light up
 * for that to be readable, which is the whole point of this trial.
 */
const ROOT_RADIUS = 44;
/* Jedes gültige Paar summiert sich auf GEAR_GAP minus etwas Luft. */
const TIP_RADIUS: Record<number, number> = { 1: 32, 2: 58, 3: 84 };
/* Der lange Zahn muss schmal genug sein, um in die breite Kerbe zu fassen. */
const TOOTH_WIDTH: Record<number, number> = { 1: 0.34, 2: 0.26, 3: 0.2 };

function gearPath(gearIndex: number): string {
  const profile = GEAR_PROFILES[gearIndex] ?? [];
  const sector = (Math.PI * 2) / GEAR_STEPS;

  const at = (angle: number, radius: number): string =>
    `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;

  const parts: string[] = [];
  for (let i = 0; i < GEAR_STEPS; i += 1) {
    const centre = i * sector;
    const value = profile[i] ?? 2;
    const tip = TIP_RADIUS[value] ?? TIP_RADIUS[2]!;
    const halfTooth = sector * (TOOTH_WIDTH[value] ?? 0.32);
    const rootStart = centre - sector / 2;

    if (i === 0) parts.push(`M ${at(rootStart, ROOT_RADIUS)}`);
    // root arc up to the flank of this tooth
    parts.push(`A ${ROOT_RADIUS} ${ROOT_RADIUS} 0 0 1 ${at(centre - halfTooth, ROOT_RADIUS)}`);
    // flank up, across the tip, flank down
    parts.push(`L ${at(centre - halfTooth * 0.72, tip)}`);
    parts.push(`L ${at(centre + halfTooth * 0.72, tip)}`);
    parts.push(`L ${at(centre + halfTooth, ROOT_RADIUS)}`);
    // root arc to the next sector boundary
    parts.push(`A ${ROOT_RADIUS} ${ROOT_RADIUS} 0 0 1 ${at(centre + sector / 2, ROOT_RADIUS)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}
