import React from 'react';
import type { ComponentProps } from 'react';
import { Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

type Props = ComponentProps<typeof Text> & {
  size?: number;
};

export default function HandwrittenText({ size = 40, style, ...props }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={1.25}
      {...props}
      style={[
        {
          color: colors.ink,
          fontFamily: fonts.displayRegular,
          fontSize: size,
          lineHeight: Math.ceil(size * 1.12),
          paddingTop: Math.ceil(size * 0.08),
          paddingBottom: Math.ceil(size * 0.1),
          maxWidth: '100%',
          flexShrink: 1,
        },
        style,
      ]}
    />
  );
}
