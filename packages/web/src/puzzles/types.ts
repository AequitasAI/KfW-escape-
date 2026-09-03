import type { PuzzleAction, PuzzleStateUnion } from '@kfw-escape/shared';

export type PuzzleSurface = 'compact' | 'wide';

export interface PuzzleProps<S extends PuzzleStateUnion> {
  state: S;
  /** true only for the accepted solver; the server enforces this independently */
  interactive: boolean;
  onAction: (action: PuzzleAction) => void;
  size: PuzzleSurface;
}
