import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import ListenerError from '../components/ListenerError';
import MomentCard from '../components/MomentCard';
import MomentSortControl from '../components/MomentSortControl';
import Screen from '../components/Screen';
import { PillButton, ScreenHeader, SectionRow } from '../components/DesignPrimitives';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { RootStackParamList, TabsParamList } from '../navigation/types';
import { subscribeFollowing } from '../services/follows';
import { subscribeMomentsByAuthors } from '../services/moments';
import { subscribePublicUsers } from '../services/users';
import type { Moment, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';
import { initialsFromName } from '../utils/formatters';
import type { MomentSort } from '../utils/momentSorting';
import { sortMomentsForDisplay } from '../utils/momentSorting';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function FeedScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<Nav>();
  const tabNavigation = useNavigation<any>();
  const [following, setFollowing] = useState<string[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<MomentSort>('posted');
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [listenerError, setListenerError] = useState<string | null>(null);
  const { refreshing, refreshKey, onRefresh, finishRefresh } = usePullToRefresh();

  useEffect(() => {
    if (!user?.uid) {
      finishRefresh();
      return;
    }
    return subscribeFollowing(user.uid, setFollowing, () => {
      setListenerError('Your friend list could not be loaded.');
      finishRefresh();
    });
  }, [finishRefresh, refreshKey, user?.uid]);

  const homeAuthorUids = useMemo(() => (user?.uid ? [user.uid, ...following] : following), [following, user?.uid]);
  useEffect(
    () =>
      subscribeMomentsByAuthors(
        homeAuthorUids,
        (nextMoments) => {
          setMoments(nextMoments);
          finishRefresh();
        },
        () => {
          setListenerError('Your moments could not be loaded.');
          finishRefresh();
        },
        undefined,
        pageSize,
      ),
    [finishRefresh, homeAuthorUids.join('|'), pageSize, refreshKey],
  );

  const authorUids = useMemo(
    () => Array.from(new Set(moments.map((moment) => moment.authorUid).concat(user?.uid ?? []))),
    [moments, user?.uid],
  );
  useEffect(
    () => subscribePublicUsers(authorUids, setPublicUsers, () => setListenerError('Some profile details could not be loaded.')),
    [authorUids.join('|')],
  );

  const openMoment = (moment: Moment) => navigation.navigate('MomentDetail', { momentId: moment.id, moment, canNote: true });
  const visibleMoments = useMemo(() => sortMomentsForDisplay(moments, sort), [moments, sort]);
  const sortNote = sort === 'posted' ? 'by post date' : 'by photo date';

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <ScreenHeader
        title="then"
        subtitle="From the people you keep up with."
        avatarUrl={user?.uid ? publicUsers[user.uid]?.avatarUrl : null}
        initials={initialsFromName(user?.displayName)}
        onAvatarPress={() => tabNavigation.navigate('RollTab' as keyof TabsParamList)}
      />
      <View style={{ paddingHorizontal: 18 }}>
        <ListenerError message={listenerError} onRetry={() => { setListenerError(null); onRefresh(); }} />
      </View>
      <FlatList
        data={visibleMoments}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(moment) => moment.id}
        contentContainerStyle={{
          paddingTop: visibleMoments.length ? 4 : 0,
          paddingBottom: 132,
          alignItems: 'center',
        }}
        ListHeaderComponent={
          visibleMoments.length ? (
            <View style={{ gap: 10 }}>
              <SectionRow label="Recent" note={sortNote} />
              <View style={{ paddingHorizontal: 18 }}>
                <MomentSortControl value={sort} onChange={setSort} />
              </View>
            </View>
          ) : null
        }
        ListHeaderComponentStyle={{ width: '100%', marginBottom: 8 }}
        ListEmptyComponent={
          <EmptyFeed
            onShare={() => tabNavigation.navigate('NewMomentTab' as keyof TabsParamList)}
            onFind={() => tabNavigation.navigate('FriendsTab' as keyof TabsParamList)}
          />
        }
        renderItem={({ item }) => (
          <MomentCard
            moment={item}
            author={publicUsers[item.authorUid]}
            onPress={openMoment}
            onNotes={(moment) => navigation.navigate('MomentDetail', { momentId: moment.id, moment, canNote: true })}
          />
        )}
        ListFooterComponent={
          visibleMoments.length ? (
            <View style={{ alignItems: 'center', gap: 10, paddingTop: 4 }}>
              <PillButton variant="secondary" onPress={() => setPageSize((current) => current + 25)}>
                Load more
              </PillButton>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function EmptyFeed({ onShare, onFind }: { onShare: () => void; onFind: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 68 }}>
      <View
        style={{
          width: 150,
          height: 182,
          borderRadius: radius.print,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: '#D4C8B4',
          backgroundColor: colors.surface,
          padding: 10,
          transform: [{ rotate: '-3deg' }],
        }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1EADC' }}>
          <Icon source="image-outline" color={colors.textFaintest} size={28} />
        </View>
        <View style={{ height: 34 }} />
      </View>
      <Text
        style={{
          marginTop: 26,
          color: colors.textPrimary,
          fontFamily: fonts.displayItalic,
          fontSize: 22,
          lineHeight: 28,
          textAlign: 'center',
        }}
      >
        Nothing developed yet
      </Text>
      <Text
        style={{
          marginTop: 8,
          maxWidth: 270,
          color: colors.textMuted,
          fontFamily: fonts.bodyRegular,
          fontSize: 13.5,
          lineHeight: 20,
          textAlign: 'center',
        }}
      >
        When the people you keep up with share a moment, it shows up here — newest first, never sorted.
      </Text>
      <PillButton icon="camera-outline" onPress={onShare} style={{ marginTop: 22, alignSelf: 'stretch' }}>
        Share the first moment
      </PillButton>
      <Text
        onPress={onFind}
        style={{ marginTop: 14, color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13 }}
      >
        or <Text style={{ color: colors.primary, fontFamily: fonts.bodySemiBold }}>find your people</Text>
      </Text>
    </View>
  );
}
