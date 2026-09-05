import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GAME_TITLE, PUZZLES, companionsGathered } from '@kfw-escape/shared';
import type { SocketAuth } from '@kfw-escape/shared';
import { Avatar } from '../components/Avatar.js';
import { ConnectionPill, HandoverPicker, ProgressTrail, SealRow, Timer } from '../components/Chrome.js';
import { api, RequestError } from '../lib/api.js';
import type { HostSession, HostStatus } from '../lib/api.js';
import { loadHostSecret, rememberHostedCode, saveHostSecret } from '../lib/identity.js';
import { SolutionPanel } from './SolutionPanel.js';
import { useSession } from '../lib/useSession.js';
import { formatClock } from '../lib/useServerClock.js';
import './views.css';

const STATUS_LABEL: Record<string, string> = {
  LOBBY: 'Lobby',
  INTRO: 'Intro',
  PUZZLE_ACTIVE: 'Prüfung läuft',
  TRANSITION: 'Übergang',
  FINALE: 'Finale',
  WON: 'Gewonnen',
  LOST: 'Verloren',
  PAUSED: 'Pausiert',
};

export function HostView(): JSX.Element {
  const { code } = useParams();
  const navigate = useNavigate();
  const normalized = code?.toUpperCase() ?? '';

  const [secret, setSecret] = useState<string | null>(() =>
    normalized ? loadHostSecret(normalized) : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [pickSolver, setPickSolver] = useState(false);

  // null while the first probe is in flight - the shell must not flash a login
  const [hostStatus, setHostStatus] = useState<HostStatus | null>(null);
  const [sessions, setSessions] = useState<HostSession[]>([]);

  const refreshHostStatus = async (): Promise<HostStatus> => {
    const status = await api
      .hostStatus()
      .catch((): HostStatus => ({ loginEnabled: false, authenticated: false }));
    setHostStatus(status);
    return status;
  };

  useEffect(() => {
    void refreshHostStatus();
  }, []);

  useEffect(() => {
    if (!hostStatus?.authenticated || normalized) return;
    void api
      .hostSessions()
      .then((payload) => setSessions(payload.sessions))
      .catch(() => setSessions([]));
  }, [hostStatus?.authenticated, normalized]);

  /*
   * The whole point of the login: a session created on one device can be taken
   * over on another. Fetch its host secret once and keep it locally from there,
   * so a reload behaves exactly like the device-bound case.
   */
  useEffect(() => {
    if (!normalized || secret || !hostStatus?.authenticated) return;
    void api
      .hostSession(normalized)
      .then((session) => {
        saveHostSecret(session.code, session.hostSecret);
        rememberHostedCode(session.code);
        setSecret(session.hostSecret);
      })
      .catch(() => {
        /* not found or no longer authorised - the panels below explain it */
      });
  }, [normalized, secret, hostStatus?.authenticated]);

  const login = async (password: string): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await api.hostLogin(password);
      /*
       * The server accepted the password - but the session lives in a cookie,
       * and a cookie can still be dropped on the way into the browser. The
       * usual reason is an http:// page while COOKIE_SECURE is on: the login
       * succeeds, nothing is stored, and the form silently comes back as if
       * nothing had happened. Say what is going on instead.
       */
      const status = await refreshHostStatus();
      if (!status.authenticated) {
        setError(
          window.location.protocol === 'http:'
            ? 'Passwort korrekt, aber die Anmeldung konnte nicht gespeichert werden: Diese Seite ist über http:// geöffnet, und die Kennung wird nur über https:// gespeichert. Bitte die Adresse mit https:// aufrufen.'
            : 'Passwort korrekt, aber die Anmeldung konnte nicht gespeichert werden. Vermutlich blockiert der Browser Cookies für diese Seite.',
        );
      }
    } catch (err) {
      setError(err instanceof RequestError ? err.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async (): Promise<void> => {
    await api.hostLogout().catch(() => undefined);
    setSessions([]);
    await refreshHostStatus();
  };

  useEffect(() => {
    if (normalized) setSecret(loadHostSecret(normalized));
  }, [normalized]);

  useEffect(() => {
    if (!normalized) return;
    void api
      .getSession(normalized)
      .then((session) => setJoinUrl(session.joinUrl))
      .catch(() => setJoinUrl(''));
  }, [normalized]);

  const auth: SocketAuth | null = useMemo(
    () => (normalized && secret ? { code: normalized, role: 'host', hostSecret: secret } : null),
    [normalized, secret],
  );

  const channel = useSession(auth);
  const { snapshot } = channel;

  const create = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const session = await api.createSession();
      saveHostSecret(session.code, session.hostSecret);
      rememberHostedCode(session.code);
      navigate(`/host/${session.code}`);
    } catch (err) {
      setError(err instanceof RequestError ? err.message : 'Die Session konnte nicht erstellt werden.');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- login gate ---------------- */

  if (hostStatus === null) {
    return (
      <main className="view view--centered host-shell">
        {/* stable hook: the view does not yet know whether a login is configured */}
        <p className="field__hint host-boot">Einen Moment …</p>
      </main>
    );
  }

  if (hostStatus.loginEnabled && !hostStatus.authenticated) {
    return (
      <HostLogin
        busy={busy}
        error={error}
        code={normalized}
        onSubmit={(password) => void login(password)}
        onDisplay={normalized ? () => navigate(`/display/${normalized}`) : null}
      />
    );
  }

  /* ---------------- no code yet ---------------- */

  if (!normalized) {
    return (
      <main className="view view--centered host-shell">
        <section className="panel host-create">
          <div className="panel__body stack">
            <h1 className="host__title">Spielleitung</h1>
            <p className="field__hint">
              {hostStatus.loginEnabled
                ? `Angemeldet. Neue Session für ${GAME_TITLE} anlegen oder eine laufende übernehmen.`
                : `Erstellt eine neue Session für ${GAME_TITLE}. Die Kennung der Spielleitung bleibt nur in diesem Browser.`}
            </p>
            <button
              type="button"
              className="btn btn--primary btn--large btn--block"
              onClick={() => void create()}
              disabled={busy}
            >
              {busy ? 'Wird erstellt …' : 'Neue Session erstellen'}
            </button>
            {error ? (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            ) : null}

            {hostStatus.authenticated && sessions.length > 0 ? (
              <div className="stack">
                <p className="field__label">Laufende Sessions</p>
                <ul className="host__sessions">
                  {sessions.map((session) => (
                    <li key={session.code}>
                      <button
                        type="button"
                        className="btn btn--block host__session"
                        onClick={() => {
                          saveHostSecret(session.code, session.hostSecret);
                          rememberHostedCode(session.code);
                          navigate(`/host/${session.code}`);
                        }}
                      >
                        <span className="mono">{session.code}</span>
                        <span className="chip">{STATUS_LABEL[session.status] ?? session.status}</span>
                        <span className="field__hint">
                          {session.playerCount === 1
                            ? '1 Gefährte'
                            : `${session.playerCount} Gefährten`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hostStatus.authenticated ? (
              <button type="button" className="btn btn--block" onClick={() => void logout()}>
                Abmelden
              </button>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  /* ---------------- code, but no host secret in this browser ---------------- */

  if (!secret) {
    return (
      <main className="view view--centered host-shell">
        <section className="panel host-create">
          <div className="panel__body stack">
            <h1 className="host__title">Keine Spielleitungs-Kennung</h1>
            <p className="field__hint">
              {hostStatus.loginEnabled ? (
                <>
                  Die Session <strong className="mono">{normalized}</strong> gibt es nicht mehr, oder sie
                  wurde bereits beendet. Laufende Sessions stehen auf der Übersicht.
                </>
              ) : (
                <>
                  Für die Session <strong className="mono">{normalized}</strong> liegt in diesem Browser
                  keine Kennung. Ohne eingerichteten Login ist die Steuerung an das Gerät gebunden, auf
                  dem die Session erstellt wurde.
                </>
              )}
            </p>
            {hostStatus.loginEnabled ? (
              <button type="button" className="btn btn--block" onClick={() => navigate('/host')}>
                Zur Übersicht
              </button>
            ) : null}
            <button type="button" className="btn btn--primary btn--block" onClick={() => void create()}>
              Stattdessen neue Session erstellen
            </button>
            <button type="button" className="btn btn--block" onClick={() => navigate(`/display/${normalized}`)}>
              Großbildansicht dieser Session öffnen
            </button>
          </div>
        </section>
      </main>
    );
  }

  const displayUrl = `${window.location.origin}/display/${normalized}`;
  const canStart = snapshot?.status === 'LOBBY' && (snapshot?.players.length ?? 0) > 0;
  const paused = snapshot?.status === 'PAUSED';
  const finished = snapshot?.status === 'WON' || snapshot?.status === 'LOST';
  const inPuzzle = snapshot?.status === 'PUZZLE_ACTIVE';
  // Phasen, die auf ein Weiter warten statt auf eine Eingabe der Gruppe
  const waiting =
    snapshot?.status === 'INTRO' ||
    snapshot?.status === 'TRANSITION' ||
    snapshot?.status === 'FALSE_VICTORY' ||
    snapshot?.status === 'FINALE';

  return (
    <main className="view host-shell">
      <div className="host">
        <header className="host__head">
          <div>
            <p className="landing__eyebrow">Kontrollzentrum der Spielleitung</p>
            <h1 className="host__title">{GAME_TITLE}</h1>
          </div>
          <div className="row">
            <ConnectionPill state={channel.connection} />
            <span className={`chip${paused ? ' chip--warn' : ' chip--live'}`}>
              {STATUS_LABEL[snapshot?.status ?? ''] ?? '—'}
            </span>
            <Timer timer={snapshot?.timer} />
          </div>
        </header>

        {channel.error ? (
          <p className="notice notice--error" role="alert">
            {channel.error}
          </p>
        ) : null}

        <div className="host__grid">
          {/* ---------------- join ---------------- */}
          <section className="panel host__card">
            <div className="panel__head">
              <h2 className="panel__title">Beitritt</h2>
            </div>
            <div className="panel__body stack">
              <div className="host__code-row">
                <div>
                  <p className="field__label">Sessioncode</p>
                  <p className="host__code mono">{normalized}</p>
                </div>
                <figure className="host__qr">
                  <img src={api.qrUrl(normalized)} alt={`QR-Code zum Beitreten von Session ${normalized}`} />
                </figure>
              </div>
              <CopyRow label="Join-Link" value={joinUrl || `${window.location.origin}/join/${normalized}`} />
              <CopyRow label="Großbildansicht" value={displayUrl} />
              <a className="btn btn--block" href={`/display/${normalized}`} target="_blank" rel="noreferrer">
                Großbildansicht öffnen
              </a>
            </div>
          </section>

          {/* ---------------- controls ---------------- */}
          <section className="panel host__card">
            <div className="panel__head">
              <h2 className="panel__title">Steuerung</h2>
              <SealRow count={snapshot?.seals ?? 0} />
            </div>
            <div className="panel__body stack">
              {snapshot ? (
                <ProgressTrail puzzles={snapshot.puzzles} currentIndex={snapshot.currentPuzzleIndex} />
              ) : null}

              {snapshot ? (
                <SolutionPanel
                  state={snapshot.status === 'PUZZLE_ACTIVE' ? snapshot.puzzleState : null}
                />
              ) : null}

              <button
                type="button"
                className="btn btn--primary btn--large btn--block"
                disabled={!canStart}
                onClick={() => channel.emit('host:start')}
              >
                Abenteuer beginnen
              </button>
              {snapshot?.status === 'LOBBY' && snapshot.players.length === 0 ? (
                <p className="field__hint">Es hat noch niemand die Reisegruppe betreten.</p>
              ) : null}

              {waiting ? (
                <>
                  <button
                    type="button"
                    className="btn btn--primary btn--large btn--block"
                    onClick={() => channel.emit('host:continue')}
                  >
                    {snapshot?.status === 'INTRO'
                      ? 'Weiter zur ersten Prüfung'
                      : snapshot?.status === 'FALSE_VICTORY'
                        ? 'Weiter zur letzten Prüfung'
                        : 'Weiter'}
                  </button>
                  {snapshot?.status === 'INTRO' ? (
                    <p className="field__hint">
                      Lest den Vorspann in Ruhe vor – die Spieluhr läuft erst mit der ersten Prüfung.
                    </p>
                  ) : null}
                </>
              ) : null}

              <div className="host__buttons">
                <button
                  type="button"
                  className="btn"
                  disabled={!snapshot || snapshot.status === 'LOBBY' || finished}
                  onClick={() => channel.emit(paused ? 'host:resume' : 'host:pause')}
                >
                  {paused ? 'Fortsetzen' : 'Pausieren'}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!inPuzzle}
                  onClick={() => channel.emit('host:rerollSolver')}
                >
                  Gefährten neu ziehen
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!inPuzzle}
                  onClick={() => setPickSolver((open) => !open)}
                >
                  Gefährten auswählen
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!inPuzzle}
                  onClick={() => channel.emit('host:skipPuzzle')}
                >
                  Prüfung überspringen
                </button>
              </div>

              {inPuzzle && pickSolver && snapshot ? (
                <HandoverPicker
                  title="Prüfung übergeben an:"
                  players={snapshot.players}
                  excludeId={snapshot.solver.solverId ?? snapshot.solver.candidateId}
                  onPick={(playerId) => {
                    channel.emit('host:setSolver', { playerId });
                    setPickSolver(false);
                  }}
                  onRandom={() => {
                    channel.emit('host:rerollSolver');
                    setPickSolver(false);
                  }}
                  onCancel={() => setPickSolver(false)}
                />
              ) : null}

              <details className="host__danger">
                <summary>Notfalleingriffe</summary>
                <div className="stack host__danger-body">
                  <p className="field__hint">
                    Diese Eingriffe verändern den Spielverlauf sichtbar für alle. Nur im Notfall nutzen.
                  </p>
                  <div className="host__buttons">
                    <button
                      type="button"
                      className="btn btn--danger"
                      disabled={!snapshot || snapshot.status === 'LOBBY' || finished}
                      onClick={() => channel.emit('host:addTime')}
                    >
                      +30 Sekunden
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      disabled={!snapshot || finished || snapshot.status === 'LOBBY'}
                      onClick={() => channel.emit('host:end')}
                    >
                      Session beenden
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => {
                        if (confirmReset) {
                          channel.emit('host:reset');
                          setConfirmReset(false);
                        } else {
                          setConfirmReset(true);
                          window.setTimeout(() => setConfirmReset(false), 5000);
                        }
                      }}
                    >
                      {confirmReset ? 'Wirklich zurücksetzen?' : 'Session zurücksetzen'}
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </section>

          {/* ---------------- roster ---------------- */}
          <section className="panel host__card">
            <div className="panel__head">
              <h2 className="panel__title">Reisegruppe</h2>
              <span className="chip">{companionsGathered(snapshot?.players.length ?? 0)}</span>
            </div>
            <div className="panel__body">
              <ul className="host__roster">
                {(snapshot?.players ?? []).map((player) => (
                  <li key={player.id} className={`host__player${player.connected ? '' : ' is-away'}`}>
                    <span className="host__player-dot" aria-hidden="true" />
                    <Avatar id={player.avatar} />
                    <span className="host__player-name">{player.displayName}</span>
                    <span className="host__player-tags">
                      {player.isSolver ? <span className="chip chip--live">Gefährte</span> : null}
                      {player.isCandidate ? <span className="chip chip--warn">gefragt</span> : null}
                      {player.declinedCurrent ? <span className="chip">abgelehnt</span> : null}
                      <span className="chip">{player.solverCount}×</span>
                    </span>
                  </li>
                ))}
                {(snapshot?.players.length ?? 0) === 0 ? (
                  <li className="field__hint">Noch niemand beigetreten.</li>
                ) : null}
              </ul>
            </div>
          </section>

          {/* ---------------- technical status ---------------- */}
          <section className="panel host__card">
            <div className="panel__head">
              <h2 className="panel__title">Technischer Status</h2>
            </div>
            <div className="panel__body">
              <dl className="host__status">
                <div>
                  <dt>Verbindung</dt>
                  <dd>{channel.connection}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{snapshot?.status ?? '—'}</dd>
                </div>
                <div>
                  <dt>Aktuelle Prüfung</dt>
                  <dd>
                    {snapshot ? `${snapshot.currentPuzzleIndex + 1}/5 · ${PUZZLES[snapshot.currentPuzzleIndex]?.title ?? '—'}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Aktueller Gefährte</dt>
                  <dd className="host__solver">
                    {snapshot?.solver.solverName ?? snapshot?.solver.candidateName ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt>Restzeit</dt>
                  <dd className="mono">{formatClock(snapshot?.timer.remainingMs ?? 0)}</dd>
                </div>
                <div>
                  <dt>Verbunden</dt>
                  <dd>
                    {(snapshot?.players ?? []).filter((p) => p.connected).length}/
                    {snapshot?.players.length ?? 0}
                  </dd>
                </div>
                <div>
                  <dt>Hinweise genutzt</dt>
                  <dd>{snapshot?.hintsUsed ?? 0}</dd>
                </div>
                <div>
                  <dt>Design-Tokens</dt>
                  <dd>
                    <TokenSource />
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function CopyRow({ label, value }: { label: string; value: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="host__copy">
        <input className="field__input host__copy-input" value={value} readOnly aria-label={label} />
        <button
          type="button"
          className="btn"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(value)
              .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              })
              .catch(() => undefined);
          }}
        >
          {copied ? 'Kopiert' : 'Kopieren'}
        </button>
      </div>
    </div>
  );
}

/** Reads back which token layer is actually active, per the branding doc. */
function TokenSource(): JSX.Element {
  const [source, setSource] = useState('—');
  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--kfw-token-source')
      .trim()
      .replace(/['"]/g, '');
    setSource(value || 'unbekannt');
  }, []);
  return <span>{source === 'placeholder' ? 'Platzhalter (Contract)' : source}</span>;
}

/**
 * The one login in the whole game. Players never see it - they still join with
 * nothing but a display name. It exists so the game master can start and steer
 * a session from a different machine than the one that created it.
 */
function HostLogin({
  busy,
  error,
  code,
  onSubmit,
  onDisplay,
}: {
  busy: boolean;
  error: string | null;
  code: string;
  onSubmit: (password: string) => void;
  onDisplay: (() => void) | null;
}): JSX.Element {
  const [password, setPassword] = useState('');

  return (
    <main className="view view--centered host-shell">
      <section className="panel host-create">
        <form
          className="panel__body stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (password.trim().length > 0) onSubmit(password);
          }}
        >
          <h1 className="host__title">Anmeldung der Spielleitung</h1>
          <p className="field__hint">
            {code ? (
              <>
                Für die Steuerung von <strong className="mono">{code}</strong> ist eine Anmeldung nötig.
              </>
            ) : (
              'Nur die Spielleitung meldet sich an. Alle anderen betreten die Reisegruppe allein mit ihrem Namen.'
            )}
          </p>

          <label className="field">
            <span className="field__label">Passwort</span>
            <input
              className="field__input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              autoFocus
            />
          </label>

          <button
            type="submit"
            className="btn btn--primary btn--large btn--block"
            disabled={busy || password.trim().length === 0}
          >
            {busy ? 'Wird geprüft …' : 'Anmelden'}
          </button>

          {error ? (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          ) : null}

          {onDisplay ? (
            <button type="button" className="btn btn--block" onClick={onDisplay}>
              Nur die Großbildansicht öffnen
            </button>
          ) : null}
        </form>
      </section>
    </main>
  );
}
