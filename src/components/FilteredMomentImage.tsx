import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme/colors';
import { normalizePhotoFilter, type PhotoFilter } from '../utils/photoFilters';

type FilterOverlay = {
  id: string;
  style: ViewStyle;
};

type FilterLook = {
  backgroundColor: string;
  /**
   * Real colour grading, applied to the photo itself. These looks used to be
   * built by dropping the image's opacity so the beige card showed through,
   * which washed the contrast out and read as hazy rather than filmic. RN 0.81
   * (new architecture, which this app enables) supports actual filter
   * primitives, so the photo now stays fully opaque and gets graded instead.
   */
  filters: ViewStyle['filter'];
  /**
   * Kept for the character a tone curve cannot express - light leaks, edge
   * falloff, flash spill. Much lighter than before, since grading now does the
   * heavy lifting rather than these sitting on top of a washed-out image.
   */
  overlays: FilterOverlay[];
};

const FILTER_LOOKS: Record<PhotoFilter, FilterLook> = {
  normal: {
    backgroundColor: colors.surfaceWarm,
    filters: [],
    overlays: [],
  },
  film: {
    backgroundColor: '#E8C88C',
    // Warm classic stock: gentle sepia bias, richer colour, a little more bite.
    filters: [{ sepia: 0.2 }, { saturate: 1.1 }, { contrast: 1.12 }, { brightness: 1.02 }],
    overlays: [
      { id: 'amber-wash', style: { backgroundColor: '#D58A3A', bottom: 0, opacity: 0.08, right: 0 } },
      { id: 'matte-fade', style: { backgroundColor: '#2A211B', bottom: 0, opacity: 0.03, right: 0 } },
      { id: 'soft-edge', style: { borderColor: '#2A211B', borderWidth: 10, bottom: 0, opacity: 0.06, right: 0 } },
    ],
  },
  sunfade: {
    backgroundColor: '#F1D6B8',
    // Sun-bleached: lifted blacks (low contrast), pulled colour, warm and bright.
    filters: [{ sepia: 0.3 }, { saturate: 0.82 }, { contrast: 0.88 }, { brightness: 1.1 }],
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
    filters: [{ saturate: 0.92 }, { contrast: 1.1 }, { brightness: 1.05 }, { hueRotate: '-8deg' }],
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
  resizeMode?: React.ComponentProps<typeof Image>['resizeMode'];
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
  const hasGrading = Array.isArray(look.filters) && look.filters.length > 0;

  return (
    <View testID={testID} style={[styles.frame, { backgroundColor: look.backgroundColor }, style]}>
      {/* The grade lives on a wrapper View: RN types expose `filter` on
          ViewStyle, not ImageStyle. */}
      <View style={hasGrading ? { width: '100%', filter: look.filters } : styles.ungraded}>
        <Image
          source={{ uri }}
          resizeMode={resizeMode}
          style={[styles.image, { aspectRatio }]}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
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
  },
  ungraded: {
    width: '100%',
  },
  image: {
    width: '100%',
    backgroundColor: colors.surfaceWarm,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
