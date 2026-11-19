/**
 * Shared control sizing, so the same kind of control is the same size on
 * every screen (Lauren's November 2026 consistency pass).
 */
export const layout = {
  /** Smallest comfortable tap area. Smaller glyphs reach it with hitSlop. */
  touchTarget: 44,
  headerHeight: 44,
  buttonHeight: 48,
  /** Secondary and inline buttons - still a full touch target. */
  buttonHeightCompact: 44,
} as const;

/** Icon sizes. One stroke family (MaterialCommunityIcons outline) throughout. */
export const iconSize = {
  /** Beside small labels: lock, chip glyphs. */
  inline: 14,
  /** Inside buttons and rows. */
  small: 18,
  /** Card actions and header buttons. */
  action: 20,
  /** Navigation: back chevrons, menus, tab bar. */
  nav: 24,
} as const;
