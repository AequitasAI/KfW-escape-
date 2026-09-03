import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GAME_TITLE, PUZZLES, companionsGathered } from '@kfw-escape/shared';
import type { SocketAuth } from '@kfw-escape/shared';
import { ConnectionPill, ProgressTrail, SealRow, Timer } from '../components/Chrome.js';
import { api, RequestError } from '../lib/api.js';
import { loadHostSecret, rememberHostedCode, saveHostSecret } from '../lib/identity.js';
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

  /* ---------------- no code yet ---------------- */

  if (!normalized) {
    return (
      <main className="view view--centered host-shell">
        <section className="panel host-create">
          <div className="panel__body stack">
            <h1 className="host__title">Spielleitung</h1>
            <p className="field__hint">
              Erstellt eine neue Session für {GAME_TITLE}. Die Kennung der Spielleitung bleibt nur in
              diesem Browser.
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
              Für die Session <strong className="mono">{normalized}</strong> liegt in diesem Browser keine
              Kennung. Die Steuerung ist bewusst an das Gerät gebunden, auf dem die Session erstellt
              wurde.
            </p>
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
                  onClick={() => channel.emit('host:skipPuzzle')}
                >
                  Prüfung überspringen
                </button>
              </div>

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
                  <dd>{snapshot?.solver.solverName ?? snapshot?.solver.candidateName ?? '—'}</dd>
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
