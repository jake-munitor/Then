import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Menu, Text } from 'react-native-paper';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { MomentSort } from '../utils/momentSorting';

type Props = {
  value: MomentSort;
  onChange: (value: MomentSort) => void;
};

export default function MomentSortControl({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value === 'picture' ? 'Picture date' : 'Date posted';

  const choose = (nextValue: MomentSort) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <View
      style={{
        width: 164,
        alignItems: 'stretch',
        gap: 5,
      }}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: fonts.bodyMedium,
          fontSize: 9,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        }}
      >
        Sort by
      </Text>
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        contentStyle={{ backgroundColor: colors.paper, borderRadius: 8 }}
        anchor={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort moments, ${selectedLabel}`}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen(true)}
            style={({ pressed }) => ({
              width: '100%',
              minHeight: 38,
              paddingHorizontal: 12,
              borderColor: pressed ? 'rgba(181, 167, 146, 0.55)' : 'rgba(181, 167, 146, 0.35)',
              borderWidth: 1,
              borderRadius: 999,
              backgroundColor: pressed ? 'rgba(221, 209, 191, 0.38)' : 'rgba(255, 253, 247, 0.74)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            })}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fonts.bodyMedium,
                fontSize: 12,
              }}
            >
              {selectedLabel}
            </Text>
            <Icon source="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>
        }
      >
        <Menu.Item
          title="Date posted"
          leadingIcon={value === 'posted' ? 'check' : undefined}
          onPress={() => choose('posted')}
        />
        <Menu.Item
          title="Picture date"
          leadingIcon={value === 'picture' ? 'check' : undefined}
          onPress={() => choose('picture')}
        />
      </Menu>
    </View>
  );
}
