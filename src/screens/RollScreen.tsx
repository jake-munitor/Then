import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Image, Share, View } from 'react-native';
import { Badge, Button, Dialog, IconButton, Portal, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import EmptyState from '../components/EmptyState';
import ListenerError from '../components/ListenerError';
import MomentCard from '../components/MomentCard';
import MomentSortControl from '../components/MomentSortControl';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { approveFollow, declineFollow, subscribeFollowers, subscribeFollowing, subscribeFollowRequests } from '../services/follows';
import {
  deleteMoment,
  fetchMomentsByAuthorPage,
  fetchSavedMomentIdPage,
  saveMomentBack,
  subscribeMomentsByAuthors,
  subscribeMomentsByIds,
  subscribeSavedMomentIds,
  type MomentPageCursor,
} from '../services/moments';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  markAllNotificationsRead,
  subscribeNotificationPreferences,
  subscribeNotifications,
  updateNotificationPreferences,
} from '../services/notifications';
import { deleteStoredFile, uploadAvatar } from '../services/photos';
import type {
  AppNotification,
  FollowRequest,
  Moment,
  NotificationPreferences,
  ProfileVisibility,
  PublicUser,
} from '../services/types';
import { subscribePublicUsers, updateThenSettings } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { initialsFromName } from '../utils/formatters';
import type { MomentSort } from '../utils/momentSorting';
import { sortMomentsForDisplay } from '../utils/momentSorting';

type RollView = 'archive' | 'saved' | 'requests' | 'activity';

