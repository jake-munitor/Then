import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme/colors';
import { radius } from '../theme/radius';

const GRAIN = require('../../assets/textures/paper-grain.png');
const TONE = require('../../assets/textures/paper-tone.png');

// Static images default to their intrinsic size, which beats left/right/
// top/bottom - so a fill has to be spelled as explicit 100% dimensions.
const fill = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' } as const;

const TONE_FLIPS = [
  undefined,
  [{ scaleX: -1 }],
  [{ scaleY: -1 }],
  [{ scaleX: -1 }, { scaleY: -1 }],
] as const;

/** Stable 0-3 from an id, so each print keeps its own paper between renders. */
export function paperVariant(seed: string | undefined): number {
  if (!seed) return 0;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  return hash % TONE_FLIPS.length;
}

/**
 * Paper surface: a fine tiled grain plus one soft, non-repeating tonal wash.
 * Both are static images - nothing here animates or re-renders.
 */
export function PaperTexture({
  grain = 0.055,
  tone = 0.05,
  variant = 0,
}: {
  /** Peak grain strength. Cards 3-6%, backgrounds 2-4%. */
  grain?: number;
  tone?: number;
  variant?: number;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={TONE}
        resizeMode="stretch"
        fadeDuration={0}
        style={[fill, { opacity: tone, transform: TONE_FLIPS[variant % TONE_FLIPS.length] as any }]}
      />
      <Image source={GRAIN} resizeMode="repeat" fadeDuration={0} style={[fill, { opacity: grain }]} />
    </View>
  );
}

/**
 * Three stacked shadows, the way a print sits on a page: a broad ambient
 * haze, a soft directional shadow a few points down, and a tight contact
 * line under the lower edge. Each layer carries an opaque background so iOS
 * can use a shadow path instead of rendering the shadow from content.
 */
export function PrintShadow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.layer, styles.ambient, style]}>
      <View style={[styles.layer, styles.directional]}>
        <View style={[styles.layer, styles.contact]}>{children}</View>
      </View>
    </View>
  );
}

type FrameProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Pass paperVariant(moment.id) so neighbouring prints don't share a wash. */
  variant?: number;
};

/**
 * The warm ivory polaroid frame, shared by the feed card, both sides of the
 * detail print, the composer and the loading skeleton so they are one object.
 * Narrow top and side borders; the caption area below the photo forms the
 * deep bottom border.
 */
export default function PolaroidFrame({ children, style, testID, variant = 0 }: FrameProps) {
  return (
    <View testID={testID} style={[styles.frame, style]}>
      <PaperTexture variant={variant} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    borderRadius: radius.print,
    backgroundColor: colors.polaroid,
    shadowColor: colors.shadow,
  },
  ambient: {
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  directional: {
    shadowOpacity: 0.09,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  contact: {
    shadowOpacity: 0.16,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  frame: {
    backgroundColor: colors.polaroid,
    borderRadius: radius.print,
    overflow: 'hidden',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 16,
    // Paper edge: light catches the top and left, the lower and right edges
    // fall into shade. One point each - it reads as thickness, not a border.
    borderWidth: 1,
    borderTopColor: 'rgba(255, 252, 246, 0.95)',
    borderLeftColor: 'rgba(255, 252, 246, 0.7)',
    borderRightColor: 'rgba(107, 84, 68, 0.10)',
    borderBottomColor: 'rgba(107, 84, 68, 0.18)',
  },
});
