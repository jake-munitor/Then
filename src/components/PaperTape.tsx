import React from 'react';
import { View } from 'react-native';

import { colors } from '../theme/colors';

export default function PaperTape() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -12,
        alignSelf: 'center',
        width: 80,
        height: 24,
        backgroundColor: colors.tape,
        opacity: 0.65,
        transform: [{ rotate: '-2deg' }],
        borderRadius: 2,
        zIndex: 2,
      }}
    />
  );
}
