import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { PHOTO_FILTER_OPTIONS, type PhotoFilter } from '../utils/photoFilters';

type Props = {
  value: PhotoFilter;
  onChange: (value: PhotoFilter) => void;
  disabled?: boolean;
};

export default function PhotoFilterPicker({ value, onChange, disabled = false }: Props) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
          letterSpacing: 0,
          textTransform: 'uppercase',
        }}
      >
        Photo tone
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PHOTO_FILTER_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`${option.label} photo tone`}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => ({
                minHeight: 44,
                flexBasis: '48%',
                flexGrow: 1,
                borderColor: selected ? colors.primary : 'rgba(181, 167, 146, 0.42)',
                borderWidth: selected ? 1.5 : 1,
                borderRadius: 8,
                backgroundColor: pressed || selected ? 'rgba(255, 253, 247, 0.92)' : 'rgba(255, 253, 247, 0.62)',
                opacity: disabled ? 0.54 : 1,
                paddingHorizontal: 10,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
              })}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderColor: option.swatch.borderColor,
                  borderWidth: 1,
                  backgroundColor: option.swatch.backgroundColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: option.swatch.accentColor,
                  }}
                />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.15}
                style={{
                  color: selected ? colors.primary : colors.textPrimary,
                  flexShrink: 1,
                  fontFamily: fonts.bodyMedium,
                  fontSize: 13,
                  letterSpacing: 0,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
