import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import type { RootStackParamList } from '../navigation/types';
import { fetchMomentById } from '../services/moments';
import { colors } from '../theme/colors';
import { goBackOrHome } from '../utils/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LinkedMoment'>;

export default function LinkedMomentScreen({ route, navigation }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMomentById(route.params.momentId)
      .then((moment) => {
        if (!active) return;
        if (moment) navigation.replace('Notes', { moment });
        else setFailed(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [navigation, route.params.momentId]);

  return (
    <Screen contentStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 560, gap: 16 }}>
        <PageHeader
          title="Opening notes"
          subtitle="Finding this moment."
          right={<IconButton icon="close" onPress={() => goBackOrHome(navigation)} accessibilityLabel="Close" />}
        />
        {failed ? (
          <EmptyState title="Moment unavailable" message="This moment may have been deleted or is no longer visible." />
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Opening notes...</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
