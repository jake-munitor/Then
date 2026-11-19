import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { colors } from '../theme/colors';
import { PaperTexture } from './PolaroidFrame';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * The album page every screen sits on: warm ivory with a faint static grain.
 * Lighter than the grain on a print so cards still read as separate objects.
 */
export default function PaperBackground({ children, style }: Props) {
  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      <PaperTexture grain={0.035} tone={0.03} />
      {children}
    </View>
  );
}
