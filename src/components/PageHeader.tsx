import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
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
        paddingTop: 16,
        paddingBottom: 18,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <HandwrittenText size={title === 'Then' ? 58 : 44} style={{ flex: 1 }}>
          {title}
        </HandwrittenText>
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
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
