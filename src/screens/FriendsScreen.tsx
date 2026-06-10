import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, View } from 'react-native';
import { Button, Dialog, Portal, Searchbar, Text, TextInput } from 'react-native-paper';

import EmptyState from '../components/EmptyState';
import ListenerError from '../components/ListenerError';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import {
  cancelFollowRequest,
  getPendingFollowRequestIds,
  removeFollow,
  requestFollow,
  subscribeFollowing,
} from '../services/follows';
import type { PublicUser } from '../services/types';
import { filterDiscoverableUsers, subscribeDiscoverableUsers } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export default function FriendsScreen() {
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [requesting, setRequesting] = useState<PublicUser | null>(null);
  const [confirming, setConfirming] = useState<{ person: PublicUser; action: 'cancel' | 'remove' } | null>(null);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [context, setContext] = useState(`I'd like to keep up.`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const { refreshing, refreshKey, onRefresh, finishRefresh } = usePullToRefresh();

  useEffect(
    () =>
      subscribeDiscoverableUsers((nextPeople) => {
        setPeople(nextPeople);
        finishRefresh();
      }, () => {
        setListenerError('The people directory could not be loaded.');
        finishRefresh();
      }),
    [finishRefresh, refreshKey],
  );
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowing(user.uid, setFollowing, () => setListenerError('Your friend list could not be loaded.'));
  }, [refreshKey, user?.uid]);
  useEffect(() => {
    if (!user?.uid || people.length === 0) {
      setSentRequests([]);
      return;
    }

    let active = true;
    getPendingFollowRequestIds(
      user.uid,
      people.map((person) => person.uid),
    )
      .then((requestIds) => {
        if (active) setSentRequests(requestIds);
      })
      .catch(() => {
        if (active) setSentRequests([]);
        if (active) setListenerError('Pending friend requests could not be checked.');
      });

    return () => {
      active = false;
    };
  }, [people, user?.uid]);

  const visiblePeople = useMemo(
    () =>
      filterDiscoverableUsers({
        users: people,
        currentUid: user?.uid,
        query,
      }),
    [people, query, user?.uid],
  );

  const openRequest = (person: PublicUser) => {
    setRequesting(person);
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
        targetUid: requesting.uid,
        displayName: user.displayName,
        context,
      });
      setSentRequests((current) => Array.from(new Set([...current, requesting.uid])));
      setRequesting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send request.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRelationshipChange = async () => {
    if (!user?.uid || !confirming) return;
    setBusy(true);
    setError(null);
    try {
      if (confirming.action === 'cancel') {
        await cancelFollowRequest({ requesterUid: user.uid, targetUid: confirming.person.uid });
        setSentRequests((current) => current.filter((uid) => uid !== confirming.person.uid));
      } else {
        await removeFollow({ followerUid: user.uid, targetUid: confirming.person.uid });
        setFollowing((current) => current.filter((uid) => uid !== confirming.person.uid));
      }
      setConfirming(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update this friendship.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <PageHeader title="Friends" subtitle="Find people you know and ask to keep up." />
      <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 12 }}>
        <Searchbar
          placeholder="Search names or handles"
          value={query}
          onChangeText={setQuery}
          elevation={0}
          style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 8 }}
          inputStyle={{ fontFamily: fonts.bodyRegular }}
        />
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <ListenerError message={listenerError} onRetry={() => { setListenerError(null); onRefresh(); }} />
      </View>

      <FlatList
        data={visiblePeople}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(person) => person.uid}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 36, gap: 12 }}
        ListEmptyComponent={
          <EmptyState
            title={query.trim() ? 'No people found' : 'No one to show yet'}
            message={query.trim() ? 'Try a display name or handle.' : 'New Then profiles will appear here.'}
          />
        }
        renderItem={({ item }) => {
          const requested = sentRequests.includes(item.uid);
          const isFollowing = following.includes(item.uid);
          return (
            <View
              style={{
                width: '100%',
                maxWidth: 520,
                alignSelf: 'center',
                backgroundColor: colors.paper,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 8,
                padding: 16,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={{ width: 52, height: 52, borderRadius: 999 }} />
                ) : (
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 999,
                      backgroundColor: colors.surfaceWarm,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="titleMedium">{(item.displayName ?? item.handle ?? '?').slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text variant="titleLarge" style={{ fontSize: 23 }}>
                    {item.displayName ?? 'Then Friend'}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>{item.handle ? `@${item.handle}` : 'Then profile'}</Text>
                </View>
              </View>
              <Button
                mode={requested || isFollowing ? 'outlined' : 'contained'}
                icon={isFollowing ? 'account-minus-outline' : requested ? 'close' : 'account-plus-outline'}
                onPress={() => {
                  if (isFollowing) setConfirming({ person: item, action: 'remove' });
                  else if (requested) setConfirming({ person: item, action: 'cancel' });
                  else openRequest(item);
                }}
              >
                {isFollowing ? 'Remove friend' : requested ? 'Cancel request' : 'Add friend'}
              </Button>
            </View>
          );
        }}
      />

      <Portal>
        <Dialog visible={Boolean(requesting)} onDismiss={() => setRequesting(null)}>
          <Dialog.Title>Add friend</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              Send a short note to {requesting?.displayName ?? 'this person'}.
            </Text>
            <TextInput label="context" value={context} onChangeText={setContext} multiline disabled={busy} />
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRequesting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onPress={submitRequest} loading={busy} disabled={busy || !context.trim()}>
              Send
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={Boolean(confirming)} onDismiss={() => setConfirming(null)}>
          <Dialog.Title>{confirming?.action === 'remove' ? 'Remove friend?' : 'Cancel request?'}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary }}>
              {confirming?.action === 'remove'
                ? `You will stop seeing private moments from ${confirming.person.displayName ?? 'this person'}.`
                : `Your request to ${confirming?.person.displayName ?? 'this person'} will be withdrawn.`}
            </Text>
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(null)} disabled={busy}>
              Keep
            </Button>
            <Button onPress={confirmRelationshipChange} loading={busy} disabled={busy} textColor={colors.error}>
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
