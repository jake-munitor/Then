import React from 'react';
import { RefreshControl, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import PaperBackground from './PaperBackground';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function Screen({ children, scroll = true, contentStyle, refreshing, onRefresh }: Props) {
  if (!scroll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <PaperBackground>
          <View style={[{ flex: 1, paddingHorizontal: 0, paddingTop: 0 }, contentStyle]}>{children}</View>
        </PaperBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <PaperBackground>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: 'transparent' }}
          contentContainerStyle={[
            { paddingHorizontal: spacing.screenX, paddingTop: 12, paddingBottom: 40 },
            contentStyle,
          ]}
          refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined}
        >
          {children}
        </ScrollView>
      </PaperBackground>
    </SafeAreaView>
  );
}
