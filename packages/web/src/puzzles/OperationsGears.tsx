import { useEffect, useRef, useState } from 'react';
import {
  CONTACT_COUNT,
  DWARF_LINES,
  GATE_CONNECTOR,
  GEAR_COUNT,
  GEAR_LABELS,
  GEAR_RINGS,
  GEAR_STEPS,
  MOTOR_CONNECTOR,
  connectorLabel,
  dwarfIdleLine,
  incomingAt,
  outgoingAt,
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
 * ist, bevor irgendetwas leuchtet - deshalb steht hier auch kein Erklärtext
 * mehr auf dem Bildschirm.
 *
 *   ROOT   Radkörper
 *   TOOTH  normale Verzahnung, ringsum gleichmässig
 *   PEG    Spezialzapfen, steht weit heraus
 *   SOCKET Kerbe, sitzt knapp innerhalb des Randes
 *
 *   PEG (86) + SOCKET (44) = 130 = NODE_GAP
 *
 * Zwei Anordnungen, ein Zustand: Auf dem Beamer und am Rechner liegt die Kette
 * waagerecht, auf dem Telefon senkrecht. Der Grund ist Geometrie, nicht
 * Geschmack - links- und rechtsseitiger Anschluss eines Rades liegen einander
 * genau gegenüber, eine Kette aus solchen Rädern ist also zwangsläufig gerade.
 * Ein Zickzack liesse sich zeichnen, aber die Zapfen würden dabei ins Leere
 * greifen, und genau das darf dieses Rätsel nicht.
 */
const ROOT = 48;
const TOOTH_TIP = 58;
const PEG_TIP = 86;
const SOCKET_R = 44;
const NODE_GAP = 130;
/** Platz für Motorgehäuse und Torflügel an den Enden der Kette. */
const END_MARGIN = 70;
/** Abstand der Kettenachse zum Rand quer zur Laufrichtung. */
const AXIS = 110;
const SPAN = END_MARGIN * 2 + (GEAR_COUNT + 1) * NODE_GAP;
/** Greiffläche je Radhälfte; knapp innerhalb des Nachbarabstands. */
const GRAB_R = 62;
/** Regelmässige Zähne rundum; die Sonderplätze liegen auf jedem dritten. */
const TEETH = 24;
/** Darunter wird die Kette senkrecht gestellt, damit die Räder gross bleiben. */
const NARROW_PX = 640;

type Orientation = 'row' | 'column';

interface Point {
  x: number;
  y: number;
}

/** Knoten 0 ist der Motor, 1..5 die Räder, 6 das Tor. */
function nodeAt(orientation: Orientation, node: number): Point {
  const along = END_MARGIN + node * NODE_GAP;
  return orientation === 'row' ? { x: along, y: AXIS } : { x: AXIS, y: along };
}

function contactAt(orientation: Orientation, contact: number): Point {
  const along = END_MARGIN + (contact + 0.5) * NODE_GAP;
  return orientation === 'row' ? { x: along, y: AXIS } : { x: AXIS, y: along };
}

export function OperationsGears({
  state,
  interactive,
  onAction,
  size,
}: PuzzleProps<OperationsGearsState>): JSX.Element {
  const [justSolved, setJustSolved] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const orientation = useChainOrientation(frame, size === 'wide');

  /*
   * Ein neu greifender Kontakt bekommt seinen eigenen Ton - satt und kurz, über
   * dem dumpfen Klacken des Drehens. Man lernt die Regel dadurch mit dem Ohr,
   * bevor man sie gelesen hat, und genau darum steht sie nirgends mehr.
   */
  const meshed = state.contacts.filter(Boolean).length;
  const meshedBefore = useRef(meshed);
  useEffect(() => {
    if (meshed > meshedBefore.current && !state.solved) sound.play('rune');
    meshedBefore.current = meshed;
  }, [meshed, state.solved]);

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
  const dwarfLine = state.solved
    ? DWARF_LINES.success
    : chain >= CONTACT_COUNT - 1
      ? DWARF_LINES.almost
      : chain >= 2
        ? DWARF_LINES.progress
        : dwarfIdleLine(state.moves);
  const dwarfMood = state.solved ? 'happy' : chain >= 2 ? 'skeptical' : 'neutral';
  const viewW = orientation === 'row' ? SPAN : AXIS * 2;
  const viewH = orientation === 'row' ? AXIS * 2 : SPAN;
  const turnable = interactive && !state.solved;

  return (
    <div
      className={`puzzle puzzle--gears puzzle--${size} gears--${orientation}${
        state.solved ? ' is-running' : ''
      }`}
    >
      <div className="gears__machine" ref={frame}>
        <div className="gears__viewport">
          <svg
            viewBox={`0 0 ${viewW} ${viewH}`}
            className="gears__svg"
            role="group"
            aria-label="Fünf Räder zwischen Motor und Tor"
          >
            <defs>
              <radialGradient id="contact-glow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#ffe6ad" stopOpacity="0.85" />
                <stop offset="55%" stopColor="#f2ae3c" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f2ae3c" stopOpacity="0" />
              </radialGradient>
            </defs>

            <Motor orientation={orientation} live={state.contacts[0] === true} />

            {/* Antriebswellen: sie führen Energie erst, wenn die Kette sie erreicht */}
            {Array.from({ length: CONTACT_COUNT }, (_, contact) => {
              const at = contactAt(orientation, contact);
              const along = orientation === 'row' ? { x: 26, y: 0 } : { x: 0, y: 26 };
              return (
                <line
                  key={`shaft-${contact}`}
                  className={`gears__shaft${contact < chain ? ' is-powered' : ''}`}
                  x1={at.x - along.x}
                  y1={at.y - along.y}
                  x2={at.x + along.x}
                  y2={at.y + along.y}
                />
              );
            })}

            {/* Bei laufender Maschine steht die Energie durchgehend an */}
            {state.solved ? (
              <line
                className="gears__energy"
                x1={orientation === 'row' ? END_MARGIN : AXIS}
                y1={orientation === 'row' ? AXIS : END_MARGIN}
                x2={orientation === 'row' ? SPAN - END_MARGIN : AXIS}
                y2={orientation === 'row' ? AXIS : SPAN - END_MARGIN}
              />
            ) : null}

            {state.orientations.map((gearOrientation, gearIndex) => (
              <GearFigure
                key={gearIndex}
                index={gearIndex}
                at={nodeAt(orientation, gearIndex + 1)}
                spin={gearOrientation}
                chainAngle={orientation === 'row' ? 0 : 90}
                running={state.solved}
              />
            ))}

            <Gate
              orientation={orientation}
              open={state.solved}
              live={state.contacts[GEAR_COUNT] === true}
            />

            {/* Die Kontaktstellen zuletzt, damit ihr Leuchten über allem liegt */}
            {state.contacts.map((live, contact) => {
              if (!live) return null;
              const at = contactAt(orientation, contact);
              return (
                <g key={`contact-${contact}`} className="gears__contact" aria-hidden="true">
                  <circle cx={at.x} cy={at.y} r="36" fill="url(#contact-glow)" />
                </g>
              );
            })}

            {/*
              Greifflächen zuletzt und ausserhalb der gedrehten Gruppen: Links
              drehen soll links bleiben, egal wie die Kette liegt.
            */}
            {turnable
              ? state.orientations.map((_, gearIndex) => (
                  <GearGrip
                    key={`grip-${gearIndex}`}
                    index={gearIndex}
                    at={nodeAt(orientation, gearIndex + 1)}
                    onRotate={rotate}
                  />
                ))
              : null}
          </svg>
        </div>

        <div className="gears__dwarf">
          <Dwarf line={dwarfLine} mood={dwarfMood} />
        </div>
      </div>

      <ol className="gears__pips" aria-hidden="true">
        {state.contacts.map((live, contact) => (
          <li
            key={contact}
            className={`gears__pip${live ? ' is-live' : ''}${contact < chain ? ' is-powered' : ''}`}
          />
        ))}
      </ol>

      {/*
        Was die Zeichnung zeigt, in Worten - nur für Vorleseprogramme. Auf dem
        Bildschirm stand das früher als Liste unter der Maschine und hat mehr
        Platz gebraucht als die Maschine selbst.
      */}
      <ul className="visually-hidden">
        {Array.from({ length: CONTACT_COUNT }, (_, contact) => (
          <li key={`say-${contact}`}>
            {contactName(contact)}: {connectorLabel(incomingAt(state.orientations, contact))} trifft{' '}
            {connectorLabel(outgoingAt(state.orientations, contact))}.{' '}
            {state.contacts[contact] === true ? 'Greift.' : 'Greift nicht.'}
          </li>
        ))}
        {state.orientations.map((value, gearIndex) => (
          <li key={`pos-${gearIndex}`}>
            {GEAR_LABELS[gearIndex]} steht auf Stellung {value + 1} von {GEAR_STEPS}.
          </li>
        ))}
      </ul>

      <p className="puzzle__status" role="status" aria-live="polite">
        {justSolved
          ? 'KLACK. Die Maschine läuft, das Tor öffnet sich.'
          : `${chain} von ${CONTACT_COUNT} Verbindungen greifen vom Motor aus.`}
      </p>
    </div>
  );
}

/**
 * Waagerecht, solange die Kette waagerecht Platz hat. Gemessen wird der Kasten
 * selbst und nicht das Fenster: Dieselbe Maschine läuft in der Spieleransicht,
 * in einer Spalte der Spielleitung und auf dem Beamer.
 */
function useChainOrientation(
  frame: React.RefObject<HTMLElement>,
  forceRow: boolean,
): Orientation {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const element = frame.current;
    if (forceRow || !element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setNarrow(width < NARROW_PX);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [frame, forceRow]);

  return forceRow || !narrow ? 'row' : 'column';
}

function contactName(contact: number): string {
  if (contact === 0) return `Motor auf ${GEAR_LABELS[0]}`;
  if (contact === GEAR_COUNT) return `${GEAR_LABELS[GEAR_COUNT - 1]} auf das Tor`;
  return `${GEAR_LABELS[contact - 1]} auf ${GEAR_LABELS[contact]}`;
}

/* ------------------------------------------------------------------ */
/* Räder                                                               */
/* ------------------------------------------------------------------ */

function GearFigure({
  index,
  at,
  spin,
  chainAngle,
  running,
}: {
  index: number;
  at: Point;
  spin: number;
  chainAngle: number;
  running: boolean;
}): JSX.Element {
  const ring = GEAR_RINGS[index] ?? [];
  const direction = index % 2 === 0 ? 'cw' : 'ccw';

  return (
    <g transform={`translate(${at.x} ${at.y}) rotate(${chainAngle})`} aria-hidden="true">
      <g className={`gear${running ? ` gear--running gear--${direction}` : ''}`}>
        <g className="gear__spin" style={{ transform: `rotate(${spin * 45}deg)` }}>
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

/**
 * Die linke Radhälfte dreht zurück, die rechte weiter. Zwei grosse Ziele statt
 * einer Reglerreihe unter der Zeichnung - und auf dem Telefon endlich
 * daumentauglich.
 */
function GearGrip({
  index,
  at,
  onRotate,
}: {
  index: number;
  at: Point;
  onRotate: (gear: number, dir: -1 | 1) => void;
}): JSX.Element {
  const label = GEAR_LABELS[index] ?? `Rad ${index + 1}`;

  const half = (dir: -1 | 1): JSX.Element => {
    const back = dir === -1;
    return (
      <g
        className={`gear-grip__half gear-grip__half--${back ? 'ccw' : 'cw'}`}
        role="button"
        tabIndex={0}
        aria-label={`${label} ${back ? 'gegen den Uhrzeigersinn' : 'im Uhrzeigersinn'} drehen`}
        onClick={() => onRotate(index, dir)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onRotate(index, dir);
        }}
      >
        <path
          className="gear-grip__hit"
          d={`M 0 ${-GRAB_R} A ${GRAB_R} ${GRAB_R} 0 0 ${back ? 0 : 1} 0 ${GRAB_R} Z`}
        />
        <path
          className="gear-grip__arrow"
          transform={`translate(${back ? -34 : 34} 0)${back ? ' scale(-1 1)' : ''}`}
          d="M -7 -9 A 11 11 0 1 1 -7 9"
        />
        <path
          className="gear-grip__arrow-head"
          transform={`translate(${back ? -34 : 34} 0)${back ? ' scale(-1 1)' : ''}`}
          d="M -7 9 L -13 2 L -1 3 Z"
        />
      </g>
    );
  };

  return (
    <g className="gear-grip" transform={`translate(${at.x} ${at.y})`}>
      {half(-1)}
      {half(1)}
    </g>
  );
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
        <ShapeMark shape={connector.shape} size={peg ? 17 : 15} opening={!peg} />
      </g>
    </g>
  );
}

/**
 * Die Form eines Anschlusses.
 *
 * `opening` dreht die Form um: Ein Zapfen zeigt mit der Spitze nach aussen, die
 * Kerbe muss ihm entgegen offen stehen. Ohne diese Spiegelung zeigten beim
 * Dreieck Zapfen und Kerbe in dieselbe Richtung - es sah aus, als könnten die
 * beiden gar nicht ineinandergreifen, und genau das war die Verwirrung.
 * Kreis, Quadrat und Diamant sind symmetrisch, dort ändert sich nichts.
 */
function ShapeMark({
  shape,
  size,
  opening = false,
}: {
  shape: ConnectorShape;
  size: number;
  opening?: boolean;
}): JSX.Element {
  const mirror = opening ? 'scale(-1 1)' : undefined;
  switch (shape) {
    case 'triangle':
      return (
        <path
          className="connector__shape"
          transform={mirror}
          d={`M ${size} 0 L ${-size * 0.7} ${-size} L ${-size * 0.7} ${size} Z`}
        />
      );
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

function Motor({ orientation, live }: { orientation: Orientation; live: boolean }): JSX.Element {
  const at = nodeAt(orientation, 0);
  const angle = orientation === 'row' ? 0 : 90;
  return (
    <g
      className={`gears__motor${live ? ' is-live' : ''}`}
      transform={`translate(${at.x} ${at.y}) rotate(${angle})`}
    >
      <rect x={-56} y={-64} width="96" height="128" rx="12" />
      <circle className="gears__motor-core" cx={-8} cy="0" r="26" />
      <FixedConnector connector={MOTOR_CONNECTOR} at={44} />
    </g>
  );
}

function Gate({
  orientation,
  open,
  live,
}: {
  orientation: Orientation;
  open: boolean;
  live: boolean;
}): JSX.Element {
  const at = nodeAt(orientation, GEAR_COUNT + 1);
  const angle = orientation === 'row' ? 0 : 90;
  return (
    <g
      className={`gears__gate${open ? ' is-open' : ''}${live ? ' is-live' : ''}`}
      transform={`translate(${at.x} ${at.y}) rotate(${angle})`}
    >
      <FixedConnector connector={GATE_CONNECTOR} at={-44} />
      <rect className="gears__gate-frame" x={-34} y={-78} width="94" height="156" rx="10" />
      <rect className="gears__gate-door gears__gate-door--l" x={-28} y={-70} width="42" height="140" />
      <rect className="gears__gate-door gears__gate-door--r" x={16} y={-70} width="42" height="140" />
    </g>
  );
}

/**
 * Der Anschluss eines festen Endes; `at` ist positiv nach rechts.
 *
 * Motor und Tor haben eine Ausprägung wie jedes Rad, und sie muss auch so
 * aussehen: Der Motor treibt mit einem Zapfen, das Tor nimmt mit einer Kerbe
 * auf. Bisher wurde beides als goldener Zapfen gezeichnet - am Tor stand damit
 * Gold gegen Gold, und die Regel „Zapfen fasst in Kerbe" war dort nicht mehr
 * abzulesen.
 */
function FixedConnector({ connector, at }: { connector: Connector; at: number }): JSX.Element {
  const pointsRight = at > 0;
  const peg = connector.polarity === 'peg';
  const distance = Math.abs(at);
  return (
    <g
      className={`connector connector--${connector.polarity} connector--fixed`}
      transform={pointsRight ? undefined : 'rotate(180)'}
    >
      {peg ? (
        <rect className="connector__neck" x={distance - 24} y={-7} width="22" height="14" />
      ) : (
        /* eine Kerbe sitzt in der Stirnfläche, nicht auf einem Hals */
        <rect className="connector__recess" x={distance - 4} y={-24} width="26" height="48" rx="4" />
      )}
      <g transform={`translate(${distance} 0)`}>
        <ShapeMark shape={connector.shape} size={17} opening={!peg} />
      </g>
    </g>
  );
}
