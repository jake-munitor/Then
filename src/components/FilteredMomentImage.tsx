import React from 'react';
import { Image, type ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme/colors';
import { normalizePhotoFilter, type PhotoFilter } from '../utils/photoFilters';

/** Soft-edged alpha masks. White pixels; each overlay tints its own. */
const MASKS = {
  vignette: require('../../assets/textures/tone-vignette.png'),
  leak: require('../../assets/textures/tone-leak.png'),
  flash: require('../../assets/textures/tone-flash.png'),
} satisfies Record<string, ImageSourcePropType>;

type FilterOverlay = {
  id: string;
  mask: keyof typeof MASKS;
  color: string;
  /** Strength where the mask is fully opaque. */
  opacity: number;
};

type GradeLayer = {
  id: string;
  /** 'normal' is a plain flat wash; every other mode blends with the photo. */
  mode: NonNullable<ViewStyle['mixBlendMode']>;
  /** Flat colour with its strength in the alpha channel. */
  color: string;
};

type FilterLook = {
  backgroundColor: string;
  /**
   * The colour grade, as flat layers laid over the photo.
   *
   * Never grade with the `filter` style. On iOS, React Native applies only
   * `brightness` and `opacity` from it and silently drops sepia, saturate,
   * contrast and hue-rotate, so the first version of these tones did almost
   * nothing on an iPhone. Blend modes do work on iOS.
   *
   * Each look is designed as plain tone maths, then fitted to layers
   * numerically: W3C blend formulas, on pixels from ten real photographs,
   * checked on three photos the fit never saw. The same maths, run on a
   * phone screenshot of the previous layers, matched the phone to about
   * 1.5 per channel on a 0-255 scale, so the fit predicts what an iPhone
   * draws.
   *
   * Fit error against each design, 0-255 per channel, held-out in brackets:
   *   film 1.9 (1.9), sunfade 0.8 (0.8), cool flash 2.1 (2.0),
   *   black and white 0.5 (0.1).
   *
   * The three colour tones are balanced to move a photo about the same
   * distance from Normal: film 10, sunfade 13, cool flash
   * 11 (mean change per channel, 0-255, overlays included, measured
   * on one reference photo). Before this they ran 7, 24 and 5 on that photo.
   * Keep them level when retuning.
   *
   * The layer colours look odd alone; they are fitted as a set.
   *
   * No layer goes above 50% alpha, so a blend mode that failed to apply
   * would show as a wash and never cover the photo. The one exception is
   * black and white's `silver` layer, which must be opaque to remove all
   * colour. It uses the `color` mode, which the other tones prove on device.
   */
  grade: GradeLayer[];
  /** Soft light and edge falloff: character a flat layer cannot give. */
  overlays: FilterOverlay[];
};

const FILTER_LOOKS: Record<PhotoFilter, FilterLook> = {
  normal: {
    backgroundColor: colors.photoBg,
    grade: [],
    overlays: [],
  },
  film: {
    backgroundColor: '#E8C88C',
    // Warm classic stock: sepia bias, richer colour, more bite, amber wash.
    grade: [
      { id: 'tone', mode: 'color', color: 'rgba(170, 109, 118, 0.209)' },
      { id: 'highlights', mode: 'color-dodge', color: 'rgba(47, 48, 14, 0.5)' },
      { id: 'shadows', mode: 'color-burn', color: 'rgba(202, 223, 217, 0.302)' },
      { id: 'wash', mode: 'normal', color: 'rgba(255, 198, 2, 0.046)' },
    ],
    overlays: [
      { id: 'soft-edge', mask: 'vignette', color: '#2A211B', opacity: 0.2 },
    ],
  },
  sunfade: {
    backgroundColor: '#F1D6B8',
    // Sun-bleached: pulled colour, gently lifted blacks, warm. Not milky.
    grade: [
      { id: 'tone', mode: 'color', color: 'rgba(0, 1, 8, 0.355)' },
      { id: 'glow', mode: 'color-dodge', color: 'rgba(29, 19, 0, 0.49)' },
      { id: 'wash', mode: 'normal', color: 'rgba(198, 157, 92, 0.121)' },
    ],
    overlays: [
      { id: 'light-leak', mask: 'leak', color: '#F6C77A', opacity: 0.12 },
    ],
  },
  coolFlash: {
    backgroundColor: '#C7DCDC',
    // Direct flash: blue-leaning, crisp, bright in the middle, dark at the edge.
    grade: [
      { id: 'cool-cast', mode: 'color', color: 'rgba(165, 147, 204, 0.137)' },
      { id: 'highlights', mode: 'color-dodge', color: 'rgba(0, 45, 61, 0.5)' },
      { id: 'shadows', mode: 'color-burn', color: 'rgba(227, 230, 213, 0.482)' },
      { id: 'wash', mode: 'normal', color: 'rgba(0, 117, 148, 0.014)' },
    ],
    overlays: [
      { id: 'flash-spot', mask: 'flash', color: '#FFFFFF', opacity: 0.07 },
      { id: 'falloff', mask: 'vignette', color: '#0F1A22', opacity: 0.22 },
    ],
  },
  blackAndWhite: {
    backgroundColor: '#D6D5D1',
    // Silver print: no colour, a little extra contrast.
    grade: [
      { id: 'silver', mode: 'color', color: 'rgba(128, 128, 128, 1.0)' },
      { id: 'highlights', mode: 'color-dodge', color: 'rgba(22, 22, 22, 0.5)' },
      { id: 'shadows', mode: 'color-burn', color: 'rgba(232, 232, 232, 0.5)' },
    ],
    overlays: [
      { id: 'soft-edge', mask: 'vignette', color: '#1A1A1A', opacity: 0.18 },
    ],
  },
};

type Props = {
  uri: string;
  filter?: PhotoFilter | string | null;
  aspectRatio?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export default function FilteredMomentImage({
  uri,
  filter,
  aspectRatio = 1,
  resizeMode = 'cover',
  accessibilityLabel,
  style,
  testID,
}: Props) {
  const selectedFilter = normalizePhotoFilter(filter);
  const look = FILTER_LOOKS[selectedFilter];

  return (
    <View testID={testID} style={[styles.frame, { backgroundColor: look.backgroundColor }, style]}>
      <Image
        source={{ uri }}
        resizeMode={resizeMode}
        style={[styles.image, { aspectRatio }]}
        accessibilityLabel={accessibilityLabel}
      />
      {look.grade.map((layer) => (
        <View
          key={layer.id}
          pointerEvents="none"
          testID={testID ? `${testID}-grade-${selectedFilter}-${layer.id}` : undefined}
          style={[
            styles.fill,
            { backgroundColor: layer.color },
            layer.mode === 'normal' ? null : { mixBlendMode: layer.mode },
          ]}
        />
      ))}
      {look.overlays.map((overlay) => (
        <Image
          key={overlay.id}
          source={MASKS[overlay.mask]}
          resizeMode="stretch"
          accessible={false}
          testID={testID ? `${testID}-filter-${selectedFilter}-${overlay.id}` : undefined}
          style={[styles.mask, { tintColor: overlay.color, opacity: overlay.opacity }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    // Blend layers mix with the photo only, never with whatever is behind
    // the frame.
    isolation: 'isolate',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: '100%',
    backgroundColor: colors.photoBg,
  },
  // A static image sizes to its own pixels unless both are set.
  mask: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
});
