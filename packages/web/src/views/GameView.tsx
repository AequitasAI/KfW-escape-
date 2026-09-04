import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
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
  getAvatar,
  sealEarned,
} from '@kfw-escape/shared';
import type { SocketAuth } from '@kfw-escape/shared';
import {
  ConnectionPill,
  MuteButton,
  ProgressTrail,
  SealRow,
  SolverBanner,
  SolverReveal,
  Timer,
} from '../components/Chrome.js';
import { Avatar } from '../components/Avatar.js';
import { PuzzleHost } from '../puzzles/PuzzleHost.js';
import { SCENE_BY_PUZZLE, Scene, type SceneId } from '../scenes/Scene.js';
import { loadIdentity } from '../lib/identity.js';
import { sound } from '../lib/sound.js';
import { useSession } from '../lib/useSession.js';
import { formatClock } from '../lib/useServerClock.js';
import './views.css';

export function GameView(): JSX.Element {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const normalized = code.toUpperCase();
  const identity = useMemo(() => loadIdentity(normalized), [normalized]);

  const auth: SocketAuth | null = identity
    ? {
        code: normalized,
        role: 'player',
        playerId: identity.playerId,
        playerToken: identity.playerToken,
      }
    : null;

  const channel = useSession(auth);
  const { snapshot, solverReveal, solvedFlash } = channel;
  const [revealShown, setRevealShown] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) navigate(`/join/${normalized}`, { replace: true });
  }, [identity, navigate, normalized]);

  // the reveal is informational and self-dismissing, it never blocks input
  useEffect(() => {
    if (solverReveal) setRevealShown(solverReveal.candidateName);
  }, [solverReveal]);

  // a room change always ends the reveal, whatever its own timer is doing
  const phase = channel.snapshot?.status;
  useEffect(() => {
    if (phase !== 'PUZZLE_ACTIVE') setRevealShown(null);
  }, [phase]);

  useEffect(() => {
    if (solvedFlash) sound.play('seal');
  }, [solvedFlash]);

  if (!identity) return <div className="view" />;

  if (channel.error) {
    return (
      <Scene id="lobby">
        <main className="view view--centered">
          <section className="panel" style={{ maxWidth: '30rem' }}>
            <div className="panel__body stack">
              <p className="notice notice--error" role="alert">
                {channel.error}
              </p>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => navigate(`/join/${normalized}`)}
              >
                Erneut beitreten
              </button>
            </div>
          </section>
        </main>
      </Scene>
    );
  }

  if (!snapshot) {
    return (
      <Scene id="lobby">
        <main className="view view--centered">
          <p className="chip chip--live">Verbinde mit der Reisegruppe …</p>
        </main>
      </Scene>
    );
  }

  const me = snapshot.players.find((player) => player.id === identity.playerId);
  const isCandidate = snapshot.solver.candidateId === identity.playerId;
  const isSolver = snapshot.solver.solverId === identity.playerId;
  const puzzle = PUZZLES[snapshot.currentPuzzleIndex];
  const scene: SceneId =
    snapshot.status === 'WON'
      ? 'bridge'
      : snapshot.status === 'LOST'
        ? 'defeat'
        : snapshot.status === 'FINALE'
          ? 'bridge'
          : snapshot.status === 'LOBBY' || snapshot.status === 'INTRO'
            ? 'lobby'
            : (SCENE_BY_PUZZLE[snapshot.currentPuzzleIndex] ?? 'lobby');

  return (
    <Scene id={scene} className="scene--player">
      <a className="skip-link" href="#puzzle">
        Direkt zur Prüfung
      </a>

      <div className="game">
        <header className="game__bar">
          <div className="game__bar-left">
            <ProgressTrail
              puzzles={snapshot.puzzles}
              currentIndex={snapshot.currentPuzzleIndex}
              size="small"
            />
          </div>
          <div className="game__bar-right">
            <ConnectionPill state={channel.connection} />
            <MuteButton />
            <Timer timer={snapshot.timer} />
          </div>
        </header>

        <main className="game__main" id="puzzle">
          {snapshot.status === 'LOBBY' ? (
            <Lobby
              snapshot={snapshot}
              myName={me?.displayName ?? identity.displayName}
              myAvatar={me?.avatar}
              channel={channel}
            />
          ) : null}

          {snapshot.status === 'INTRO' ? <Intro /> : null}

          {snapshot.status === 'PAUSED' ? (
            <section className="stage stage--message">
              <h2 className="stage__title">Pause</h2>
              <p className="stage__text">Die Spielleitung hat das Abenteuer angehalten. Die Zeit steht.</p>
            </section>
          ) : null}

          {snapshot.status === 'TRANSITION' ? (
            <section className="stage stage--message">
              <SealRow count={snapshot.seals} />
              <h2 className="stage__title">
                {PUZZLES[Math.max(0, snapshot.currentPuzzleIndex)]?.successLine}
              </h2>
              <p className="stage__seal-name">{sealEarned(snapshot.currentPuzzleIndex)}</p>
              <p className="stage__text">Die nächste Prüfung öffnet sich …</p>
            </section>
          ) : null}

          {snapshot.status === 'FINALE' ? (
            <section className="stage stage--message">
              <SealRow count={5} />
              <h2 className="stage__title">{FINALE_LINE}</h2>
            </section>
          ) : null}

          {snapshot.status === 'PUZZLE_ACTIVE' && puzzle ? (
            <section className="stage">
              <header className="stage__head">
                <p className="stage__station">{puzzle.station}</p>
                <h2 className="stage__title">{puzzle.title}</h2>
                <p className="stage__atmosphere">{puzzle.atmosphere}</p>
                <p className="stage__task">{puzzle.task}</p>
              </header>

              {snapshot.hintText ? (
                <p className="stage__hint">
                  <strong>Hinweis:</strong> {snapshot.hintText}
                </p>
              ) : null}

              <div className={`stage__puzzle${isSolver ? '' : ' is-observing'}`}>
                <PuzzleHost
                  state={snapshot.puzzleState}
                  interactive={isSolver}
                  onAction={channel.sendAction}
                />
              </div>

              {!isSolver && !isCandidate ? (
                <p className="stage__observer">
                  Du siehst alles live mit. Nur der Gefährte kann bedienen – redet miteinander.
                </p>
              ) : null}

              {channel.lastRejection && (isSolver || isCandidate) ? (
                <p className="notice notice--error stage__reject" role="alert">
                  {channel.lastRejection.message}
                </p>
              ) : null}
            </section>
          ) : null}

          {snapshot.status === 'WON' || snapshot.status === 'LOST' ? (
            <EndScreen snapshot={snapshot} />
          ) : null}
        </main>

        {snapshot.status === 'PUZZLE_ACTIVE' ? (
          <footer className="game__foot">
            <SolverBanner
              solver={snapshot.solver}
              avatar={
                snapshot.players.find(
                  (p) => p.id === (snapshot.solver.solverId ?? snapshot.solver.candidateId),
                )?.avatar
              }
            >
              {isCandidate ? (
                <>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                      sound.play('rune');
                      channel.emit('solver:accept');
                    }}
                  >
                    Prüfung annehmen
                  </button>
                  {snapshot.players.filter((p) => p.connected).length > 1 ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        sound.play('click');
                        channel.emit('solver:decline');
                      }}
                    >
                      An anderen Gefährten weitergeben
                    </button>
                  ) : (
                    /* allein unterwegs: ein Knopf, der niemanden findet, wirkt kaputt */
                    <span className="field__hint">Du bist gerade allein unterwegs.</span>
                  )}
                </>
              ) : null}
              {isSolver && snapshot.hintAvailable ? (
                <button type="button" className="btn" onClick={() => channel.emit('hint:request')}>
                  Hinweis anfordern
                </button>
              ) : null}
            </SolverBanner>
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

