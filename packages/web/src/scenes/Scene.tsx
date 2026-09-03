import type { ReactNode } from 'react';
import './scene.css';

export type SceneId =
  | 'lobby'
  | 'archive'
  | 'connection'
  | 'testmasters'
  | 'mine'
  | 'gate'
  | 'bridge'
  | 'defeat';

export const SCENE_BY_PUZZLE: readonly SceneId[] = [
  'archive',
  'connection',
  'testmasters',
  'mine',
  'gate',
];

/**
 * Every room is three stacked layers plus the interactive puzzle layer:
 *
 *   bg   far background wash and silhouettes  (replaceable by artwork)
 *   mid  architecture and props
 *   fx   light, particles, vignette
 *
 * The bg layer accepts an image via the `--scene-image` custom property, so
 * final artwork can be dropped in later without touching any component.
 */
export function Scene({
  id,
  children,
  className,
}: {
  id: SceneId;
  children?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={`scene scene--${id}${className ? ` ${className}` : ''}`} data-scene={id}>
      <div className="scene__bg" aria-hidden="true">
        <SceneArt id={id} />
      </div>
      <div className="scene__fx" aria-hidden="true" />
      <div className="scene__content">{children}</div>
    </div>
  );
}

function SceneArt({ id }: { id: SceneId }): JSX.Element {
  switch (id) {
    case 'archive':
      return <ArchiveArt />;
    case 'connection':
      return <ConnectionArt />;
    case 'testmasters':
      return <TestmastersArt />;
    case 'mine':
      return <MineArt />;
    case 'gate':
      return <GateArt />;
    case 'bridge':
      return <BridgeArt />;
    case 'defeat':
      return <DefeatArt />;
    default:
      return <LobbyArt />;
  }
}

const VIEWBOX = '0 0 1600 900';

function Sky({ from, to }: { from: string; to: string }): JSX.Element {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${from.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#sky-${from.slice(1)})`} />
    </>
  );
}

/* ------------------------------------------------------------------ */

function LobbyArt(): JSX.Element {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" role="presentation">
      <Sky from="#0d2137" to="#050d18" />
      {[...Array(9)].map((_, i) => (
        <polygon
          key={i}
          points={`${120 + i * 170},900 ${200 + i * 170},${520 + (i % 3) * 90} ${300 + i * 170},900`}
          fill="#0b1c2e"
          opacity={0.75 - i * 0.04}
        />
      ))}
      <g className="scene-stars">
        {[...Array(40)].map((_, i) => (
          <circle
            key={i}
            cx={(i * 137) % 1600}
            cy={(i * 71) % 420}
            r={i % 5 === 0 ? 2.2 : 1.2}
            fill="#a8d8ff"
            opacity={0.15 + ((i * 7) % 10) / 22}
          />
        ))}
      </g>
      <path d="M0 700 Q400 640 800 700 T1600 690 V900 H0 Z" fill="#071426" />
    </svg>
  );
}

function ArchiveArt(): JSX.Element {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" role="presentation">
      <Sky from="#132a42" to="#050e1a" />
      {/* monumental shelves receding into the dark */}
      {[0, 1, 2, 3].map((depth) => {
        const inset = depth * 130;
        const opacity = 0.9 - depth * 0.2;
        return (
          <g key={depth} opacity={opacity}>
            <rect x={inset} y={140 + depth * 40} width="230" height={760 - depth * 40} fill="#0c1e30" />
            <rect
              x={1600 - inset - 230}
              y={140 + depth * 40}
              width="230"
              height={760 - depth * 40}
              fill="#0c1e30"
            />
            {[...Array(6)].map((_, row) => (
              <g key={row}>
                <rect x={inset + 16} y={200 + depth * 40 + row * 110} width="198" height="8" fill="#17304a" />
                <rect
                  x={1600 - inset - 214}
                  y={200 + depth * 40 + row * 110}
                  width="198"
                  height="8"
                  fill="#17304a"
                />
              </g>
            ))}
          </g>
        );
      })}
      {/* floating scrolls */}
      {[...Array(7)].map((_, i) => (
        <g key={i} className="scene-float" style={{ animationDelay: `${i * 0.9}s` }}>
          <rect
            x={520 + i * 82}
            y={190 + ((i * 53) % 190)}
            width="26"
            height="52"
            rx="9"
            fill="#e8d6ac"
            opacity="0.28"
          />
        </g>
      ))}
      <ellipse cx="800" cy="560" rx="360" ry="200" fill="#ffd48a" opacity="0.07" />
      <path d="M0 760 H1600 V900 H0 Z" fill="#061020" />
    </svg>
  );
}

