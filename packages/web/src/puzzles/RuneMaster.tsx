import { useEffect, useState } from 'react';
import { RUNE_GATES, RUNE_MASTER_COOLDOWN_MS, RUNE_MASTER_LINE } from '@kfw-escape/shared';
import type { RuneMasterState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { sound } from '../lib/sound.js';

/**
 * Die Prüfung des Runenmeisters.
 *
 * Zwei Angaben, ein Versuch: das Tor, das den Weg freigibt, und die Inschrift,
 * die als einzige wahr ist. Beides wird getrennt gewählt und gemeinsam
 * geprüft - deshalb liegt der Bestätigungsknopf auch abseits der Tore. Ein
 * Fehlgriff soll aus einer Überlegung kommen, nicht aus einem Daumen.
 */
export function RuneMaster({
  state,
  interactive,
  onAction,
  size,
}: PuzzleProps<RuneMasterState>): JSX.Element {
  const [locked, setLocked] = useState(false);

  /* Nach einer falschen Antwort bleibt der Knopf so lange stumm wie der Server. */
  useEffect(() => {
    if (state.lastRejectedAt === null) {
      setLocked(false);
      return undefined;
    }
    setLocked(true);
    sound.play('fail');
    const remaining = Math.max(0, state.lastRejectedAt + RUNE_MASTER_COOLDOWN_MS - Date.now());
    const timeout = window.setTimeout(() => setLocked(false), remaining);
    return () => window.clearTimeout(timeout);
  }, [state.lastRejectedAt]);

  useEffect(() => {
    if (state.solved) sound.play('gate');
  }, [state.solved]);

  const pick = (slot: 'gate' | 'inscription', index: number): void => {
    if (!interactive || state.solved) return;
    sound.play('click');
    onAction({ type: 'pick', slot, index });
  };

  const ready = state.gate !== null && state.inscription !== null;

  return (
    <div className={`puzzle puzzle--runes-final puzzle--${size}${state.solved ? ' is-open' : ''}`}>
      <p className="runemaster__npc">„{RUNE_MASTER_LINE}“</p>

      <ol className="runemaster__gates">
        {RUNE_GATES.map((gate, index) => {
          const chosen = state.gate === index;
          const claimed = state.inscription === index;
          const rejected =
            state.lastRejected !== null &&
            (state.lastRejected[0] === index || state.lastRejected[1] === index);
          return (
            <li
              key={gate.id}
              className={`runemaster__gate${chosen ? ' is-chosen' : ''}${
                claimed ? ' is-claimed' : ''
              }${rejected ? ' is-rejected' : ''}${state.solved && chosen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="runemaster__arch"
                disabled={!interactive || state.solved}
                aria-pressed={chosen}
                aria-label={`${gate.name} als Weg wählen`}
                onClick={() => pick('gate', index)}
              >
                <GateArt sigil={gate.sigil} />
                <span className="runemaster__gate-name">{gate.name}</span>
                <span className="runemaster__gate-state">
                  {chosen ? 'als Weg gewählt' : 'als Weg wählen'}
                </span>
              </button>

              <button
                type="button"
                className="runemaster__plaque"
                disabled={!interactive || state.solved}
                aria-pressed={claimed}
                aria-label={`Inschrift des ${gate.name} für wahr erklären: ${gate.inscription}`}
                onClick={() => pick('inscription', index)}
              >
                <span className="runemaster__inscription">„{gate.inscription}“</span>
                <span className="runemaster__gate-state">
                  {claimed ? 'als einzig wahr benannt' : 'für wahr erklären'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="runemaster__verdict">
        <button
          type="button"
          className="btn btn--primary btn--large"
          disabled={!interactive || state.solved || !ready || locked}
          onClick={() => {
            sound.play('clunk');
            onAction({ type: 'attempt' });
          }}
        >
          {locked ? 'Der Stein prüft noch …' : 'Das Tor durchschreiten'}
        </button>
      </div>

      <p className="puzzle__status" role="status" aria-live="polite">
        {state.solved
          ? 'Der Stein gibt nach. Der Weg ist frei.'
          : state.lastRejected !== null
            ? 'Das Tor bleibt verschlossen. Eine der beiden Angaben stimmt nicht.'
            : ready
              ? 'Tor und Inschrift benannt. Der Stein wartet.'
              : 'Wählt ein Tor – und die Inschrift, die als einzige wahr ist.'}
      </p>
    </div>
  );
}

/** Ein Torbogen aus altem Stein; die Rune darin nennt das Tor. */
function GateArt({ sigil }: { sigil: string }): JSX.Element {
  return (
    <svg viewBox="0 0 120 150" className="runemaster__art" aria-hidden="true">
      <path
        className="runemaster__stone"
        d="M 10 150 L 10 60 A 50 50 0 0 1 110 60 L 110 150 Z"
      />
      <path
        className="runemaster__opening"
        d="M 30 150 L 30 66 A 30 30 0 0 1 90 66 L 90 150 Z"
      />
      {/* Fugen im Mauerwerk - ohne sie ist es ein Bogen, kein Bauwerk */}
      {[92, 116, 140].map((y) => (
        <g key={y}>
          <line className="runemaster__joint" x1="10" y1={y} x2="30" y2={y} />
          <line className="runemaster__joint" x1="90" y1={y} x2="110" y2={y} />
        </g>
      ))}
      <text className="runemaster__sigil" x="60" y="112" textAnchor="middle">
        {sigil}
      </text>
    </svg>
  );
}
