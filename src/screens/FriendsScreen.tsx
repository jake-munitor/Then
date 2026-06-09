import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, View } from 'react-native';
import { Button, Dialog, Portal, Searchbar, Text, TextInput } from 'react-native-paper';

import EmptyState from '../components/EmptyState';
import Screen from '../components/Screen';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { getPendingFollowRequestIds, requestFollow, subscribeFollowing } from '../services/follows';
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
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [context, setContext] = useState(`I'd like to keep up.`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshing, refreshKey, onRefresh, finishRefresh } = usePullToRefresh();

  useEffect(
    () =>
      subscribeDiscoverableUsers((nextPeople) => {
        setPeople(nextPeople);
        finishRefresh();
      }),
    [finishRefresh, refreshKey],
  );
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowing(user.uid, setFollowing);
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
        following,
        query,
      }),
    [following, people, query, user?.uid],
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

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', padding: 16, paddingBottom: 8, gap: 12 }}>
        <View>
          <Text style={{ fontFamily: fonts.handwriting, fontSize: 40, color: colors.ink }}>friends</Text>
          <Text style={{ color: colors.textSecondary }}>Find people you know and ask to keep up.</Text>
        </View>
        <Searchbar
          placeholder="Search names or handles"
          value={query}
          onChangeText={setQuery}
          style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1 }}
          inputStyle={{ fontFamily: fonts.bodyRegular }}
        />
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
            message={query.trim() ? 'Try a display name or handle.' : 'Public profiles and Wander opt-ins appear here.'}
          />
        }
        renderItem={({ item }) => {
          const requested = sentRequests.includes(item.uid);
          return (
            <View
              style={{
                width: '100%',
                maxWidth: 520,
                alignSelf: 'center',
                backgroundColor: colors.paper,
                borderColor: colors.border,
                borderWidth: 1,
                padding: 14,
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
                  <Text variant="titleMedium">{item.displayName ?? 'Then Friend'}</Text>
                  <Text style={{ color: colors.textSecondary }}>{item.handle ? `@${item.handle}` : 'Then profile'}</Text>
                </View>
              </View>
              <Button
                mode={requested ? 'outlined' : 'contained'}
                icon={requested ? 'check' : 'account-plus-outline'}
                onPress={() => openRequest(item)}
                disabled={requested}
              >
                {requested ? 'Request sent' : 'Add friend'}
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
      </Portal>
    </Screen>
  );
}
