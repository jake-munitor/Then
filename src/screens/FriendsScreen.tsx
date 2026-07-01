import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Button, Dialog, Icon, Portal, Searchbar, Text, TextInput } from 'react-native-paper';

import EmptyState from '../components/EmptyState';
import ListenerError from '../components/ListenerError';
import Screen from '../components/Screen';
import {
  Avatar,
  IconCircleButton,
  PillButton,
  ScreenHeader,
  SectionLabel,
} from '../components/DesignPrimitives';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import {
  approveFollow,
  cancelFollowRequest,
  blockUser,
  declineFollow,
  removeFollow,
  reportUser,
  requestFollow,
  subscribeBlockedUserIds,
  subscribeFollowing,
  subscribeFollowRequests,
  subscribeOutgoingFollowRequestIds,
} from '../services/follows';
import type { FollowRequest, PublicUser } from '../services/types';
import { filterDiscoverableUsers, subscribeDiscoverableUsers, subscribePublicUsers } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';

export default function FriendsScreen() {
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [followingUsers, setFollowingUsers] = useState<Record<string, PublicUser>>({});
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [requestUsers, setRequestUsers] = useState<Record<string, PublicUser>>({});
  const [requesting, setRequesting] = useState<PublicUser | null>(null);
  const [confirming, setConfirming] = useState<{ person: PublicUser; action: 'cancel' | 'remove' } | null>(null);
  const [blocking, setBlocking] = useState<PublicUser | null>(null);
  const [reporting, setReporting] = useState<PublicUser | null>(null);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [context, setContext] = useState(`I'd like to keep up.`);
  const [reportContext, setReportContext] = useState('');
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
    if (!user?.uid) return;
    return subscribeFollowRequests(user.uid, setRequests, () => setListenerError('Follow requests could not be loaded.'));
  }, [refreshKey, user?.uid]);
  useEffect(() => {
    if (!user?.uid) {
      setSentRequests([]);
      return;
    }
    return subscribeOutgoingFollowRequestIds(
      user.uid,
      setSentRequests,
      () => setListenerError('Pending friend requests could not be checked.'),
    );
  }, [refreshKey, user?.uid]);
  useEffect(() => {
    if (!user?.uid) {
      setBlockedIds([]);
      return;
    }
    return subscribeBlockedUserIds(user.uid, setBlockedIds, () => setListenerError('Blocked profiles could not be checked.'));
  }, [refreshKey, user?.uid]);
  useEffect(
    () => subscribePublicUsers(following, setFollowingUsers, () => setListenerError('Some friend details could not be loaded.')),
    [following.join('|')],
  );
  useEffect(
    () => subscribePublicUsers(requests.map((request) => request.requesterUid), setRequestUsers, () => setListenerError('Some request details could not be loaded.')),
    [requests.map((request) => request.requesterUid).join('|')],
  );

  const visiblePeople = useMemo(
    () =>
      filterDiscoverableUsers({
        users: people,
        currentUid: user?.uid,
        query,
      }).filter((person) => !blockedIds.includes(person.uid)),
    [blockedIds, people, query, user?.uid],
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

  const submitReport = async () => {
    if (!reporting) return;
    setBusy(true);
    setError(null);
    try {
      await reportUser({ targetUid: reporting.uid, reason: 'profile', context: reportContext });
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
      await blockUser(blocking.uid);
      setPeople((current) => current.filter((person) => person.uid !== blocking.uid));
      setBlocking(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not block this person.');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (requesterUid: string) => {
    if (!user?.uid) return;
    setError(null);
    try {
      await approveFollow({ ownerUid: user.uid, requesterUid });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not approve this request.');
    }
  };

  const handleDecline = async (requesterUid: string) => {
    if (!user?.uid) return;
    setError(null);
    try {
      await declineFollow({ ownerUid: user.uid, requesterUid });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not decline this request.');
    }
  };

  const followingList = following.map((uid) => followingUsers[uid]).filter(Boolean) as PublicUser[];

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} contentStyle={{ gap: 16, paddingHorizontal: 18, paddingBottom: 104 }}>
      <ScreenHeader
        title="Friends"
        titleKind="script"
        subtitle="Everyone you keep up with, and who keeps up with you."
        right={<IconCircleButton icon="account-plus-outline" accessibilityLabel="Find someone" />}
      />
      <ListenerError message={listenerError} onRetry={() => { setListenerError(null); onRefresh(); }} />
      <Searchbar
        placeholder="Find someone by handle"
        value={query}
        onChangeText={setQuery}
        elevation={0}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.pill,
          shadowColor: '#2A2622',
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 1,
        }}
        inputStyle={{ fontFamily: fonts.bodyRegular, fontSize: 14 }}
      />
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

      <View style={{ gap: 9 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SectionLabel>Requests</SectionLabel>
          {requests.length ? (
            <View style={{ minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
              <Text style={{ color: colors.white, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>{requests.length}</Text>
            </View>
          ) : null}
        </View>
        {requests.length ? (
          <View
            style={{
              borderRadius: radius.lg,
              shadowColor: '#2A2622',
              shadowOpacity: 0.06,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}
          >
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' }}>
            {requests.map((request) => {
              const profile = requestUsers[request.requesterUid];
              return (
                <View key={request.requesterUid} style={{ padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <Avatar uri={profile?.avatarUrl} name={profile?.displayName ?? request.displayName} size={46} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>
                        {profile?.displayName ?? request.displayName ?? 'Then Friend'}
                      </Text>
                      <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 12.5 }}>
                        {profile?.handle ? `@${profile.handle}` : 'then profile'} · wants to keep up
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <PillButton onPress={() => handleApprove(request.requesterUid)} style={{ flex: 1, minHeight: 42 }}>
                      Approve
                    </PillButton>
                    <PillButton variant="secondary" onPress={() => handleDecline(request.requesterUid)} style={{ flex: 1, minHeight: 42 }}>
                      Decline
                    </PillButton>
                  </View>
                </View>
              );
            })}
          </View>
          </View>
        ) : null}
      </View>

      <PeopleList
        title={`Keeping up with · ${followingList.length}`}
        people={followingList}
        emptyTitle="No friends yet"
        emptyMessage="Search by handle to ask someone to keep up."
        onRemove={(person) => setConfirming({ person, action: 'remove' })}
      />

      {query.trim() ? (
        <PeopleList
          title="Search"
          people={visiblePeople}
          emptyTitle="No people found"
          emptyMessage="Try a display name or handle."
          sentRequests={sentRequests}
          following={following}
          onRequest={openRequest}
          onCancel={(person) => setConfirming({ person, action: 'cancel' })}
          onRemove={(person) => setConfirming({ person, action: 'remove' })}
          onReport={setReporting}
          onBlock={setBlocking}
        />
      ) : null}

      <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 11.5, lineHeight: 17 }}>
        Private profiles don't appear here. Only people who've approved you.
      </Text>

      <Portal>
        <Dialog visible={Boolean(requesting)} onDismiss={() => setRequesting(null)}>
          <Dialog.Title>Ask to keep up</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              Send a short note to {requesting?.displayName ?? 'this person'}.
            </Text>
            <TextInput label="context" value={context} onChangeText={setContext} multiline disabled={busy} />
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRequesting(null)} disabled={busy}>Cancel</Button>
            <Button onPress={submitRequest} loading={busy} disabled={busy || !context.trim()}>Send</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={Boolean(confirming)} onDismiss={() => setConfirming(null)}>
          <Dialog.Title>{confirming?.action === 'remove' ? 'Stop keeping up?' : 'Cancel request?'}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary }}>
              {confirming?.action === 'remove'
                ? `You will stop seeing private moments from ${confirming.person.displayName ?? 'this person'}.`
                : `Your request to ${confirming?.person.displayName ?? 'this person'} will be withdrawn.`}
            </Text>
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(null)} disabled={busy}>Keep</Button>
            <Button onPress={confirmRelationshipChange} loading={busy} disabled={busy} textColor={colors.error}>
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={Boolean(reporting)} onDismiss={() => setReporting(null)}>
          <Dialog.Title>Report profile?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              Tell us what feels wrong about {reporting?.displayName ?? 'this profile'}.
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
              You will stop seeing them, and existing requests or friendships will be removed.
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

function PeopleList({
  title,
  people,
  emptyTitle,
  emptyMessage,
  sentRequests = [],
  following = [],
  onRequest,
  onCancel,
  onRemove,
  onReport,
  onBlock,
}: {
  title: string;
  people: PublicUser[];
  emptyTitle: string;
  emptyMessage: string;
  sentRequests?: string[];
  following?: string[];
  onRequest?: (person: PublicUser) => void;
  onCancel?: (person: PublicUser) => void;
  onRemove?: (person: PublicUser) => void;
  onReport?: (person: PublicUser) => void;
  onBlock?: (person: PublicUser) => void;
}) {
  return (
    <View style={{ gap: 9 }}>
      <SectionLabel>{title}</SectionLabel>
      {people.length ? (
        <View
          style={{
            borderRadius: radius.lg,
            shadowColor: '#2A2622',
            shadowOpacity: 0.06,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 2,
          }}
        >
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' }}>
          {people.map((person, index) => {
            const requested = sentRequests.includes(person.uid);
            const isFollowing = following.includes(person.uid) || (!onRequest && Boolean(onRemove));
            return (
              <View
                key={person.uid}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderBottomColor: colors.borderWarm,
                  borderBottomWidth: index === people.length - 1 ? 0 : 1,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {person.avatarUrl ? (
                    <Image
                      source={{ uri: person.avatarUrl }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.photoBg,
                        borderColor: 'rgba(243, 237, 228, 0.9)',
                        borderWidth: 1.5,
                      }}
                    />
                  ) : (
                    <Avatar name={person.displayName ?? person.handle} size={44} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>
                      {person.displayName ?? 'Then Friend'}
                    </Text>
                    <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 12.5 }}>
                      {person.handle ? `@${person.handle}` : 'then profile'}
                    </Text>
                  </View>
                  {onRequest ? (
                    <Pressable
                      onPress={() => {
                        if (isFollowing) onRemove?.(person);
                        else if (requested) onCancel?.(person);
                        else onRequest(person);
                      }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1, flexDirection: 'row', alignItems: 'center', gap: 4 })}
                    >
                      <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
                        {isFollowing ? 'Remove' : requested ? 'Pending' : 'Ask'}
                      </Text>
                      <Icon source="chevron-right" color={colors.textFaintest} size={19} />
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => onRemove?.(person)} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}>
                      <Icon source="chevron-right" color={colors.textFaintest} size={22} />
                    </Pressable>
                  )}
                </View>
                {(onReport || onBlock) ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                    {onReport ? <Text onPress={() => onReport(person)} style={{ color: colors.textFaint, fontSize: 12 }}>Report</Text> : null}
                    {onBlock ? <Text onPress={() => onBlock(person)} style={{ color: colors.danger, fontSize: 12 }}>Block</Text> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        </View>
      ) : (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      )}
    </View>
  );
}
