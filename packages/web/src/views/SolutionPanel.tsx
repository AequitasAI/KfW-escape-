import { useMemo, useState } from 'react';
import {
  ARCHIVE_SOLUTION,
  DIFF_COUNT,
  DIFF_HOTSPOTS,
  GATE_SOLUTION,
  GEAR_LABELS,
  GEAR_SOLUTION,
  RUNE_GATES,
  RUNE_MASTER_SOLUTION,
  RUNES,
  solveCable,
} from '@kfw-escape/shared';
import type { PuzzleStateUnion } from '@kfw-escape/shared';

/**
 * Die Lösung der laufenden Prüfung - für die Spielleitung und für die Demo.
 *
 * Nimmt den Rätselzustand statt eines Snapshots entgegen: Die Demo läuft ohne
 * Session, hat also keinen Snapshot, braucht die Lösung beim Testen aber genauso.
 *
 * Bewusst eingeklappt: Wer sie braucht, klappt sie auf; wer über die Schulter
 * schaut, sieht sie nicht. Für das Kabelrätsel steht keine feste Lösung im
 * Code - der Weg hängt vom aktuellen Brett ab und wird deshalb live aus dem
 * Zustand berechnet, damit auch nach ein paar Zügen der richtige nächste Zug
 * dasteht.
 */
export function SolutionPanel({ state }: { state: PuzzleStateUnion | null }): JSX.Element | null {
  const [open, setOpen] = useState(false);

  /*
   * Der Kabelweg wird gesucht, nicht nachgeschlagen. Die Ansicht rendert im
   * Sekundentakt neu (Uhr), deshalb hängt die Suche am Brett und nicht am
   * Render - und läuft nur, wenn jemand die Lösung wirklich aufklappt.
   */
  const boardKey = state?.kind === 'cable_labyrinth' ? state.board.join(',') : '';
  const cableMoves = useMemo(
    () =>
      open && state?.kind === 'cable_labyrinth'
        ? solveCable(state.board, { maxDepth: 18, maxNodes: 400_000 })
        : null,
    // boardKey steht stellvertretend für das Brett
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, boardKey],
  );

  if (!state) return null;

  return (
    <details className="host__solution" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Lösung dieser Prüfung</summary>
      <div className="host__solution-body">{open ? describe(state, cableMoves) : null}</div>
    </details>
  );
}

function describe(state: PuzzleStateUnion, cableMoves: number[] | null): JSX.Element {
  switch (state.kind) {
    case 'archive_runes': {
      const labels = ARCHIVE_SOLUTION.map(
        (id) => RUNES.find((rune) => rune.id === id)?.label ?? id,
      );
      return (
        <>
          <p className="field__label">Reihenfolge von links nach rechts</p>
          <ol className="host__solution-list">
            {labels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ol>
        </>
      );
    }

    case 'cable_labyrinth': {
      const moves = cableMoves;
      if (moves === null) {
        return (
          <p className="field__hint">
            Von hier aus wurde kein Weg gefunden. Wenn die Gruppe feststeckt: Prüfung überspringen.
          </p>
        );
      }
      if (moves.length === 0) return <p className="field__hint">Bereits gelöst.</p>;
      return (
        <>
          <p className="field__label">
            {moves.length === 1 ? 'Noch ein Zug' : `Noch ${moves.length} Züge`} – Feldnummern, oben
            links ist 1
          </p>
          <p className="host__solution-moves mono">{moves.map((index) => index + 1).join(' → ')}</p>
          <p className="field__hint">
            Auf das genannte Feld tippen; es rutscht in die freie Lücke. Die Liste rechnet sich nach
            jedem Zug neu.
          </p>
        </>
      );
    }

    case 'testmasters_diff': {
      const open = DIFF_HOTSPOTS.filter((spot) => !state.found.includes(spot.id));
      return (
        <>
          <p className="field__label">
            {open.length === 0 ? 'Alle gefunden' : `Noch offen: ${open.length} von ${DIFF_COUNT}`}
          </p>
          <ul className="host__solution-list">
            {open.map((spot) => (
              <li key={spot.id}>
                <strong>{spot.label}</strong> (Prüffeld {spot.field}) – Urfassung {spot.left},
                Prüfexemplar {spot.right}
              </li>
            ))}
          </ul>
          <p className="field__hint">
            Getippt wird auf die Stelle selbst; die Felder sind grosszügig. Es zählt auf beiden
            Plänen.
          </p>
        </>
      );
    }

    case 'operations_gears': {
      return (
        <>
          <p className="field__label">Stellung jedes Rades (1 = Grundstellung)</p>
          <ul className="host__solution-list">
            {GEAR_SOLUTION.map((orientation, index) => (
              <li key={index}>
                <strong>{GEAR_LABELS[index] ?? `Rad ${index + 1}`}</strong>: Stellung{' '}
                {orientation + 1}
                {index === 0 ? ' (fest verbaut)' : ''}
                {state.orientations[index] === orientation ? ' ✓' : ''}
              </li>
            ))}
          </ul>
          <p className="field__hint">
            Jeder Klick auf ein Rad dreht es eine Stellung weiter. Häkchen heisst: steht schon
            richtig.
          </p>
        </>
      );
    }

    case 'rune_master': {
      const gate = RUNE_GATES[RUNE_MASTER_SOLUTION.gate];
      const inscription = RUNE_GATES[RUNE_MASTER_SOLUTION.inscription];
      return (
        <>
          <p className="field__label">Weg und wahre Inschrift</p>
          <ul className="host__solution-list">
            <li>
              Weg: <strong>{gate?.name}</strong>
              {state.gate === RUNE_MASTER_SOLUTION.gate ? ' ✓' : ''}
            </li>
            <li>
              Einzig wahre Inschrift: <strong>{inscription?.name}</strong>
              {state.inscription === RUNE_MASTER_SOLUTION.inscription ? ' ✓' : ''}
            </li>
          </ul>
          <p className="field__hint">
            Nimmt man jedes Tor einmal als den Weg an, ist nur in einem Fall genau eine Inschrift
            wahr. Beides muss benannt sein, dann öffnet der Stein.
          </p>
        </>
      );
    }

    case 'black_gate_code':
      return (
        <>
          <p className="field__label">Code</p>
          <p className="host__solution-code mono">{GATE_SOLUTION}</p>
          <p className="field__hint">Führende Null gehört dazu.</p>
        </>
      );

    default:
      return <p className="field__hint">Für diese Prüfung liegt keine Lösung vor.</p>;
  }
}
