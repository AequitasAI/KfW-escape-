import { useMemo } from 'react';
import { legalMoves } from '@kfw-escape/shared';
import type { CableDir, CableLabyrinthState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { sound } from '../lib/sound.js';

const CELL = 100;
const HALF = CELL / 2;
/** Platz links und rechts für Quelle und Fassung - beide gehören ins Bild. */
const PORT = 96;

const EDGE: Record<CableDir, { x: number; y: number }> = {
  N: { x: HALF, y: 0 },
  S: { x: HALF, y: CELL },
  W: { x: 0, y: HALF },
  E: { x: CELL, y: HALF },
};

/**
 * 4x4 sliding cable puzzle. Tiles slide, they never rotate, so each tile keeps
 * its fixed connector geometry wherever it lands. The energised set comes from
 * the server after every move, which is what makes the live flow trustworthy.
 *
 * Quelle und Fassung liegen bewusst IM selben SVG wie das Brett und auf der
 * Höhe ihrer tatsächlichen Reihe. Vorher standen sie als eigene Kästen daneben,
 * vertikal zentriert - man konnte also nicht sehen, auf welcher Höhe die
 * Energie hereinkommt und wo sie hinaus muss, und der Hinweistext musste
 * nachliefern, was das Bild verschwieg.
 */
export function CableLabyrinth({
  state,
  interactive,
  onAction,
  size,
}: PuzzleProps<CableLabyrinthState>): JSX.Element {
  const movable = useMemo(() => new Set(legalMoves(state.board)), [state.board]);
  const energized = useMemo(() => new Set(state.energized), [state.energized]);

  const width = state.cols * CELL;
  const height = state.rows * CELL;
  const sourceY = state.sourceRow * CELL + HALF;
  const targetY = state.targetRow * CELL + HALF;
  const live = energized.size > 0;

  const slide = (index: number): void => {
    if (!interactive || !movable.has(index)) return;
    sound.play('click');
    onAction({ type: 'slide', index });
  };

  return (
    <div className={`puzzle puzzle--cable puzzle--${size}${state.solved ? ' is-solved' : ''}`}>
      <svg
        className="cable__board"
        viewBox={`${-PORT - 10} -14 ${width + 2 * PORT + 20} ${height + 28}`}
        role="group"
        aria-label={`Runenkanäle, vier mal vier Platten. Die Energie tritt links in Reihe ${
          state.sourceRow + 1
        } ein und muss rechts in Reihe ${state.targetRow + 1} austreten.`}
      >
        <defs>
          <linearGradient id="cable-plate" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#4a4335" />
            <stop offset="100%" stopColor="#2c271d" />
          </linearGradient>
          <linearGradient id="cable-plate-live" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#6b5a33" />
            <stop offset="100%" stopColor="#3d3320" />
          </linearGradient>
          <radialGradient id="cable-core" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fff2cd" />
            <stop offset="45%" stopColor="#f2ae3c" />
            <stop offset="100%" stopColor="#8a5a12" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Gefasster Stein, in den die Platten eingelassen sind */}
        <rect
          className="cable__bed"
          x="-10"
          y="-10"
          width={width + 20}
          height={height + 20}
          rx="14"
        />

        {/* Die aktiven Reihen sind am Rahmen markiert, nicht nur im Text */}
        <rect className="cable__lane cable__lane--in" x="-10" y={sourceY - HALF} width="10" height={CELL} />
        <rect
          className={`cable__lane cable__lane--out${state.solved ? ' is-live' : ''}`}
          x={width}
          y={targetY - HALF}
          width="10"
          height={CELL}
        />

        <SourceRune x={-PORT} y={sourceY} live={live} />
        <TargetSocket x={width + PORT} y={targetY} boardWidth={width} open={state.solved} />

        {state.board.map((tileId, index) => {
          const row = Math.floor(index / state.cols);
          const col = index % state.cols;
          const x = col * CELL;
          const y = row * CELL;

          if (tileId === null) {
            return (
              <rect
                key={index}
                className="cable__gap"
                x={x + 5}
                y={y + 5}
                width={CELL - 10}
                height={CELL - 10}
                rx="9"
              />
            );
          }

          const tile = state.tiles[tileId];
          const isLive = energized.has(index);
          const canMove = interactive && movable.has(index);

          return (
            <g
              key={tileId}
              className={`cable-tile${isLive ? ' is-live' : ''}${canMove ? ' is-movable' : ''}`}
              transform={`translate(${x} ${y})`}
              role="button"
              tabIndex={canMove ? 0 : -1}
              aria-disabled={!canMove}
              aria-label={`Kachel Zeile ${row + 1} Spalte ${col + 1}${
                isLive ? ', unter Energie' : ''
              }${canMove ? ', kann verschoben werden' : ''}`}
              onClick={() => slide(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  slide(index);
                }
              }}
            >
              <rect className="cable-tile__body" x="4" y="4" width={CELL - 8} height={CELL - 8} rx="9" />
              {/* eingelassene Fase, damit die Platte Tiefe bekommt */}
              <rect className="cable-tile__bevel" x="9" y="9" width={CELL - 18} height={CELL - 18} rx="7" />
              {(tile?.connectors ?? []).map((dir) => (
                <line
                  key={`base-${dir}`}
                  className="cable-tile__conduit"
                  x1={HALF}
                  y1={HALF}
                  x2={EDGE[dir].x}
                  y2={EDGE[dir].y}
                />
              ))}
              {(tile?.connectors ?? []).map((dir) => (
                <line
                  key={`live-${dir}`}
                  className="cable-tile__core"
                  x1={HALF}
                  y1={HALF}
                  x2={EDGE[dir].x}
                  y2={EDGE[dir].y}
                />
              ))}
              <circle className="cable-tile__hub" cx={HALF} cy={HALF} r="10" />
            </g>
          );
        })}
      </svg>

      <p className="puzzle__status" role="status" aria-live="polite">
        {state.solved
          ? 'Die Leitung steht. Die Energie erreicht die Fassung.'
          : `${energized.size} Segment${energized.size === 1 ? '' : 'e'} unter Energie · ${state.moves} Züge`}
      </p>
    </div>
  );
}