/* ------------------------------------------------------------------ */

function Lobby({
  snapshot,
  myName,
  myAvatar,
  channel,
}: {
  snapshot: NonNullable<ReturnType<typeof useSession>['snapshot']>;
  myName: string;
  /** undefined for the moment between joining and the first snapshot */
  myAvatar?: number | undefined;
  channel: ReturnType<typeof useSession>;
}): JSX.Element {
  const [name, setName] = useState(myName);
  const [saved, setSaved] = useState(false);

  useEffect(() => setName(myName), [myName]);

  return (
    <section className="stage stage--lobby">
      <header className="stage__head">
        <p className="stage__station">{GAME_TITLE}</p>
        <h2 className="stage__title">Die Reisegruppe versammelt sich</h2>
        <p className="stage__task">{companionsGathered(snapshot.players.length)}</p>
        {typeof myAvatar === 'number' ? (
          <p className="lobby__sigil">
            <Avatar id={myAvatar} size="md" title={false} />
            <span>
              Dein Zeichen: <strong>{getAvatar(myAvatar).name}</strong>
            </span>
          </p>
        ) : null}
      </header>

      <ul className="roster" aria-label="Anwesende Gefährten">
        {snapshot.players.map((player) => (
          <li key={player.id} className={`roster__item${player.connected ? '' : ' is-away'}`}>
            <Avatar id={player.avatar} />
            <span className="roster__dot" aria-hidden="true" />
            {player.displayName}
            {!player.connected ? <span className="roster__away"> (offline)</span> : null}
          </li>
        ))}
      </ul>

      <form
        className="lobby__rename"
        onSubmit={(event) => {
          event.preventDefault();
          channel.emit('player:rename', { displayName: name });
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2000);
        }}
      >
        <label className="field">
          <span className="field__label">Anzeigename ändern (bis zum Start möglich)</span>
          <div className="row">
            <input
              className="field__input"
              value={name}
              maxLength={24}
              onChange={(event) => setName(event.target.value)}
            />
            <button type="submit" className="btn">
              Speichern
            </button>
          </div>
        </label>
        {saved ? <p className="field__hint">Gespeichert.</p> : null}
      </form>

      <p className="stage__observer">Wartet auf das Zeichen der Spielleitung.</p>
    </section>
  );
}

