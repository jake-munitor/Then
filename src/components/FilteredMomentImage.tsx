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
  imageOpacity: number;
  overlays: FilterOverlay[];
};

const FILTER_LOOKS: Record<PhotoFilter, FilterLook> = {
  normal: {
    backgroundColor: colors.surfaceWarm,
    imageOpacity: 1,
    overlays: [],
  },
  film: {
    backgroundColor: '#E8C88C',
    imageOpacity: 0.91,
    overlays: [
      { id: 'amber-wash', style: { backgroundColor: '#D58A3A', bottom: 0, opacity: 0.2, right: 0 } },
      { id: 'cream-lift', style: { backgroundColor: '#FFF2CE', bottom: 0, opacity: 0.15, right: 0 } },
      { id: 'matte-fade', style: { backgroundColor: '#2A211B', bottom: 0, opacity: 0.04, right: 0 } },
      { id: 'soft-edge', style: { borderColor: '#2A211B', borderWidth: 10, bottom: 0, opacity: 0.08, right: 0 } },
    ],
  },
  sunfade: {
    backgroundColor: '#F1D6B8',
    imageOpacity: 0.8,
    overlays: [
      { id: 'peach-wash', style: { backgroundColor: '#E9A56E', bottom: 0, opacity: 0.2, right: 0 } },
      { id: 'paper-haze', style: { backgroundColor: '#FFFDF7', bottom: 0, opacity: 0.14, right: 0 } },
      {
        id: 'light-leak',
        style: {
          backgroundColor: '#F4C16E',
          height: '22%',
          opacity: 0.2,
          right: 0,
        },
      },
    ],
  },
  coolFlash: {
    backgroundColor: '#C7DCDC',
    imageOpacity: 0.9,
    overlays: [
      { id: 'blue-wash', style: { backgroundColor: '#517789', bottom: 0, opacity: 0.18, right: 0 } },
      { id: 'flash-haze', style: { backgroundColor: '#FFFDF7', bottom: 0, opacity: 0.1, right: 0 } },
      {
        id: 'side-flash',
        style: {
          backgroundColor: '#FFFFFF',
          opacity: 0.14,
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

  return (
    <View testID={testID} style={[styles.frame, { backgroundColor: look.backgroundColor }, style]}>
      <Image
        source={{ uri }}
        resizeMode={resizeMode}
        style={[styles.image, { aspectRatio, opacity: look.imageOpacity }]}
        accessibilityLabel={accessibilityLabel}
      />
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
