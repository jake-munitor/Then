import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

type Props = {
  value: string;
};

export default function DateStamp({ value }: Props) {
  return (
    <View
      testID="date-stamp"
      style={{
        paddingHorizontal: 4,
        paddingVertical: 2,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.1}
        style={{
          color: colors.white,
          fontFamily: fonts.bodyMedium,
          fontSize: 12,
          lineHeight: 15,
          letterSpacing: 1.3,
          fontVariant: ['tabular-nums'],
          textTransform: 'uppercase',
          textShadowColor: 'rgba(0, 0, 0, 0.48)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 5,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
