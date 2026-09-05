import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CODE_LENGTH, GAME_SUBTITLE, GAME_TITLE } from '@kfw-escape/shared';
import { api, RequestError } from '../lib/api.js';
import { listHostedCodes, rememberHostedCode, saveHostSecret } from '../lib/identity.js';
import { Scene } from '../scenes/Scene.js';
import './views.css';

export function LandingView(): JSX.Element {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hosted = listHostedCodes();

  const createSession = async (): Promise<void> => {
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

  const joinByCode = (event: React.FormEvent): void => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== CODE_LENGTH) {
      setError(`Ein Sessioncode hat ${CODE_LENGTH} Zeichen.`);
      return;
    }
    navigate(`/join/${normalized}`);
  };

  return (
    <Scene id="lobby">
      <main className="view view--centered">
        <div className="landing">
          <header className="landing__head">
            <p className="landing__eyebrow">Internes Teamabenteuer</p>
            <h1 className="landing__title">{GAME_TITLE}</h1>
            <p className="landing__subtitle">{GAME_SUBTITLE}</p>
          </header>

          <div className="landing__cards">
            <section className="panel landing__card">
              <div className="panel__body stack">
                <h2 className="landing__card-title">Der Reisegruppe beitreten</h2>
                <p className="landing__card-text">
                  Kein Login, keine Mailadresse. Nur ein Anzeigename und der Sessioncode von der
                  Spielleitung.
                </p>
                <form className="stack" onSubmit={joinByCode}>
                  <label className="field">
                    <span className="field__label">Sessioncode</span>
                    <input
                      className="field__input mono landing__code-input"
                      value={code}
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                      placeholder="ABC234"
                      maxLength={CODE_LENGTH}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      inputMode="text"
                      aria-describedby="code-hint"
                    />
                  </label>
                  <p className="field__hint" id="code-hint">
                    {CODE_LENGTH} Zeichen, ohne 0, O, I und 1.
                  </p>
                  <button type="submit" className="btn btn--primary btn--block btn--large">
                    Weiter
                  </button>
                </form>
              </div>
            </section>

            <section className="panel landing__card">
              <div className="panel__body stack">
                <h2 className="landing__card-title">Spielleitung</h2>
                <p className="landing__card-text">
                  Erstellt eine neue Session, zeigt den QR-Code und startet das Abenteuer. Die
                  Großbildansicht läuft auf einer eigenen Route.
                </p>
                <button
                  type="button"
                  className="btn btn--primary btn--block btn--large"
                  onClick={() => void createSession()}
                  disabled={busy}
                >
                  {busy ? 'Wird erstellt …' : 'Neue Session erstellen'}
                </button>
                {hosted.length > 0 ? (
                  <div className="stack">
                    <span className="field__label">Zuletzt von diesem Gerät geleitet</span>
                    <div className="row">
                      {hosted.map((entry) => (
                        <button
                          key={entry}
                          type="button"
                          className="chip landing__chip-btn mono"
                          onClick={() => navigate(`/host/${entry}`)}
                        >
                          {entry}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          {error ? (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          ) : null}

          {/* Übungsraum: bewusst klein und unten, damit ihn am Spieleabend
              niemand mit dem Beitritt verwechselt. */}
          <p className="landing__demo">
            Nur die Rätsel ausprobieren?{' '}
            <button type="button" className="landing__demo-link" onClick={() => navigate('/demo')}>
              Zum Übungsraum
            </button>
          </p>
        </div>
      </main>
    </Scene>
  );
}
