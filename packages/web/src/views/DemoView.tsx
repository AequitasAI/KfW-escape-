import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PUZZLES, createPuzzleState, reducePuzzle } from '@kfw-escape/shared';
import type { PuzzleAction, PuzzleMetaView, PuzzleStateUnion } from '@kfw-escape/shared';
import { MuteButton, ProgressTrail } from '../components/Chrome.js';
import { PuzzleHost } from '../puzzles/PuzzleHost.js';
import { SCENE_BY_PUZZLE, Scene, type SceneId } from '../scenes/Scene.js';
import { SolutionPanel } from './SolutionPanel.js';
import { sound } from '../lib/sound.js';
import './views.css';

/**
 * Übungsraum: alle fünf Prüfungen einzeln durchspielen, ohne Session, ohne
 * Spielleitung, ohne Gefährten.
 *
 * Der Trick ist, dass hier nichts nachgebaut wird. Die Rätsellogik liegt in
 * `@kfw-escape/shared` und ist reines `createPuzzleState` / `reducePuzzle` -
 * derselbe Code, den der Server im echten Spiel fährt. Die Demo hält diesen
 * Zustand einfach im Browser statt in einer Session. Damit kann der Übungsraum
 * gar nicht auseinanderlaufen: Wer hier ein Rätsel löst, löst es genau so wie
 * am Spieleabend, nur eben allein und ohne Uhr.
 *
 * Kein Server, keine Anmeldung, kein Socket - deshalb ist die Route auch ohne
 * Code erreichbar und stört den echten Betrieb nicht.
 */
export function DemoView(): JSX.Element {
  const params = useParams();
  const navigate = useNavigate();

  const index = clampStation(params.station);
  const puzzle = PUZZLES[index];

  const [state, setState] = useState<PuzzleStateUnion>(() => createPuzzleState(PUZZLES[index]!.id));
  const [hintOpen, setHintOpen] = useState(false);
  const [solvedIds, setSolvedIds] = useState<readonly string[]>([]);

  /*
   * Beim Wechsel der Station wird frisch aufgebaut. Die Kennung steht in der
   * URL, deshalb reicht ein Effekt auf ihr - Reload, Zurück-Taste und die
   * Stationsknöpfe landen alle im selben Zweig.
   */
  const puzzleId = puzzle?.id;
  useEffect(() => {
    if (!puzzleId) return;
    setState(createPuzzleState(puzzleId));
    setHintOpen(false);
  }, [puzzleId]);

  useEffect(() => {
    if (!state.solved || !puzzleId) return;
    sound.play('seal');
    setSolvedIds((current) => (current.includes(puzzleId) ? current : [...current, puzzleId]));
  }, [state.solved, puzzleId]);

  const onAction = useCallback((action: PuzzleAction) => {
    // Ungültige Züge geben null zurück - im echten Spiel eine Ablehnung vom
    // Server, hier schlicht ein Zug, der nichts verändert.
    setState((current) => reducePuzzle(current, action, Date.now()) ?? current);
  }, []);

  const trail: PuzzleMetaView[] = useMemo(
    () =>
      PUZZLES.map((entry) => ({
        index: entry.index,
        id: entry.id,
        station: entry.station,
        title: entry.title,
        status: solvedIds.includes(entry.id) ? 'SOLVED' : 'ACTIVE',
      })),
    [solvedIds],
  );

  if (!puzzle) return <Scene id="lobby" />;

  const scene: SceneId = SCENE_BY_PUZZLE[index] ?? 'lobby';
  const isLast = index === PUZZLES.length - 1;

  return (
    <Scene id={scene} className="scene--player">
      <a className="skip-link" href="#puzzle">
        Direkt zur Prüfung
      </a>

      <div className="game">
        <header className="game__bar">
          <div className="game__bar-left">
            <ProgressTrail puzzles={trail} currentIndex={index} size="small" />
          </div>
          <div className="game__bar-right">
            <span className="chip demo__badge">Übungsraum</span>
            <MuteButton />
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/')}>
              Zurück
            </button>
          </div>
        </header>

        <main className="game__main" id="puzzle">
          <section className="stage">
            <header className="stage__head">
              <p className="stage__station">{puzzle.station}</p>
              <h2 className="stage__title">{puzzle.title}</h2>
              <p className="stage__atmosphere">{puzzle.atmosphere}</p>
              <p className="stage__task">{puzzle.task}</p>
            </header>

            {hintOpen ? (
              <p className="stage__hint">
                <strong>Hinweis:</strong> {puzzle.hint}
              </p>
            ) : null}

            <div className="stage__puzzle">
              <PuzzleHost state={state} interactive onAction={onAction} />
            </div>

            {state.solved ? (
              <p className="stage__solved demo__solved" role="status">
                {puzzle.successLine}
              </p>
            ) : null}
          </section>
        </main>

        <footer className="game__foot demo__foot">
          <div className="demo__actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                sound.play('click');
                setState(createPuzzleState(puzzle.id));
              }}
            >
              Prüfung zurücksetzen
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setHintOpen((open) => !open)}
              aria-expanded={hintOpen}
            >
              {hintOpen ? 'Hinweis verbergen' : 'Hinweis zeigen'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={index === 0}
              onClick={() => navigate(`/demo/${index}`)}
            >
              Vorherige Prüfung
            </button>
            <button
              type="button"
              className={`btn${state.solved && !isLast ? ' btn--primary' : ''}`}
              disabled={isLast}
              onClick={() => navigate(`/demo/${index + 2}`)}
            >
              Nächste Prüfung
            </button>
          </div>

          <nav className="demo__stations" aria-label="Prüfung wählen">
            {PUZZLES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`chip demo__station${entry.index === index ? ' is-current' : ''}`}
                aria-current={entry.index === index ? 'true' : undefined}
                onClick={() => navigate(`/demo/${entry.index + 1}`)}
              >
                {entry.index + 1}. {entry.title}
                {solvedIds.includes(entry.id) ? ' ✓' : ''}
              </button>
            ))}
          </nav>

          <SolutionPanel state={state} />

          <p className="field__hint demo__note">
            Übungsraum: keine Session, keine Spielleitung, keine Uhr. Gespielt wird dieselbe
            Rätsellogik wie im echten Abenteuer, der Fortschritt bleibt aber nur in diesem Tab.
          </p>
        </footer>
      </div>
    </Scene>
  );
}

/** Stationsnummer aus der URL: 1..5, alles andere landet auf der ersten. */
function clampStation(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 1), PUZZLES.length) - 1;
}
