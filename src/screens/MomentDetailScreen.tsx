import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DateStamp from '../components/DateStamp';
import FilteredMomentImage from '../components/FilteredMomentImage';
import Screen from '../components/Screen';
import { Avatar, PillButton, SectionLabel } from '../components/DesignPrimitives';
import type { RootStackParamList } from '../navigation/types';
import {
  addNote,
  subscribeMoment,
  subscribeMomentBack,
  subscribeMomentKeep,
  subscribeMomentSaved,
  subscribeNotes,
  toggleKeep,
  toggleSave,
} from '../services/moments';
import { markMomentNotificationsRead } from '../services/notifications';
import { subscribePublicUsers } from '../services/users';
import type { Moment, MomentBack, Note, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';
import { formatMemoryDate } from '../utils/dates';

type Props = NativeStackScreenProps<RootStackParamList, 'MomentDetail'>;

export default function MomentDetailScreen({ route, navigation }: Props) {
  const { user } = useContext(AuthContext);
  const [moment, setMoment] = useState<Moment | null>(route.params.moment ?? null);
  const [back, setBack] = useState<MomentBack | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [text, setText] = useState('');
  const [kept, setKept] = useState(false);
  const [saved, setSaved] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [busyAction, setBusyAction] = useState<'keep' | 'save' | 'note' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(
    () =>
      subscribeMoment(
        route.params.momentId,
        setMoment,
        () => setListenerError('This moment could not be loaded.'),
      ),
    [route.params.momentId],
  );

  const isOwner = Boolean(user?.uid && moment?.authorUid === user.uid);
  useEffect(() => {
    if (!moment?.id || !isOwner) {
      setBack(null);
      setFlipped(false);
      return;
    }
    return subscribeMomentBack(moment.id, setBack, () => setListenerError('The private reflection could not be loaded.'));
  }, [isOwner, moment?.id]);

  useEffect(() => {
    if (!moment?.id) return;
    return subscribeNotes(
      moment.id,
      setNotes,
      () => setListenerError('Notes could not be loaded.'),
    );
  }, [moment?.id]);

  useEffect(() => {
    if (user?.uid && moment?.authorUid === user.uid) {
      markMomentNotificationsRead(user.uid, moment.id).catch(() => {});
    }
  }, [moment?.authorUid, moment?.id, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !moment?.id) return;
    return subscribeMomentKeep({ momentId: moment.id, uid: user.uid }, setKept, () => {
      setListenerError('Some moment actions could not be loaded.');
    });
  }, [moment?.id, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !moment?.id) return;
    return subscribeMomentSaved({ momentId: moment.id, uid: user.uid }, setSaved, () => {
      setListenerError('Some moment actions could not be loaded.');
    });
  }, [moment?.id, user?.uid]);

  const uids = useMemo(
    () => Array.from(new Set(notes.map((note) => note.authorUid).concat(moment?.authorUid ?? []))),
    [notes, moment?.authorUid],
  );
  useEffect(
    () => subscribePublicUsers(uids, setPublicUsers, () => setListenerError('Some profile details could not be loaded.')),
    [uids.join('|')],
  );

  useEffect(() => {
    Animated.timing(flip, {
      toValue: flipped ? 1 : 0,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, [flip, flipped]);

  if (!moment) {
    return (
      <Screen contentStyle={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Opening moment...</Text>
      </Screen>
    );
  }

  const author = publicUsers[moment.authorUid];
  const memoryDate = formatMemoryDate(moment.memoryDate);
  const canNote = Boolean(route.params.canNote ?? true);

  const handleKeep = async () => {
    if (!user?.uid || busyAction) return;
    setBusyAction('keep');
    try {
      await toggleKeep({ momentId: moment.id, authorUid: moment.authorUid, uid: user.uid, currentlyKept: kept });
      setError(null);
    } catch {
      setError('This keep could not be updated.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSave = async () => {
    if (!user?.uid || busyAction) return;
    setBusyAction('save');
    try {
      await toggleSave({ momentId: moment.id, authorUid: moment.authorUid, uid: user.uid, currentlySaved: saved });
      setError(null);
    } catch {
      setError('This save could not be updated.');
    } finally {
      setBusyAction(null);
    }
  };

  const submitNote = async () => {
    if (!user?.uid || !text.trim() || busyAction) return;
    setBusyAction('note');
    setError(null);
    try {
      await addNote({ momentId: moment.id, uid: user.uid, text });
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send note.');
    } finally {
      setBusyAction(null);
    }
  };

  const frontStyle = {
    transform: [
      {
        rotateY: flip.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
    opacity: flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }),
  };
  const backStyle = {
    transform: [
      {
        rotateY: flip.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg'],
        }),
      },
    ],
    opacity: flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }),
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen contentStyle={{ gap: 16, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36 }}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={{ flex: 1 }}>
            <Icon source="chevron-left" color={colors.textPrimary} size={25} />
          </Pressable>
          <SectionLabel style={{ flex: 1, textAlign: 'center' }}>A moment</SectionLabel>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Icon source="dots-horizontal" color={colors.textFaint} size={24} />
          </View>
        </View>

        {listenerError ? <Text style={{ color: colors.error }}>{listenerError}</Text> : null}

        <View
          style={{
            shadowColor: '#2A2622',
            shadowOpacity: 0.09,
            shadowRadius: 34,
            shadowOffset: { width: 0, height: 14 },
            elevation: 4,
          }}
        >
          <Pressable onPress={() => isOwner && setFlipped((current) => !current)} disabled={!isOwner}>
            <View style={{ minHeight: 468 }}>
              <Animated.View style={[{ backfaceVisibility: 'hidden' }, frontStyle]}>
                <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 10 }}>
                  <View style={{ borderRadius: 10, overflow: 'hidden', backgroundColor: colors.photoBg }}>
                    <FilteredMomentImage
                      uri={moment.imageUrl}
                      filter={moment.photoFilter}
                      aspectRatio={1}
                      resizeMode="cover"
                      style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.photoBg }}
                      accessibilityLabel={moment.frontText || 'Then moment'}
                    />
                    {memoryDate ? (
                      <View style={{ position: 'absolute', left: 12, top: 12 }}>
                        <DateStamp value={memoryDate} />
                      </View>
                    ) : null}
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingTop: 17, paddingBottom: 14, gap: 7 }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: fonts.displayItalic, fontSize: 22, lineHeight: 30 }}>
                      {moment.frontText || 'Untitled'}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12.5 }}>
                      {isOwner ? 'you shared this' : `from ${author?.displayName ?? 'Then Friend'}`} · {memoryDate}
                    </Text>
                  </View>
                </View>
              </Animated.View>
              {isOwner ? (
                <Animated.View
                  pointerEvents={flipped ? 'auto' : 'none'}
                  style={[
                    {
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      backfaceVisibility: 'hidden',
                    },
                    backStyle,
                  ]}
                >
                  <View style={{ minHeight: 468, backgroundColor: colors.backPaper, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: radius.lg, padding: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <SectionLabel>On the back</SectionLabel>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Icon source="lock-outline" color={colors.textFaint} size={13} />
                        <Text style={{ color: colors.textFaint, fontFamily: fonts.bodySemiBold, fontSize: 10 }}>PRIVATE TO YOU</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 34 }}>
                      <Text style={{ color: '#4A4136', fontFamily: fonts.scriptMedium, fontSize: 27, lineHeight: 35 }}>
                        {back?.text || 'No private reflection yet.'}
                      </Text>
                    </View>
                    <View style={{ borderTopColor: colors.borderStrong, borderTopWidth: 1, paddingTop: 14 }}>
                      <Text style={{ color: colors.textFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, letterSpacing: 1 }}>
                        {memoryDate.toUpperCase()} · only you can read this
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              ) : null}
            </View>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <Pressable onPress={handleKeep} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, flexDirection: 'row', alignItems: 'center', gap: 4 })}>
              <Icon source={kept ? 'heart' : 'heart-outline'} color={kept ? colors.primary : colors.textFaint} size={18} />
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>
                {moment.keptCount} kept
              </Text>
            </Pressable>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>·</Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>{notes.length} notes</Text>
            <Pressable onPress={handleSave} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
              <Icon source={saved ? 'bookmark' : 'bookmark-outline'} color={saved ? colors.primary : colors.textFaint} size={18} />
            </Pressable>
          </View>
          {isOwner ? (
            <PillButton
              variant="secondary"
              icon="refresh"
              onPress={() => setFlipped((current) => !current)}
              style={{ minHeight: 40 }}
            >
              {flipped ? 'See the front' : 'Turn it over'}
            </PillButton>
          ) : null}
        </View>

        <View style={{ gap: 13 }}>
          <SectionLabel>Notes</SectionLabel>
          {notes.length ? (
            notes.map((note) => {
              const noteAuthor = publicUsers[note.authorUid];
              return (
                <View key={note.id} style={{ flexDirection: 'row', gap: 10 }}>
                  <Avatar uri={noteAuthor?.avatarUrl} name={noteAuthor?.displayName} size={34} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemiBold, fontSize: 13 }}>
                      {noteAuthor?.displayName ?? 'Then Friend'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 22 }}>
                      {note.text}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13 }}>No notes yet.</Text>
          )}
        </View>

        {canNote ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.pill,
              paddingLeft: 16,
              paddingRight: 8,
              minHeight: 50,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="leave a quiet note..."
              disabled={Boolean(busyAction)}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={{ flex: 1, backgroundColor: 'transparent' }}
              contentStyle={{ color: colors.textPrimary, fontFamily: fonts.displayItalic, fontSize: 15 }}
            />
            <Pressable onPress={submitNote} disabled={!text.trim() || Boolean(busyAction)} accessibilityRole="button" accessibilityLabel="Send note">
              <Icon source="send" color={text.trim() ? colors.primary : colors.textFaint} size={21} />
            </Pressable>
          </View>
        ) : null}
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
