import { useEffect, useState } from 'react';
import { DWARF_LINES, GEAR_LABELS, GEAR_PROFILES, GEAR_STEPS } from '@kfw-escape/shared';
import type { OperationsGearsState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { Dwarf } from '../components/Chrome.js';
import { sound } from '../lib/sound.js';

const GEAR_RADIUS = 66;
const GEAR_GAP = 138;

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

  const meshed = state.contacts.filter(Boolean).length;
  const dwarfLine = state.solved
    ? DWARF_LINES.success
    : meshed >= 3
      ? DWARF_LINES.almost
      : meshed >= 1
        ? DWARF_LINES.progress
        : DWARF_LINES.start;
  const dwarfMood = state.solved ? 'happy' : meshed >= 3 ? 'skeptical' : 'neutral';

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
            <linearGradient id="gear-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8c9bab" />
              <stop offset="55%" stopColor="#5c6c7e" />
              <stop offset="100%" stopColor="#3a4859" />
            </linearGradient>
            <linearGradient id="gear-live" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#89f0e2" />
              <stop offset="60%" stopColor="#3fb9ab" />
              <stop offset="100%" stopColor="#217c73" />
            </linearGradient>
          </defs>

          {/* motor housing on the left */}
          <g className={`gears__motor${state.poweredUpTo > 0 ? ' is-live' : ''}`}>
            <rect x="10" y="82" width="86" height="96" rx="12" />
            <circle cx="53" cy="130" r="26" className="gears__motor-core" />
          </g>

          {/* drive shafts between gears */}
          {state.contacts.map((live, index) => (
            <line
              key={index}
              className={`gears__shaft${live ? ' is-live' : ''}${
                index < state.poweredUpTo ? ' is-powered' : ''
              }`}
              x1={150 + index * GEAR_GAP + GEAR_RADIUS - 8}
              y1="130"
              x2={150 + (index + 1) * GEAR_GAP - GEAR_RADIUS + 8}
              y2="130"
            />
          ))}

          {state.orientations.map((orientation, gearIndex) => {
            const cx = 150 + gearIndex * GEAR_GAP;
            const powered = gearIndex <= state.poweredUpTo;
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
                  <circle
                    className={`gear__contact${state.contacts[gearIndex] ? ' is-meshed' : ''}`}
                    cx={GEAR_GAP / 2}
                    cy="0"
                    r="9"
                  />
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
          <i className="gears__legend-swatch gears__legend-swatch--1" /> flacher Zahn (1)
        </span>
        <span className="gears__legend-item">
          <i className="gears__legend-swatch gears__legend-swatch--2" /> mittlerer Zahn (2)
        </span>
        <span className="gears__legend-item">
          <i className="gears__legend-swatch gears__legend-swatch--3" /> tiefe Kerbe (3)
        </span>
        <span className="gears__legend-note">Zwei Kontaktflächen greifen, wenn sie zusammen 4 ergeben.</span>
      </div>

      <p className="puzzle__status" role="status" aria-live="polite">
        {justSolved
          ? 'KLACK. Die Maschine läuft, das Tor öffnet sich.'
          : `${meshed} von ${state.contacts.length} Kontakten greifen`}
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
 *   1 -> shallow nub, 2 -> full tooth, 3 -> deep notch cut into the rim
 */
const ROOT_RADIUS = 44;
const TIP_RADIUS: Record<number, number> = { 1: 54, 2: 66, 3: 30 };

function gearPath(gearIndex: number): string {
  const profile = GEAR_PROFILES[gearIndex] ?? [];
  const sector = (Math.PI * 2) / GEAR_STEPS;
  const halfTooth = sector * 0.32;

  const at = (angle: number, radius: number): string =>
    `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;

  const parts: string[] = [];
  for (let i = 0; i < GEAR_STEPS; i += 1) {
    const centre = i * sector;
    const tip = TIP_RADIUS[profile[i] ?? 2] ?? TIP_RADIUS[2]!;
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
