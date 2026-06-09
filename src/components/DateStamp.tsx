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
        backgroundColor: 'rgba(250, 248, 244, 0.9)',
        borderColor: colors.border,
        borderWidth: 1,
        paddingHorizontal: 7,
        paddingVertical: 4,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.1}
        style={{
          color: colors.textPrimary,
          fontFamily: fonts.dateStamp,
          fontSize: 10,
          lineHeight: 13,
          fontVariant: ['tabular-nums'],
          textTransform: 'uppercase',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
