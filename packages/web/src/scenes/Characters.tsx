import { useEffect } from 'react';
import { DWARF_MOOD_ORDER, preloadDwarfMoods, useDwarfArt, useGuardArt } from './sceneArt.js';
import './characters.css';

export type DwarfMood = 'neutral' | 'skeptical' | 'happy';

/**
 * Der Betriebszwerg.
 *
 * Side character, never a depiction of a real person. Drawn as SVG so he stays
 * crisp on a beamer and can be re-coloured through tokens; a final raster
 * illustration can replace him via <Dwarf art="..."> without touching callers.
 *
 * Silhouette follows the concept reference: broad build, mining helmet with a
 * brass lamp, heavy ginger beard, workshop jacket and tool belt.
 */
export function DwarfArt({ mood, className }: { mood: DwarfMood; className?: string }): JSX.Element {
  const art = useDwarfArt(mood);

  // the other moods are fetched up front so the payoff swap does not pop
  useEffect(() => {
    preloadDwarfMoods(DWARF_MOOD_ORDER);
  }, []);

  if (art) {
    return (
      <img
        src={art}
        alt=""
        aria-hidden="true"
        className={`dwarf-art dwarf-art--image dwarf-art--${mood}${className ? ` ${className}` : ''}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 140 180"
      className={`dwarf-art dwarf-art--${mood}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dw-jacket" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a6072" />
          <stop offset="100%" stopColor="#2b3a48" />
        </linearGradient>
        <linearGradient id="dw-helmet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a6a3f" />
          <stop offset="55%" stopColor="#6b5231" />
          <stop offset="100%" stopColor="#4a3820" />
        </linearGradient>
        <linearGradient id="dw-beard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9752f" />
          <stop offset="60%" stopColor="#a85c22" />
          <stop offset="100%" stopColor="#84461a" />
        </linearGradient>
        <radialGradient id="dw-lamp" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fff3d0" />
          <stop offset="45%" stopColor="#ffcc70" />
          <stop offset="100%" stopColor="#ffab3d" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* --- ground shadow --- */}
      <ellipse cx="70" cy="173" rx="42" ry="6" fill="#000" opacity="0.35" />

      {/* --- legs and boots --- */}
      <g fill="#3a2b1e">
        <rect x="46" y="138" width="20" height="26" rx="5" />
        <rect x="74" y="138" width="20" height="26" rx="5" />
      </g>
      <g fill="#241a12">
        <rect x="40" y="158" width="30" height="12" rx="5" />
        <rect x="70" y="158" width="30" height="12" rx="5" />
      </g>

      {/* --- body --- */}
      <path d="M38 92 Q70 82 102 92 L106 142 Q70 150 34 142 Z" fill="url(#dw-jacket)" />
      {/* jacket seam + collar */}
      <path d="M70 88 L70 140" stroke="#1f2b36" strokeWidth="2" opacity="0.7" />
      <path d="M50 89 Q70 101 90 89" fill="none" stroke="#5d7385" strokeWidth="3" strokeLinecap="round" />

      {/* --- belt --- */}
      <rect x="34" y="126" width="72" height="13" rx="4" fill="#2a1e14" />
      <rect x="62" y="127" width="17" height="11" rx="3" fill="#c99a3e" />
      <rect x="66" y="130" width="9" height="5" rx="1.5" fill="#8f6b25" />

      {/* --- arms --- */}
      <g fill="url(#dw-jacket)">
        <path d="M38 96 Q26 112 30 132 L44 132 Q40 112 48 100 Z" />
        <path
          className="dwarf-art__arm-right"
          d="M102 96 Q114 112 110 132 L96 132 Q100 112 92 100 Z"
        />
      </g>
      {/* hands */}
      <circle cx="36" cy="134" r="8" fill="#d9a883" />
      <g className="dwarf-art__hand-right">
        <circle cx="104" cy="134" r="8" fill="#d9a883" />
        {/* thumbs up, only visible in the happy mood */}
        <rect className="dwarf-art__thumb" x="101" y="118" width="6" height="14" rx="3" fill="#d9a883" />
      </g>

      {/* --- beard, the signature silhouette --- */}
      <path
        d="M40 66 Q40 118 70 128 Q100 118 100 66 Q92 96 82 104 Q70 112 58 104 Q48 96 40 66 Z"
        fill="url(#dw-beard)"
      />
      {/* braid strands */}
      <path d="M56 96 Q58 112 62 122" stroke="#8c4c1c" strokeWidth="2.5" fill="none" opacity="0.7" />
      <path d="M84 96 Q82 112 78 122" stroke="#8c4c1c" strokeWidth="2.5" fill="none" opacity="0.7" />
      <path d="M70 104 L70 126" stroke="#8c4c1c" strokeWidth="2.5" opacity="0.55" />

      {/* --- face --- */}
      <path d="M46 46 Q70 38 94 46 L94 74 Q70 88 46 74 Z" fill="#e8b892" />
      {/* cheeks */}
      <circle cx="55" cy="70" r="7" fill="#d98f6a" opacity="0.5" />
      <circle cx="85" cy="70" r="7" fill="#d98f6a" opacity="0.5" />
      {/* nose */}
      <path d="M70 58 Q78 66 70 72 Q62 66 70 58 Z" fill="#dda17c" />

      {/* eyes - the expression lives here */}
      <g className="dwarf-art__eyes">
        <circle className="dwarf-art__eye" cx="58" cy="58" r="3.4" fill="#20242c" />
        <circle className="dwarf-art__eye" cx="82" cy="58" r="3.4" fill="#20242c" />
        <circle cx="59.2" cy="56.8" r="1.1" fill="#fff" opacity="0.85" />
        <circle cx="83.2" cy="56.8" r="1.1" fill="#fff" opacity="0.85" />
      </g>

      {/* brows carry the mood; skeptical raises the right one */}
      <g stroke="#8c4c1c" strokeWidth="3.6" strokeLinecap="round" fill="none">
        <path className="dwarf-art__brow dwarf-art__brow--l" d="M51 49 L66 47" />
        <path className="dwarf-art__brow dwarf-art__brow--r" d="M74 47 L89 49" />
      </g>

      {/* mouth: hidden inside the beard except when he is happy */}
      <path className="dwarf-art__mouth" d="M62 78 Q70 86 78 78" fill="none" stroke="#7a3d16" strokeWidth="3" strokeLinecap="round" />

      {/* --- helmet --- */}
      <path d="M40 50 Q70 16 100 50 L100 56 Q70 48 40 56 Z" fill="url(#dw-helmet)" />
      <rect x="36" y="50" width="68" height="9" rx="4.5" fill="#7a5c36" />
      <path d="M40 50 Q70 22 100 50" fill="none" stroke="#a5814c" strokeWidth="2" opacity="0.6" />
      {/* brass lamp */}
      <circle cx="70" cy="36" r="9" fill="#b98a35" />
      <circle cx="70" cy="36" r="5.5" fill="#ffd98a" />
      <circle className="dwarf-art__lamp-glow" cx="70" cy="36" r="26" fill="url(#dw-lamp)" />
    </svg>
  );
}

/**
 * Der schwarze Wächter am Schwarzen Tor.
 *
 * Epic gatekeeper, deliberately not horror: clean silhouette, cool visor light,
 * no gore, no face. Lowers the sword once the code is accepted.
 */
export function GuardArt({ open, className }: { open: boolean; className?: string }): JSX.Element {
  const art = useGuardArt(open);

  if (art) {
    return (
      <img
        src={art}
        alt=""
        aria-hidden="true"
        className={`guard-art guard-art--image${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 150 210"
      className={`guard-art${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gd-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3644" />
          <stop offset="55%" stopColor="#1a2330" />
          <stop offset="100%" stopColor="#0e141d" />
        </linearGradient>
        <linearGradient id="gd-cloak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2a3c" />
          <stop offset="100%" stopColor="#0a1119" />
        </linearGradient>
        <linearGradient id="gd-blade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9c6d4" />
          <stop offset="100%" stopColor="#63748a" />
        </linearGradient>
      </defs>

      <ellipse cx="75" cy="203" rx="46" ry="7" fill="#000" opacity="0.45" />

      {/* cloak behind everything */}
      <path d="M40 62 Q75 52 110 62 L126 198 Q75 208 24 198 Z" fill="url(#gd-cloak)" />

      {/* torso */}
      <path d="M46 66 Q75 56 104 66 L110 150 Q75 160 40 150 Z" fill="url(#gd-plate)" />
      {/* chest ridges */}
      <path d="M75 62 L75 152" stroke="#3d4c5e" strokeWidth="2" opacity="0.8" />
      <path d="M52 86 Q75 96 98 86" fill="none" stroke="#3d4c5e" strokeWidth="3" />
      <path d="M50 106 Q75 116 100 106" fill="none" stroke="#3d4c5e" strokeWidth="3" />

      {/* pauldrons */}
      <path d="M36 64 Q46 50 62 58 L60 78 Q44 82 36 76 Z" fill="#26313e" />
      <path d="M114 64 Q104 50 88 58 L90 78 Q106 82 114 76 Z" fill="#26313e" />

      {/* legs */}
      <rect x="54" y="150" width="17" height="48" rx="6" fill="#141c26" />
      <rect x="79" y="150" width="17" height="48" rx="6" fill="#141c26" />

      {/* helmet: closed great helm, no face, a single cold visor slit */}
      <path d="M55 14 Q75 4 95 14 L98 44 Q75 54 52 44 Z" fill="url(#gd-plate)" />
      <path d="M55 14 Q75 4 95 14 L96 22 Q75 14 54 22 Z" fill="#37455a" opacity="0.7" />
      <rect className="guard-art__visor" x="58" y="28" width="34" height="5" rx="2.5" />
      {/* crest */}
      <path d="M75 4 Q79 -4 75 -8 Q71 -4 75 4 Z" fill="#37455a" />
      {/* gorget */}
      <path d="M56 46 Q75 56 94 46 L96 62 Q75 70 54 62 Z" fill="#222c39" />

      {/* arms */}
      <path d="M38 74 Q30 106 36 140 L52 140 Q46 106 52 82 Z" fill="url(#gd-plate)" />
      <path d="M112 74 Q120 106 114 140 L98 140 Q104 106 98 82 Z" fill="url(#gd-plate)" />

      {/* the sword, pivoting at the gauntlet */}
      <g className="guard-art__sword">
        <rect x="118" y="52" width="7" height="96" rx="3" fill="url(#gd-blade)" />
        <path d="M118 148 L125 148 L121.5 160 Z" fill="#63748a" />
        <rect x="109" y="46" width="25" height="7" rx="3" fill="#4a5a6e" />
        <rect x="118" y="30" width="7" height="18" rx="3" fill="#3a4757" />
        <circle cx="121.5" cy="28" r="5" fill="#4a5a6e" />
        <circle className="guard-art__pommel" cx="121.5" cy="28" r="2.4" />
      </g>
    </svg>
  );
}
