import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import EmptyState from '../components/EmptyState';
import MomentCard from '../components/MomentCard';
import Screen from '../components/Screen';
import { RootStackParamList, TabsParamList } from '../navigation/types';
import { subscribeFollowing } from '../services/follows';
import { subscribeMomentsByAuthors } from '../services/moments';
import { subscribePublicUsers } from '../services/users';
import type { Moment, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function FeedScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<Nav>();
  const tabNavigation = useNavigation<any>();
  const [following, setFollowing] = useState<string[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFollowing(user.uid, setFollowing);
  }, [user?.uid]);

  const homeAuthorUids = useMemo(() => (user?.uid ? [user.uid, ...following] : following), [following, user?.uid]);
  useEffect(() => subscribeMomentsByAuthors(homeAuthorUids, setMoments), [homeAuthorUids.join('|')]);

  const authorUids = useMemo(() => moments.map((moment) => moment.authorUid), [moments]);
  useEffect(() => subscribePublicUsers(authorUids, setPublicUsers), [authorUids.join('|')]);

  const emptyTitle = moments.length === 0 && following.length === 0 ? 'No moments yet' : 'Nothing new';
  const emptyMessage =
    moments.length === 0 && following.length === 0
      ? 'Add a photo to start.'
      : 'When someone shares, it will show up here.';
  const emptyAction = moments.length === 0 && following.length === 0 ? 'New moment' : 'Wander';
  const emptyTarget = moments.length === 0 && following.length === 0 ? 'NewMomentTab' : 'WanderTab';

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ fontFamily: fonts.handwriting, fontSize: 42, color: colors.ink }}>then</Text>
        <Text style={{ color: colors.textSecondary }}>Photos from people you choose.</Text>
      </View>
      <FlatList
        data={moments}
        keyExtractor={(moment) => moment.id}
        contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 36, alignItems: 'center' }}
        ListEmptyComponent={
          <EmptyState
            title={emptyTitle}
            message={emptyMessage}
            actionLabel={emptyAction}
            onAction={() => tabNavigation.navigate(emptyTarget as keyof TabsParamList)}
          />
        }
        renderItem={({ item }) => (
          <MomentCard
            moment={item}
            author={publicUsers[item.authorUid]}
            onNotes={(moment) => navigation.navigate('Notes', { moment })}
          />
        )}
        ListFooterComponent={
          moments.length ? (
            <Button mode="text" onPress={() => tabNavigation.navigate('NewMomentTab' as keyof TabsParamList)}>
              New moment
            </Button>
          ) : null
        }
      />
    </Screen>
  );
}
