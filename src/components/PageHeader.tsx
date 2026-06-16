import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import FilmStripe from './FilmStripe';
import HandwrittenText from './HandwrittenText';

type Props = {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  initials?: string;
  onAvatarPress?: () => void;
  right?: React.ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  avatarUrl,
  initials = '?',
  onAvatarPress,
  right,
}: Props) {
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 560,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        gap: 7,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          {title === 'Then' ? <FilmStripe width={74} height={4} /> : null}
          <HandwrittenText
            size={title === 'Then' ? 60 : 43}
            style={{
              marginTop: title === 'Then' ? 5 : 0,
              fontFamily: title === 'Then' ? fonts.script : fonts.displayRegular,
            }}
          >
            {title}
          </HandwrittenText>
        </View>
        {right}
        {avatarUrl || onAvatarPress ? (
          <Pressable
            onPress={onAvatarPress}
            disabled={!onAvatarPress}
            accessibilityRole={onAvatarPress ? 'button' : undefined}
            accessibilityLabel={onAvatarPress ? 'Open your roll' : undefined}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceWarm }}
              />
            ) : (
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: colors.surfaceWarm,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 20 }}>
                  {initials}
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}
      </View>
      {subtitle ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fonts.bodyRegular,
            fontSize: 14,
            lineHeight: 20,
            letterSpacing: 0.15,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
