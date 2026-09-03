import { useEffect } from 'react';
import { DWARF_MOOD_ORDER, preloadDwarfMoods, useDwarfArt, useGuardArt } from './sceneArt.js';
import './characters.css';

export type DwarfMood = 'neutral' | 'skeptical' | 'happy';

/**
 * Character art in the spirit of a classic painted point-and-click adventure:
 * heavy dark outlines, exaggerated cartoon proportions (large head, huge nose,
 * stubby body), warm saturated colours, few but very readable shapes.
 *
 * Explicitly NOT the flat geometric look an interface drifts towards on its
 * own - that, plus a cold accent colour, is what makes a fantasy game read as
 * science fiction.
 *
 * Both figures are side characters, never depictions of real people. A final
 * raster illustration replaces either one by dropping a file into
 * public/art/characters/ - see docs/ARTWORK.md.
 */

const INK = '#2b1a10';

/* ------------------------------------------------------------------ */
/* Der Betriebszwerg                                                   */
/* ------------------------------------------------------------------ */

export function DwarfArt({ mood, className }: { mood: DwarfMood; className?: string }): JSX.Element {
  // one hook per mood, fixed order, so all three resolve up front
  const neutral = useDwarfArt('neutral');
  const skeptical = useDwarfArt('skeptical');
  const happy = useDwarfArt('happy');
  const byMood: Record<DwarfMood, string | null> = { neutral, skeptical, happy };
  const art = byMood[mood];

  useEffect(() => {
    preloadDwarfMoods(DWARF_MOOD_ORDER);
  }, []);

  if (art) {
    /*
     * All available moods are stacked and cross-faded rather than swapped.
     * A hard src change flashes on the very frame the machine starts - the one
     * moment the dwarf is supposed to carry. Duplicate paths are collapsed, so
     * a single supplied file costs a single layer.
     */
    const layers = [...new Set(DWARF_MOOD_ORDER.map((m) => byMood[m]).filter(Boolean))] as string[];
    return (
      <span
        className={`dwarf-art dwarf-art--image dwarf-art--${mood}${className ? ` ${className}` : ''}`}
        aria-hidden="true"
      >
        {layers.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`dwarf-art__layer${src === art ? ' is-current' : ''}`}
          />
        ))}
      </span>
    );
  }

  return (
    <svg
      viewBox="0 0 160 200"
      className={`dwarf-art dwarf-art--${mood}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dw-tunic" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d8a4a" />
          <stop offset="100%" stopColor="#48602f" />
        </linearGradient>
        <linearGradient id="dw-beard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e08a37" />
          <stop offset="55%" stopColor="#c26f26" />
          <stop offset="100%" stopColor="#9c531a" />
        </linearGradient>
        <linearGradient id="dw-helm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a7442" />
          <stop offset="100%" stopColor="#5d4526" />
        </linearGradient>
        <radialGradient id="dw-lamp" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="40%" stopColor="#ffce6a" />
          <stop offset="100%" stopColor="#ffab3d" stopOpacity="0" />
        </radialGradient>
        {/* skin and cloth get a lit side and a shadow side rather than one flat fill */}
        <linearGradient id="dw-skin" x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#f7c398" />
          <stop offset="60%" stopColor="#e8ab7c" />
          <stop offset="100%" stopColor="#c98459" />
        </linearGradient>
        <linearGradient id="dw-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3a1f0c" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/*
        Drawing order matters and is the whole trick: body, then the beard mass,
        then the head on top of it. What stays visible is a beard framing the
        face - no cut-out shapes needed, and the face can never be swallowed.
      */}
      <g stroke={INK} strokeWidth="4.5" strokeLinejoin="round">
        <ellipse cx="80" cy="190" rx="42" ry="6" fill="#000" opacity="0.4" stroke="none" />

        {/* stubby legs and heavy boots */}
        <rect x="60" y="152" width="16" height="20" rx="5" fill="#7a5a34" />
        <rect x="84" y="152" width="16" height="20" rx="5" fill="#7a5a34" />
        <path d="M50 170 h30 a6 6 0 0 1 6 6 v6 h-42 v-6 a6 6 0 0 1 6 -6 z" fill="#4a3320" />
        <path d="M80 170 h30 a6 6 0 0 1 6 6 v6 h-42 v-6 a6 6 0 0 1 6 -6 z" fill="#4a3320" />

        {/* barrel body, wide belt, brass buckle */}
        <path d="M46 112 Q80 102 114 112 L120 156 Q80 166 40 156 Z" fill="url(#dw-tunic)" />
        <rect x="38" y="140" width="84" height="14" rx="5" fill="#5a3d22" strokeWidth="4" />
        <rect x="70" y="141" width="20" height="12" rx="4" fill="#e0a93f" strokeWidth="3.5" />

        {/* short arms and chunky mitts */}
        <path d="M46 116 Q32 128 36 148 L50 148 Q46 130 54 122 Z" fill="url(#dw-tunic)" />
        <path d="M114 116 Q128 128 124 148 L110 148 Q114 130 106 122 Z" fill="url(#dw-tunic)" />
        <circle cx="40" cy="152" r="10" fill="url(#dw-skin)" />
      </g>

      <g className="dwarf-art__hand-right" stroke={INK} strokeWidth="4.5" strokeLinejoin="round">
        <circle cx="120" cy="152" r="10" fill="url(#dw-skin)" />
        {/* thumbs up, happy mood only */}
        <rect className="dwarf-art__thumb" x="115" y="130" width="9" height="18" rx="4.5" fill="url(#dw-skin)" />
      </g>

      <g stroke={INK} strokeWidth="4.5" strokeLinejoin="round">
        {/* the beard, hanging from the jaw and ending above the belt */}
        <path d="M44 70 C 40 118, 58 134, 80 134 C 102 134, 120 118, 116 70 Z" fill="url(#dw-beard)" />
        {/* head, laid over the beard */}
        <path d="M48 46 Q48 30 80 28 Q112 30 112 46 L112 76 Q80 96 48 76 Z" fill="url(#dw-skin)" />
      </g>

      <circle cx="58" cy="72" r="7" fill="#dd8a5c" opacity="0.5" />
      <circle cx="102" cy="72" r="7" fill="#dd8a5c" opacity="0.5" />

      <g className="dwarf-art__eyes">
        <circle className="dwarf-art__eye" cx="66" cy="56" r="4.4" fill={INK} />
        <circle className="dwarf-art__eye" cx="94" cy="56" r="4.4" fill={INK} />
        <circle cx="67.6" cy="54.4" r="1.5" fill="#fff" opacity="0.9" />
        <circle cx="95.6" cy="54.4" r="1.5" fill="#fff" opacity="0.9" />
      </g>

      {/* brows carry the mood */}
      <g stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
        <path className="dwarf-art__brow dwarf-art__brow--l" d="M57 45 L74 43" />
        <path className="dwarf-art__brow dwarf-art__brow--r" d="M86 43 L103 45" />
      </g>

      {/* the bulbous adventure-game nose */}
      <path
        d="M80 58 Q93 63 93 71 Q93 80 80 80 Q67 80 67 71 Q67 63 80 58 Z"
        fill="url(#dw-skin)"
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* moustache, deliberately below the nose so it can never cover the face */}
      <path
        d="M58 82 Q80 76 102 82 Q90 94 80 89 Q70 94 58 82 Z"
        fill="url(#dw-beard)"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* the grin, revealed only once the machine runs */}
      <path className="dwarf-art__mouth" d="M68 92 Q80 102 92 92 Q80 97 68 92 Z" fill="#5a2810" />

      {/* mining helmet with a brass lamp */}
      <g stroke={INK} strokeWidth="4.5" strokeLinejoin="round">
        <path d="M38 42 Q80 4 122 42 L122 48 Q80 36 38 48 Z" fill="url(#dw-helm)" />
        <rect x="34" y="40" width="92" height="11" rx="5.5" fill="#8a6739" strokeWidth="4" />
        <circle cx="80" cy="26" r="11" fill="#c9963c" strokeWidth="4" />
      </g>
      <circle cx="80" cy="26" r="5.5" fill="#ffe6a8" />
      <circle className="dwarf-art__lamp-glow" cx="80" cy="26" r="26" fill="url(#dw-lamp)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Der Schwarze Wächter                                                */
/* ------------------------------------------------------------------ */

/**
 * A storybook knight, not a machine: a real great helm with a breathing grille
 * and warm torchlight behind the eye slot. The earlier version had a single
 * glowing horizontal visor slit, which reads as a robot and was the strongest
 * science-fiction cue in the whole game.
 */
export function GuardArt({ open, className }: { open: boolean; className?: string }): JSX.Element {
  const closedArt = useGuardArt(false);
  const openArt = useGuardArt(true);
  const art = open ? openArt : closedArt;

  if (art) {
    const layers = [...new Set([closedArt, openArt].filter(Boolean))] as string[];
    return (
      <span
        className={`guard-art guard-art--image${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
        aria-hidden="true"
      >
        {layers.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`guard-art__layer${src === art ? ' is-current' : ''}`}
          />
        ))}
      </span>
    );
  }

  return (
    <svg
      viewBox="-6 -22 172 248"
      className={`guard-art${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gd-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5a5f6b" />
          <stop offset="45%" stopColor="#3a3f4a" />
          <stop offset="100%" stopColor="#22262e" />
        </linearGradient>
        <linearGradient id="gd-cloak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d2b2b" />
          <stop offset="100%" stopColor="#3a1414" />
        </linearGradient>
        <linearGradient id="gd-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c8cdd6" />
          <stop offset="50%" stopColor="#8f97a4" />
          <stop offset="100%" stopColor="#5c636e" />
        </linearGradient>
        {/* torchlight from the lower left, moonlight from behind */}
        <linearGradient id="gd-torch" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff9a3c" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#ff9a3c" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="80" cy="212" rx="48" ry="7" fill="#000" opacity="0.45" />

      {/* deep red cloak, the warm counterweight to all the steel */}
      <path
        d="M40 66 Q80 54 120 66 L136 206 Q80 216 24 206 Z"
        fill="url(#gd-cloak)"
        stroke={INK}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />

      <g stroke={INK} strokeWidth="4.5" strokeLinejoin="round">
        {/* legs */}
        <rect x="56" y="156" width="20" height="50" rx="7" fill="#2b3038" />
        <rect x="84" y="156" width="20" height="50" rx="7" fill="#2b3038" />

        {/* breastplate */}
        <path d="M46 70 Q80 58 114 70 L120 158 Q80 170 40 158 Z" fill="url(#gd-steel)" />

        {/* tabard with a simple heraldic band */}
        <path d="M66 66 h28 l-4 92 h-20 z" fill="#8d6a2a" />

        {/* big rounded pauldrons */}
        <path d="M34 70 Q42 50 64 60 L60 84 Q42 88 34 80 Z" fill="url(#gd-steel)" />
        <path d="M126 70 Q118 50 96 60 L100 84 Q118 88 126 80 Z" fill="url(#gd-steel)" />

        {/* arms and gauntlets */}
        <path d="M36 80 Q28 116 34 148 L52 148 Q46 116 52 88 Z" fill="url(#gd-steel)" />
        <path d="M124 80 Q132 116 126 148 L108 148 Q114 116 108 88 Z" fill="url(#gd-steel)" />
        <circle cx="43" cy="152" r="11" fill="#3a3f4a" />
        <circle cx="117" cy="152" r="11" fill="#3a3f4a" />
      </g>

      {/* torchlight wash across the breastplate and the near leg */}
      <path d="M46 70 Q80 58 114 70 L120 158 Q80 170 40 158 Z" fill="url(#gd-torch)" />
      {/* cool moon rim along the right silhouette */}
      <path d="M114 70 Q120 110 120 158 L112 156 Q112 110 108 74 Z" fill="#a9c6e6" opacity="0.3" />

      {/* --- great helm --- */}
      <g stroke={INK} strokeWidth="4.5" strokeLinejoin="round">
        <path d="M54 20 Q80 8 106 20 L108 52 Q80 64 52 52 Z" fill="url(#gd-steel)" />
        {/* struck highlight along the crown, so the helm reads as hammered steel */}
        <path d="M58 22 Q80 12 102 22 L101 28 Q80 19 59 28 Z" fill="#7c828f" strokeWidth="0" opacity="0.7" />
        {/* eye slot, dark - the torchlight sits behind it, it does not emit */}
        <path d="M60 32 h40 v7 h-40 z" fill="#140f0c" strokeWidth="3" />
        {/* breathing grille: the detail that makes it a helmet and not a visor */}
        <g strokeWidth="0" fill="#191410">
          <rect x="70" y="44" width="4" height="10" rx="2" />
          <rect x="78" y="44" width="4" height="10" rx="2" />
          <rect x="86" y="44" width="4" height="10" rx="2" />
        </g>
        {/* gorget */}
        <path d="M56 54 Q80 66 104 54 L106 70 Q80 80 54 70 Z" fill="#2f343d" />
      </g>
      {/* warm eyes behind the slot */}
      <circle className="guard-art__eye" cx="70" cy="35.5" r="2.6" />
      <circle className="guard-art__eye" cx="90" cy="35.5" r="2.6" />

      {/* plume */}
      <path
        d="M80 10 Q72 -8 80 -16 Q88 -8 80 10 Z"
        fill="#8d2f2f"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* the sword, pivoting at the gauntlet */}
      <g className="guard-art__sword" stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path d="M122 56 h11 v92 l-5.5 14 l-5.5 -14 z" fill="url(#gd-blade)" />
        <rect x="110" y="50" width="35" height="9" rx="4" fill="#6b5a3a" />
        <rect x="123" y="32" width="9" height="20" rx="4" fill="#4a4f59" />
        <circle cx="127.5" cy="29" r="6" fill="#c9963c" />
      </g>
    </svg>
  );
}
