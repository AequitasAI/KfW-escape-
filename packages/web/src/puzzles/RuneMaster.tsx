import { useEffect, useState } from 'react';
import { RUNE_GATES, RUNE_MASTER_LINE } from '@kfw-escape/shared';
import type { RuneMasterState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { sound } from '../lib/sound.js';

/**
 * Die Prüfung des Runenmeisters.
 *
 * Zwei Angaben, ein einziger Versuch: das Tor, das den Weg freigibt, und die
 * Inschrift, die als einzige wahr ist. Beides wird getrennt gewählt und
 * gemeinsam geprüft.
 *
 * Weil eine falsche Antwort das Abenteuer beendet, ist die Oberfläche hier
 * ausdrücklich langsam: Die beiden Schritte stehen nummeriert da, der Knopf
 * sagt, was noch fehlt, und vor der Abgabe wird einmal nachgefragt - mit der
 * Folge im Klartext. Wer hier verliert, soll wissen, worauf er geklickt hat.
 */
export function RuneMaster({
  state,
  interactive,
  onAction,
  size,
}: PuzzleProps<RuneMasterState>): JSX.Element {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state.solved) sound.play('gate');
    if (state.failed) sound.play('fail');
  }, [state.solved, state.failed]);

  const settled = state.solved || state.failed;
  const locked = !interactive || settled;

  const pick = (slot: 'gate' | 'inscription', index: number): void => {
    if (locked) return;
    sound.play('click');
    setConfirming(false);
    onAction({ type: 'pick', slot, index });
  };

  const ready = state.gate !== null && state.inscription !== null;
  const buttonLabel =
    state.gate === null
      ? 'Zuerst ein Tor wählen'
      : state.inscription === null
        ? 'Jetzt die wahre Inschrift benennen'
        : 'Das Tor durchschreiten';

  return (
    <div
      className={`puzzle puzzle--runes-final puzzle--${size}${state.solved ? ' is-open' : ''}${
        state.failed ? ' is-failed' : ''
      }`}
    >
      <p className="runemaster__npc">„{RUNE_MASTER_LINE}“</p>

      {/* Zwei Schritte, sichtbar nummeriert - der Knopf wartet auf beide. */}
      <ol className="runemaster__steps" aria-hidden="true">
        <li className={`runemaster__step${state.gate !== null ? ' is-done' : ''}`}>
          <span className="runemaster__step-mark">{state.gate !== null ? '✓' : '1'}</span>
          Tor wählen
        </li>
        <li className={`runemaster__step${state.inscription !== null ? ' is-done' : ''}`}>
          <span className="runemaster__step-mark">{state.inscription !== null ? '✓' : '2'}</span>
          Wahre Inschrift benennen
        </li>
      </ol>

      <ol className="runemaster__gates">
        {RUNE_GATES.map((gate, index) => {
          const chosen = state.gate === index;
          const claimed = state.inscription === index;
          const wrong = state.failed && state.answered !== null && state.answered.includes(index);
          return (
            <li
              key={gate.id}
              className={`runemaster__gate${chosen ? ' is-chosen' : ''}${
                claimed ? ' is-claimed' : ''
              }${wrong ? ' is-wrong' : ''}${state.solved && chosen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="runemaster__arch"
                disabled={locked}
                aria-pressed={chosen}
                aria-label={`${gate.name} als Weg wählen`}
                onClick={() => pick('gate', index)}
              >
                <GateArt sigil={gate.sigil} />
                <span className="runemaster__gate-name">{gate.name}</span>
                <span className="runemaster__gate-state">
                  {chosen ? '① als Weg gewählt' : '① als Weg wählen'}
                </span>
              </button>

              <button
                type="button"
                className="runemaster__plaque"
                disabled={locked}
                aria-pressed={claimed}
                aria-label={`Inschrift des ${gate.name} für wahr erklären: ${gate.inscription}`}
                onClick={() => pick('inscription', index)}
              >
                <span className="runemaster__inscription">„{gate.inscription}“</span>
                <span className="runemaster__gate-state">
                  {claimed ? '② als einzig wahr benannt' : '② für wahr erklären'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="runemaster__verdict">
        {settled ? null : confirming ? (
          <div className="runemaster__confirm" role="alertdialog" aria-label="Antwort abgeben">
            <p className="runemaster__confirm-text">
              <strong>Seid ihr sicher?</strong> Der Runenmeister fragt nur einmal. Eine falsche
              Angabe beendet das Abenteuer.
            </p>
            <div className="runemaster__confirm-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  sound.play('click');
                  setConfirming(false);
                }}
              >
                Noch einmal nachdenken
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  sound.play('clunk');
                  setConfirming(false);
                  onAction({ type: 'attempt' });
                }}
              >
                Ja – durchschreiten
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--large"
            disabled={locked || !ready}
            onClick={() => {
              sound.play('click');
              setConfirming(true);
            }}
          >
            {buttonLabel}
          </button>
        )}
      </div>

      <p className="puzzle__status" role="status" aria-live="polite">
        {state.solved
          ? 'Der Stein gibt nach. Der Weg ist frei.'
          : state.failed
            ? 'Der Stein schliesst sich. Es gab nur diesen einen Versuch.'
            : ready
              ? 'Tor und Inschrift benannt. Der Runenmeister wartet auf euer Wort.'
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
