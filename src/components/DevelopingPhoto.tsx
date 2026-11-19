import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';
import { useReducedMotion } from '../utils/motion';
import type { PhotoFilter } from '../utils/photoFilters';
import FilteredMomentImage from './FilteredMomentImage';

const CLOUD = require('../../assets/textures/develop-cloud.png');

/** Lauren's spec: 5-7 seconds from blank to finished. */
export const DEVELOP_DURATION_MS = 6000;

// Undeveloped instant film: a flat, milky warm grey with no image in it.
const EMULSION = '#DCD5C8';
// Fresh prints run warm and flat before the colour settles.
const EARLY_CAST = '#C8A27C';

const fill = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' } as const;

type Props = {
  uri: string;
  filter?: PhotoFilter | string | null;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Plays once when a photo is chosen for a new moment: the print starts nearly
 * blank and develops into the finished picture, like instant film.
 *
 * It is decoration only. It never touches the file that gets uploaded, never
 * blocks the share button, and a tap finishes it at once. It is not used in
 * the feed or on a reopened moment.
 *
 * How it is built: the finished photo sits at the bottom; above it a blurred
 * copy, a flat emulsion wash, two cloudy masks and a warm cast each fade out
 * on their own schedule. The clouds clear later than the wash, which is what
 * makes the reveal uneven rather than a plain fade. Every animated value is
 * an opacity on the native driver, so typing a caption stays smooth.
 */
export default function DevelopingPhoto({ uri, filter, accessibilityLabel, testID }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const [developed, setDeveloped] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      setDeveloped(true);
      return;
    }
    progress.setValue(0);
    setDeveloped(false);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DEVELOP_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setDeveloped(true);
    });
    return () => animation.stop();
    // A new photo (new uri) is the only thing that restarts it - changing the
    // tone mid-way re-grades the print without starting over.
  }, [progress, reducedMotion, uri]);

  const reveal = useCallback(() => {
    progress.stopAnimation();
    progress.setValue(1);
    setDeveloped(true);
  }, [progress]);

  const fade = (inputRange: number[], outputRange: number[]) =>
    progress.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });

  return (
    <Pressable
      onPress={reveal}
      disabled={developed}
      accessibilityRole={developed ? 'image' : 'button'}
      accessibilityLabel={developed ? accessibilityLabel : 'Photo developing. Tap to reveal it now.'}
      testID={testID}
      style={styles.frame}
    >
      <FilteredMomentImage
        uri={uri}
        filter={filter}
        aspectRatio={1}
        style={styles.photo}
        testID={testID ? `${testID}-image` : undefined}
      />

      {developed ? null : (
        <>
          {/* Soft focus: a blurred copy that gives way to the sharp print. */}
          <Animated.View pointerEvents="none" style={[fill, { opacity: fade([0.3, 0.86], [1, 0]) }]}>
            <Image source={{ uri }} blurRadius={22} resizeMode="cover" style={fill} />
          </Animated.View>
          {/* Colour arrives late: a warm, flat cast that drains away. */}
          <Animated.View
            pointerEvents="none"
            style={[fill, { backgroundColor: EARLY_CAST, opacity: fade([0, 0.45, 1], [0.3, 0.22, 0]) }]}
          />
          {/* The blank print: nearly opaque at first, gone by three-quarters. */}
          <Animated.View
            pointerEvents="none"
            style={[fill, { backgroundColor: EMULSION, opacity: fade([0, 0.1, 0.78], [0.97, 0.9, 0]) }]}
          />
          {/* Uneven chemistry: cloudy patches that lag behind the wash. */}
          <Animated.Image
            source={CLOUD}
            resizeMode="stretch"
            fadeDuration={0}
            style={[fill, { tintColor: EMULSION, opacity: fade([0, 0.35, 0.92], [1, 0.75, 0]) }]}
          />
          <Animated.Image
            source={CLOUD}
            resizeMode="stretch"
            fadeDuration={0}
            style={[
              fill,
              { tintColor: EMULSION, transform: [{ scaleX: -1.35 }, { scaleY: 1.35 }], opacity: fade([0, 0.55, 1], [0.8, 0.5, 0]) },
            ]}
          />
          <Animated.View pointerEvents="none" style={[styles.hint, { opacity: fade([0, 0.06, 0.82, 0.96], [0, 1, 1, 0]) }]}>
            <Text style={styles.hintText}>developing - tap to reveal</Text>
          </Animated.View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: EMULSION,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.photoBg,
  },
  hint: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: 'rgba(81, 72, 63, 0.5)',
  },
  hintText: {
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
});
