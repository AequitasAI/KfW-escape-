/**
 * Companion sigils.
 *
 * Nobody picks an avatar: the server hands out a free sigil on join, so the
 * whole room sees the same symbol next to the same name - on the beamer, in the
 * host list and on every phone. Thirty of them means a group of thirty is
 * unambiguous without a single duplicate.
 *
 * A sigil is a glyph plus a colourway. Both are data, not pixels: the client
 * draws them as SVG, so they stay crisp on a projector and cost no assets. A
 * rendered illustration can still take over per sigil - see docs/ARTWORK.md.
 */

export type AvatarGlyph =
  | 'hammer' | 'anvil' | 'rune' | 'lantern' | 'key' | 'gear'
  | 'quill' | 'scroll' | 'axe' | 'shield' | 'tower' | 'bridge'
  | 'flame' | 'compass' | 'crown' | 'star' | 'bell' | 'harp'
  | 'mountain' | 'oak' | 'raven' | 'wolf' | 'stag' | 'boat'
  | 'wheel' | 'sword' | 'book' | 'coin' | 'lock' | 'gate';

export interface AvatarDef {
  /** stable index, also the storage value */
  id: number;
  /** shown as tooltip and read out by screen readers */
  name: string;
  glyph: AvatarGlyph;
  /** index into AVATAR_PALETTES */
  palette: number;
}

/** Warm forge tones only - a cold accent is what makes fantasy read as sci-fi. */
export interface AvatarPalette {
  /** medallion ground, dark end */
  base: string;
  /** medallion ground, lit end */
  lit: string;
  /** the glyph itself */
  ink: string;
  /** rim of the wax seal */
  rim: string;
}

export const AVATAR_PALETTES: readonly AvatarPalette[] = Object.freeze([
  { base: '#3d2a15', lit: '#6b4a20', ink: '#ffd58a', rim: '#e8b23f' }, // brass
  { base: '#2b1f2c', lit: '#553a56', ink: '#f0c8f0', rim: '#c08ac0' }, // amethyst
  { base: '#1f2e26', lit: '#3a5a45', ink: '#bff0c8', rim: '#6fbf84' }, // moss
  { base: '#3a1d19', lit: '#6d3327', ink: '#ffc4a3', rim: '#e0763f' }, // ember
  { base: '#1e2735', lit: '#3a4c66', ink: '#cfe0ff', rim: '#7d9ec9' }, // slate
  { base: '#332a12', lit: '#5f5220', ink: '#fff0b0', rim: '#d9c04a' }, // gold
]);

/**
 * The order is fixed forever: the id is stored per player, so shuffling this
 * list would change which sigil a running session already handed out.
 */
export const AVATARS: readonly AvatarDef[] = Object.freeze(
  (
    [
      ['Hammer der Bauhütte', 'hammer'],
      ['Amboss der Esse', 'anvil'],
      ['Rune des Anfangs', 'rune'],
      ['Laterne der Nachtschicht', 'lantern'],
      ['Schlüssel des Archivs', 'key'],
      ['Zahnrad des Werks', 'gear'],
      ['Feder der Schreibstube', 'quill'],
      ['Rolle der Zusagen', 'scroll'],
      ['Axt der Waldhüter', 'axe'],
      ['Schild der Bürgschaft', 'shield'],
      ['Turm der Prüfung', 'tower'],
      ['Brücke der zwei Welten', 'bridge'],
      ['Flamme der Freigabe', 'flame'],
      ['Zirkel der Planer', 'compass'],
      ['Krone des Aufbaus', 'crown'],
      ['Stern der Nordwacht', 'star'],
      ['Glocke des Ausrufs', 'bell'],
      ['Harfe der Chronisten', 'harp'],
      ['Gipfel der Förderer', 'mountain'],
      ['Eiche des Wiederaufbaus', 'oak'],
      ['Rabe der Botschaft', 'raven'],
      ['Wolf der Grenzwacht', 'wolf'],
      ['Hirsch der Lichtung', 'stag'],
      ['Kahn der Fährleute', 'boat'],
      ['Rad der Mühle', 'wheel'],
      ['Klinge der Testmeister', 'sword'],
      ['Buch der Regeln', 'book'],
      ['Münze der Zusage', 'coin'],
      ['Riegel des Schwarzen Tors', 'lock'],
      ['Tor der zwei Programme', 'gate'],
    ] as const
  ).map(([name, glyph], index) => ({
    id: index,
    name,
    glyph: glyph as AvatarGlyph,
    // three colourways apart, so neighbours in the list never share a ground
    palette: (index * 5) % AVATAR_PALETTES.length,
  })),
);

export const AVATAR_COUNT = AVATARS.length;

/** Never throws: an unknown id falls back to the first sigil. */
export function getAvatar(id: number | null | undefined): AvatarDef {
  if (typeof id !== 'number' || !Number.isInteger(id)) return AVATARS[0] as AvatarDef;
  return (AVATARS[((id % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT] ?? AVATARS[0]) as AvatarDef;
}

export function avatarPalette(id: number | null | undefined): AvatarPalette {
  return AVATAR_PALETTES[getAvatar(id).palette] as AvatarPalette;
}
