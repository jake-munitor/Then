import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import EmptyState from '../components/EmptyState';
import ListenerError from '../components/ListenerError';
import Screen from '../components/Screen';
import {
  Avatar,
  IconCircleButton,
  PillButton,
  ScreenHeader,
  SectionLabel,
  SegmentedControl,
  Thumb,
} from '../components/DesignPrimitives';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { RootStackParamList } from '../navigation/types';
import { approveFollow, declineFollow, subscribeFollowers, subscribeFollowing, subscribeFollowRequests } from '../services/follows';
import {
  fetchMomentsByAuthorPage,
  fetchSavedMomentIdPage,
  subscribeMomentsByAuthors,
  subscribeMomentsByIds,
  subscribeSavedMomentIds,
  type MomentPageCursor,
} from '../services/moments';
import { subscribeNotifications } from '../services/notifications';
import type { FollowRequest, Moment, ProfileVisibility, PublicUser } from '../services/types';
import { subscribePublicUsers } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';
import { initialsFromName } from '../utils/formatters';

type RollView = 'archive' | 'saved' | 'requests';
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function RollScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>('private');
  const [appearInWander, setAppearInWander] = useState(false);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [archive, setArchive] = useState<Moment[]>([]);
  const [archiveCursor, setArchiveCursor] = useState<MomentPageCursor>(null);
  const [archiveHasMore, setArchiveHasMore] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedCursor, setSavedCursor] = useState<MomentPageCursor>(null);
  const [savedHasMore, setSavedHasMore] = useState(true);
  const [saved, setSaved] = useState<Moment[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [requestUsers, setRequestUsers] = useState<Record<string, PublicUser>>({});
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [view, setView] = useState<RollView>('archive');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
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
    return subscribeFollowers(user.uid, setFollowers, () => setListenerError('Follower details could not be loaded.'));
  }, [refreshKey, user?.uid]);
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowing(user.uid, setFollowing, () => setListenerError('Your friend list could not be loaded.'));
  }, [refreshKey, user?.uid]);
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeNotifications(
      user.uid,
      (items) => setNotificationCount(items.filter((item) => !item.readAt).length),
      () => setListenerError('Notifications could not be loaded.'),
    );
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid) return;
    return subscribePublicUsers(
      [user.uid],
      (profiles) => {
        const current = profiles[user.uid];
        if (!current) return;
        setProfile(current);
        setProfileVisibility(current.profileVisibility);
        setAppearInWander(current.appearInWander);
      },
      () => setListenerError('Your profile could not be loaded.'),
    );
  }, [user?.uid]);
  useEffect(
    () => subscribePublicUsers(requests.map((request) => request.requesterUid), setRequestUsers, () => setListenerError('Some request details could not be loaded.')),
    [requests.map((request) => request.requesterUid).join('|')],
  );

  const visibleMoments = useMemo(() => (view === 'archive' ? archive : saved), [archive, saved, view]);
  const gridGap = 12;
  const gridWidth = Math.min(width - 36, 560);
  const thumbSize = (gridWidth - gridGap) / 2;

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
    } catch {
      setListenerError('Older moments could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} contentStyle={{ gap: 16, paddingHorizontal: 18, paddingBottom: 104 }}>
      <ScreenHeader
        title="Your roll"
        titleKind="script"
        subtitle="Everything you've kept and shared, in one place."
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HeaderIconWithBadge
              icon="bell-outline"
              count={notificationCount}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityLabel="Open notifications"
            />
            <IconCircleButton icon="cog-outline" onPress={() => navigation.navigate('RollSettings')} accessibilityLabel="Open settings" />
          </View>
        }
      />
      <ListenerError message={listenerError} onRetry={() => { setListenerError(null); onRefresh(); }} />
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.xl,
          padding: 20,
          flexDirection: 'row',
          gap: 16,
          alignItems: 'center',
          shadowColor: '#2A2622',
          shadowOpacity: 0.06,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 3,
        }}
      >
        <Avatar uri={profile?.avatarUrl} name={profile?.displayName ?? user?.displayName} size={66} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 30 }}>
              {profile?.displayName ?? user?.displayName ?? 'Then Friend'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, backgroundColor: colors.background, paddingHorizontal: 9, paddingVertical: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
              <Text style={{ color: colors.textSecondary, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>
                {profileVisibility === 'public' ? 'Public' : 'Private'}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 13 }}>
            {profile?.handle ? `@${profile.handle}` : '@handle'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fonts.displayRegular, fontSize: 18 }}>{following.length}</Text> keeping up
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fonts.displayRegular, fontSize: 18 }}>{followers.length}</Text> kept by
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'archive', label: 'Archive' },
            { value: 'saved', label: 'Saved' },
            { value: 'requests', label: 'Requests' },
          ]}
          style={{ flex: 1 }}
        />
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>Recent</Text>
      </View>

      <PillButton variant="secondary" icon="book-open-page-variant-outline" onPress={() => navigation.navigate('YourYear')}>
        Your Year
      </PillButton>

      {view === 'requests' ? (
        requests.length === 0 ? (
          <EmptyState title="No follow requests" message="Follow requests land here." />
        ) : (
          <View style={{ gap: 12 }}>
            {requests.map((request) => {
              const requester = requestUsers[request.requesterUid];
              return (
                <View key={request.requesterUid} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar uri={requester?.avatarUrl} name={requester?.displayName ?? request.displayName} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>
                        {requester?.displayName ?? request.displayName ?? 'Then Friend'}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12.5 }}>
                        {request.context}
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
        )
      ) : visibleMoments.length === 0 ? (
        <EmptyState
          title={view === 'archive' ? 'Your archive is waiting' : 'Nothing saved yet'}
          message={view === 'archive' ? 'Shared moments appear here.' : 'Saved moments appear here.'}
        />
      ) : (
        <View style={{ width: gridWidth, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }}>
          {visibleMoments.map((moment) => (
            <Pressable
              key={moment.id}
              onPress={() => navigation.navigate('MomentDetail', { momentId: moment.id, moment, canNote: true })}
              accessibilityRole="button"
              accessibilityLabel={moment.frontText || 'Open moment'}
              style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
            >
              <Thumb uri={moment.imageUrl} size={thumbSize} caption={moment.frontText} />
            </Pressable>
          ))}
        </View>
      )}

      {(view === 'archive' ? archiveHasMore : view === 'saved' ? savedHasMore : false) ? (
        <PillButton variant="secondary" onPress={loadMore} disabled={loadingMore}>
          Load more
        </PillButton>
      ) : null}
    </Screen>
  );
}

function HeaderIconWithBadge({
  icon,
  count,
  onPress,
  accessibilityLabel,
}: {
  icon: string;
  count: number;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon source={icon} color={colors.textMuted} size={21} />
      {count ? (
        <View
          style={{
            position: 'absolute',
            right: -2,
            top: -2,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            borderColor: colors.surface,
            borderWidth: 1,
          }}
        >
          <Text style={{ color: colors.white, fontFamily: fonts.bodySemiBold, fontSize: 10 }}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
