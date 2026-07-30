import React from 'react';
import {
  Image,
  ImageStyle,
  Pressable,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ImageStyle | ViewStyle>;
};

export function Avatar({ uri, name, size = 40, onPress, style }: AvatarProps) {
  const initial = (name ?? '?').trim().slice(0, 1).toUpperCase() || '?';
  const content = uri ? (
    <Image
      source={{ uri }}
      style={[
        avatarStyle(size),
        { backgroundColor: colors.photoBg },
        style as StyleProp<ImageStyle>,
      ]}
    />
  ) : (
    <View
      style={[
        avatarStyle(size),
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceWarm,
        },
        style as StyleProp<ViewStyle>,
      ]}
    >
      <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemiBold, fontSize: size * 0.38 }}>
        {initial}
      </Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      {content}
    </Pressable>
  );
}

function avatarStyle(size: number) {
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: colors.white,
    shadowColor: '#2A2622',
    shadowOpacity: 0.17,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  };
}

export function Wordmark({
  children = 'then',
  size = 42,
  style,
}: {
  children?: React.ReactNode;
  size?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      maxFontSizeMultiplier={1.15}
      style={[
        {
          color: colors.textPrimary,
          fontFamily: fonts.scriptMedium,
          fontSize: size,
          // Caveat has tall ascenders and deep descenders; a line box smaller
          // than the font size shaves them, and on the multi-line onboarding
          // headlines the rows physically overlap.
          lineHeight: size * 1.35,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  titleKind = 'wordmark',
  avatarUrl,
  initials,
  onAvatarPress,
  right,
}: {
  title: string;
  subtitle?: string;
  titleKind?: 'wordmark' | 'script' | 'serif';
  avatarUrl?: string | null;
  initials?: string;
  onAvatarPress?: () => void;
  right?: React.ReactNode;
}) {
  const titleNode =
    titleKind === 'serif' ? (
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: fonts.displayMedium,
          fontSize: 22,
          lineHeight: 28,
        }}
      >
        {title}
      </Text>
    ) : (
      <Text
        maxFontSizeMultiplier={1.15}
        style={{
          color: colors.textPrimary,
          fontFamily: fonts.captionSerifMedium,
          fontSize: titleKind === 'wordmark' ? 34 : 30,
          lineHeight: titleKind === 'wordmark' ? 40 : 36,
        }}
      >
        {title}
      </Text>
    );

  return (
    <View style={{ width: '100%', gap: 7, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18 }}>
      <View style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>{titleNode}</View>
        {right}
        {avatarUrl || onAvatarPress ? (
          <Avatar uri={avatarUrl} name={initials} onPress={onAvatarPress} />
        ) : null}
      </View>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13.5, lineHeight: 19 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionRow({ label, note }: { label: string; note?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }}>
      {/* RN defaults flexShrink to 0, so without these a long note overflows
          the row rather than letting the pair shrink to fit. */}
      <SectionLabel style={{ flexShrink: 1 }}>{label}</SectionLabel>
      {note ? (
        <Text numberOfLines={1} style={{ flexShrink: 1, marginLeft: 10, color: colors.textFaintest, fontFamily: fonts.bodyRegular, fontSize: 11 }}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      style={[
        {
          color: colors.textFaint,
          fontFamily: fonts.bodySemiBold,
          fontSize: 10.5,
          letterSpacing: 1.35,
          textTransform: 'uppercase',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function PillButton({
  children,
  icon,
  variant = 'primary',
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  const foreground = primary ? colors.white : danger ? colors.danger : colors.primary;
  const accessibilityLabel = typeof children === 'string' ? children : undefined;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: radius.pill,
          paddingHorizontal: 18,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          backgroundColor: primary ? colors.primary : colors.surfaceInset,
          borderWidth: primary ? 0 : 1,
          borderColor: colors.borderInset,
          opacity: disabled ? 0.56 : pressed ? 0.78 : 1,
          shadowColor: primary ? colors.primary : '#2A2622',
          shadowOpacity: primary ? 0.28 : 0,
          shadowRadius: primary ? 16 : 0,
          shadowOffset: { width: 0, height: 7 },
          elevation: primary ? 4 : 0,
        },
        style,
      ]}
    >
      {icon ? <Icon source={icon} color={foreground} size={17} /> : null}
      <Text style={{ color: foreground, fontFamily: fonts.bodySemiBold, fontSize: 14.5 }}>{children}</Text>
    </Pressable>
  );
}

export function Toggle({
  value,
  onValueChange,
  disabled,
}: {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => onValueChange?.(!value)}
      disabled={disabled || !onValueChange}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={({ pressed }) => ({
        width: 48,
        height: 28,
        borderRadius: 999,
        padding: 3,
        justifyContent: 'center',
        backgroundColor: value ? colors.primary : colors.toggleOff,
        opacity: disabled ? 0.55 : pressed ? 0.78 : 1,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.white,
          alignSelf: value ? 'flex-end' : 'flex-start',
          shadowColor: '#2A2622',
          shadowOpacity: 0.12,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          borderRadius: radius.pill,
          padding: 4,
          backgroundColor: colors.surfaceInset,
          borderColor: colors.borderInset,
          borderWidth: 1,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 34,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.primary : 'transparent',
              opacity: pressed ? 0.78 : 1,
              shadowColor: selected ? colors.primary : 'transparent',
              shadowOpacity: selected ? 0.22 : 0,
              shadowRadius: selected ? 10 : 0,
              shadowOffset: { width: 0, height: 4 },
              elevation: selected ? 2 : 0,
            })}
          >
            <Text
              style={{
                color: selected ? colors.white : colors.textMuted,
                fontFamily: fonts.bodySemiBold,
                fontSize: 13,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function IconCircleButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: string;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon source={icon} color={colors.textMuted} size={21} />
    </Pressable>
  );
}

export function Thumb({
  uri,
  size,
  caption,
  style,
}: {
  uri: string;
  size?: number;
  caption?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          overflow: 'hidden',
          backgroundColor: colors.photoBg,
          borderColor: 'rgba(243, 237, 228, 0.75)',
          borderWidth: 1,
        },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: colors.photoBg,
        }}
        accessibilityLabel={caption ?? 'moment photo'}
      />
    </View>
  );
}
