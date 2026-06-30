import React from 'react';
import { Platform, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

type Props = {
  value: string;
  tone?: 'chip' | 'amber';
};

export default function DateStamp({ value, tone = 'chip' }: Props) {
  const isAmber = tone === 'amber';
  const displayValue = formatCameraDate(value);
  return (
    <View
      testID="date-stamp"
      style={{
        paddingHorizontal: isAmber ? 2 : 9,
        paddingVertical: isAmber ? 2 : 5,
        borderRadius: 7,
        backgroundColor: isAmber ? 'transparent' : colors.overlayChip,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.1}
        style={{
          color: isAmber ? colors.dateAmber : colors.white,
          fontFamily: isAmber
            ? fonts.cameraBold
            : Platform.select({ ios: 'Courier', android: 'monospace', default: 'Courier New' }),
          fontSize: isAmber ? 12 : 10,
          lineHeight: isAmber ? 14 : 12,
          letterSpacing: 1.15,
          fontVariant: ['tabular-nums'],
          textShadowColor: isAmber ? 'rgba(22, 17, 12, 0.9)' : 'rgba(47, 42, 38, 0.55)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: isAmber ? 2.4 : 1.6,
        }}
      >
        {displayValue}
      </Text>
    </View>
  );
}

function formatCameraDate(value: string) {
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = isoDate
    ? new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]))
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.toUpperCase();
  const month = parsed.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const day = String(parsed.getDate()).padStart(2, '0');
  const year = String(parsed.getFullYear()).slice(-2);
  return `${month} ${day} '${year}`;
}