/** Der Einspeisepunkt: ein Runenstein, aus dem die Energie ins Brett läuft. */
function SourceRune({ x, y, live }: { x: number; y: number; live: boolean }): JSX.Element {
  return (
    <g className={`cable__source${live ? ' is-live' : ''}`} transform={`translate(${x} ${y})`}>
      <path className="cable__feed" d={`M 34 0 H ${-x - 10}`} />
      <circle className="cable__source-halo" r="46" />
      <circle className="cable__source-stone" r="32" />
      <circle className="cable__source-core" r="15" />
      {/* Runenkerben rund um den Stein */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <line
          key={angle}
          className="cable__source-rune"
          x1="0"
          y1="-38"
          x2="0"
          y2="-45"
          transform={`rotate(${angle})`}
        />
      ))}
      <text className="cable__caption" y="66" textAnchor="middle">
        Quelle
      </text>
    </g>
  );
}

/** Die Fassung: versiegelt, bis die Leitung sie erreicht. */
function TargetSocket({
  x,
  y,
  boardWidth,
  open,
}: {
  x: number;
  y: number;
  boardWidth: number;
  open: boolean;
}): JSX.Element {
  return (
    <g className={`cable__target${open ? ' is-open' : ''}`} transform={`translate(${x} ${y})`}>
      <path className="cable__feed" d={`M ${boardWidth - x + 10} 0 H -30`} />
      <path className="cable__target-frame" d="M -30 -46 H 22 A 12 12 0 0 1 34 -34 V 34 A 12 12 0 0 1 22 46 H -30 Z" />
      {/* Kristall in der Fassung */}
      <path className="cable__target-crystal" d="M 0 -26 L 20 0 L 0 26 L -20 0 Z" />
      <text className="cable__caption" y="66" textAnchor="middle">
        Fassung
      </text>
    </g>
  );
}
