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
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 7,
        backgroundColor: colors.overlayChip,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.1}
        style={{
          color: colors.white,
          fontFamily: fonts.bodySemiBold,
          fontSize: 10,
          lineHeight: 12,
          letterSpacing: 1,
          fontVariant: ['tabular-nums'],
          textTransform: 'uppercase',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
