import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function PaperBackground({ children, style }: Props) {
  return <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</View>;
}
