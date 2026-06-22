import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import ListenerError from '../components/ListenerError';
import MomentCard from '../components/MomentCard';
import Screen from '../components/Screen';
import { PillButton, ScreenHeader, SectionRow } from '../components/DesignPrimitives';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { RootStackParamList } from '../navigation/types';
import {
  blockUser,
  reportUser,
  requestFollow,
  subscribeBlockedUserIds,
  subscribeFollowing,
  subscribeOutgoingFollowRequestIds,
} from '../services/follows';
import { fetchWanderMomentPage, subscribeWanderMoments, type MomentPageCursor } from '../services/moments';
import { subscribePublicUsers } from '../services/users';
import type { Moment, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WanderScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<Nav>();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [pageCursor, setPageCursor] = useState<MomentPageCursor>(null);
  const [hasMore, setHasMore] = useState(true);
  const [following, setFollowing] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [requesting, setRequesting] = useState<Moment | null>(null);
  const [blocking, setBlocking] = useState<Moment | null>(null);
  const [reporting, setReporting] = useState<Moment | null>(null);
  const [context, setContext] = useState('');
  const [reportContext, setReportContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
      }, (cursor) => {
        setPageCursor(cursor);
        setHasMore(Boolean(cursor));
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
  useEffect(() => {
    if (!user?.uid) {
      setBlockedIds([]);
      return;
    }
    return subscribeBlockedUserIds(user.uid, setBlockedIds, () => setListenerError('Blocked profiles could not be checked.'));
  }, [refreshKey, user?.uid]);

  const authorUids = useMemo(() => moments.map((moment) => moment.authorUid), [moments]);
  const visibleMoments = useMemo(
    () => moments.filter((moment) => !blockedIds.includes(moment.authorUid)),
    [blockedIds, moments],
  );
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

  const submitReport = async () => {
    if (!reporting) return;
    setBusy(true);
    setError(null);
    try {
      await reportUser({
        targetUid: reporting.authorUid,
        reason: 'moment',
        context: reportContext || reporting.frontText,
      });
      setReporting(null);
      setReportContext('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send report.');
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    if (!blocking) return;
    setBusy(true);
    setError(null);
    try {
      await blockUser(blocking.authorUid);
      setMoments((current) => current.filter((moment) => moment.authorUid !== blocking.authorUid));
      setBlocking(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not block this person.');
    } finally {
      setBusy(false);
    }
  };

  const loadMore = async () => {
    if (!pageCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchWanderMomentPage({ after: pageCursor });
      setMoments((current) => {
        const seen = new Set(current.map((moment) => moment.id));
        return current.concat(page.moments.filter((moment) => !seen.has(moment.id)));
      });
      setPageCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor) && page.moments.length > 0);
    } catch {
      setListenerError('Older Wander moments could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <ScreenHeader
        title="Wander"
        titleKind="script"
        subtitle="A window into moments shared beyond your circle."
      />
      <View style={{ paddingHorizontal: 18 }}>
        <ListenerError message={listenerError} onRetry={() => { setListenerError(null); onRefresh(); }} />
      </View>
      <FlatList
        data={visibleMoments}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(moment) => moment.id}
        contentContainerStyle={{ paddingTop: visibleMoments.length ? 12 : 40, paddingBottom: 36, alignItems: 'center' }}
        ListHeaderComponent={visibleMoments.length ? <SectionRow label="Recent" note="newest first · never sorted" /> : null}
        ListHeaderComponentStyle={{ width: '100%', marginBottom: 14 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingHorizontal: 30, paddingTop: 72 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 21 }}>Nothing here yet</Text>
            <Text style={{ marginTop: 8, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
              Public moments appear here chronologically when people choose to appear in Wander.
            </Text>
          </View>
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
            onPress={(moment) =>
              navigation.navigate('MomentDetail', {
                momentId: moment.id,
                moment,
                canNote: moment.authorUid === user?.uid || following.includes(moment.authorUid),
              })
            }
            onFollow={
              item.authorUid !== user?.uid &&
              !following.includes(item.authorUid) &&
              !pendingRequests.includes(item.authorUid)
                ? openRequest
                : undefined
            }
            onReport={item.authorUid !== user?.uid ? setReporting : undefined}
            onBlock={item.authorUid !== user?.uid ? setBlocking : undefined}
          />
        )}
        ListFooterComponent={
          visibleMoments.length && hasMore ? (
            <PillButton variant="secondary" onPress={loadMore} disabled={loadingMore}>
              Load more
            </PillButton>
          ) : null
        }
      />

      <Portal>
        <Dialog visible={Boolean(requesting)} onDismiss={() => setRequesting(null)}>
          <Dialog.Title>Ask to keep up</Dialog.Title>
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
        <Dialog visible={Boolean(reporting)} onDismiss={() => setReporting(null)}>
          <Dialog.Title>Report moment?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              Tell us what feels wrong about this moment.
            </Text>
            <TextInput label="context" value={reportContext} onChangeText={setReportContext} multiline disabled={busy} />
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReporting(null)} disabled={busy}>Cancel</Button>
            <Button onPress={submitReport} loading={busy} disabled={busy}>Report</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={Boolean(blocking)} onDismiss={() => setBlocking(null)}>
          <Dialog.Title>Block this person?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary }}>
              You will stop seeing their moments, and existing requests or friendships will be removed.
            </Text>
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBlocking(null)} disabled={busy}>Keep</Button>
            <Button onPress={submitBlock} loading={busy} disabled={busy} textColor={colors.error}>Block</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
