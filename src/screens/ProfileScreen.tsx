import React, { useContext, useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Button, Dialog, IconButton, Portal, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EmptyState from '../components/EmptyState';
import ListenerError from '../components/ListenerError';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { PillButton } from '../components/DesignPrimitives';
import type { RootStackParamList } from '../navigation/types';
import {
  blockUser,
  cancelFollowRequest,
  removeFollow,
  reportUser,
  requestFollow,
  subscribeBlockedUserIds,
  subscribeFollowing,
  subscribeOutgoingFollowRequestIds,
} from '../services/follows';
import type { PublicUser } from '../services/types';
import { fetchPublicUser, fetchPublicUserByHandle } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';
import { initialsFromName } from '../utils/formatters';
import { goBackOrHome } from '../utils/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ route, navigation }: Props) {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [following, setFollowing] = useState<string[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [context, setContext] = useState(`I'd like to keep up.`);
  const [reportContext, setReportContext] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListenerError(null);
    const loadProfile = route.params.uid
      ? fetchPublicUser(route.params.uid)
      : fetchPublicUserByHandle(route.params.handle ?? '');
    loadProfile
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
      })
      .catch(() => {
        if (active) setListenerError('This profile could not be opened.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [route.params.handle, route.params.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowing(user.uid, setFollowing, () => setListenerError('Your friend list could not be loaded.'));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeOutgoingFollowRequestIds(
      user.uid,
      setSentRequests,
      () => setListenerError('Pending requests could not be checked.'),
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeBlockedUserIds(user.uid, setBlockedIds, () => setListenerError('Blocked profiles could not be checked.'));
  }, [user?.uid]);

  const isSelf = profile?.uid === user?.uid;
  const isFollowing = Boolean(profile && following.includes(profile.uid));
  const isRequested = Boolean(profile && sentRequests.includes(profile.uid));
  const isBlocked = Boolean(profile && blockedIds.includes(profile.uid));

  const submitRequest = async () => {
    if (!user?.uid || !profile) return;
    setBusy(true);
    setError(null);
    try {
      await requestFollow({
        requesterUid: user.uid,
        targetUid: profile.uid,
        displayName: user.displayName,
        context,
      });
      setRequesting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send request.');
    } finally {
      setBusy(false);
    }
  };

  const cancelOrRemove = async () => {
    if (!user?.uid || !profile) return;
    setBusy(true);
    setError(null);
    try {
      if (isRequested) {
        await cancelFollowRequest({ requesterUid: user.uid, targetUid: profile.uid });
      } else if (isFollowing) {
        await removeFollow({ followerUid: user.uid, targetUid: profile.uid });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update this relationship.');
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      await reportUser({ targetUid: profile.uid, reason: 'profile', context: reportContext || 'Profile link report' });
      setReporting(false);
      setReportContext('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send report.');
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      await blockUser(profile.uid);
      setBlocking(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not block this person.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 560, gap: 16 }}>
        <PageHeader
          title="Profile"
          subtitle={profile?.handle ? `@${profile.handle}` : 'Shared Then profile'}
          right={<IconButton icon="close" onPress={() => goBackOrHome(navigation)} accessibilityLabel="Close profile" />}
        />
        <ListenerError message={listenerError} onRetry={() => setListenerError(null)} />

        {loading ? (
          <EmptyState title="Opening profile" message="Looking for this Then profile." />
        ) : !profile ? (
          <EmptyState title="Profile unavailable" message="This link may be old, private, or misspelled." />
        ) : (
          <View
            style={{
              width: '100%',
              borderRadius: radius.lg,
              shadowColor: '#2A2622',
              shadowOpacity: 0.07,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 7 },
              elevation: 2,
            }}
          >
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 22, gap: 18 }}>
            <View style={{ alignItems: 'center', gap: 12 }}>
              {profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={{ width: 96, height: 96, borderRadius: 999, borderColor: 'rgba(243, 237, 228, 0.9)', borderWidth: 2, backgroundColor: colors.photoBg }}
                />
              ) : (
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 999,
                    backgroundColor: colors.surfaceWarm,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontFamily: fonts.captionSerifMedium, fontSize: 30 }}>
                    {initialsFromName(profile.displayName ?? profile.handle)}
                  </Text>
                </View>
              )}
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: fonts.captionSerifMedium, fontSize: 23, lineHeight: 29 }}>
                  {profile.displayName ?? 'Then Friend'}
                </Text>
                <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 13 }}>
                  {profile.handle ? `@${profile.handle}` : 'Then profile'}
                </Text>
              </View>
            </View>

            {isSelf ? (
              <PillButton icon="filmstrip" onPress={() => navigation.navigate('MainTabs')}>
                Open your roll
              </PillButton>
            ) : isBlocked ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontFamily: fonts.bodyRegular, fontSize: 13 }}>
                You have blocked this profile.
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                <PillButton
                  variant={isFollowing || isRequested ? 'secondary' : 'primary'}
                  icon={isFollowing ? 'account-minus-outline' : isRequested ? 'close' : 'account-plus-outline'}
                  onPress={() => {
                    if (isFollowing || isRequested) cancelOrRemove();
                    else setRequesting(true);
                  }}
                  disabled={busy}
                >
                  {isFollowing ? 'Remove friend' : isRequested ? 'Cancel request' : 'Add friend'}
                </PillButton>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22 }}>
                  <Text onPress={() => setReporting(true)} style={{ color: colors.textFaint, fontFamily: fonts.bodyMedium, fontSize: 13 }}>
                    Report
                  </Text>
                  <Text onPress={() => setBlocking(true)} style={{ color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 13 }}>
                    Block
                  </Text>
                </View>
              </View>
            )}
            {error ? <Text style={{ color: colors.error, textAlign: 'center' }}>{error}</Text> : null}
          </View>
          </View>
        )}
      </View>

      <Portal>
        <Dialog visible={requesting} onDismiss={() => setRequesting(false)}>
          <Dialog.Title>Add friend</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              Send a short note to {profile?.displayName ?? 'this person'}.
            </Text>
            <TextInput label="context" value={context} onChangeText={setContext} maxLength={500} multiline disabled={busy} />
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRequesting(false)} disabled={busy}>Cancel</Button>
            <Button onPress={submitRequest} loading={busy} disabled={busy || !context.trim()}>Send</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={reporting} onDismiss={() => setReporting(false)}>
          <Dialog.Title>Report profile?</Dialog.Title>
          <Dialog.Content>
            <TextInput label="context" value={reportContext} onChangeText={setReportContext} maxLength={1000} multiline disabled={busy} />
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReporting(false)} disabled={busy}>Cancel</Button>
            <Button onPress={submitReport} loading={busy} disabled={busy}>Report</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={blocking} onDismiss={() => setBlocking(false)}>
          <Dialog.Title>Block this person?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary }}>
              You will stop seeing them, and existing requests or friendships will be removed.
            </Text>
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBlocking(false)} disabled={busy}>Keep</Button>
            <Button onPress={submitBlock} loading={busy} disabled={busy} textColor={colors.error}>Block</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
