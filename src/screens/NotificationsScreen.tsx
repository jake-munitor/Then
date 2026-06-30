import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EmptyState from '../components/EmptyState';
import ListenerError from '../components/ListenerError';
import Screen from '../components/Screen';
import { Avatar, PillButton, SectionLabel } from '../components/DesignPrimitives';
import type { RootStackParamList } from '../navigation/types';
import { markAllNotificationsRead, subscribeNotifications } from '../services/notifications';
import { subscribePublicUsers } from '../services/users';
import type { AppNotification, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [actors, setActors] = useState<Record<string, PublicUser>>({});
  const [busy, setBusy] = useState(false);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeNotifications(
      user.uid,
      (items) => {
        setNotifications(items);
        setListenerError(null);
      },
      () => setListenerError('Notifications could not be loaded.'),
    );
  }, [user?.uid]);

  const actorUids = useMemo(
    () => Array.from(new Set(notifications.map((item) => item.actorUid).filter(Boolean))),
    [notifications],
  );

  useEffect(
    () => subscribePublicUsers(actorUids, setActors, () => setListenerError('Some notification profiles could not be loaded.')),
    [actorUids.join('|')],
  );

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const markRead = async () => {
    if (!user?.uid || busy || !unreadCount) return;
    setBusy(true);
    setError(null);
    try {
      await markAllNotificationsRead(user.uid);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark notifications read.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ gap: 16, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 38 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={{ flex: 1 }}>
          <Icon source="chevron-left" color={colors.textPrimary} size={25} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', color: colors.textPrimary, fontFamily: fonts.displayMedium, fontSize: 21 }}>
          Notifications
        </Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Icon source="bell-outline" color={colors.textFaint} size={22} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View>
          <SectionLabel>Recent notes</SectionLabel>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12.5, marginTop: 3 }}>
            {unreadCount ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        <PillButton variant="secondary" onPress={markRead} disabled={busy || !unreadCount} style={{ minHeight: 38 }}>
          Mark read
        </PillButton>
      </View>

      <ListenerError message={listenerError} onRetry={() => setListenerError(null)} />
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

      {notifications.length ? (
        <View style={{ gap: 10 }}>
          {notifications.map((item) => {
            const actor = actors[item.actorUid];
            const unread = !item.readAt;
            return (
              <Pressable
                key={item.id}
                onPress={() => navigation.navigate('MomentDetail', { momentId: item.momentId, canNote: true })}
                accessibilityRole="button"
                accessibilityLabel={`Open notification for ${item.frontText || 'moment'}`}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.72 : 1,
                  backgroundColor: unread ? colors.surface : colors.surfaceInset,
                  borderColor: unread ? colors.borderStrong : colors.border,
                  borderWidth: 1,
                  borderRadius: radius.lg,
                  padding: 14,
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'flex-start',
                })}
              >
                <Avatar uri={actor?.avatarUrl} name={actor?.displayName} size={38} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    {unread ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
                    <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>
                      {actor?.displayName ?? 'Someone'} left a note
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 22 }}>
                    {item.text || 'Open the moment to read it.'}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 12 }}>
                    on {item.frontText || 'a moment'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyState title="Nothing new" message="Notes on your moments will land here." />
      )}
    </Screen>
  );
}
