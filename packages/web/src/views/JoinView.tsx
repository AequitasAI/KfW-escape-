import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  GAME_TITLE,
  LOBBY_SUBLINE,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  companionsGathered,
} from '@kfw-escape/shared';
import { api, RequestError } from '../lib/api.js';
import { loadIdentity, saveIdentity } from '../lib/identity.js';
import { Scene } from '../scenes/Scene.js';
import './views.css';

/**
 * The only form in the whole game. No password, no mail address, no employee id:
 * a display name and nothing else.
 */
export function JoinView(): JSX.Element {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const normalized = code.toUpperCase();

  const [name, setName] = useState('');
  const [status, setStatus] = useState<'checking' | 'ready' | 'joining' | 'missing'>('checking');
  const [players, setPlayers] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const session = await api.getSession(normalized);
        if (cancelled) return;
        setPlayers(session.playerCount);

        // already known in this browser? then straight into the game
        try {
          const me = await api.me(normalized);
          if (cancelled) return;
          saveIdentity(normalized, me);
          navigate(`/game/${normalized}`, { replace: true });
          return;
        } catch {
          const stored = loadIdentity(normalized);
          if (stored) setName(stored.displayName);
        }
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('missing');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalized, navigate]);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < MIN_DISPLAY_NAME_LENGTH) {
      setError(`Bitte mindestens ${MIN_DISPLAY_NAME_LENGTH} Zeichen eingeben.`);
      return;
    }
    setStatus('joining');
    setError(null);
    try {
      const joined = await api.join(normalized, trimmed);
      saveIdentity(normalized, joined);
      navigate(`/game/${normalized}`, { replace: true });
    } catch (err) {
      setError(err instanceof RequestError ? err.message : 'Der Beitritt hat nicht geklappt.');
      setStatus('ready');
    }
  };

  if (!code) return <Navigate to="/" replace />;

  return (
    <Scene id="lobby">
      <main className="view view--centered">
        <div className="join">
          <header className="join__head">
            <p className="landing__eyebrow">{GAME_TITLE}</p>
            <h1 className="join__title">Der Reisegruppe beitreten</h1>
            <p className="join__code mono" aria-label={`Sessioncode ${normalized.split('').join(' ')}`}>
              {normalized}
            </p>
          </header>

          {status === 'missing' ? (
            <section className="panel">
              <div className="panel__body stack">
                <p className="notice notice--error" role="alert">
                  Diese Reisegruppe gibt es nicht (mehr). Bitte den Code bei der Spielleitung prüfen.
                </p>
                <button type="button" className="btn btn--block" onClick={() => navigate('/')}>
                  Zurück zum Start
                </button>
              </div>
            </section>
          ) : (
            <section className="panel">
              <div className="panel__body stack">
                <p className="join__lead">{LOBBY_SUBLINE}</p>
                {players !== null ? <p className="chip chip--live">{companionsGathered(players)}</p> : null}

                <form className="stack" onSubmit={(event) => void submit(event)}>
                  <label className="field">
                    <span className="field__label">Anzeigename</span>
                    <input
                      className="field__input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={MAX_DISPLAY_NAME_LENGTH}
                      autoFocus
                      autoComplete="nickname"
                      placeholder="z. B. Mara"
                      disabled={status === 'checking' || status === 'joining'}
                      aria-describedby="name-hint"
                    />
                  </label>
                  <p className="field__hint" id="name-hint">
                    Nur dieser Name wird gespeichert – keine Mailadresse, kein Passwort.
                  </p>
                  {error ? (
                    <p className="notice notice--error" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    className="btn btn--primary btn--block btn--large"
                    disabled={status !== 'ready'}
                  >
                    {status === 'joining' ? 'Trete bei …' : 'Der Reisegruppe beitreten'}
                  </button>
                </form>
              </div>
            </section>
          )}
        </div>
      </main>
    </Scene>
  );
}
