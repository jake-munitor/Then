/**
 * Lauren's November 2026 colour system. These seven are the only hues in the
 * app chrome; every token below is one of them or a tint mixed from them, so a
 * palette change is made here and nowhere else.
 *
 * Target balance: ~75% neutrals (ivory, cream, taupe), ~15% brown and
 * terracotta, ~7% blush, ~3% champagne gold. No pure white, cool grey, bright
 * pink, saturated gold or metallic effects on surfaces.
 */
export const palette = {
  warmIvory: '#F3EFE6',
  softCream: '#F8F5EF',
  mutedTaupe: '#A3978C',
  warmBrown: '#51483F',
  dustyBlush: '#E8C9C5',
  champagneGold: '#D8C0A0',
  mutedTerracotta: '#B97459',
} as const;

export const colors = {
  // Paper: the app background and the polaroid frame share one ivory, the way
  // a print sits on an album page. Cards separate from the page by shadow and
  // edge (see PolaroidFrame), not by a colour step.
  background: palette.warmIvory,
  paper: palette.warmIvory,
  polaroid: palette.warmIvory,
  backPaper: palette.warmIvory,
  // Elevated cards and content surfaces sit a step lighter than the page.
  surface: palette.softCream,
  // Wells inside a cream card (inputs, secondary buttons) drop back to ivory.
  surfaceInset: palette.warmIvory,
  surfaceWarm: palette.dustyBlush,
  // Shown behind a photo while it loads: ivory shaded toward taupe.
  photoBg: '#E9E3D8',
  photoMatBorder: 'rgba(243, 239, 230, 0.75)',

  // Borders are taupe mixed into ivory at ~45% / ~30% / ~70%.
  border: '#CFC7BE',
  borderInset: '#DBD5CB',
  borderStrong: '#BBB1A7',
  borderWarm: palette.champagneGold,

  // Text. Taupe on ivory is 2.5:1 - fine for inactive icons, labels and
  // placeholders, too faint for sentences. The two middle tones are brown
  // mixed toward taupe so running text keeps roughly 4.5:1 or better.
  textPrimary: palette.warmBrown,
  textSecondary: '#695F56',
  textMuted: '#7A7067',
  textFaint: palette.mutedTaupe,
  textFaintest: '#B8AEA4',
  ink: palette.warmBrown,

  primary: palette.mutedTerracotta,
  accentSoft: palette.dustyBlush,
  gold: palette.champagneGold,
  navBar: 'rgba(248, 245, 239, 0.94)',
  overlayChip: 'rgba(28,24,20,0.42)',
  toggleOff: '#CFC7BE',

  // One warm neutral for every shadow in the app - never black.
  shadow: '#6B5444',

  // Film artefacts drawn on or beside photos, deliberately outside the UI
  // palette: the camera date imprint and the retro film stripe.
  dateAmber: '#C9A46A',
  mustard: palette.champagneGold,
  sage: '#5E7355',
  filmBlue: '#517789',
  filmRed: '#A94E3A',

  error: '#A45B52',
  danger: '#A45B52',
  // Text and glyphs on terracotta or over photos only - never a surface.
  white: '#FFFFFF',
} as const;
