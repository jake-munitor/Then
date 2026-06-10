import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import EmptyState from '../components/EmptyState';
import ListenerError from '../components/ListenerError';
import MomentCard from '../components/MomentCard';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { RootStackParamList, TabsParamList } from '../navigation/types';
import { subscribeFollowing } from '../services/follows';
import { subscribeMomentsByAuthors } from '../services/moments';
import { subscribePublicUsers } from '../services/users';
import type { Moment, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { todayYYYYMMDD } from '../utils/dates';
import { initialsFromName } from '../utils/formatters';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function FeedScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<Nav>();
  const tabNavigation = useNavigation<any>();
  const [following, setFollowing] = useState<string[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [listenerError, setListenerError] = useState<string | null>(null);
  const { refreshing, refreshKey, onRefresh, finishRefresh } = usePullToRefresh();

  useEffect(() => {
    if (!user?.uid) {
      finishRefresh();
      return;
    }
    return subscribeFollowing(user.uid, setFollowing, () => {
      setListenerError('Your friend list could not be loaded.');
      finishRefresh();
    });
  }, [finishRefresh, refreshKey, user?.uid]);

  const homeAuthorUids = useMemo(() => (user?.uid ? [user.uid, ...following] : following), [following, user?.uid]);
  useEffect(
    () =>
      subscribeMomentsByAuthors(homeAuthorUids, (nextMoments) => {
        setMoments(nextMoments);
        finishRefresh();
      }, () => {
        setListenerError('Your moments could not be loaded.');
        finishRefresh();
      }),
    [finishRefresh, homeAuthorUids.join('|'), refreshKey],
  );

  const authorUids = useMemo(
    () => Array.from(new Set(moments.map((moment) => moment.authorUid).concat(user?.uid ?? []))),
    [moments, user?.uid],
  );
  useEffect(
    () => subscribePublicUsers(authorUids, setPublicUsers, () => setListenerError('Some profile details could not be loaded.')),
    [authorUids.join('|')],
  );

  const emptyTitle = moments.length === 0 && following.length === 0 ? 'No moments yet' : 'Nothing new';
  const emptyMessage =
    moments.length === 0 && following.length === 0
      ? 'Add a photo to start.'
      : 'When someone shares, it will show up here.';
  const emptyAction = moments.length === 0 && following.length === 0 ? 'New moment' : 'Wander';
  const emptyTarget = moments.length === 0 && following.length === 0 ? 'NewMomentTab' : 'WanderTab';
  const sectionTitle = moments[0]?.memoryDate === todayYYYYMMDD() ? 'Today' : 'Recent';

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <PageHeader
        title="Then"
        subtitle="Photos from people you choose."
        avatarUrl={user?.uid ? publicUsers[user.uid]?.avatarUrl : null}
        initials={initialsFromName(user?.displayName)}
        onAvatarPress={() => tabNavigation.navigate('RollTab' as keyof TabsParamList)}
      />
      <ListenerError message={listenerError} onRetry={() => { setListenerError(null); onRefresh(); }} />
      <FlatList
        data={moments}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(moment) => moment.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 36, alignItems: 'center' }}
        ListHeaderComponent={
          moments.length ? (
            <View style={{ width: '100%', maxWidth: 560, marginBottom: 14 }}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fonts.displayMedium,
                  fontSize: 31,
                  lineHeight: 36,
                }}
              >
                {sectionTitle}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={emptyTitle}
            message={emptyMessage}
            actionLabel={emptyAction}
            onAction={() => tabNavigation.navigate(emptyTarget as keyof TabsParamList)}
          />
        }
        renderItem={({ item }) => (
          <MomentCard
            moment={item}
            author={publicUsers[item.authorUid]}
            onNotes={(moment) => navigation.navigate('Notes', { moment })}
          />
        )}
        ListFooterComponent={
          moments.length ? (
            <Button mode="text" onPress={() => tabNavigation.navigate('NewMomentTab' as keyof TabsParamList)}>
              New moment
            </Button>
          ) : null
        }
      />
    </Screen>
  );
}
