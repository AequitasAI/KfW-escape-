import { useEffect, useState } from 'react';
import { FALSE_VICTORY, FALSE_VICTORY_DURATION_MS, FALSE_VICTORY_TWIST_AT_MS } from '@kfw-escape/shared';
import { SealRow } from './Chrome.js';
import { sound } from '../lib/sound.js';
import './falseVictory.css';

/**
 * Der falsche Sieg.
 *
 * Zwei Schläge in einer Sequenz. Der Takt kommt vom Server - `phaseEndsAt`
 * steht im Snapshot -, damit Spieleransicht, Grossbild und Spielleitung im
 * selben Moment umschlagen. Ein lokaler Timer würde je nach Gerät um Sekunden
 * abweichen, und genau in dieser Sekunde liegt der ganze Effekt.
 *
 * Wer die Bewegung nicht will (`prefers-reduced-motion`), bekommt dieselben
 * beiden Bilder ohne Fahrt: Die Dramaturgie steckt im Text und im Umschlag,
 * nicht in der Animation.
 */
export function FalseVictory({
  phaseEndsAt,
  size = 'player',
}: {
  phaseEndsAt: number | null;
  size?: 'player' | 'display';
}): JSX.Element {
  const beat = useFalseVictoryBeat(phaseEndsAt);

  useEffect(() => {
    if (beat === 'triumph') sound.play('finale');
    if (beat === 'twist') sound.play('gate');
  }, [beat]);

  return (
    <section className={`fv fv--${size} fv--${beat}`} aria-live="polite">
      <div className="fv__scene" aria-hidden="true">
        {/*
          Die gemalte Brücke liegt schon im Hintergrund der Szene. Hier kommt
          nur dazu, was sich bewegt: die Energie, die über sie hinwegläuft, und
          das Tor, das sich ihr in den Weg stellt.
        */}
        <svg viewBox="0 0 400 190" className="fv__art">
          <defs>
            <linearGradient id="fv-beam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffd27a" stopOpacity="0.15" />
              <stop offset="35%" stopColor="#ffe6ad" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f2ae3c" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          <g className="fv__beam">
            <rect x="8" y="150" width="384" height="7" rx="3.5" fill="url(#fv-beam)" />
            <rect x="8" y="163" width="384" height="3" rx="1.5" fill="url(#fv-beam)" opacity="0.5" />
          </g>

          <g className="fv__stone">
            <path
              className="fv__stone-body"
              d="M 148 156 L 148 92 A 52 52 0 0 1 252 92 L 252 156 Z"
            />
            <path
              className="fv__stone-opening"
              d="M 170 156 L 170 98 A 30 30 0 0 1 230 98 L 230 156 Z"
            />
            {[112, 130, 148].map((y) => (
              <g key={y}>
                <line className="fv__stone-joint" x1="148" y1={y} x2="170" y2={y} />
                <line className="fv__stone-joint" x1="230" y1={y} x2="252" y2={y} />
              </g>
            ))}
            <circle className="fv__stone-rune" cx="159" cy="102" r="4.5" />
            <circle className="fv__stone-rune" cx="241" cy="102" r="4.5" />
            <path className="fv__stone-lock" d="M 200 112 L 214 126 L 200 140 L 186 126 Z" />
          </g>
        </svg>
      </div>

      {beat === 'triumph' ? (
        <div className="fv__text">
          <SealRow count={5} />
          <h2 className="fv__title">{FALSE_VICTORY.triumphTitle}</h2>
          <p className="fv__line">{FALSE_VICTORY.triumphLine}</p>
          <p className="fv__note">{FALSE_VICTORY.triumphNote}</p>
        </div>
      ) : (
        <div className="fv__text">
          <h2 className="fv__title fv__title--twist">{FALSE_VICTORY.twistTitle}</h2>
          <p className="fv__line">{FALSE_VICTORY.twistLine}</p>
          <p className="fv__note">{FALSE_VICTORY.twistNote}</p>
        </div>
      )}
    </section>
  );
}

/**
 * Welcher der beiden Schläge gerade läuft, gerechnet aus der Serveruhr.
 *
 * Fehlt `phaseEndsAt` - etwa weil die Spielleitung pausiert hat -, bleibt es
 * beim Umschlag, damit niemand vor einem eingefrorenen Triumph sitzt.
 */
function useFalseVictoryBeat(phaseEndsAt: number | null): 'triumph' | 'twist' {
  const [beat, setBeat] = useState<'triumph' | 'twist'>(() => beatAt(phaseEndsAt));

  useEffect(() => {
    setBeat(beatAt(phaseEndsAt));
    if (phaseEndsAt === null) return undefined;
    const switchAt = phaseEndsAt - (FALSE_VICTORY_DURATION_MS - FALSE_VICTORY_TWIST_AT_MS);
    const delay = switchAt - Date.now();
    if (delay <= 0) return undefined;
    const timeout = window.setTimeout(() => setBeat('twist'), delay);
    return () => window.clearTimeout(timeout);
  }, [phaseEndsAt]);

  return beat;
}

function beatAt(phaseEndsAt: number | null): 'triumph' | 'twist' {
  if (phaseEndsAt === null) return 'twist';
  const elapsed = FALSE_VICTORY_DURATION_MS - (phaseEndsAt - Date.now());
  return elapsed < FALSE_VICTORY_TWIST_AT_MS ? 'triumph' : 'twist';
}
