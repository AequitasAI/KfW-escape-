import { useMemo } from 'react';
import { legalMoves } from '@kfw-escape/shared';
import type { CableDir, CableLabyrinthState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { sound } from '../lib/sound.js';

const CELL = 100;
const HALF = CELL / 2;

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

  const slide = (index: number): void => {
    if (!interactive || !movable.has(index)) return;
    sound.play('click');
    onAction({ type: 'slide', index });
  };

  return (
    <div className={`puzzle puzzle--cable puzzle--${size}`}>
      <div className="cable__frame">
        <div className="cable__port cable__port--source" aria-hidden="true">
          <span className={`cable__port-core${energized.size > 0 ? ' is-live' : ''}`} />
          <span className="cable__port-label">Quelle</span>
        </div>

        <svg
          className="cable__board"
          viewBox={`-6 -6 ${width + 12} ${height + 12}`}
          role="group"
          aria-label="Kabelraster, vier mal vier Kacheln"
        >
          <rect
            x="-6"
            y="-6"
            width={width + 12}
            height={height + 12}
            rx="10"
            fill="rgba(6,17,30,0.72)"
            stroke="var(--game-ui-line-strong)"
          />
          {/* source and target rails */}
          <line
            x1="-6"
            y1={state.sourceRow * CELL + HALF}
            x2="0"
            y2={state.sourceRow * CELL + HALF}
            stroke="var(--game-fx-energy)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <line
            x1={width}
            y1={state.targetRow * CELL + HALF}
            x2={width + 6}
            y2={state.targetRow * CELL + HALF}
            stroke={state.solved ? 'var(--game-fx-energy)' : 'var(--game-fx-metal-dark)'}
            strokeWidth="7"
            strokeLinecap="round"
          />

          {state.board.map((tileId, index) => {
            const row = Math.floor(index / state.cols);
            const col = index % state.cols;
            const x = col * CELL;
            const y = row * CELL;

            if (tileId === null) {
              return (
                <rect
                  key={index}
                  x={x + 4}
                  y={y + 4}
                  width={CELL - 8}
                  height={CELL - 8}
                  rx="8"
                  fill="rgba(2,8,16,0.85)"
                  stroke="var(--game-ui-line)"
                  strokeDasharray="6 6"
                />
              );
            }

            const tile = state.tiles[tileId];
            const live = energized.has(index);
            const canMove = interactive && movable.has(index);

            return (
              <g
                key={tileId}
                className={`cable-tile${live ? ' is-live' : ''}${canMove ? ' is-movable' : ''}`}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={canMove ? 0 : -1}
                aria-disabled={!canMove}
                aria-label={`Kachel Zeile ${row + 1} Spalte ${col + 1}${
                  live ? ', unter Energie' : ''
                }${canMove ? ', kann verschoben werden' : ''}`}
                onClick={() => slide(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    slide(index);
                  }
                }}
              >
                <rect
                  className="cable-tile__body"
                  x="4"
                  y="4"
                  width={CELL - 8}
                  height={CELL - 8}
                  rx="8"
                />
                {/* dark conduit underneath, then the live core on top */}
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
                <circle className="cable-tile__hub" cx={HALF} cy={HALF} r="9" />
              </g>
            );
          })}
        </svg>

        <div className="cable__port cable__port--target" aria-hidden="true">
          <span className={`cable__port-core${state.solved ? ' is-live' : ''}`} />
          <span className="cable__port-label">Zielsystem</span>
        </div>
      </div>

      <p className="puzzle__status" role="status" aria-live="polite">
        {state.solved
          ? 'Die Leitung steht. Energie erreicht das Zielsystem.'
          : `${energized.size} Segment${energized.size === 1 ? '' : 'e'} unter Energie · ${state.moves} Züge`}
      </p>
    </div>
  );
}
