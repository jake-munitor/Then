import React from 'react';
import { ImageBackground, StyleProp, ViewStyle } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function PaperBackground({ children, style }: Props) {
  return (
    <ImageBackground
      source={require('../../assets/paper-texture.png')}
      resizeMode="repeat"
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      imageStyle={{ opacity: 0.38 }}
    >
      {children}
    </ImageBackground>
  );
}
