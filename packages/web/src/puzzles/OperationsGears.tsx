import { useEffect, useState } from 'react';
import {
  CONTACT_COUNT,
  DWARF_LINES,
  GATE_CONNECTOR,
  GEAR_COUNT,
  GEAR_LABELS,
  GEAR_RINGS,
  GEAR_STEPS,
  MOTOR_CONNECTOR,
  SHAPE_LABELS,
  connectorLabel,
  dwarfIdleLine,
  incomingAt,
  leftConnector,
  outgoingAt,
  rightConnector,
} from '@kfw-escape/shared';
import type { Connector, ConnectorShape, GearSector, OperationsGearsState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { Dwarf } from '../components/Chrome.js';
import { sound } from '../lib/sound.js';

/**
 * Die Maschine ist die Regel.
 *
 * Der Radabstand ist kein Layoutwert: Ein Zapfen reicht genau bis in die Kerbe
 * des Nachbarn, wenn beide zusammenpassen. Passt es nicht, fährt der Zapfen
 * sichtbar in den Radkörper oder es bleibt eine Lücke. Man sieht also, was los
 * ist, bevor irgendetwas leuchtet.
 *
 *   ROOT   Radkörper
 *   TOOTH  normale Verzahnung, ringsum gleichmässig
 *   PEG    Spezialzapfen, steht weit heraus
 *   SOCKET Kerbe, sitzt knapp innerhalb des Randes
 *
 *   PEG (86) + SOCKET (44) = 130 = GEAR_GAP
 */
const ROOT = 48;
const TOOTH_TIP = 58;
const PEG_TIP = 86;
const SOCKET_R = 44;
const GEAR_GAP = 130;
const FIRST_X = 150;
const AXIS_Y = 150;
const VIEW_W = FIRST_X + (GEAR_COUNT - 1) * GEAR_GAP + 200;
const VIEW_H = 300;
/** Regelmässige Zähne rundum; die Sonderplätze liegen auf jedem dritten. */
const TEETH = 24;

const gearX = (index: number): number => FIRST_X + index * GEAR_GAP;
const contactX = (contact: number): number =>
  contact === 0
    ? gearX(0) - GEAR_GAP / 2
    : contact === GEAR_COUNT
      ? gearX(GEAR_COUNT - 1) + GEAR_GAP / 2
      : gearX(contact - 1) + GEAR_GAP / 2;

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

  const chain = state.poweredUpTo;
  const meshed = state.contacts.filter(Boolean).length;
  const dwarfLine = state.solved
    ? DWARF_LINES.success
    : chain >= CONTACT_COUNT - 1
      ? DWARF_LINES.almost
      : chain >= 2
        ? DWARF_LINES.progress
        : dwarfIdleLine(state.moves);
  const dwarfMood = state.solved ? 'happy' : chain >= 2 ? 'skeptical' : 'neutral';

  return (
    <div className={`puzzle puzzle--gears puzzle--${size}${state.solved ? ' is-running' : ''}`}>
      <div className="gears__machine">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="gears__svg"
          role="group"
          aria-label="Fünf Räder zwischen Motor und Tor"
        >
          <defs>
            <radialGradient id="contact-glow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#ffe6ad" stopOpacity="0.8" />
              <stop offset="55%" stopColor="#f2ae3c" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f2ae3c" stopOpacity="0" />
            </radialGradient>
          </defs>

          <Motor live={state.contacts[0] === true} />

          {/* Antriebswellen: sie führen Energie erst, wenn die Kette sie erreicht */}
          {Array.from({ length: CONTACT_COUNT }, (_, contact) => (
            <line
              key={`shaft-${contact}`}
              className={`gears__shaft${contact < chain ? ' is-powered' : ''}`}
              x1={contactX(contact) - 26}
              y1={AXIS_Y}
              x2={contactX(contact) + 26}
              y2={AXIS_Y}
            />
          ))}

          {state.orientations.map((orientation, gearIndex) => (
            <GearFigure
              key={gearIndex}
              index={gearIndex}
              orientation={orientation}
              running={state.solved}
              interactive={interactive && !state.solved}
              onRotate={rotate}
            />
          ))}

          <Gate open={state.solved} live={state.contacts[GEAR_COUNT] === true} />

          {/* Die Kontaktstellen zuletzt, damit ihr Leuchten über allem liegt */}
          {state.contacts.map((live, contact) =>
            live ? (
              <g key={`contact-${contact}`} className="gears__contact" aria-hidden="true">
                <circle cx={contactX(contact)} cy={AXIS_Y} r="34" fill="url(#contact-glow)" />
              </g>
            ) : null,
          )}
        </svg>

        <div className="gears__dwarf">
          <Dwarf line={dwarfLine} mood={dwarfMood} />
        </div>
      </div>

      {interactive && !state.solved ? (
        /*
         * Die Regler liegen ausserhalb der Zeichnung. Im SVG schrumpfen sie mit
         * ihr mit, und auf einem Telefon, auf dem fünf Räder nebeneinander
         * passen müssen, bleibt davon kein bedienbares Tippziel übrig.
         */
        <div className="gears__controls">
          {GEAR_LABELS.map((label, gearIndex) => (
            <div className="gears__control" key={label}>
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
          ))}
        </div>
      ) : null}

      <div className="gears__legend">
        <span className="gears__legend-note">
          Gleiche Form, entgegengesetzte Ausprägung: Ein {SHAPE_LABELS.triangle}-Zapfen fasst nur in
          eine {SHAPE_LABELS.triangle}-Kerbe. Ein passender Kontakt leuchtet – aber nur alle sechs
          zusammen setzen die Maschine in Gang.
        </span>
        <ul className="gears__contact-list">
          {Array.from({ length: CONTACT_COUNT }, (_, contact) => {
            const from = incomingAt(state.orientations, contact);
            const to = outgoingAt(state.orientations, contact);
            const live = state.contacts[contact] === true;
            return (
              <li key={contact} className={`gears__contact-item${live ? ' is-live' : ''}`}>
                <span className="gears__contact-name">{contactName(contact)}</span>
                <span className="gears__contact-pair">
                  {connectorLabel(from)} → {connectorLabel(to)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="puzzle__status" role="status" aria-live="polite">
        {justSolved
          ? 'KLACK. Die Maschine läuft, das Tor öffnet sich.'
          : chain > 0
            ? `Der Antrieb greift vom Motor aus über ${chain} von ${CONTACT_COUNT} Kontakten.`
            : meshed > 0
              ? 'Einzelne Anschlüsse greifen – aber noch nicht vom Motor aus.'
              : 'Die Maschine steht still.'}
      </p>
    </div>
  );
}

function contactName(contact: number): string {
  if (contact === 0) return `Motor → ${GEAR_LABELS[0]}`;
  if (contact === GEAR_COUNT) return `${GEAR_LABELS[GEAR_COUNT - 1]} → Tor`;
  return `${GEAR_LABELS[contact - 1]} → ${GEAR_LABELS[contact]}`;
}

/* ------------------------------------------------------------------ */
/* Räder                                                               */
/* ------------------------------------------------------------------ */

function GearFigure({
  index,
  orientation,
  running,
  interactive,
  onRotate,
}: {
  index: number;
  orientation: number;
  running: boolean;
  interactive: boolean;
  onRotate: (gear: number, dir: -1 | 1) => void;
}): JSX.Element {
  const ring = GEAR_RINGS[index] ?? [];
  const direction = index % 2 === 0 ? 'cw' : 'ccw';

  return (
    <g transform={`translate(${gearX(index)} ${AXIS_Y})`}>
      <g
        className={`gear${running ? ` gear--running gear--${direction}` : ''}${
          interactive ? ' is-turnable' : ''
        }`}
        role="button"
        tabIndex={interactive ? 0 : -1}
        aria-disabled={!interactive}
        aria-label={gearAriaLabel(index, orientation)}
        onClick={() => onRotate(index, 1)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
            event.preventDefault();
            onRotate(index, 1);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            onRotate(index, -1);
          }
        }}
      >
        <g className="gear__spin" style={{ transform: `rotate(${orientation * 45}deg)` }}>
          {/*
            Hält die Bounding Box symmetrisch um die Achse. Die Zapfen reichen je
            nach Stellung unterschiedlich weit, sonst wandert der fill-box-
            Mittelpunkt und das Rad eiert beim Drehen statt sich zu drehen.
          */}
          <circle r={PEG_TIP} fill="none" stroke="none" />
          <path className="gear__teeth" d={toothRing(ring)} />
          <circle className="gear__body" r={ROOT} />
          {ring.map((connector, sectorIndex) =>
            connector ? (
              <ConnectorMark key={sectorIndex} connector={connector} sector={sectorIndex} />
            ) : null,
          )}
          <circle className="gear__hub" r="18" />
          <line className="gear__marker" x1="0" y1="-18" x2="0" y2="-34" />
        </g>
        <circle className="gear__bore" r="6" />
      </g>
    </g>
  );
}

function gearAriaLabel(index: number, orientation: number): string {
  const label = GEAR_LABELS[index] ?? `Rad ${index + 1}`;
  const left = connectorLabel(leftConnector(index, orientation));
  const right = connectorLabel(rightConnector(index, orientation));
  return `${label}, Stellung ${orientation + 1} von ${GEAR_STEPS}. Links ${left}, rechts ${right}.`;
}

/** Gleichmässige Verzahnung; wo ein Sonderanschluss sitzt, bleibt der Zahn weg. */
function toothRing(ring: readonly GearSector[]): string {
  const step = (Math.PI * 2) / TEETH;
  const half = step * 0.3;
  const perSector = TEETH / GEAR_STEPS;
  const at = (angle: number, radius: number): string =>
    `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;

  const parts: string[] = [`M ${at(-step / 2, ROOT)}`];
  for (let i = 0; i < TEETH; i += 1) {
    const centre = i * step;
    const special = i % perSector === 0 && ring[i / perSector] != null;
    if (special) {
      parts.push(`A ${ROOT} ${ROOT} 0 0 1 ${at(centre + step / 2, ROOT)}`);
      continue;
    }
    parts.push(`A ${ROOT} ${ROOT} 0 0 1 ${at(centre - half, ROOT)}`);
    parts.push(`L ${at(centre - half * 0.7, TOOTH_TIP)}`);
    parts.push(`L ${at(centre + half * 0.7, TOOTH_TIP)}`);
    parts.push(`L ${at(centre + half, ROOT)}`);
    parts.push(`A ${ROOT} ${ROOT} 0 0 1 ${at(centre + step / 2, ROOT)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/** Zapfen stehen heraus, Kerben sind in den Rand eingelassen. */
function ConnectorMark({ connector, sector }: { connector: Connector; sector: number }): JSX.Element {
  const angle = sector * 45;
  const peg = connector.polarity === 'peg';
  const distance = peg ? PEG_TIP - 16 : SOCKET_R;

  return (
    <g transform={`rotate(${angle})`} className={`connector connector--${connector.polarity}`}>
      {peg ? <rect className="connector__neck" x={ROOT - 4} y={-7} width={PEG_TIP - ROOT - 8} height={14} /> : null}
      <g transform={`translate(${distance} 0)`}>
        <ShapeMark shape={connector.shape} size={peg ? 17 : 15} />
      </g>
    </g>
  );
}

function ShapeMark({ shape, size }: { shape: ConnectorShape; size: number }): JSX.Element {
  switch (shape) {
    case 'triangle':
      return <path className="connector__shape" d={`M ${size} 0 L ${-size * 0.7} ${-size} L ${-size * 0.7} ${size} Z`} />;
    case 'circle':
      return <circle className="connector__shape" r={size * 0.9} />;
    case 'square':
      return (
        <rect
          className="connector__shape"
          x={-size * 0.85}
          y={-size * 0.85}
          width={size * 1.7}
          height={size * 1.7}
          rx="2"
        />
      );
    case 'diamond':
    default:
      return <path className="connector__shape" d={`M ${size} 0 L 0 ${-size} L ${-size} 0 L 0 ${size} Z`} />;
  }
}

/* ------------------------------------------------------------------ */
/* Feste Enden                                                         */
/* ------------------------------------------------------------------ */

function Motor({ live }: { live: boolean }): JSX.Element {
  const x = gearX(0) - GEAR_GAP;
  return (
    <g className={`gears__motor${live ? ' is-live' : ''}`} transform={`translate(${x} ${AXIS_Y})`}>
      <rect x={-56} y={-64} width="96" height="128" rx="12" />
      <circle className="gears__motor-core" cx={-8} cy="0" r="26" />
      <FixedConnector connector={MOTOR_CONNECTOR} at={44} />
    </g>
  );
}

function Gate({ open, live }: { open: boolean; live: boolean }): JSX.Element {
  const x = gearX(GEAR_COUNT - 1) + GEAR_GAP;
  return (
    <g
      className={`gears__gate${open ? ' is-open' : ''}${live ? ' is-live' : ''}`}
      transform={`translate(${x} ${AXIS_Y})`}
    >
      <FixedConnector connector={GATE_CONNECTOR} at={-44} />
      <rect className="gears__gate-frame" x={-34} y={-78} width="94" height="156" rx="10" />
      <rect className="gears__gate-door gears__gate-door--l" x={-28} y={-70} width="42" height="140" />
      <rect className="gears__gate-door gears__gate-door--r" x={16} y={-70} width="42" height="140" />
    </g>
  );
}

/** Der Anschluss eines festen Endes; `at` ist positiv nach rechts. */
function FixedConnector({ connector, at }: { connector: Connector; at: number }): JSX.Element {
  const pointsRight = at > 0;
  return (
    <g className="connector connector--peg connector--fixed" transform={pointsRight ? undefined : 'rotate(180)'}>
      <rect className="connector__neck" x={Math.abs(at) - 24} y={-7} width="22" height="14" />
      <g transform={`translate(${Math.abs(at)} 0)`}>
        <ShapeMark shape={connector.shape} size={17} />
      </g>
    </g>
  );
}