function Intro(): JSX.Element {
  return (
    <section className="stage stage--intro">
      {INTRO_LINES.map((line, index) => (
        <p key={line} className="intro__line" style={{ animationDelay: `${index * 420}ms` }}>
          {line}
        </p>
      ))}
      <p
        className="intro__wait"
        style={{ animationDelay: `${INTRO_LINES.length * 420 + 200}ms` }}
      >
        {INTRO_WAIT_LINE}
      </p>
    </section>
  );
}

function EndScreen({
  snapshot,
}: {
  snapshot: NonNullable<ReturnType<typeof useSession>['snapshot']>;
}): JSX.Element {
  const won = snapshot.status === 'WON';
  const lines = won ? WIN_LINES : LOSE_LINES;
  const result = snapshot.result;

  useEffect(() => {
    sound.play(won ? 'finale' : 'fail');
  }, [won]);

  return (
    <section className={`stage stage--end ${won ? 'is-win' : 'is-loss'}`}>
      <SealRow count={won ? 5 : (result?.solvedCount ?? 0) + (result?.skippedCount ?? 0)} />
      <h2 className="end__headline">{lines[0]}</h2>
      {lines.slice(1).map((line, index) => (
        <p key={line} className="end__line" style={{ animationDelay: `${(index + 1) * 260}ms` }}>
          {line}
        </p>
      ))}

      {result ? (
        <dl className="end__stats">
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
          <div>
            <dt>Prüfungen gelöst</dt>
            <dd>
              {result.solvedCount}
              {result.skippedCount > 0 ? ` (+${result.skippedCount} übersprungen)` : ''}
            </dd>
          </div>
        </dl>
      ) : null}

      <p className="end__footnote">{won ? WIN_FOOTNOTE : LOSE_FOOTNOTE}</p>
      {!won ? <p className="end__gag">{LOSE_GAG}</p> : null}
    </section>
  );
}
