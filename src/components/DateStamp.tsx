import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

type Props = {
  value: string;
  secondaryValue?: string;
};

export default function DateStamp({ value, secondaryValue }: Props) {
  return (
    <View
      testID="date-stamp"
      style={{
        paddingHorizontal: 2,
        paddingVertical: 2,
        gap: 2,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.1}
        style={{
          color: colors.white,
          fontFamily: fonts.bodyMedium,
          fontSize: 15,
          lineHeight: 20,
          fontVariant: ['tabular-nums'],
          textShadowColor: 'rgba(0, 0, 0, 0.3)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
        }}
      >
        {value}
      </Text>
      {secondaryValue ? (
        <Text
          style={{
            color: colors.white,
            fontFamily: fonts.bodyRegular,
            fontSize: 14,
            lineHeight: 18,
            fontVariant: ['tabular-nums'],
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}
        >
          {secondaryValue}
        </Text>
      ) : null}
    </View>
  );
}