function ConnectionArt(): JSX.Element {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" role="presentation">
      <Sky from="#0b2733" to="#04101a" />
      <rect x="0" y="180" width="180" height="720" fill="#0c2130" />
      <rect x="1420" y="180" width="180" height="720" fill="#0c2130" />
      {[...Array(10)].map((_, i) => (
        <rect key={i} x="30" y={230 + i * 62} width="120" height="34" rx="6" fill="#123243" opacity="0.9" />
      ))}
      {[...Array(10)].map((_, i) => (
        <rect key={i} x="1450" y={230 + i * 62} width="120" height="34" rx="6" fill="#123243" opacity="0.9" />
      ))}
      {[...Array(5)].map((_, i) => (
        <path
          key={i}
          d={`M180 ${260 + i * 110} C 520 ${200 + i * 130}, 1080 ${360 + i * 90}, 1420 ${300 + i * 100}`}
          stroke="#4fe3d0"
          strokeWidth="2.5"
          fill="none"
          opacity="0.16"
          className="scene-cable"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
      <ellipse cx="180" cy="460" rx="120" ry="180" fill="#4fe3d0" opacity="0.09" />
      <ellipse cx="1420" cy="500" rx="120" ry="180" fill="#4fe3d0" opacity="0.06" />
      <path d="M0 800 H1600 V900 H0 Z" fill="#04101a" />
    </svg>
  );
}

function TestmastersArt(): JSX.Element {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" role="presentation">
      <Sky from="#16283c" to="#060e19" />
      {/* symmetric hall: columns and arches */}
      {[130, 380, 1220, 1470].map((x, i) => (
        <g key={i}>
          <rect x={x - 46} y="120" width="92" height="780" fill="#0d1f31" />
          <rect x={x - 60} y="110" width="120" height="26" rx="6" fill="#16324c" />
          <rect x={x - 60} y="860" width="120" height="40" rx="6" fill="#16324c" />
        </g>
      ))}
      <path d="M100 150 Q800 -30 1500 150" stroke="#1b3a58" strokeWidth="26" fill="none" />
      <path d="M180 210 Q800 60 1420 210" stroke="#132c44" strokeWidth="14" fill="none" />
      <ellipse cx="800" cy="330" rx="420" ry="170" fill="#8fc6ff" opacity="0.05" />
      <path d="M0 830 H1600 V900 H0 Z" fill="#050d17" />
    </svg>
  );
}

function MineArt(): JSX.Element {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" role="presentation">
      <Sky from="#2a1c12" to="#0a0d14" />
      {/* rough rock ceiling and walls */}
      <path
        d="M0 0 H1600 V210 L1450 260 L1320 190 L1180 250 L1030 195 L880 255 L730 190 L580 250 L430 195 L280 255 L140 200 L0 250 Z"
        fill="#0e131c"
      />
      <path d="M0 900 H1600 V730 L1420 690 L1200 740 L980 700 L760 745 L540 700 L320 745 L120 705 L0 750 Z" fill="#0c1119" />
      {/* support beams */}
      {[240, 760, 1300].map((x, i) => (
        <g key={i} opacity="0.85">
          <rect x={x} y="250" width="26" height="470" fill="#2a1f16" />
          <rect x={x - 90} y="240" width="206" height="24" fill="#31241a" />
        </g>
      ))}
      {/* warm forge glow and lanterns */}
      <ellipse cx="800" cy="520" rx="520" ry="230" fill="#ff9a52" opacity="0.10" />
      {[180, 620, 1080, 1480].map((x, i) => (
        <g key={i} className="scene-flicker" style={{ animationDelay: `${i * 0.7}s` }}>
          <circle cx={x} cy="330" r="9" fill="#ffb266" />
          <circle cx={x} cy="330" r="34" fill="#ff9a52" opacity="0.16" />
        </g>
      ))}
      {/* crystal cart hint, bottom left */}
      <g opacity="0.6">
        <polygon points="90,720 130,650 170,720" fill="#4fe3d0" opacity="0.5" />
        <polygon points="140,725 175,668 205,725" fill="#4fe3d0" opacity="0.35" />
      </g>
    </svg>
  );
}

