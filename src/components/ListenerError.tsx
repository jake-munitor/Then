import React from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { colors } from '../theme/colors';

type Props = {
  message?: string | null;
  onRetry?: () => void;
};

export default function ListenerError({ message, onRetry }: Props) {
  if (!message) return null;

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
        backgroundColor: colors.paper,
        borderColor: colors.error,
        borderWidth: 1,
        padding: 14,
        gap: 8,
      }}
    >
      <Text variant="titleSmall" style={{ color: colors.error }}>
        Could not refresh this page
      </Text>
      <Text style={{ color: colors.textSecondary }}>{message}</Text>
      {onRetry ? (
        <Button mode="outlined" icon="refresh" onPress={onRetry}>
          Try again
        </Button>
      ) : null}
    </View>
  );
}
