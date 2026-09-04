import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  dwarfIdleLine,
  FINALE_LINE,
  GAME_TITLE,
  INTRO_LINES,
  INTRO_WAIT_LINE,
  LOSE_FOOTNOTE,
  LOSE_GAG,
  LOSE_LINES,
  PUZZLES,
  WIN_FOOTNOTE,
  WIN_LINES,
  companionsGathered,
  sealEarned,
} from '@kfw-escape/shared';
import type { SocketAuth } from '@kfw-escape/shared';
import { Avatar } from '../components/Avatar.js';
import { ProgressTrail, SealRow, SolverBanner, SolverReveal, Timer, Dwarf } from '../components/Chrome.js';
import { PuzzleHost } from '../puzzles/PuzzleHost.js';
import { SCENE_BY_PUZZLE, Scene, type SceneId } from '../scenes/Scene.js';
import { api } from '../lib/api.js';
import { useSession } from '../lib/useSession.js';
import { formatClock } from '../lib/useServerClock.js';
import './views.css';

/**
 * Big screen / Teams screenshare view.
 *
 * Deliberately contains no admin control, no debug output and no raw state:
 * only title, station, progress, timer, the puzzle itself, the companion's name
 * and short status copy (10_design/DISPLAY_SCREEN_REQUIREMENTS.md).
 */
export function DisplayView(): JSX.Element {
  const { code = '' } = useParams();
  const normalized = code.toUpperCase();

  const auth: SocketAuth = { code: normalized, role: 'display' };
  const channel = useSession(auth);
  const { snapshot, solverReveal } = channel;
  const [revealShown, setRevealShown] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string>('');

  useEffect(() => {
    if (solverReveal) setRevealShown(solverReveal.candidateName);
  }, [solverReveal]);

  // a room change always ends the reveal, whatever its own timer is doing
  const phase = channel.snapshot?.status;
  useEffect(() => {
    if (phase !== 'PUZZLE_ACTIVE') setRevealShown(null);
  }, [phase]);

  useEffect(() => {
    void api
      .getSession(normalized)
      .then((session) => setJoinUrl(session.joinUrl))
      .catch(() => setJoinUrl(''));
  }, [normalized]);

  if (channel.error || !snapshot) {
    return (
      <Scene id="lobby">
        <main className="display display--empty">
          <h1 className="display__title">{GAME_TITLE}</h1>
          <p className="display__lead">{channel.error ?? 'Verbindung wird aufgebaut …'}</p>
        </main>
      </Scene>
    );
  }

  const puzzle = PUZZLES[snapshot.currentPuzzleIndex];
  const scene: SceneId =
    snapshot.status === 'WON' || snapshot.status === 'FINALE'
      ? 'bridge'
      : snapshot.status === 'LOST'
        ? 'defeat'
        : snapshot.status === 'LOBBY' || snapshot.status === 'INTRO'
          ? 'lobby'
          : (SCENE_BY_PUZZLE[snapshot.currentPuzzleIndex] ?? 'lobby');

  return (
    <Scene id={scene} className="scene--display">
      <div className="display">
        <header className="display__top">
          <div className="display__top-center">
            <h1 className="display__title">{GAME_TITLE}</h1>
            <ProgressTrail
              puzzles={snapshot.puzzles}
              currentIndex={snapshot.currentPuzzleIndex}
              size="large"
            />
          </div>
          <div className="display__top-right">
            <Timer timer={snapshot.timer} size="large" />
          </div>
        </header>

        <main className="display__stage">
          {snapshot.status === 'LOBBY' ? (
            <div className="display__lobby">
              <div className="display__lobby-text">
                <h2 className="display__headline">Die Reisegruppe versammelt sich</h2>
                <p className="display__lead">{companionsGathered(snapshot.players.length)}</p>
                <p className="display__code-label">Sessioncode</p>
                <p className="display__code mono">{snapshot.code}</p>
                <ul className="display__roster">
                  {snapshot.players.map((player) => (
                    <li key={player.id} className="display__roster-item">
                      <Avatar id={player.avatar} />
                      {player.displayName}
                    </li>
                  ))}
                </ul>
              </div>
              <figure className="display__qr">
                <img src={api.qrUrl(normalized)} alt={`QR-Code zum Beitreten: ${joinUrl}`} />
                <figcaption>{joinUrl || `…/join/${normalized}`}</figcaption>
              </figure>
            </div>
          ) : null}

          {snapshot.status === 'INTRO' ? (
            <div className="display__intro">
              {INTRO_LINES.map((line, index) => (
                <p key={line} className="intro__line" style={{ animationDelay: `${index * 500}ms` }}>
                  {line}
                </p>
              ))}
              <p
                className="intro__wait"
                style={{ animationDelay: `${INTRO_LINES.length * 500 + 200}ms` }}
              >
                {INTRO_WAIT_LINE}
              </p>
            </div>
          ) : null}

          {snapshot.status === 'PAUSED' ? (
            <div className="display__message">
              <h2 className="display__headline">Pause</h2>
              <p className="display__lead">Das Abenteuer ist angehalten. Die Zeit steht still.</p>
            </div>
          ) : null}

          {snapshot.status === 'TRANSITION' ? (
            <div className="display__message">
              <SealRow count={snapshot.seals} />
              <h2 className="display__headline">{PUZZLES[snapshot.currentPuzzleIndex]?.successLine}</h2>
              <p className="display__seal-name">{sealEarned(snapshot.currentPuzzleIndex)}</p>
              <p className="display__lead">Der Weg zur nächsten Prüfung öffnet sich …</p>
            </div>
          ) : null}

          {snapshot.status === 'FINALE' ? (
            <div className="display__message display__message--finale">
              <SealRow count={5} />
              <h2 className="display__headline">{FINALE_LINE}</h2>
            </div>
          ) : null}

          {snapshot.status === 'PUZZLE_ACTIVE' && puzzle ? (
            <div className="display__room">
              <div className="display__room-head">
                <span className="display__station-badge">{puzzle.station}</span>
                <h2 className="display__room-title">{puzzle.title}</h2>
                <p className="display__atmosphere">{puzzle.atmosphere}</p>
                <p className="display__lead">{puzzle.task}</p>
              </div>

              <div className="display__puzzle">
                <PuzzleHost
                  state={snapshot.puzzleState}
                  interactive={false}
                  onAction={() => undefined}
                  size="wide"
                />
              </div>

              {snapshot.hintText ? (
                <p className="display__hint">
                  <strong>Hinweis:</strong> {snapshot.hintText}
                </p>
              ) : null}
            </div>
          ) : null}

          {snapshot.status === 'WON' || snapshot.status === 'LOST' ? (
            <DisplayEnd snapshot={snapshot} />
          ) : null}
        </main>

        {snapshot.status === 'PUZZLE_ACTIVE' ? (
          <footer className="display__foot">
            <SolverBanner
              solver={snapshot.solver}
              avatar={
                snapshot.players.find(
                  (p) => p.id === (snapshot.solver.solverId ?? snapshot.solver.candidateId),
                )?.avatar
              }
              variant="display"
            />
            {snapshot.currentPuzzleIndex !== 3 ? (
              <div className="display__aside">
                <SealRow count={snapshot.seals} />
              </div>
            ) : (
              <div className="display__aside">
                <Dwarf line={dwarfIdleLine(0)} mood="neutral" />
              </div>
            )}
          </footer>
        ) : null}
      </div>

      {revealShown ? <SolverReveal
          name={revealShown}
          avatar={snapshot.players.find((p) => p.id === snapshot.solver.candidateId)?.avatar}
          onDone={() => setRevealShown(null)}
        /> : null}
    </Scene>
  );
}