function GateArt(): JSX.Element {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" role="presentation">
      <Sky from="#0a0f1c" to="#02060d" />
      {/* monumental gate silhouette */}
      <rect x="470" y="120" width="660" height="780" fill="#070c16" />
      <path d="M470 300 Q800 30 1130 300 V140 H470 Z" fill="#070c16" />
      <rect x="440" y="100" width="60" height="800" fill="#0b1220" />
      <rect x="1100" y="100" width="60" height="800" fill="#0b1220" />
      <line x1="800" y1="140" x2="800" y2="900" stroke="#04070e" strokeWidth="10" />
      {[...Array(6)].map((_, i) => (
        <rect key={i} x="500" y={220 + i * 115} width="600" height="6" fill="#111c2e" />
      ))}
      {/* cold sentinel light */}
      <ellipse cx="800" cy="620" rx="300" ry="220" fill="#5b8fd6" opacity="0.07" />
      <circle cx="800" cy="470" r="16" fill="#7fb4ff" opacity="0.5" className="scene-flicker" />
      <path d="M0 860 H1600 V900 H0 Z" fill="#02060d" />
    </svg>
  );
}

function BridgeArt(): JSX.Element {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" role="presentation">
      <Sky from="#0e2b46" to="#040f1f" />
      <g className="scene-stars">
        {[...Array(60)].map((_, i) => (
          <circle
            key={i}
            cx={(i * 211) % 1600}
            cy={(i * 97) % 520}
            r={i % 6 === 0 ? 2.6 : 1.3}
            fill="#cfe9ff"
            opacity={0.2 + ((i * 3) % 10) / 18}
          />
        ))}
      </g>
      {/* the bridge itself, forming out of energy */}
      <path
        d="M60 780 Q800 470 1540 780"
        stroke="#4fe3d0"
        strokeWidth="10"
        fill="none"
        opacity="0.75"
        className="scene-cable"
      />
      <path d="M60 812 Q800 502 1540 812" stroke="#4fe3d0" strokeWidth="4" fill="none" opacity="0.4" />
      {[...Array(11)].map((_, i) => {
        const t = i / 10;
        const x = 60 + t * 1480;
        const y = 780 - Math.sin(Math.PI * t) * 300;
        return (
          <g key={i} className="scene-float" style={{ animationDelay: `${i * 0.25}s` }}>
            <line x1={x} y1={y} x2={x} y2={y + 90} stroke="#4fe3d0" strokeWidth="2" opacity="0.35" />
          </g>
        );
      })}
      <ellipse cx="800" cy="520" rx="560" ry="240" fill="#4fe3d0" opacity="0.08" />
      <path d="M0 860 H1600 V900 H0 Z" fill="#040f1f" />
    </svg>
  );
}

function DefeatArt(): JSX.Element {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice" role="presentation">
      <Sky from="#101822" to="#03070d" />
      <path d="M60 800 Q420 620 720 700" stroke="#33475c" strokeWidth="9" fill="none" opacity="0.6" />
      <path d="M880 700 Q1180 620 1540 800" stroke="#33475c" strokeWidth="9" fill="none" opacity="0.6" />
      {/* the gap where the bridge should be */}
      <ellipse cx="800" cy="760" rx="200" ry="60" fill="#03070d" />
      <path d="M0 860 H1600 V900 H0 Z" fill="#03070d" />
    </svg>
  );
}
