import type { PuzzleAction, PuzzleStateUnion } from '@kfw-escape/shared';
import { ArchiveRunes } from './ArchiveRunes.js';
import { CableLabyrinth } from './CableLabyrinth.js';
import { TestmastersDiff } from './TestmastersDiff.js';
import { OperationsGears } from './OperationsGears.js';
import { BlackGate } from './BlackGate.js';
import { RuneMaster } from './RuneMaster.js';
import type { PuzzleSurface } from './types.js';
import './puzzles.css';

/**
 * Renders whichever trial the server says is active. Every view (player, host,
 * display) mounts the same component with the same state, only `interactive`
 * differs - and that flag is convenience, not authorisation.
 */
export function PuzzleHost({
  state,
  interactive,
  onAction,
  size = 'compact',
}: {
  state: PuzzleStateUnion | null;
  interactive: boolean;
  onAction: (action: PuzzleAction) => void;
  size?: PuzzleSurface;
}): JSX.Element | null {
  if (!state) return null;

  switch (state.kind) {
    case 'archive_runes':
      return <ArchiveRunes state={state} interactive={interactive} onAction={onAction} size={size} />;
    case 'cable_labyrinth':
      return <CableLabyrinth state={state} interactive={interactive} onAction={onAction} size={size} />;
    case 'testmasters_diff':
      return <TestmastersDiff state={state} interactive={interactive} onAction={onAction} size={size} />;
    case 'operations_gears':
      return <OperationsGears state={state} interactive={interactive} onAction={onAction} size={size} />;
    case 'black_gate_code':
      return <BlackGate state={state} interactive={interactive} onAction={onAction} size={size} />;
    case 'rune_master':
      return <RuneMaster state={state} interactive={interactive} onAction={onAction} size={size} />;
    default:
      return null;
  }
}
