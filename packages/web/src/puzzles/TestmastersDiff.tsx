import { useState } from 'react';
import { DIFF_HOTSPOTS, TESTMASTER_LINE } from '@kfw-escape/shared';
import type { TestmastersDiffState } from '@kfw-escape/shared';
import type { PuzzleProps } from './types.js';
import { sound } from '../lib/sound.js';

type Side = 'left' | 'right';

/**
 * Two fantasy system plans as SVG components rather than two raster images, so
 * the four differences stay crisp and responsive and every hotspot is a real
 * focusable control.
 */
export function TestmastersDiff({
  state,
  interactive,
  onAction,
  size,
}: PuzzleProps<TestmastersDiffState>): JSX.Element {
  const [missAt, setMissAt] = useState<{ side: Side; x: number; y: number; key: number } | null>(null);
  const found = new Set(state.found);

  const hit = (hotspotId: string): void => {
    if (!interactive || found.has(hotspotId)) return;
    sound.play('stamp');
    onAction({ type: 'hit', hotspotId });
  };

  const miss = (side: Side, event: React.MouseEvent<SVGSVGElement>): void => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setMissAt({
      side,
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
      key: Date.now(),
    });
    onAction({ type: 'miss' });
  };

  return (
    <div className={`puzzle puzzle--diff puzzle--${size}`}>
      <p className="diff__npc">„{TESTMASTER_LINE}“</p>

      <div className="diff__plans">
        {(['left', 'right'] as const).map((side) => (
          <figure key={side} className="diff__plan">
            <figcaption className="diff__caption">
              {side === 'left' ? 'Bauplan A – Urfassung' : 'Bauplan B – Prüfexemplar'}
            </figcaption>
            <div className="diff__canvas">
              <svg
                viewBox="0 0 400 300"
                className={`diff__svg${interactive ? ' is-interactive' : ''}`}
                onClick={(event) => {
                  // a click that did not land on a hotspot button is a miss
                  if (event.target === event.currentTarget) miss(side, event);
                }}
                aria-label={`${side === 'left' ? 'Bauplan A' : 'Bauplan B'} mit vier möglichen Abweichungen`}
              >
                <Plan side={side} found={found} interactive={interactive} onHit={hit} onMiss={(e) => miss(side, e)} />
              </svg>
              {missAt?.side === side ? (
                <span
                  key={missAt.key}
                  className="diff__miss"
                  style={{ left: `${missAt.x}%`, top: `${missAt.y}%` }}
                  aria-hidden="true"
                >
                  geprüft – korrekt
                </span>
              ) : null}
            </div>
          </figure>
        ))}
      </div>

      <ul className="diff__tally" aria-label="Gefundene Abweichungen">
        {DIFF_HOTSPOTS.map((hotspot) => {
          const done = found.has(hotspot.id);
          return (
            <li key={hotspot.id} className={`diff__tally-item${done ? ' is-found' : ''}`}>
              <span className="diff__tally-mark" aria-hidden="true">
                {done ? '✓' : '?'}
              </span>
              {done ? `${hotspot.label}: ${hotspot.left} statt ${hotspot.right}` : 'Noch nicht gefunden'}
            </li>
          );
        })}
      </ul>

      <p className="puzzle__status" role="status" aria-live="polite">
        {state.found.length} von 4 Abweichungen gefunden
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface PlanProps {
  side: Side;
  found: Set<string>;
  interactive: boolean;
  onHit: (id: string) => void;
  onMiss: (event: React.MouseEvent<SVGSVGElement>) => void;
}

function Hotspot({
  id,
  label,
  x,
  y,
  w,
  h,
  found,
  interactive,
  onHit,
  children,
}: {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  found: Set<string>;
  interactive: boolean;
  onHit: (id: string) => void;
  children: React.ReactNode;
}): JSX.Element {
  const isFound = found.has(id);
  return (
    <g
      className={`diff-hotspot${isFound ? ' is-found' : ''}`}
      role="button"
      tabIndex={interactive && !isFound ? 0 : -1}
      aria-disabled={!interactive || isFound}
      aria-label={isFound ? `${label}: bereits gefunden` : `Auffälligkeit prüfen: ${label}`}
      onClick={(event) => {
        event.stopPropagation();
        onHit(id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onHit(id);
        }
      }}
    >
      {children}
      <rect className="diff-hotspot__hit" x={x} y={y} width={w} height={h} rx="8" />
      {isFound ? <rect className="diff-hotspot__ring" x={x} y={y} width={w} height={h} rx="8" /> : null}
    </g>
  );
}

function Plan({ side, found, interactive, onHit }: PlanProps): JSX.Element {
  const isLeft = side === 'left';
  return (
    <>
      {/* --- static plan furniture (identical on both sides) --------- */}
      <rect x="4" y="4" width="392" height="292" rx="10" className="plan__paper" />
      <g className="plan__grid">
        {[...Array(7)].map((_, i) => (
          <line key={`v${i}`} x1={40 + i * 55} y1="20" x2={40 + i * 55} y2="280" />
        ))}
        {[...Array(5)].map((_, i) => (
          <line key={`h${i}`} x1="20" y1={45 + i * 55} x2="380" y2={45 + i * 55} />
        ))}
      </g>
      <text x="200" y="26" className="plan__title" textAnchor="middle">
        SCHALTPLAN DER GROSSEN HALLE
      </text>

      {/* fixed vessels */}
      <rect x="150" y="60" width="52" height="42" rx="6" className="plan__part" />
      <rect x="248" y="60" width="52" height="42" rx="6" className="plan__part" />
      <line x1="202" y1="81" x2="248" y2="81" className="plan__line" />
      <circle cx="90" cy="205" r="12" className="plan__part" />
      <line x1="102" y1="205" x2="150" y2="205" className="plan__line" />

      {/* --- difference 1: rune top left, triangle vs diamond -------- */}
      <Hotspot
        id="rune_top_left"
        label="Rune oben links"
        x={30}
        y={50}
        w={64}
        h={62}
        found={found}
        interactive={interactive}
        onHit={onHit}
      >
        {isLeft ? (
          <polygon points="62,58 92,106 32,106" className="plan__glyph" />
        ) : (
          <polygon points="62,56 90,82 62,108 34,82" className="plan__glyph" />
        )}
      </Hotspot>

      {/* --- difference 2: middle connection arrow direction --------- */}
      <Hotspot
        id="middle_arrow"
        label="Pfeilrichtung der mittleren Verbindung"
        x={140}
        y={132}
        w={130}
        h={44}
        found={found}
        interactive={interactive}
        onHit={onHit}
      >
        <line x1="150" y1="154" x2="260" y2="154" className="plan__line" />
        {isLeft ? (
          <polygon points="260,154 244,146 244,162" className="plan__glyph" />
        ) : (
          <polygon points="150,154 166,146 166,162" className="plan__glyph" />
        )}
      </Hotspot>

      {/* --- difference 3: bottom gear, 6 vs 5 spokes ---------------- */}
      <Hotspot
        id="bottom_gear_spokes"
        label="Speichen des unteren Zahnrads"
        x={268}
        y={186}
        w={92}
        h={92}
        found={found}
        interactive={interactive}
        onHit={onHit}
      >
        <circle cx="314" cy="232" r="34" className="plan__part" />
        <circle cx="314" cy="232" r="9" className="plan__part" />
        {Array.from({ length: isLeft ? 6 : 5 }, (_, i) => {
          const angle = (i / (isLeft ? 6 : 5)) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={314 + Math.cos(angle) * 9}
              y1={232 + Math.sin(angle) * 9}
              x2={314 + Math.cos(angle) * 33}
              y2={232 + Math.sin(angle) * 33}
              className="plan__line"
            />
          );
        })}
      </Hotspot>

      {/* --- difference 4: container label IV vs VI ------------------ */}
      <Hotspot
        id="container_label"
        label="Beschriftung des Behälters"
        x={128}
        y={196}
        w={96}
        h={70}
        found={found}
        interactive={interactive}
        onHit={onHit}
      >
        <rect x="140" y="206" width="72" height="52" rx="6" className="plan__part" />
        <text x="176" y="240" textAnchor="middle" className="plan__label">
          {isLeft ? 'IV' : 'VI'}
        </text>
      </Hotspot>
    </>
  );
}
