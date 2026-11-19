import React, { useEffect, useRef } from 'react';
import { Animated, useWindowDimensions, View } from 'react-native';

import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import PolaroidFrame, { PrintShadow } from './PolaroidFrame';

/**
 * A blank polaroid with a slow warm shimmer - shown only during a screen's
 * true first load, so waiting reads as a print developing rather than a
 * spinner. Cached revisits skip this entirely.
 */
export default function SkeletonPolaroid({ width }: { width?: number }) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = width ?? Math.min(Math.max(windowWidth - 36, 286), 430);
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <PrintShadow style={{ width: cardWidth, alignSelf: 'center', marginBottom: 22 }}>
      <PolaroidFrame>
        <View accessibilityLabel="Loading moments">
          <Animated.View
            style={{ width: '100%', aspectRatio: 1, borderRadius: radius.printPhoto, backgroundColor: colors.photoBg, opacity: pulse }}
          />
          <Animated.View
            style={{ marginTop: 18, height: 15, width: '58%', borderRadius: 4, backgroundColor: colors.photoBg, opacity: pulse }}
          />
          <Animated.View
            style={{ marginTop: 12, height: 20, width: '34%', borderRadius: 4, backgroundColor: colors.photoBg, opacity: pulse }}
          />
        </View>
      </PolaroidFrame>
    </PrintShadow>
  );
}
