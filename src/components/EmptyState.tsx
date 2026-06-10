import React from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { colors } from '../theme/colors';

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ title, message, actionLabel, onAction }: Props) {
  return (
    <View
      style={{
        alignSelf: 'center',
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
        gap: 10,
        paddingVertical: 36,
        paddingHorizontal: 18,
      }}
    >
      <View style={{ width: 34, height: 1, backgroundColor: colors.sage, opacity: 0.55, marginBottom: 4 }} />
      <Text variant="headlineSmall" style={{ color: colors.textPrimary, textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
