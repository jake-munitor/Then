import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import EmptyState from '../components/EmptyState';
import ListenerError from '../components/ListenerError';
import MomentCard from '../components/MomentCard';
import MomentSortControl from '../components/MomentSortControl';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { RootStackParamList } from '../navigation/types';
import { requestFollow, subscribeFollowing, subscribeOutgoingFollowRequestIds } from '../services/follows';
import { subscribeWanderMoments } from '../services/moments';
import { subscribePublicUsers } from '../services/users';
import type { Moment, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { MomentSort } from '../utils/momentSorting';
import { sortMomentsForDisplay } from '../utils/momentSorting';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WanderScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<Nav>();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [sort, setSort] = useState<MomentSort>('posted');
  const [following, setFollowing] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [requesting, setRequesting] = useState<Moment | null>(null);
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const { refreshing, refreshKey, onRefresh, finishRefresh } = usePullToRefresh();

  useEffect(
    () =>
      subscribeWanderMoments((nextMoments) => {
        setMoments(nextMoments);
        finishRefresh();
      }, () => {
        setListenerError('Wander moments could not be loaded.');
        finishRefresh();
      }),
    [finishRefresh, refreshKey],
  );
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowing(user.uid, setFollowing, () => setListenerError('Your friend list could not be loaded.'));
  }, [refreshKey, user?.uid]);
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeOutgoingFollowRequestIds(
      user.uid,
      setPendingRequests,
      () => setListenerError('Pending friend requests could not be loaded.'),
    );
  }, [refreshKey, user?.uid]);

  const authorUids = useMemo(() => moments.map((moment) => moment.authorUid), [moments]);
  const visibleMoments = useMemo(() => sortMomentsForDisplay(moments, sort), [moments, sort]);
  useEffect(
    () => subscribePublicUsers(authorUids, setPublicUsers, () => setListenerError('Some profile details could not be loaded.')),
    [authorUids.join('|')],
  );

  const openRequest = (moment: Moment) => {
    setRequesting(moment);
    setContext(`I'd like to keep up.`);
    setError(null);
  };

  const submitRequest = async () => {
    if (!user?.uid || !requesting) return;
    setBusy(true);
    setError(null);
    try {
      await requestFollow({
        requesterUid: user.uid,
        targetUid: requesting.authorUid,
        displayName: user.displayName,
        context,
      });
      setRequesting(null);
      setContext('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <PageHeader title="Wander" subtitle="A window into moments shared beyond your circle." />
      <ListenerError message={listenerError} onRetry={() => { setListenerError(null); onRefresh(); }} />

      <FlatList
        data={visibleMoments}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(moment) => moment.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 36, alignItems: 'center' }}
        ListHeaderComponentStyle={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}
        ListHeaderComponent={
          visibleMoments.length ? (
            <View
              style={{
                width: '100%',
                marginBottom: 16,
                paddingHorizontal: 28,
                alignItems: 'flex-start',
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fonts.displayMedium,
                  fontSize: 29,
                  lineHeight: 34,
                }}
              >
                {sort === 'picture' ? 'Chronological' : 'Recent'}
              </Text>
              <MomentSortControl value={sort} onChange={setSort} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={moments.length ? 'Nothing new' : 'Nothing here yet'}
            message={moments.length ? 'You already follow or own everything here.' : 'Public moments will show here.'}
          />
        }
        renderItem={({ item }) => (
          <MomentCard
            moment={item}
            mode="wander"
            author={publicUsers[item.authorUid]}
            connectionLine={
              item.authorUid === user?.uid
                ? 'your Wander post'
                : following.includes(item.authorUid)
                  ? 'keeping up'
                  : pendingRequests.includes(item.authorUid)
                    ? 'request pending'
                    : 'wander'
            }
            onNotes={(moment) => navigation.navigate('Notes', { moment })}
            onFollow={
              item.authorUid !== user?.uid &&
              !following.includes(item.authorUid) &&
              !pendingRequests.includes(item.authorUid)
                ? openRequest
                : undefined
            }
          />
        )}
      />

      <Portal>
        <Dialog visible={Boolean(requesting)} onDismiss={() => setRequesting(null)}>
          <Dialog.Title>Request access</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              Send a short note to {requesting ? publicUsers[requesting.authorUid]?.displayName ?? 'this person' : 'this person'}.
            </Text>
            <TextInput label="context" value={context} onChangeText={setContext} multiline disabled={busy} />
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRequesting(null)}>Cancel</Button>
            <Button onPress={submitRequest} loading={busy} disabled={busy || !context.trim()}>
              Send
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
