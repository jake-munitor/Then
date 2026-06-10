import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { Badge, Button, Dialog, IconButton, Portal, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

import EmptyState from '../components/EmptyState';
import ListenerError from '../components/ListenerError';
import MomentCard from '../components/MomentCard';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { db } from '../firebase/firebase';
import { approveFollow, declineFollow, subscribeFollowers, subscribeFollowing, subscribeFollowRequests } from '../services/follows';
import { deleteMoment, subscribeMomentsByAuthors, subscribeMomentsByIds, subscribeSavedMomentIds } from '../services/moments';
import { deleteStoredFile, uploadAvatar } from '../services/photos';
import type { FollowRequest, Moment, ProfileVisibility, PublicUser } from '../services/types';
import { subscribePublicUsers, updateThenSettings } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { initialsFromName } from '../utils/formatters';

type RollView = 'archive' | 'saved' | 'requests';

export default function RollScreen() {
  const { user, deleteAccount, logout, updateDisplayName } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [name, setName] = useState(user?.displayName ?? '');
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>('private');
  const [appearInWander, setAppearInWander] = useState(false);
  const [archive, setArchive] = useState<Moment[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [saved, setSaved] = useState<Moment[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [view, setView] = useState<RollView>('archive');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [deletingMoment, setDeletingMoment] = useState<Moment | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const { refreshing, refreshKey, onRefresh, finishRefresh } = usePullToRefresh();

  useEffect(() => {
    if (!user?.uid) {
      finishRefresh();
      return;
    }
    return subscribeMomentsByAuthors([user.uid], (nextArchive) => {
      setArchive(nextArchive);
      finishRefresh();
    }, () => {
      setListenerError('Your archive could not be loaded.');
      finishRefresh();
    });
  }, [finishRefresh, refreshKey, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeSavedMomentIds(user.uid, setSavedIds, () => setListenerError('Saved moments could not be loaded.'));
  }, [refreshKey, user?.uid]);

  useEffect(
    () => subscribeMomentsByIds(savedIds, setSaved, () => setListenerError('Some saved moments could not be loaded.')),
    [refreshKey, savedIds.join('|')],
  );

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowRequests(user.uid, setRequests, () => setListenerError('Follow requests could not be loaded.'));
  }, [refreshKey, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowers(user.uid, setFollowers, () => setListenerError('Follower details could not be loaded.'));
  }, [refreshKey, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowing(user.uid, setFollowing, () => setListenerError('Your friend list could not be loaded.'));
  }, [refreshKey, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribePublicUsers(
      [user.uid],
      (profiles) => {
        const profile = profiles[user.uid];
        if (!profile) return;
        setName(profile.displayName ?? user.displayName ?? '');
        setAvatarUri(profile.avatarUrl);
        setProfileVisibility(profile.profileVisibility);
        setAppearInWander(profile.appearInWander);
      },
      () => setListenerError('Your profile could not be loaded.'),
    );
  }, [user?.displayName, user?.uid]);

  const visibleMoments = useMemo(() => (view === 'archive' ? archive : saved), [archive, saved, view]);
  const authorUids = useMemo(() => visibleMoments.map((moment) => moment.authorUid), [visibleMoments]);

  useEffect(
    () => subscribePublicUsers(authorUids, setPublicUsers, () => setListenerError('Some profile details could not be loaded.')),
    [authorUids.join('|')],
  );

  const saveProfile = async () => {
    if (!user?.uid || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateDisplayName(name);
      await updateThenSettings({ uid: user.uid, displayName: name, profileVisibility, appearInWander });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const changeAvatar = async () => {
    if (!user?.uid || !db) return;
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo access denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled) return;

    setBusy(true);
    try {
      const previousAvatar = avatarUri;
      const url = await uploadAvatar({ uid: user.uid, uri: result.assets[0].uri });
      await setDoc(doc(db, 'users', user.uid), { avatarUrl: url, updatedAt: serverTimestamp() }, { merge: true });
      await setDoc(doc(db, 'publicUsers', user.uid), { avatarUrl: url, updatedAt: serverTimestamp() }, { merge: true });
      setAvatarUri(url);
      await deleteStoredFile(previousAvatar).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update avatar.');
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

  const confirmDeleteMoment = async () => {
    if (!user?.uid || !deletingMoment) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMoment({ momentId: deletingMoment.id, uid: user.uid });
      setDeletingMoment(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete this moment.');
    } finally {
      setBusy(false);
    }
  };

  const openDeleteMoment = (moment: Moment) => {
    setError(null);
    setDeletingMoment(moment);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(deletePassword);
      setShowDeleteAccount(false);
    } catch (e: any) {
      const message =
        e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password'
          ? 'Password is incorrect.'
          : e instanceof Error
            ? e.message
            : 'Could not delete the account.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ alignItems: 'center' }} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ width: '100%', maxWidth: 640, gap: 18 }}>
      <PageHeader
        title="Your roll"
        subtitle="Your archive, saved moments, and requests."
        right={
          <View>
            <IconButton
              icon={requests.length ? 'bell' : 'bell-outline'}
              iconColor={requests.length ? colors.primary : colors.textSecondary}
              size={22}
              onPress={() => setView('requests')}
              accessibilityLabel={requests.length ? `${requests.length} pending requests` : 'Open requests'}
            />
            {requests.length ? (
              <Badge style={{ position: 'absolute', right: 2, top: 2, backgroundColor: colors.primary }}>
                {requests.length}
              </Badge>
            ) : null}
          </View>
        }
      />
      <ListenerError message={listenerError} onRetry={() => { setListenerError(null); onRefresh(); }} />

      <View style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 72, height: 72, borderRadius: 999 }} />
          ) : (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 999,
                backgroundColor: colors.surfaceWarm,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="titleLarge">{initialsFromName(user?.displayName)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall">{user?.displayName ?? 'Then Friend'}</Text>
            <Text style={{ color: colors.textSecondary }}>keeping up {following.length} / kept by {followers.length}</Text>
          </View>
        </View>

        <TextInput label="display name" value={name} onChangeText={setName} disabled={busy} />

        <SegmentedButtons
          value={profileVisibility}
          onValueChange={(value) => setProfileVisibility(value as ProfileVisibility)}
          buttons={[
            { value: 'private', label: 'Private' },
            { value: 'public', label: 'Public' },
          ]}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall">Default to Wander</Text>
            <Text style={{ color: colors.textSecondary }}>New moments start opted in.</Text>
          </View>
          <Switch value={appearInWander} onValueChange={setAppearInWander} disabled={busy} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button mode="contained" onPress={saveProfile} disabled={busy || !name.trim()} style={{ flex: 1 }}>
            Save
          </Button>
          <Button mode="outlined" onPress={changeAvatar} disabled={busy} style={{ flex: 1 }}>
            Avatar
          </Button>
        </View>
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      </View>

      <SegmentedButtons
        value={view}
        onValueChange={(value) => setView(value as RollView)}
        buttons={[
          { value: 'archive', label: 'Archive' },
          { value: 'saved', label: 'Saved' },
          { value: 'requests', label: `Requests ${requests.length ? `(${requests.length})` : ''}` },
        ]}
      />

      {view === 'requests' ? (
        requests.length === 0 ? (
          <EmptyState title="No follow requests" message="Follow requests land here." />
        ) : (
          requests.map((request) => (
            <View
              key={request.requesterUid}
              style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}
            >
              <Text variant="titleLarge">{request.displayName ?? 'Then Friend'}</Text>
              <Text style={{ color: colors.textSecondary }}>{request.context}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button mode="contained" onPress={() => handleApprove(request.requesterUid)} style={{ flex: 1 }}>
                  Approve
                </Button>
                <Button mode="outlined" onPress={() => handleDecline(request.requesterUid)} style={{ flex: 1 }}>
                  Decline
                </Button>
              </View>
            </View>
          ))
        )
      ) : visibleMoments.length === 0 ? (
        <EmptyState
          title={view === 'archive' ? 'Your archive is waiting' : 'Nothing saved yet'}
          message={view === 'archive' ? 'Shared moments appear here.' : 'Saved moments appear here.'}
        />
      ) : (
        <View style={{ gap: 16 }}>
          {visibleMoments.slice(0, 30).map((moment) => (
            <MomentCard
              key={moment.id}
              moment={moment}
              mode={view === 'archive' ? 'roll' : 'saved'}
              author={
                publicUsers[moment.authorUid] ?? {
                  uid: moment.authorUid,
                  displayName: moment.authorUid === user?.uid ? user.displayName : null,
                  handle: null,
                  avatarUrl: null,
                  profileVisibility,
                  appearInWander,
                }
              }
              canFlipBack={view === 'archive' && moment.authorUid === user?.uid}
              onDelete={view === 'archive' && moment.authorUid === user?.uid ? openDeleteMoment : undefined}
              onNotes={(selectedMoment) => navigation.navigate('Notes', { moment: selectedMoment })}
            />
          ))}
        </View>
      )}

      <Button mode="text" onPress={logout} textColor={colors.error}>
        Sign out
      </Button>
      <Button
        mode="outlined"
        icon="account-remove-outline"
        onPress={() => {
          setError(null);
          setDeletePassword('');
          setShowDeleteAccount(true);
        }}
        textColor={colors.error}
      >
        Delete account
      </Button>
      </View>

      <Portal>
        <Dialog visible={Boolean(deletingMoment)} onDismiss={() => setDeletingMoment(null)}>
          <Dialog.Title>Delete this moment?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary }}>The photo, notes, likes, and private reflection will be permanently removed.</Text>
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeletingMoment(null)} disabled={busy}>Keep</Button>
            <Button onPress={confirmDeleteMoment} loading={busy} disabled={busy} textColor={colors.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showDeleteAccount} onDismiss={() => setShowDeleteAccount(false)}>
          <Dialog.Title>Delete your account?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              This permanently removes your profile, moments, friendships, saved items, and current uploaded media. Enter your password to confirm.
            </Text>
            <TextInput
              label="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              disabled={busy}
            />
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteAccount(false)} disabled={busy}>Cancel</Button>
            <Button
              onPress={confirmDeleteAccount}
              loading={busy}
              disabled={busy || !deletePassword}
              textColor={colors.error}
            >
              Delete account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
