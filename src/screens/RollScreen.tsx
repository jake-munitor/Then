import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { Button, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

import EmptyState from '../components/EmptyState';
import MomentCard from '../components/MomentCard';
import Screen from '../components/Screen';
import { db } from '../firebase/firebase';
import { approveFollow, declineFollow, subscribeFollowers, subscribeFollowing, subscribeFollowRequests } from '../services/follows';
import { subscribeKeptMomentIds, subscribeMomentsByAuthors, subscribeMomentsByIds } from '../services/moments';
import { uploadAvatar } from '../services/photos';
import type { FollowRequest, Moment, ProfileVisibility, PublicUser } from '../services/types';
import { subscribePublicUsers, updateThenSettings } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { initialsFromName } from '../utils/formatters';

type RollView = 'archive' | 'kept' | 'requests';

export default function RollScreen() {
  const { user, logout, updateDisplayName } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [name, setName] = useState(user?.displayName ?? '');
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>('private');
  const [appearInWander, setAppearInWander] = useState(false);
  const [archive, setArchive] = useState<Moment[]>([]);
  const [keptIds, setKeptIds] = useState<string[]>([]);
  const [kept, setKept] = useState<Moment[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [view, setView] = useState<RollView>('archive');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeMomentsByAuthors([user.uid], setArchive);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeKeptMomentIds(user.uid, setKeptIds);
  }, [user?.uid]);

  useEffect(() => subscribeMomentsByIds(keptIds, setKept), [keptIds.join('|')]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowRequests(user.uid, setRequests);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowers(user.uid, setFollowers);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowing(user.uid, setFollowing);
  }, [user?.uid]);

  const visibleMoments = useMemo(() => (view === 'archive' ? archive : kept), [archive, kept, view]);
  const authorUids = useMemo(() => visibleMoments.map((moment) => moment.authorUid), [visibleMoments]);

  useEffect(() => subscribePublicUsers(authorUids, setPublicUsers), [authorUids.join('|')]);

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
      const url = await uploadAvatar({ uid: user.uid, uri: result.assets[0].uri });
      await setDoc(doc(db, 'users', user.uid), { avatarUrl: url, updatedAt: serverTimestamp() }, { merge: true });
      await setDoc(doc(db, 'publicUsers', user.uid), { avatarUrl: url, updatedAt: serverTimestamp() }, { merge: true });
      setAvatarUri(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update avatar.');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (requesterUid: string) => {
    if (!user?.uid) return;
    await approveFollow({ ownerUid: user.uid, requesterUid });
  };

  const handleDecline = async (requesterUid: string) => {
    if (!user?.uid) return;
    await declineFollow({ ownerUid: user.uid, requesterUid });
  };

  return (
    <Screen contentStyle={{ alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 640, gap: 18 }}>
      <View>
        <Text style={{ fontFamily: fonts.handwriting, fontSize: 40, color: colors.ink }}>your roll</Text>
        <Text style={{ color: colors.textSecondary }}>Archive, kept, requests.</Text>
      </View>

      <View style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, padding: 16, gap: 14 }}>
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
            <Text variant="titleMedium">{user?.displayName ?? 'Then Friend'}</Text>
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
            <Text variant="titleSmall">show in wander</Text>
            <Text style={{ color: colors.textSecondary }}>Let others find your front posts.</Text>
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
          { value: 'archive', label: 'archive' },
          { value: 'kept', label: 'kept' },
          { value: 'requests', label: `requests ${requests.length ? `(${requests.length})` : ''}` },
        ]}
      />

      {view === 'requests' ? (
        requests.length === 0 ? (
          <EmptyState title="No follow requests" message="Follow requests land here." />
        ) : (
          requests.map((request) => (
            <View key={request.requesterUid} style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, padding: 14, gap: 10 }}>
              <Text variant="titleMedium">{request.displayName ?? 'Then Friend'}</Text>
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
          title={view === 'archive' ? 'Your archive is waiting' : 'Nothing kept yet'}
          message={view === 'archive' ? 'Shared moments appear here.' : 'Saved moments appear here.'}
        />
      ) : (
        <View style={{ gap: 16 }}>
          {visibleMoments.slice(0, 30).map((moment) => (
            <MomentCard
              key={moment.id}
              moment={moment}
              mode={view === 'archive' ? 'roll' : 'kept'}
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
              onNotes={(selectedMoment) => navigation.navigate('Notes', { moment: selectedMoment })}
            />
          ))}
        </View>
      )}

      <Button mode="text" onPress={logout} textColor={colors.error}>
        Sign out
      </Button>
      </View>
    </Screen>
  );
}