function DisplayEnd({
  snapshot,
}: {
  snapshot: NonNullable<ReturnType<typeof useSession>['snapshot']>;
}): JSX.Element {
  const won = snapshot.status === 'WON';
  const lines = won ? WIN_LINES : LOSE_LINES;
  const result = snapshot.result;

  return (
    <div className={`display__end ${won ? 'is-win' : 'is-loss'}`}>
      <SealRow count={won ? 5 : (result?.solvedCount ?? 0) + (result?.skippedCount ?? 0)} />
      <h2 className="display__end-headline">{lines[0]}</h2>
      {lines.slice(1).map((line, index) => (
        <p key={line} className="display__end-line" style={{ animationDelay: `${(index + 1) * 320}ms` }}>
          {line}
        </p>
      ))}
      {result ? (
        <dl className="display__end-stats">
          <div>
            <dt>Restzeit</dt>
            <dd className="mono">{formatClock(result.remainingMs)}</dd>
          </div>
          <div>
            <dt>Gefährten</dt>
            <dd>{result.playerCount}</dd>
          </div>
          <div>
            <dt>Hinweise</dt>
            <dd>{result.hintsUsed}</dd>
          </div>
        </dl>
      ) : null}
      <p className="display__end-footnote">{won ? WIN_FOOTNOTE : LOSE_FOOTNOTE}</p>
      {!won ? <p className="display__end-gag">{LOSE_GAG}</p> : null}
    </div>
  );
}
