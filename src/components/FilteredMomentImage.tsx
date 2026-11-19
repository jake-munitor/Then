import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme/colors';
import { normalizePhotoFilter, type PhotoFilter } from '../utils/photoFilters';

type FilterOverlay = {
  id: string;
  style: ViewStyle;
};

type GradeLayer = {
  id: string;
  mode: NonNullable<ViewStyle['mixBlendMode']>;
  /** Flat colour with its strength in the alpha channel. */
  color: string;
};

type FilterLook = {
  backgroundColor: string;
  /**
   * The colour grade, as flat blend layers laid over the photo.
   *
   * These looks were first specified as filter chains (sepia, saturate,
   * contrast, hue-rotate). On iOS, React Native applies only `brightness`
   * and `opacity` from `filter` and silently drops the rest, so on an iPhone
   * every tone was a brightness nudge and nothing more. Blend modes do work
   * on iOS, so each chain is reproduced here with layers fitted numerically
   * to the original chain: W3C blend maths against the CSS filter maths, on
   * pixels sampled from nine real photographs, then checked on three photos
   * the fit never saw. Mean error against the designed look, per channel on
   * a 0-255 scale, before -> after (held-out photos in brackets):
   *   film       9.3 -> 2.6   (8.2 -> 1.3)
   *   sunfade    9.7 -> 1.9   (13.6 -> 1.1)
   *   cool flash 6.0 -> 2.9   (5.3 -> 2.5)
   * Cool flash keeps the largest gap because a hue rotation cannot be built
   * from flat layers. The colours look odd in isolation (a mauve "tone",
   * olive highlights); they are fitted as a set and only make sense together.
   *
   * No layer goes above 50% alpha and the photo stays fully opaque
   * underneath, so a blend mode that failed to apply would show as a heavy
   * wash, never a covered photo.
   */
  grade: GradeLayer[];
  /**
   * Kept for the character a tone curve cannot express - light leaks, edge
   * falloff, flash spill.
   */
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
    // Warm classic stock: gentle sepia bias, richer colour, a little more bite.
    grade: [
      { id: 'tone', mode: 'color', color: 'rgba(172, 94, 136, 0.131)' },
      { id: 'highlights', mode: 'color-dodge', color: 'rgba(47, 54, 23, 0.5)' },
      { id: 'shadows', mode: 'color-burn', color: 'rgba(219, 236, 223, 0.5)' },
    ],
    overlays: [
      { id: 'amber-wash', style: { backgroundColor: '#D58A3A', bottom: 0, opacity: 0.08, right: 0 } },
      { id: 'matte-fade', style: { backgroundColor: '#2A211B', bottom: 0, opacity: 0.03, right: 0 } },
      { id: 'soft-edge', style: { borderColor: '#2A211B', borderWidth: 10, bottom: 0, opacity: 0.06, right: 0 } },
    ],
  },
  sunfade: {
    backgroundColor: '#F1D6B8',
    // Sun-bleached: lifted blacks (low contrast), pulled colour, warm and bright.
    grade: [
      { id: 'tone', mode: 'color', color: 'rgba(17, 4, 7, 0.426)' },
      { id: 'lifted-blacks', mode: 'screen', color: 'rgba(43, 43, 43, 0.366)' },
      { id: 'glow', mode: 'color-dodge', color: 'rgba(42, 44, 16, 0.5)' },
    ],
    overlays: [
      { id: 'peach-wash', style: { backgroundColor: '#E9A56E', bottom: 0, opacity: 0.1, right: 0 } },
      {
        id: 'light-leak',
        style: {
          backgroundColor: '#F4C16E',
          height: '22%',
          opacity: 0.14,
          right: 0,
        },
      },
    ],
  },
  coolFlash: {
    backgroundColor: '#C7DCDC',
    // Direct flash: cooler hue, slightly desaturated, crisp and bright.
    grade: [
      { id: 'cool-cast', mode: 'color', color: 'rgba(137, 94, 137, 0.095)' },
      { id: 'highlights', mode: 'color-dodge', color: 'rgba(42, 43, 37, 0.5)' },
      { id: 'shadows', mode: 'color-burn', color: 'rgba(222, 236, 230, 0.5)' },
    ],
    overlays: [
      { id: 'blue-wash', style: { backgroundColor: '#517789', bottom: 0, opacity: 0.08, right: 0 } },
      {
        id: 'side-flash',
        style: {
          backgroundColor: '#FFFFFF',
          opacity: 0.09,
          width: '24%',
        },
      },
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
          style={[styles.grade, { backgroundColor: layer.color, mixBlendMode: layer.mode }]}
        />
      ))}
      {look.overlays.map((overlay) => (
        <View
          key={overlay.id}
          pointerEvents="none"
          testID={testID ? `${testID}-filter-${selectedFilter}-${overlay.id}` : undefined}
          style={[styles.overlay, overlay.style]}
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
  grade: {
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
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
