import React from 'react';
import { DimensionValue, View } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  width?: DimensionValue;
  height?: number;
};

export default function FilmStripe({ width = 86, height = 4 }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.mustard }} />
      <View style={{ flex: 1, backgroundColor: colors.filmRed }} />
      <View style={{ flex: 1, backgroundColor: colors.sage }} />
      <View style={{ flex: 1, backgroundColor: colors.filmBlue }} />
    </View>
  );
}
