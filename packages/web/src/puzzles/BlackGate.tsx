import { useEffect, useState } from 'react';
import { GATE_CLUES, GATE_CODE_LENGTH, GUARD_LINES } from '@kfw-escape/shared';
import type { BlackGateState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { sound } from '../lib/sound.js';

/**
 * Deduction puzzle in front of the gate. A large keypad, no timer penalty for a
 * wrong code, and the five statements stay visible the whole time - the group is
 * meant to reason out loud, not to brute force.
 */
export function BlackGate({ state, interactive, onAction, size }: PuzzleProps<BlackGateState>): JSX.Element {
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (state.lastRejected) {
      setShake((n) => n + 1);
      sound.play('fail');
    }
  }, [state.lastRejected]);

  useEffect(() => {
    if (state.solved) sound.play('gate');
  }, [state.solved]);

  const press = (digit: number): void => {
    if (!interactive || state.entry.length >= GATE_CODE_LENGTH) return;
    sound.play('click');
    onAction({ type: 'digit', digit });
  };

  const slots = Array.from({ length: GATE_CODE_LENGTH }, (_, i) => state.entry[i] ?? null);
  const complete = state.entry.length === GATE_CODE_LENGTH;

  return (
    <div className={`puzzle puzzle--gate puzzle--${size}${state.solved ? ' is-open' : ''}`}>
      <div className="gate__guard">
        <svg viewBox="0 0 120 170" className="gate__guard-art" aria-hidden="true">
          {/* stylised gatekeeper: epic, not horror */}
          <path d="M60 14 Q84 22 84 48 L84 62 L36 62 L36 48 Q36 22 60 14 Z" fill="#1a2432" />
          <rect x="44" y="40" width="32" height="7" rx="3" fill="#5f8dc4" opacity="0.85" />
          <path d="M30 66 Q60 56 90 66 L100 150 L20 150 Z" fill="#141d29" />
          <path d="M30 66 Q60 56 90 66 L92 84 Q60 74 28 84 Z" fill="#1e2b3c" />
          <rect
            className="gate__sword"
            x="97"
            y="52"
            width="7"
            height="96"
            rx="3"
            fill="#4a5a6d"
          />
          <rect x="90" y="96" width="21" height="6" rx="3" fill="#6a7c90" />
        </svg>
        <div className="gate__speech">
          <p className="gate__speech-hail">{state.solved ? GUARD_LINES.success : GUARD_LINES.start}</p>
          {!state.solved ? <p className="gate__speech-body">{GUARD_LINES.continue}</p> : null}
        </div>
      </div>

      <div className="gate__panel">
        <ol className="gate__clues" aria-label="Aussagen des Wächters">
          {GATE_CLUES.map((clue) => (
            <li key={clue.guess} className="gate__clue">
              <span className="gate__clue-code mono">{clue.guess}</span>
              <span className="gate__clue-text">{clue.text}</span>
            </li>
          ))}
        </ol>

        <div className="gate__keypad-wrap">
          <div
            key={shake}
            className={`gate__display${state.lastRejected ? ' is-rejected' : ''}`}
            role="status"
            aria-live="polite"
            aria-label={`Eingegebener Code: ${state.entry === '' ? 'leer' : state.entry.split('').join(' ')}`}
          >
            {slots.map((digit, i) => (
              <span key={i} className={`gate__slot${digit !== null ? ' is-filled' : ''}`}>
                {digit ?? ''}
              </span>
            ))}
          </div>

          {state.lastRejected ? (
            <p className="gate__reject">Das Tor bleibt verschlossen. Versucht es erneut.</p>
          ) : null}

          <div className="gate__keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                className="gate__key"
                disabled={!interactive || complete}
                onClick={() => press(digit)}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              className="gate__key gate__key--util"
              disabled={!interactive || state.entry.length === 0}
              onClick={() => {
                sound.play('click');
                onAction({ type: 'backspace' });
              }}
              aria-label="Letzte Ziffer löschen"
            >
              ⌫
            </button>
            <button
              type="button"
              className="gate__key"
              disabled={!interactive || complete}
              onClick={() => press(0)}
            >
              0
            </button>
            <button
              type="button"
              className="gate__key gate__key--submit"
              disabled={!interactive || !complete}
              onClick={() => {
                sound.play('clunk');
                onAction({ type: 'submit' });
              }}
              aria-label="Code prüfen"
            >
              ✓
            </button>
          </div>

          {state.attempts.length > 0 ? (
            <p className="gate__attempts">
              Bereits versucht: <span className="mono">{state.attempts.join(' · ')}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
