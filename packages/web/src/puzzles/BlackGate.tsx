import { useEffect, useState } from 'react';
import { GATE_CLUES, GATE_CODE_LENGTH, GUARD_LINES, guardChallenge } from '@kfw-escape/shared';
import type { BlackGateState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { sound } from '../lib/sound.js';
import { GuardArt } from '../scenes/Characters.js';

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
        <div className="gate__guard-figure">
          <GuardArt open={state.solved} />
        </div>
        <div className="gate__speech">
          {/*
            Bei jedem Fehlversuch fragt der Wächter knapper nach. Er ist nicht
            der Gegner - er macht seine Arbeit, und die besteht aus genau einer
            Frage nach der anderen.
          */}
          <p className="gate__speech-hail">
            {state.solved
              ? GUARD_LINES.success
              : state.attempts.length > 0
                ? guardChallenge(state.attempts.length)
                : GUARD_LINES.start}
          </p>
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
