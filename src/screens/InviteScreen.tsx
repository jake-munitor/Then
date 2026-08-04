import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { PillButton } from '../components/DesignPrimitives';
import type { RootStackParamList } from '../navigation/types';
import { redeemInvite, takePendingInviteCode, type RedeemedInvite } from '../services/invites';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { goBackOrHome } from '../utils/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Invite'>;

export default function InviteScreen({ route, navigation }: Props) {
  const [redeemed, setRedeemed] = useState<RedeemedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);

    // This screen owns the redemption, so the stashed copy of the same code
    // must not be redeemed again by TabsNavigator on the next cold start.
    void takePendingInviteCode();

    redeemInvite(route.params.code)
      .then((result) => {
        if (active) setRedeemed(result);
      })
      .catch((redeemError: unknown) => {
        if (!active) return;
        setError(redeemError instanceof Error ? redeemError.message : 'This invite could not be used.');
      });

    return () => {
      active = false;
    };
  }, [attempt, route.params.code]);

  const inviterName = redeemed?.displayName ?? 'your friend';

  return (
    <Screen contentStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 560, gap: 16 }}>
        <PageHeader
          title="An invite"
          subtitle="Connecting you with your person."
          right={<IconButton icon="close" onPress={() => goBackOrHome(navigation)} accessibilityLabel="Close" />}
        />
        {error ? (
          <View style={{ gap: 14 }}>
            <EmptyState title="This invite could not be used" message={error} />
            <View style={{ alignItems: 'center', gap: 10 }}>
              <PillButton icon="refresh" onPress={() => setAttempt((current) => current + 1)}>
                Try again
              </PillButton>
              <PillButton variant="secondary" onPress={() => goBackOrHome(navigation)}>
                Back to Then
              </PillButton>
            </View>
          </View>
        ) : redeemed ? (
          <View style={{ alignItems: 'center', gap: 16, paddingVertical: 28, paddingHorizontal: 22 }}>
            <Text style={{ color: colors.textPrimary, fontFamily: fonts.script, fontSize: 34, lineHeight: 46, textAlign: 'center' }}>
              You and {inviterName} are keeping up
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 23, textAlign: 'center' }}>
              Their moments land in your feed now, and yours in theirs.
            </Text>
            <PillButton
              icon="account-outline"
              onPress={() => navigation.replace('Profile', { uid: redeemed.inviterUid })}
            >
              See {inviterName}'s roll
            </PillButton>
            <PillButton variant="secondary" onPress={() => goBackOrHome(navigation)}>
              Back to your feed
            </PillButton>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Opening your invite...</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
