import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { PillButton } from '../components/DesignPrimitives';
import type { RootStackParamList } from '../navigation/types';
import { fetchMomentById } from '../services/moments';
import { captureException } from '../services/telemetry';
import { colors } from '../theme/colors';
import { goBackOrHome } from '../utils/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LinkedMoment'>;

/**
 * Firestore's getDoc has no timeout of its own - on a flaky connection it
 * quietly retries forever, which left this screen spinning indefinitely
 * (field report: tapping a push notification while driving). After this long,
 * show the failure state with a retry instead. A late success still wins:
 * if the fetch resolves after the timeout fires, we navigate anyway.
 */
const FETCH_TIMEOUT_MS = 12000;

export default function LinkedMomentScreen({ route, navigation }: Props) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setFailed(false);
    const timeout = setTimeout(() => {
      if (!active) return;
      setFailed(true);
      // A timeout here means Firestore neither resolved nor rejected - the
      // wedged-transport case. Count it in Sentry so recurrence is visible
      // without waiting for a screenshot report.
      captureException(new Error('LinkedMoment fetch timed out'), {
        momentId: route.params.momentId,
        target: route.params.target ?? null,
        attempt,
      });
    }, FETCH_TIMEOUT_MS);

    fetchMomentById(route.params.momentId)
      .then((moment) => {
        if (!active) return;
        if (!moment) {
          setFailed(true);
        } else if (route.params.target === 'notes') {
          navigation.replace('Notes', { moment });
        } else {
          navigation.replace('MomentDetail', { momentId: moment.id, moment, canNote: true });
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [attempt, navigation, route.params.momentId, route.params.target]);

  const openingNotes = route.params.target === 'notes';
  const title = openingNotes ? 'Opening notes' : 'Opening moment';

  return (
    <Screen contentStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 560, gap: 16 }}>
        <PageHeader
          title={title}
          subtitle="Finding this moment."
          right={<IconButton icon="close" onPress={() => goBackOrHome(navigation)} accessibilityLabel="Close" />}
        />
        {failed ? (
          <View style={{ gap: 14 }}>
            <EmptyState
              title="Moment unavailable"
              message="This moment may have been deleted, or the connection dropped while finding it."
            />
            <View style={{ alignItems: 'center' }}>
              <PillButton icon="refresh" onPress={() => setAttempt((current) => current + 1)}>
                Try again
              </PillButton>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
              {openingNotes ? 'Opening notes...' : 'Opening moment...'}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