export default function RollScreen() {
  const { user, deleteAccount, logout, updateDisplayName } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [name, setName] = useState(user?.displayName ?? '');
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>('private');
  const [appearInWander, setAppearInWander] = useState(false);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [archive, setArchive] = useState<Moment[]>([]);
  const [archiveCursor, setArchiveCursor] = useState<MomentPageCursor>(null);
  const [archiveHasMore, setArchiveHasMore] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedCursor, setSavedCursor] = useState<MomentPageCursor>(null);
  const [savedHasMore, setSavedHasMore] = useState(true);
  const [saved, setSaved] = useState<Moment[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [view, setView] = useState<RollView>('archive');
  const [sort, setSort] = useState<MomentSort>('posted');
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [deletingMoment, setDeletingMoment] = useState<Moment | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Moment | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const { refreshing, refreshKey, onRefresh, finishRefresh } = usePullToRefresh();

  useEffect(() => {
    if (!user?.uid) {
      finishRefresh();
      return;
    }
    return subscribeMomentsByAuthors(
      [user.uid],
      (nextArchive) => {
        setArchive(nextArchive);
        finishRefresh();
      },
      () => {
        setListenerError('Your archive could not be loaded.');
        finishRefresh();
      },
      (cursor) => {
        setArchiveCursor(cursor);
        setArchiveHasMore(Boolean(cursor));
      },
    );
  }, [finishRefresh, refreshKey, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeSavedMomentIds(
      user.uid,
      setSavedIds,
      () => setListenerError('Saved moments could not be loaded.'),
      (cursor) => {
        setSavedCursor(cursor);
        setSavedHasMore(Boolean(cursor));
      },
    );
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
    return subscribeNotifications(
      user.uid,
      setNotifications,
      () => setListenerError('Note activity could not be loaded.'),
    );
  }, [refreshKey, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeNotificationPreferences(
      user.uid,
      setNotificationPreferences,
      () => setListenerError('Notification settings could not be loaded.'),
    );
  }, [user?.uid]);

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
        setProfileHandle(profile.handle);
        setHandle(profile.handle ?? '');
        setAvatarUri(profile.avatarUrl);
        setProfileVisibility(profile.profileVisibility);
        setAppearInWander(profile.appearInWander);
      },
      () => setListenerError('Your profile could not be loaded.'),
    );
  }, [user?.displayName, user?.uid]);

  const visibleMoments = useMemo(
    () => sortMomentsForDisplay(view === 'archive' ? archive : saved, sort),
    [archive, saved, sort, view],
  );
  const authorUids = useMemo(
    () =>
      Array.from(
        new Set(
          visibleMoments
            .map((moment) => moment.authorUid)
            .concat(notifications.map((notification) => notification.actorUid)),
        ),
      ),
    [notifications, visibleMoments],
  );

  useEffect(
    () => subscribePublicUsers(authorUids, setPublicUsers, () => setListenerError('Some profile details could not be loaded.')),
    [authorUids.join('|')],
  );

  const saveProfile = async () => {
    if (!user?.uid || !name.trim() || !handle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateDisplayName(name);
      await updateThenSettings({
        uid: user.uid,
        displayName: name,
        handle,
        profileVisibility,
        appearInWander,
        avatarUrl: avatarUri,
        onboardingCompleted: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const changeAvatar = async () => {
    if (!user?.uid || !handle.trim()) return;
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
      await updateThenSettings({
        uid: user.uid,
        displayName: name || user.displayName || 'Then Friend',
        handle,
        profileVisibility,
        appearInWander,
        avatarUrl: url,
        onboardingCompleted: true,
      });
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

  const openActivity = () => {
    setView('activity');
    if (user?.uid) markAllNotificationsRead(user.uid).catch(() => {});
  };

  const shareProfile = async () => {
    const handle = profileHandle ? `@${profileHandle}` : user?.displayName ?? 'me';
    await Share.share({
      message: `Find ${handle} on Then: then://profile/${profileHandle ?? ''}\n\nIf Then is not installed: https://apps.apple.com/app/id6778068657`,
    });
  };

  const setNotificationPreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user?.uid) return;
    const next = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(next);
    try {
      await updateNotificationPreferences(user.uid, next);
      setError(null);
    } catch (e) {
      setNotificationPreferences(notificationPreferences);
      setError(e instanceof Error ? e.message : 'Could not update notifications.');
    }
  };

  const openReflectionEditor = (moment: Moment, currentText: string) => {
    setEditingReflection(moment);
    setReflectionText(currentText);
    setError(null);
  };

  const saveReflection = async () => {
    if (!user?.uid || !editingReflection) return;
    setBusy(true);
    setError(null);
    try {
      await saveMomentBack({
        momentId: editingReflection.id,
        uid: user.uid,
        text: reflectionText,
      });
      setEditingReflection(null);
      setReflectionText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this reflection.');
    } finally {
      setBusy(false);
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

  const loadMore = async () => {
    if (!user?.uid || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      if (view === 'archive' && archiveCursor) {
        const page = await fetchMomentsByAuthorPage({ authorUid: user.uid, after: archiveCursor });
        setArchive((current) => {
          const seen = new Set(current.map((moment) => moment.id));
          return current.concat(page.moments.filter((moment) => !seen.has(moment.id)));
        });
        setArchiveCursor(page.nextCursor);
        setArchiveHasMore(Boolean(page.nextCursor) && page.moments.length > 0);
      } else if (view === 'saved' && savedCursor) {
        const page = await fetchSavedMomentIdPage({ uid: user.uid, after: savedCursor });
        setSavedIds((current) => Array.from(new Set(current.concat(page.momentIds))));
        setSavedCursor(page.nextCursor);
        setSavedHasMore(Boolean(page.nextCursor) && page.momentIds.length > 0);
      }
    } catch (e) {
      setListenerError('Older moments could not be loaded.');
    } finally {
      setLoadingMore(false);
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
              icon={notifications.some((item) => !item.readAt) ? 'bell' : 'bell-outline'}
              iconColor={notifications.some((item) => !item.readAt) ? colors.primary : colors.textSecondary}
              size={22}
              onPress={openActivity}
              accessibilityLabel="Open activity"
            />
            {notifications.filter((item) => !item.readAt).length ? (
              <Badge style={{ position: 'absolute', right: 2, top: 2, backgroundColor: colors.primary }}>
                {notifications.filter((item) => !item.readAt).length}
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
        <TextInput
          label="handle"
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
          disabled={busy}
          left={<TextInput.Affix text="@" />}
        />

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
          <Button mode="contained" onPress={saveProfile} disabled={busy || !name.trim() || !handle.trim()} style={{ flex: 1 }}>
            Save
          </Button>
          <Button mode="outlined" onPress={changeAvatar} disabled={busy} style={{ flex: 1 }}>
            Avatar
          </Button>
        </View>
        <Button mode="text" icon="share-variant-outline" onPress={shareProfile} disabled={busy}>
          Share my profile
        </Button>
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      </View>

      <View style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 18, gap: 14 }}>
        <View>
          <Text variant="titleMedium">Notifications</Text>
          <Text style={{ color: colors.textSecondary }}>Choose which quiet updates can buzz you.</Text>
        </View>
        {[
          ['notes', 'Notes on your moments'],
          ['followRequests', 'Friend requests'],
          ['friendApprovals', 'Friend approvals'],
          ['wander', 'Wander activity'],
        ].map(([key, label]) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ flex: 1, color: colors.textPrimary }}>{label}</Text>
            <Switch
              value={notificationPreferences[key as keyof NotificationPreferences]}
              onValueChange={(value) => setNotificationPreference(key as keyof NotificationPreferences, value)}
              disabled={busy}
            />
          </View>
        ))}
      </View>

      <SegmentedButtons
        value={view}
        onValueChange={(value) => {
          if (value === 'activity') openActivity();
          else setView(value as RollView);
        }}
        buttons={[
          { value: 'archive', label: 'Archive' },
          { value: 'saved', label: 'Saved' },
          { value: 'requests', label: `Requests ${requests.length ? `(${requests.length})` : ''}` },
        ]}
      />
      {(view === 'archive' || view === 'saved') && visibleMoments.length ? (
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 12 }}>
          <MomentSortControl value={sort} onChange={setSort} />
        </View>
      ) : null}

      {view === 'activity' ? (
        notifications.length === 0 ? (
          <EmptyState title="No note activity" message="New notes on your moments will appear here." />
        ) : (
          notifications.map((notification) => (
            <View
              key={notification.id}
              style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 6 }}
            >
              <Text variant="titleMedium">
                {publicUsers[notification.actorUid]?.displayName ?? 'A friend'} left a note
              </Text>
              <Text style={{ color: colors.textPrimary }}>{notification.text}</Text>
              <Text style={{ color: colors.textSecondary }}>On {notification.frontText || 'your moment'}</Text>
            </View>
          ))
        )
      ) : view === 'requests' ? (
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
          {visibleMoments.map((moment) => (
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
              onEditBack={view === 'archive' && moment.authorUid === user?.uid ? openReflectionEditor : undefined}
              onDelete={view === 'archive' && moment.authorUid === user?.uid ? openDeleteMoment : undefined}
              onNotes={(selectedMoment) => navigation.navigate('Notes', { moment: selectedMoment })}
            />
          ))}
          {(view === 'archive' ? archiveHasMore : savedHasMore) ? (
            <Button mode="text" onPress={loadMore} loading={loadingMore} disabled={loadingMore}>
              Load more
            </Button>
          ) : null}
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
        <Dialog visible={Boolean(editingReflection)} onDismiss={() => setEditingReflection(null)}>
          <Dialog.Title>Private reflection</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              This stays private and can be revisited whenever you like.
            </Text>
            <TextInput
              label="on the back"
              value={reflectionText}
              onChangeText={setReflectionText}
              multiline
              disabled={busy}
            />
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditingReflection(null)} disabled={busy}>Cancel</Button>
            <Button onPress={saveReflection} loading={busy} disabled={busy}>Save</Button>
          </Dialog.Actions>
        </Dialog>
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
