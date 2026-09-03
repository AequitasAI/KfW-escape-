import { useEffect, useRef, useState } from 'react';
import type { PuzzleMetaView, SolverView, TimerView } from '@kfw-escape/shared';
import { describeClock, formatClock, useServerClock } from '../lib/useServerClock.js';
import { sound } from '../lib/sound.js';
import './chrome.css';

/* ------------------------------------------------------------------ */
/* Timer                                                               */
/* ------------------------------------------------------------------ */

export function Timer({
  timer,
  size = 'medium',
}: {
  timer: TimerView | null | undefined;
  size?: 'medium' | 'large';
}): JSX.Element {
  const remaining = useServerClock(timer);
  // urgency thresholds from 04_ux_ui/UX_UI_SPEC.md
  const urgency = remaining <= 30_000 ? 'critical' : remaining <= 120_000 ? 'urgent' : 'calm';

  return (
    <div className={`timer timer--${size} timer--${urgency}`} data-urgency={urgency}>
      <div className="timer__icon" aria-hidden="true">
        <HourglassIcon />
      </div>
      <div className="timer__body">
        <span className="timer__value mono">{formatClock(remaining)}</span>
        <span className="timer__label">Verbleibende Zeit</span>
      </div>
      <span className="visually-hidden" role="timer" aria-live="off">
        {describeClock(remaining)}
      </span>
    </div>
  );
}

function HourglassIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h10M7 21h10M8 3v3.2a4 4 0 0 0 1.6 3.2L12 12l-2.4 2.6A4 4 0 0 0 8 17.8V21M16 3v3.2a4 4 0 0 1-1.6 3.2L12 12l2.4 2.6a4 4 0 0 1 1.6 3.2V21" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Progress trail: five stations                                       */
/* ------------------------------------------------------------------ */

