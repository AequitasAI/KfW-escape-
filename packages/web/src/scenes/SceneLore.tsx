import { loreMarksFor } from '@kfw-escape/shared';
import type { LoreMark, LoreScene } from '@kfw-escape/shared';

/**
 * Die Anspielungen im Hintergrund.
 *
 * Eine eigene Ebene über dem Szenenbild, nicht in der gezeichneten Szene: Wo
 * ein gemaltes Artwork liegt, verdeckt es das generierte SVG vollständig - die
 * Marken wären dort unsichtbar, also genau in den Räumen, die am Spieleabend
 * tatsächlich zu sehen sind.
 *
 * Sie liegen unter der Vignette und nehmen keine Klicks an. Das ist Absicht:
 * Sie sind Kulisse, nichts davon ist bedienbar, und nichts davon darf einem
 * Fingertipp im Weg stehen.
 */
export function SceneLore({ scene }: { scene: LoreScene }): JSX.Element | null {
  const marks = loreMarksFor(scene);
  if (marks.length === 0) return null;

  return (
    <div className="scene__lore" aria-hidden="true">
      {marks.map((mark) => (
        <div
          key={mark.id}
          className={`lore lore--${mark.kind}${mark.wideOnly ? ' lore--wide-only' : ''}`}
          style={{
            left: `${mark.x}%`,
            top: `${mark.y}%`,
            ...(mark.scale ? { '--lore-scale': String(mark.scale) } : {}),
          } as React.CSSProperties}
        >
          <MarkArt mark={mark} />
          {mark.rune ? <span className="lore__rune">{mark.rune}</span> : null}
          {mark.label ? <span className="lore__label">{mark.label}</span> : null}
          {mark.line ? <span className="lore__line">{mark.line}</span> : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Silhouetten, keine Illustrationen. Die Marken sollen sich in ein gemaltes
 * Bild einfügen, nicht darauf kleben - deshalb dunkler Stein, ein einziger
 * warmer Akzent und sonst nichts.
 */
function MarkArt({ mark }: { mark: LoreMark }): JSX.Element {
  switch (mark.kind) {
    case 'academy':
      return (
        <svg viewBox="0 0 120 90" className="lore__art">
          <path className="lore__stone" d="M 8 90 L 8 46 L 60 18 L 112 46 L 112 90 Z" />
          <rect className="lore__stone" x="34" y="52" width="52" height="38" />
          <rect className="lore__glow" x="44" y="60" width="10" height="16" />
          <rect className="lore__glow" x="66" y="60" width="10" height="16" />
          <path className="lore__stone" d="M 52 6 L 68 6 L 68 22 L 52 22 Z" />
        </svg>
      );
    case 'tower':
      return (
        <svg viewBox="0 0 80 120" className="lore__art">
          <path className="lore__stone" d="M 20 120 L 24 30 L 56 30 L 60 120 Z" />
          <path className="lore__stone" d="M 16 30 L 40 4 L 64 30 Z" />
          <rect className="lore__glow" x="34" y="52" width="12" height="18" rx="6" />
          <rect className="lore__glow" x="34" y="84" width="12" height="16" rx="6" />
        </svg>
      );
    case 'estate':
      return (
        <svg viewBox="0 0 140 80" className="lore__art">
          <path className="lore__stone" d="M 6 80 L 6 40 L 34 20 L 62 40 L 62 80 Z" />
          <path className="lore__stone" d="M 70 80 L 70 30 L 96 12 L 122 30 L 122 80 Z" />
          <rect className="lore__glow" x="24" y="50" width="12" height="14" />
          <rect className="lore__glow" x="88" y="42" width="12" height="14" />
          {/* Baugerüst - in der Wohnlande wird immer irgendwo gebaut */}
          <path className="lore__line-art" d="M 126 80 L 126 24 M 134 80 L 134 24 M 126 44 L 134 44" />
        </svg>
      );
    case 'massif':
      return (
        <svg viewBox="0 0 200 90" className="lore__art">
          <path
            className="lore__stone lore__stone--dark"
            d="M 0 90 L 34 34 L 58 58 L 92 10 L 124 54 L 150 28 L 200 90 Z"
          />
          {/* ein einziges Fenster brennt noch; irgendwer pflegt das ja */}
          <rect className="lore__glow lore__glow--faint" x="94" y="62" width="5" height="8" />
        </svg>
      );
    case 'vault':
      return (
        <svg viewBox="0 0 90 100" className="lore__art">
          <path className="lore__stone" d="M 6 100 L 6 44 A 39 39 0 0 1 84 44 L 84 100 Z" />
          <path className="lore__stone--dark" d="M 20 100 L 20 48 A 25 25 0 0 1 70 48 L 70 100 Z" />
          <path className="lore__line-art" d="M 20 74 L 70 74 M 45 48 L 45 100" />
          <circle className="lore__glow lore__glow--faint" cx="45" cy="74" r="6" />
        </svg>
      );
    case 'statue':
      return (
        <svg viewBox="0 0 70 120" className="lore__art">
          <rect className="lore__stone" x="14" y="96" width="42" height="24" rx="2" />
          <rect className="lore__stone" x="20" y="86" width="30" height="12" rx="2" />
          <path className="lore__stone" d="M 28 86 L 28 40 A 7 7 0 0 1 42 40 L 42 86 Z" />
          <circle className="lore__stone" cx="35" cy="28" r="9" />
          {/* der Winkel in der Hand - er war schliesslich Baumeister */}
          <path className="lore__line-art" d="M 44 48 L 56 60 L 44 72" />
        </svg>
      );
    case 'crate':
      return (
        <svg viewBox="0 0 100 70" className="lore__art">
          <rect className="lore__stone" x="6" y="24" width="44" height="40" rx="3" />
          <rect className="lore__stone" x="54" y="34" width="38" height="30" rx="3" />
          <path className="lore__line-art" d="M 6 40 L 50 40 M 28 24 L 28 64 M 54 48 L 92 48" />
        </svg>
      );
    case 'sign':
      return (
        <svg viewBox="0 0 110 70" className="lore__art">
          <rect className="lore__stone" x="4" y="6" width="102" height="36" rx="4" />
          <path className="lore__line-art" d="M 55 42 L 55 70" />
          <path className="lore__line-art" d="M 12 16 L 98 16 M 12 26 L 74 26" />
        </svg>
      );
    case 'runestone':
    default:
      return (
        <svg viewBox="0 0 70 90" className="lore__art">
          <path className="lore__stone" d="M 12 90 L 6 34 L 30 6 L 58 20 L 62 90 Z" />
          <path className="lore__line-art" d="M 22 40 L 46 40 M 22 54 L 46 54" />
        </svg>
      );
  }
}
