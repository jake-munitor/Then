import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import EmptyState from '../components/EmptyState';
import HandwrittenText from '../components/HandwrittenText';
import MomentCard from '../components/MomentCard';
import Screen from '../components/Screen';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { RootStackParamList } from '../navigation/types';
import { requestFollow, subscribeFollowing } from '../services/follows';
import { subscribeWanderMoments } from '../services/moments';
import { subscribePublicUsers } from '../services/users';
import type { Moment, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WanderScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<Nav>();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [requesting, setRequesting] = useState<Moment | null>(null);
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshing, refreshKey, onRefresh, finishRefresh } = usePullToRefresh();

  useEffect(
    () =>
      subscribeWanderMoments((nextMoments) => {
        setMoments(nextMoments);
        finishRefresh();
      }),
    [finishRefresh, refreshKey],
  );
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowing(user.uid, setFollowing);
  }, [refreshKey, user?.uid]);

  const visibleMoments = useMemo(
    () => moments.filter((moment) => moment.authorUid !== user?.uid && !following.includes(moment.authorUid)),
    [following, moments, user?.uid],
  );
  const authorUids = useMemo(() => visibleMoments.map((moment) => moment.authorUid), [visibleMoments]);
  useEffect(() => subscribePublicUsers(authorUids, setPublicUsers), [authorUids.join('|')]);

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
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <HandwrittenText>wander</HandwrittenText>
        <Text style={{ color: colors.textSecondary }}>Opt-in posts from people outside your feed.</Text>
      </View>

      <FlatList
        data={visibleMoments}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(moment) => moment.id}
        contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 36, alignItems: 'center' }}
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
            connectionLine="wander"
            onNotes={(moment) => navigation.navigate('Notes', { moment })}
            onFollow={openRequest}
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
