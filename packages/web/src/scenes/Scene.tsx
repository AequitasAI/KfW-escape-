import type { ReactNode } from 'react';
import { useSceneArt } from './sceneArt.js';
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
  // If final artwork has been dropped in, it takes over the background layer.
  // Until then the generated SVG carries the scene on its own.
  const art = useSceneArt(id);

  return (
    <div
      className={`scene scene--${id}${art ? ' scene--art' : ''}${className ? ` ${className}` : ''}`}
      data-scene={id}
      style={art ? ({ '--scene-image': `url("${art}")` } as React.CSSProperties) : undefined}
    >
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
          stroke="#f2ae3c"
          strokeWidth="2.5"
          fill="none"
          opacity="0.16"
          className="scene-cable"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
      <ellipse cx="180" cy="460" rx="120" ry="180" fill="#f2ae3c" opacity="0.09" />
      <ellipse cx="1420" cy="500" rx="120" ry="180" fill="#f2ae3c" opacity="0.06" />
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
      <defs>
        <linearGradient id="mine-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b2a1c" />
          <stop offset="45%" stopColor="#241a13" />
          <stop offset="100%" stopColor="#0d1017" />
        </linearGradient>
        <radialGradient id="mine-forge" cx="50%" cy="60%">
          <stop offset="0%" stopColor="#ff9a52" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#c2622c" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ff9a52" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mine-lantern" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ff9a52" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#mine-rock)" />

      {/* deep gallery behind everything, giving the hall a far wall */}
      <path d="M300 250 H1300 V760 H300 Z" fill="#120d0a" opacity="0.75" />
      <path
        d="M300 250 Q800 190 1300 250 L1300 300 Q800 246 300 300 Z"
        fill="#1a1310"
      />

      {/* hewn rock ceiling with irregular strata */}
      <path
        d="M0 0 H1600 V150 L1520 200 L1430 152 L1330 214 L1230 158 L1120 226 L1010 164 L900 232
           L790 168 L680 228 L570 160 L460 220 L350 156 L240 212 L130 154 L0 208 Z"
        fill="#0f1219"
      />
      <path
        d="M0 60 H1600 V120 L1400 160 L1180 118 L960 170 L740 122 L520 168 L300 120 L100 162 L0 128 Z"
        fill="#1b1710"
        opacity="0.7"
      />

      {/* rock floor with rubble */}
      <path
        d="M0 900 H1600 V748 L1450 712 L1270 756 L1090 718 L900 762 L710 716 L520 758 L330 714
           L150 756 L0 720 Z"
        fill="#100c09"
      />
      {[...Array(14)].map((_, i) => (
        <ellipse
          key={i}
          cx={60 + i * 118}
          cy={790 + ((i * 37) % 60)}
          rx={16 + ((i * 13) % 22)}
          ry={7 + ((i * 5) % 8)}
          fill="#1c1510"
          opacity="0.8"
        />
      ))}

      {/* timber pit props */}
      {[210, 700, 1190].map((x, i) => (
        <g key={i}>
          <rect x={x - 110} y="196" width="252" height="30" rx="4" fill="#2f2216" />
          <rect x={x - 110} y="196" width="252" height="8" rx="4" fill="#3d2d1d" />
          <rect x={x} y="222" width="34" height="520" fill="#2a1e14" />
          <rect x={x} y="222" width="10" height="520" fill="#38281a" />
          {/* iron bracket */}
          <rect x={x - 6} y="300" width="46" height="12" rx="3" fill="#4a3a28" />
        </g>
      ))}

      {/* warm forge glow filling the hall */}
      <ellipse cx="800" cy="520" rx="700" ry="300" fill="url(#mine-forge)" />

      {/* hanging lanterns */}
      {[150, 520, 900, 1290, 1520].map((x, i) => (
        <g key={i} className="scene-flicker" style={{ animationDelay: `${i * 0.63}s` }}>
          <line x1={x} y1="150" x2={x} y2="286" stroke="#3a2c1e" strokeWidth="3" />
          <circle cx={x} cy="300" r="52" fill="url(#mine-lantern)" />
          <path d={`M${x - 13} 288 H${x + 13} L${x + 9} 314 H${x - 9} Z`} fill="#4a3826" />
          <circle cx={x} cy="300" r="7" fill="#ffd48a" />
        </g>
      ))}

      {/* mine cart with glowing crystals, foreground left */}
      <g>
        <path d="M40 812 H300" stroke="#2b2118" strokeWidth="7" />
        {[...Array(9)].map((_, i) => (
          <rect key={i} x={46 + i * 30} y="806" width="9" height="18" fill="#241b13" />
        ))}
        <path d="M70 736 H240 L226 806 H84 Z" fill="#2c2118" />
        <path d="M70 736 H240 L236 752 H74 Z" fill="#3b2c1e" />
        <circle cx="108" cy="812" r="15" fill="#1d1610" />
        <circle cx="202" cy="812" r="15" fill="#1d1610" />
        <g opacity="0.95">
          <polygon points="104,736 124,690 144,736" fill="#f2ae3c" opacity="0.55" />
          <polygon points="140,736 166,678 190,736" fill="#f2ae3c" opacity="0.4" />
          <polygon points="176,736 196,700 214,736" fill="#f2ae3c" opacity="0.5" />
        </g>
        <ellipse cx="155" cy="720" rx="105" ry="52" fill="#f2ae3c" opacity="0.12" />
      </g>

      {/* carved stone gate arch, far right - where the machine leads */}
      <g>
        <path d="M1360 740 V420 Q1470 330 1580 420 V740 Z" fill="#191d26" />
        <path d="M1360 740 V420 Q1470 330 1580 420 V440 Q1470 358 1380 440 V740 Z" fill="#252b38" />
        <rect x="1392" y="452" width="156" height="288" fill="#0b0e14" />
        {[...Array(5)].map((_, i) => (
          <line
            key={i}
            x1="1392"
            y1={492 + i * 56}
            x2="1548"
            y2={492 + i * 56}
            stroke="#161b24"
            strokeWidth="5"
          />
        ))}
        <polygon points="1470,372 1490,398 1470,424 1450,398" fill="#f2ae3c" opacity="0.55" />
      </g>

      {/* foreground rock shoulders, framing the composition */}
      <path d="M0 900 V640 Q90 700 130 900 Z" fill="#0a0d13" />
      <path d="M1600 900 V660 Q1520 720 1490 900 Z" fill="#0a0d13" />
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
        stroke="#f2ae3c"
        strokeWidth="10"
        fill="none"
        opacity="0.75"
        className="scene-cable"
      />
      <path d="M60 812 Q800 502 1540 812" stroke="#f2ae3c" strokeWidth="4" fill="none" opacity="0.4" />
      {[...Array(11)].map((_, i) => {
        const t = i / 10;
        const x = 60 + t * 1480;
        const y = 780 - Math.sin(Math.PI * t) * 300;
        return (
          <g key={i} className="scene-float" style={{ animationDelay: `${i * 0.25}s` }}>
            <line x1={x} y1={y} x2={x} y2={y + 90} stroke="#f2ae3c" strokeWidth="2" opacity="0.35" />
          </g>
        );
      })}
      <ellipse cx="800" cy="520" rx="560" ry="240" fill="#f2ae3c" opacity="0.08" />
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
