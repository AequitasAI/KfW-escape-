import type { CSSProperties } from 'react';
import { AVATAR_PALETTES, getAvatar } from '@kfw-escape/shared';
import type { AvatarGlyph } from '@kfw-escape/shared';
import { useAvatarArt } from '../scenes/sceneArt.js';
import './avatar.css';

/**
 * A companion sigil: wax-seal medallion with a hand-drawn emblem.
 *
 * Drawn rather than photographed on purpose. Thirty portraits would be thirty
 * files to keep in sync; an emblem stays readable at 32 px next to a name in
 * the lobby and at 200 px on the beamer, and it never clashes with the painted
 * backgrounds the way a second illustration style would.
 *
 * A rendered illustration still wins when one exists - drop
 * public/art/avatars/avatar_01.webp (01 to 30) and it takes over.
 */

const INK_WIDTH = 3;

/** Every glyph is drawn inside a 48x48 box around the centre (24, 24). */
const GLYPHS: Record<AvatarGlyph, JSX.Element> = {
  hammer: (
    <>
      <path d="M24 20 v18" />
      <path d="M12 12 h24 a3 3 0 0 1 3 3 v4 a3 3 0 0 1 -3 3 h-24 a3 3 0 0 1 -3 -3 v-4 a3 3 0 0 1 3 -3 z" className="sigil__fill" />
      <path d="M20 22 h8" className="sigil__hole" />
    </>
  ),
  anvil: (
    <>
      <path d="M11 17 h20 l8 6 -8 2 v2 h-20 z" className="sigil__fill" />
      <path d="M20 27 v4" />
      <path d="M13 31 h14 l3 6 h-20 z" className="sigil__fill" />
    </>
  ),
  rune: (
    <>
      <path d="M24 11 v26" />
      <path d="M24 17 l8 -6" />
      <path d="M24 25 l-8 -6" />
      <path d="M24 30 l8 7" />
    </>
  ),
  lantern: (
    <>
      <path d="M24 8 a6 6 0 0 1 6 6" />
      <path d="M15 15 h18 l-3 5 v12 l3 5 h-18 l3 -5 v-12 z" />
      <path d="M24 21 c4 4 4 7 0 10 c-4 -3 -4 -6 0 -10 z" className="sigil__fill" />
    </>
  ),
  key: (
    <>
      <circle cx="18" cy="18" r="6" />
      <path d="M22 22 l13 13" />
      <path d="M31 31 l4 -4" />
      <path d="M35 35 l4 -4" />
    </>
  ),
  gear: (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d="M24 6 v6" transform={`rotate(${i * 45} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="11" />
      <circle cx="24" cy="24" r="4" className="sigil__fill" />
    </>
  ),
  quill: (
    <>
      <path d="M38 9 c-16 3 -23 13 -24 25 c13 -2 23 -10 24 -25 z" className="sigil__fill" />
      <path d="M34 13 l-20 23" className="sigil__hole" />
      <path d="M14 36 l-5 4" />
    </>
  ),
  scroll: (
    <>
      <path d="M16 16 h16 v16 h-16 z" className="sigil__fill" />
      <path d="M20 21 h8 M20 27 h8" className="sigil__hole" />
      <path d="M16 16 m0 -4 a4 4 0 1 0 0 8" />
      <path d="M32 32 m0 4 a4 4 0 1 0 0 -8" />
    </>
  ),
  axe: (
    <>
      <path d="M16 8 v32" />
      <path d="M24 12 c10 1 14 6 14 11 c0 5 -4 10 -14 11 c3 -7 3 -15 0 -22 z" className="sigil__fill" />
      <path d="M30 19 c3 2 4 3 4 4 c0 1 -1 2 -4 4" className="sigil__hole" />
    </>
  ),
  shield: (
    <>
      <path d="M24 10 l12 4 v10 c0 8 -6 12 -12 14 c-6 -2 -12 -6 -12 -14 v-10 z" className="sigil__fill" />
      <path d="M17 22 l7 6 l7 -6" className="sigil__hole" />
    </>
  ),
  tower: (
    <>
      <path d="M15 12 h4 v4 h-4 z M22 12 h4 v4 h-4 z M29 12 h4 v4 h-4 z" className="sigil__fill" />
      <path d="M15 18 h18 v20 h-18 z" className="sigil__fill" />
      <path d="M24 25 m-3 0 a3 3 0 0 1 6 0 v6 h-6 z" className="sigil__hole" />
    </>
  ),
  bridge: (
    <>
      <path d="M9 30 h30 v4 h-30 z" className="sigil__fill" />
      <path d="M12 30 c4 -11 20 -11 24 0" />
      <path d="M15 34 v5 M24 34 v5 M33 34 v5" />
    </>
  ),
  flame: (
    <>
      <path
        d="M24 9 c7 8 11 12 11 18 a11 11 0 0 1 -22 0 c0 -5 3 -8 6 -12 c1 3 2 4 3 5 c1 -4 1 -8 2 -11 z"
        className="sigil__fill"
      />
    </>
  ),
  compass: (
    <>
      <circle cx="24" cy="12" r="3" className="sigil__fill" />
      <path d="M23 15 l-8 23" />
      <path d="M25 15 l8 23" />
      <path d="M19 30 h10" />
    </>
  ),
  crown: (
    <>
      <path d="M12 32 l-2 -16 l8 7 l6 -11 l6 11 l8 -7 l-2 16 z" className="sigil__fill" />
      <path d="M12 35 h24" />
    </>
  ),
  star: (
    <path
      d="M24 9 l4.6 9.8 l10.4 1.4 l-7.6 7.4 l1.9 10.8 l-9.3 -5.2 l-9.3 5.2 l1.9 -10.8 l-7.6 -7.4 l10.4 -1.4 z"
      className="sigil__fill"
    />
  ),
  bell: (
    <>
      <path d="M24 11 a10 10 0 0 1 10 10 v9 h-20 v-9 a10 10 0 0 1 10 -10 z" className="sigil__fill" />
      <path d="M12 33 h24" />
      <circle cx="24" cy="37" r="2.5" className="sigil__fill" />
    </>
  ),
  harp: (
    <>
      <path d="M35 10 c-13 4 -20 14 -21 27" />
      <path d="M13 37 h22" />
      <path d="M21 36 v-8 M26 36 v-12 M31 36 v-17" strokeWidth="2" />
    </>
  ),
  mountain: (
    <>
      <path d="M8 36 l11 -18 l6 9 l5 -8 l10 17 z" className="sigil__fill" />
      <path d="M15 27 l4 -7 l3 5" className="sigil__hole" />
    </>
  ),
  oak: (
    <>
      <circle cx="24" cy="19" r="9" className="sigil__fill" />
      <circle cx="15" cy="24" r="6" className="sigil__fill" />
      <circle cx="33" cy="24" r="6" className="sigil__fill" />
      <path d="M24 27 v12" />
    </>
  ),
  raven: (
    <>
      <path d="M14 33 c-2 -12 7 -21 18 -21 l7 3 l-6 3 c3 6 1 14 -6 17 c-5 2 -11 1 -13 -2 z" className="sigil__fill" />
      <path d="M30 18 a1.6 1.6 0 1 0 0.1 0" className="sigil__hole" />
      <path d="M17 35 l4 4 M25 34 l3 5" />
    </>
  ),
  wolf: (
    <>
      <path d="M13 13 l5 8 h12 l5 -8 l1 12 c0 5 -3 9 -7 11 l-5 4 l-5 -4 c-4 -2 -7 -6 -7 -11 z" className="sigil__fill" />
      <path d="M20 25 v3 M28 25 v3" className="sigil__hole" />
      <path d="M24 33 l-2.5 2.5 h5 z" className="sigil__hole" />
    </>
  ),
  stag: (
    <>
      <path d="M18 24 c0 -4 12 -4 12 0 c0 6 -3 14 -6 14 c-3 0 -6 -8 -6 -14 z" className="sigil__fill" />
      <path d="M19 22 c-3 -4 -3 -8 -5 -10 M17 17 c-3 0 -5 -2 -7 -4" />
      <path d="M29 22 c3 -4 3 -8 5 -10 M31 17 c3 0 5 -2 7 -4" />
      <path d="M22 29 v2 M26 29 v2" className="sigil__hole" />
    </>
  ),
  boat: (
    <>
      <path d="M24 26 v-16" />
      <path d="M26 12 c7 3 9 8 9 13 h-9 z" className="sigil__fill" />
      <path d="M9 29 h30 l-6 9 h-18 z" className="sigil__fill" />
    </>
  ),
  wheel: (
    <>
      <circle cx="24" cy="24" r="14" />
      <circle cx="24" cy="24" r="4" className="sigil__fill" />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d="M24 10 v6" transform={`rotate(${i * 60} 24 24)`} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <path key={`b${i}`} d="M20 10 h8" transform={`rotate(${i * 60 + 30} 24 24)`} />
      ))}
    </>
  ),
  sword: (
    <>
      <path d="M24 8 l4 6 v14 h-8 v-14 z" className="sigil__fill" />
      <path d="M14 30 h20" />
      <path d="M24 30 v8" />
      <circle cx="24" cy="40" r="2.5" className="sigil__fill" />
    </>
  ),
  book: (
    <>
      <path d="M10 14 c6 0 11 1 14 4 v18 c-3 -3 -8 -4 -14 -4 z" className="sigil__fill" />
      <path d="M38 14 c-6 0 -11 1 -14 4 v18 c3 -3 8 -4 14 -4 z" className="sigil__fill" />
      <path d="M24 18 v18" className="sigil__hole" strokeWidth="4" />
    </>
  ),
  coin: (
    <>
      <circle cx="24" cy="24" r="14" className="sigil__fill" />
      <circle cx="24" cy="24" r="9" className="sigil__hole" />
      <path d="M24 19 v10 M21 22 h6" className="sigil__hole" />
    </>
  ),
  lock: (
    <>
      <path d="M17 21 v-4 a7 7 0 0 1 14 0 v4" />
      <path d="M13 21 h22 v17 h-22 z" className="sigil__fill" />
      <circle cx="24" cy="28" r="2.5" className="sigil__hole" />
      <path d="M24 30 v4" className="sigil__hole" />
    </>
  ),
  gate: (
    <>
      <path d="M12 38 v-16 a12 12 0 0 1 24 0 v16 z" className="sigil__fill" />
      <path d="M24 11 v27" className="sigil__hole" />
      <path d="M19 26 h-2 M31 26 h-2" className="sigil__hole" />
    </>
  ),
};

export interface AvatarProps {
  /** sigil index as handed out by the server */
  id: number;
  size?: 'sm' | 'md' | 'lg';
  /** shows the sigil name as a tooltip; off inside lists that print the name */
  title?: boolean;
  className?: string;
}

export function Avatar({ id, size = 'sm', title = true, className }: AvatarProps): JSX.Element {
  const avatar = getAvatar(id);
  const palette = AVATAR_PALETTES[avatar.palette] ?? AVATAR_PALETTES[0]!;
  const art = useAvatarArt(avatar.id);
  const classes = `avatar avatar--${size}${className ? ` ${className}` : ''}`;
  const gradientId = `sigil-grd-${avatar.id}`;

  if (art) {
    return (
      <span
        className={`${classes} avatar--image`}
        role="img"
        aria-label={`Zeichen: ${avatar.name}`}
        style={{ borderColor: palette.rim }}
        {...(title ? { title: avatar.name } : {})}
      >
        <img src={art} alt="" />
      </span>
    );
  }

  return (
    <svg
      viewBox="0 0 48 48"
      className={classes}
      role="img"
      aria-label={`Zeichen: ${avatar.name}`}
      // the ground colour drives the cut-outs, so detail reads on every colourway
      style={{ color: palette.ink, '--sigil-ground': palette.base } as CSSProperties}
    >
      {title ? <title>{avatar.name}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={palette.lit} />
          <stop offset="100%" stopColor={palette.base} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill={`url(#${gradientId})`} />
      <circle cx="24" cy="24" r="22" fill="none" stroke={palette.rim} strokeWidth="2" opacity="0.9" />
      <g
        className="sigil"
        fill="none"
        stroke="currentColor"
        strokeWidth={INK_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[avatar.glyph]}
      </g>
    </svg>
  );
}
