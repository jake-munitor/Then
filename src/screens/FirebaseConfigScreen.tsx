import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import Screen from '../components/Screen';
import { colors } from '../theme/colors';

export default function FirebaseConfigScreen() {
  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, padding: 20, gap: 12 }}>
        <Text variant="headlineSmall">Then needs Firebase</Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
          Copy `.env.example` to `.env`, add the `EXPO_PUBLIC_FIREBASE_*` values, then restart Expo.
        </Text>
      </View>
    </Screen>
  );
}
