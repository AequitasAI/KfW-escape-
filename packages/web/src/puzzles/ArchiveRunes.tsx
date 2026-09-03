import { useState } from 'react';
import { ARCHIVE_CLUES, RUNES } from '@kfw-escape/shared';
import type { ArchiveRunesState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { sound } from '../lib/sound.js';

const RUNE_BY_ID = new Map(RUNES.map((rune) => [rune.id, rune]));

/**
 * Five runes into five sockets. Drag and drop on the desktop, but the primary
 * interaction is tap-then-tap plus explicit move buttons, so the puzzle is fully
 * usable by touch and by keyboard (a11y requirement of the puzzle spec).
 */
export function ArchiveRunes({ state, interactive, onAction, size }: PuzzleProps<ArchiveRunesState>): JSX.Element {
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const swap = (a: number, b: number): void => {
    if (a === b) return;
    sound.play('click');
    onAction({ type: 'swap', a, b });
  };

  const onSocketActivate = (index: number): void => {
    if (!interactive) return;
    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    swap(selected, index);
    setSelected(null);
  };

  const move = (index: number, dir: -1 | 1): void => {
    if (!interactive) return;
    const target = index + dir;
    if (target < 0 || target >= state.order.length) return;
    sound.play('click');
    onAction({ type: 'shift', index, dir });
    setSelected(target);
  };

  return (
    <div className={`puzzle puzzle--runes puzzle--${size}`}>
      <ol className="runes" aria-label="Fünf Sockel für die Runen">
        {state.order.map((runeId, index) => {
          const rune = RUNE_BY_ID.get(runeId);
          const isSelected = selected === index;
          return (
            <li key={index} className="runes__slot">
              <button
                type="button"
                className={`rune${isSelected ? ' rune--selected' : ''}${state.solved ? ' rune--locked' : ''}${
                  dragging === index ? ' rune--dragging' : ''
                }`}
                style={{ animationDelay: state.solved ? `${index * 130}ms` : undefined }}
                disabled={!interactive}
                aria-disabled={!interactive}
                aria-pressed={isSelected}
                aria-label={`Sockel ${index + 1}: ${rune?.label ?? runeId}${
                  isSelected ? ', ausgewählt' : ''
                }`}
                draggable={interactive}
                onClick={() => onSocketActivate(index)}
                onDragStart={(event) => {
                  setDragging(index);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(index));
                }}
                onDragEnd={() => setDragging(null)}
                onDragOver={(event) => {
                  if (interactive) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = Number(event.dataTransfer.getData('text/plain'));
                  setDragging(null);
                  if (Number.isInteger(from)) swap(from, index);
                }}
              >
                <span className="rune__glyph" aria-hidden="true">
                  {rune?.symbol ?? '?'}
                </span>
                <span className="rune__label">{rune?.label ?? runeId}</span>
                <span className="rune__socket" aria-hidden="true">
                  {index + 1}
                </span>
              </button>
              {interactive ? (
                <div className="runes__nudge" aria-hidden={false}>
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`${rune?.label ?? runeId} nach links verschieben`}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon"
                    disabled={index === state.order.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`${rune?.label ?? runeId} nach rechts verschieben`}
                  >
                    →
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="clues">
        <h3 className="clues__title">Die Inschrift des Archivs</h3>
        <ol className="clues__list">
          {ARCHIVE_CLUES.map((clue) => (
            <li key={clue}>{clue}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