export function ProgressTrail({
  puzzles,
  currentIndex,
  size = 'medium',
}: {
  puzzles: PuzzleMetaView[];
  currentIndex: number;
  size?: 'small' | 'medium' | 'large';
}): JSX.Element {
  return (
    <ol className={`trail trail--${size}`} aria-label="Fortschritt über fünf Prüfungen">
      {puzzles.map((puzzle) => {
        const done = puzzle.status === 'SOLVED' || puzzle.status === 'SKIPPED';
        const active = !done && puzzle.index === currentIndex;
        const state = done ? 'done' : active ? 'active' : 'todo';
        return (
          <li key={puzzle.index} className={`trail__item trail__item--${state}`}>
            <span className="trail__pip" aria-hidden="true">
              <svg viewBox="0 0 40 44" className="trail__hex">
                <polygon points="20,1 38,11 38,33 20,43 2,33 2,11" />
              </svg>
              <span className="trail__mark">
                {done ? (puzzle.status === 'SKIPPED' ? '–' : '✓') : puzzle.index + 1}
              </span>
            </span>
            <span className="visually-hidden">
              {`Station ${puzzle.index + 1}: ${puzzle.title} – ${
                puzzle.status === 'SOLVED'
                  ? 'gelöst'
                  : puzzle.status === 'SKIPPED'
                    ? 'übersprungen'
                    : active
                      ? 'aktuell'
                      : 'offen'
              }`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Seals                                                               */
/* ------------------------------------------------------------------ */

export function SealRow({ count, total = 5 }: { count: number; total?: number }): JSX.Element {
  return (
    <div className="seals" aria-label={`${count} von ${total} Siegeln geborgen`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`seal${i < count ? ' seal--lit' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 32 36">
            <polygon points="16,1 30,9 30,27 16,35 2,27 2,9" />
            <circle cx="16" cy="18" r="5" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Solver banner                                                       */
/* ------------------------------------------------------------------ */

export function SolverBanner({
  solver,
  variant = 'player',
  children,
}: {
  solver: SolverView;
  variant?: 'player' | 'display';
  children?: React.ReactNode;
}): JSX.Element {
  const name = solver.solverName ?? solver.candidateName;
  const accepted = solver.solverName !== null;

  return (
    <div className={`solver-banner solver-banner--${variant}`}>
      <span className="solver-banner__avatar" aria-hidden="true">
        {(name ?? '?').slice(0, 1).toUpperCase()}
      </span>
      <div className="solver-banner__text">
        {name ? (
          <>
            <p className="solver-banner__headline">
              <strong>{name}</strong> {accepted ? 'ist der aktuelle Gefährte' : 'wurde gewählt'}
            </p>
            <p className="solver-banner__sub">
              {accepted
                ? `Nur ${name} kann die Prüfung bedienen. Alle anderen dürfen helfen.`
                : 'Die Prüfung wurde angeboten und noch nicht angenommen.'}
            </p>
          </>
        ) : (
          <>
            <p className="solver-banner__headline">Es wird ein Gefährte bestimmt …</p>
            <p className="solver-banner__sub">Einen Moment.</p>
          </>
        )}
      </div>
      {children ? <div className="solver-banner__actions">{children}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Solver reveal overlay                                               */
/* ------------------------------------------------------------------ */

export function SolverReveal({ name, onDone }: { name: string; onDone: () => void }): JSX.Element {
  // The parent re-renders on every timer tick, so the callback identity changes
  // constantly. Keep it in a ref, otherwise the dismissal timer is restarted
  // every second and the overlay never goes away.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // never blocks longer than 2 s, per the UX spec
    const timeout = window.setTimeout(() => onDoneRef.current(), 1_900);
    return () => window.clearTimeout(timeout);
  }, [name]);

  return (
    <div className="reveal" role="status" aria-live="polite">
      <div className="reveal__inner">
        <p className="reveal__lead">Der nächste Gefährte wird bestimmt …</p>
        <p className="reveal__name">{name.toUpperCase()}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Betriebszwerg - a side character, never a real person               */
/* ------------------------------------------------------------------ */

export function Dwarf({ line, mood }: { line: string; mood: 'neutral' | 'skeptical' | 'happy' }): JSX.Element {
  return (
    <figure className={`dwarf dwarf--${mood}`}>
      <div className="dwarf__bubble" role="status" aria-live="polite">
        {line}
      </div>
      <svg className="dwarf__art" viewBox="0 0 120 150" aria-hidden="true">
        {/* helmet */}
        <path d="M32 52 Q60 24 88 52 L88 60 L32 60 Z" fill="#5b4a35" />
        <rect x="30" y="56" width="60" height="8" rx="4" fill="#6d5941" />
        <circle cx="60" cy="46" r="7" fill="#ffd48a" opacity="0.9" />
        {/* face */}
        <rect x="42" y="62" width="36" height="18" rx="6" fill="#d8a684" />
        <circle cx="52" cy="70" r="2.6" fill="#20242c" />
        <circle cx="68" cy="70" r="2.6" fill="#20242c" />
        {/* beard */}
        <path d="M40 76 Q60 122 80 76 Q72 96 60 100 Q48 96 40 76 Z" fill="#a4622f" />
        {/* body */}
        <path d="M34 96 Q60 88 86 96 L92 142 L28 142 Z" fill="#3f5163" />
        <rect x="28" y="118" width="64" height="10" rx="4" fill="#2a3746" />
        <rect x="52" y="118" width="16" height="10" rx="3" fill="#c08a3e" />
      </svg>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Mute toggle                                                         */
/* ------------------------------------------------------------------ */

export function MuteButton({ className }: { className?: string }): JSX.Element {
  const [muted, setMuted] = useState(sound.isMuted);
  useEffect(() => sound.subscribe(setMuted), []);

  return (
    <button
      type="button"
      className={`btn btn--ghost btn--icon${className ? ` ${className}` : ''}`}
      onClick={() => sound.toggle()}
      aria-pressed={muted}
      title={muted ? 'Ton einschalten' : 'Ton ausschalten'}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
      <span className="visually-hidden">{muted ? 'Ton einschalten' : 'Ton ausschalten'}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Connection state                                                    */
/* ------------------------------------------------------------------ */

export function ConnectionPill({ state }: { state: string }): JSX.Element | null {
  if (state === 'connected') return null;
  const label =
    state === 'reconnecting'
      ? 'Verbindung wird wiederhergestellt …'
      : state === 'failed'
        ? 'Verbindung getrennt'
        : 'Verbinde …';
  return (
    <div className={`conn conn--${state}`} role="status" aria-live="polite">
      <span className="conn__dot" aria-hidden="true" />
      {label}
    </div>
  );
}
