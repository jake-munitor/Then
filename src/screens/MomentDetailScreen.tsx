import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Button, Dialog, Icon, Menu, Portal, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DateStamp from '../components/DateStamp';
import FilteredMomentImage from '../components/FilteredMomentImage';
import PolaroidFrame, { paperVariant, PrintShadow } from '../components/PolaroidFrame';
import Screen from '../components/Screen';
import { Avatar, PillButton, SectionLabel } from '../components/DesignPrimitives';
import type { RootStackParamList } from '../navigation/types';
import {
  addNote,
  deleteMoment,
  saveMomentBack,
  subscribeMoment,
  subscribeMomentBack,
  subscribeMomentKeep,
  subscribeMomentSaved,
  subscribeNotes,
  toggleKeep,
  toggleSave,
} from '../services/moments';
import { blockUser, reportUser } from '../services/follows';
import { markMomentNotificationsRead } from '../services/notifications';
import { subscribePublicUsers } from '../services/users';
import type { Moment, MomentBack, Note, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { dialogStyle } from '../theme/theme';
import { fonts } from '../theme/fonts';
import { iconSize, layout } from '../theme/layout';
import { radius } from '../theme/radius';
import { formatMemoryDate } from '../utils/dates';
import { useReducedMotion } from '../utils/motion';
import { goBackOrHome } from '../utils/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MomentDetail'>;

// Lauren's spec: a brief, smooth turn (250-350ms). With Reduce Motion on, the
// two sides cross-fade in place instead of rotating.
const FLIP_DURATION_MS = 320;
const FLIP_REDUCED_DURATION_MS = 160;

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
  const [editingBack, setEditingBack] = useState(false);
  const [backDraft, setBackDraft] = useState('');
  const [busyAction, setBusyAction] = useState<'keep' | 'save' | 'note' | 'back' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState<'delete' | 'report' | 'block' | null>(null);
  const [reportContext, setReportContext] = useState('');
  const [menuBusy, setMenuBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const flip = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  // The back is laid over the front; it takes the front's measured height so
  // both sides of the print are the same physical size.
  const [frontHeight, setFrontHeight] = useState(0);
  const { width: windowWidth } = useWindowDimensions();

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
  // Notes are private to the author's approved circle (PRIVACY_SEMANTICS.md);
  // wander viewers arrive with canNote=false and must not subscribe to them.
  const canNote = Boolean(route.params.canNote ?? true);
  useEffect(() => {
    if (!moment?.id || !isOwner) {
      setBack(null);
      setFlipped(false);
      setEditingBack(false);
      setBackDraft('');
      return;
    }
    return subscribeMomentBack(moment.id, setBack, () => setListenerError('The private reflection could not be loaded.'));
  }, [isOwner, moment?.id]);

  useEffect(() => {
    if (!editingBack) setBackDraft(back?.text ?? '');
  }, [back?.text, editingBack]);

  useEffect(() => {
    if (!moment?.id || !canNote) {
      setNotes([]);
      return;
    }
    return subscribeNotes(
      moment.id,
      setNotes,
      () => setListenerError('Notes could not be loaded.'),
    );
  }, [moment?.id, canNote]);

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
      duration: reducedMotion ? FLIP_REDUCED_DURATION_MS : FLIP_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [flip, flipped, reducedMotion]);

  if (!moment) {
    return (
      <Screen contentStyle={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Opening moment...</Text>
      </Screen>
    );
  }

  const author = publicUsers[moment.authorUid];
  const authorName = author?.displayName ?? 'Then Friend';
  const memoryDate = formatMemoryDate(moment.memoryDate);
  const detailCardWidth = Math.min(Math.max(windowWidth - 36, 286), 430);
  const detailPrintMinHeight = detailCardWidth + 92;

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

  const closeMenuThen = (next: 'delete' | 'report' | 'block') => {
    setMenuOpen(false);
    setError(null);
    setConfirming(next);
  };

  const confirmDelete = async () => {
    if (!user?.uid || menuBusy) return;
    setMenuBusy(true);
    try {
      await deleteMoment({ momentId: moment.id, uid: user.uid });
      setConfirming(null);
      goBackOrHome(navigation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This moment could not be deleted.');
    } finally {
      setMenuBusy(false);
    }
  };

  const confirmReport = async () => {
    if (menuBusy) return;
    setMenuBusy(true);
    try {
      await reportUser({ targetUid: moment.authorUid, reason: 'moment', context: reportContext.trim() });
      setReportContext('');
      setConfirming(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This report could not be sent.');
    } finally {
      setMenuBusy(false);
    }
  };

  const confirmBlock = async () => {
    if (menuBusy) return;
    setMenuBusy(true);
    try {
      await blockUser(moment.authorUid);
      setConfirming(null);
      goBackOrHome(navigation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This person could not be blocked.');
    } finally {
      setMenuBusy(false);
    }
  };

  const startBackEdit = () => {
    setBackDraft(back?.text ?? '');
    setEditingBack(true);
    setFlipped(true);
  };

  const cancelBackEdit = () => {
    setBackDraft(back?.text ?? '');
    setEditingBack(false);
    setError(null);
  };

  const submitBack = async () => {
    if (!user?.uid || !moment.id || busyAction) return;
    setBusyAction('back');
    setError(null);
    try {
      await saveMomentBack({ momentId: moment.id, uid: user.uid, text: backDraft });
      setEditingBack(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the back reflection.');
    } finally {
      setBusyAction(null);
    }
  };

  const printHeight = Math.max(detailPrintMinHeight, frontHeight);
  // Each side stays solid until it is edge-on, then hands over - a turning
  // card, not two ghosts. Under Reduce Motion there is no turn, only a fade.
  const frontStyle = {
    transform: [
      { perspective: 1200 },
      {
        rotateY: flip.interpolate({
          inputRange: [0, 1],
          outputRange: reducedMotion ? ['0deg', '0deg'] : ['0deg', '180deg'],
        }),
      },
    ],
    opacity: flip.interpolate({
      inputRange: reducedMotion ? [0, 1] : [0, 0.49, 0.51, 1],
      outputRange: reducedMotion ? [1, 0] : [1, 1, 0, 0],
    }),
  };
  const backStyle = {
    transform: [
      { perspective: 1200 },
      {
        rotateY: flip.interpolate({
          inputRange: [0, 1],
          outputRange: reducedMotion ? ['0deg', '0deg'] : ['180deg', '360deg'],
        }),
      },
    ],
    opacity: flip.interpolate({
      inputRange: reducedMotion ? [0, 1] : [0, 0.49, 0.51, 1],
      outputRange: reducedMotion ? [0, 1] : [0, 0, 1, 1],
    }),
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen contentStyle={{ gap: 16, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: layout.headerHeight }}>
          <Pressable
            onPress={() => goBackOrHome(navigation)}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ width: layout.touchTarget, minHeight: layout.touchTarget, justifyContent: 'center' }}
          >
            <Icon source="chevron-left" color={colors.textPrimary} size={iconSize.nav} />
          </Pressable>
          <SectionLabel style={{ flex: 1, textAlign: 'center' }}>A moment</SectionLabel>
          <View style={{ width: 44, alignItems: 'flex-end' }}>
            <Menu
              visible={menuOpen}
              onDismiss={() => setMenuOpen(false)}
              anchor={
                <Pressable
                  onPress={() => setMenuOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                  testID="moment-detail-menu-button"
                  hitSlop={12}
                  style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1 })}
                >
                  <Icon source="dots-horizontal" color={colors.textFaint} size={iconSize.nav} />
                </Pressable>
              }
            >
              {isOwner ? (
                <Menu.Item
                  onPress={() => closeMenuThen('delete')}
                  leadingIcon="trash-can-outline"
                  title="Delete moment"
                />
              ) : (
                <>
                  <Menu.Item onPress={() => closeMenuThen('report')} leadingIcon="flag-outline" title="Report moment" />
                  <Menu.Item onPress={() => closeMenuThen('block')} leadingIcon="account-cancel-outline" title={`Block ${authorName}`} />
                </>
              )}
            </Menu>
          </View>
        </View>

        {listenerError ? <Text style={{ color: colors.error }}>{listenerError}</Text> : null}

        <View style={{ width: detailCardWidth, alignSelf: 'center' }}>
          <Pressable onPress={() => isOwner && !editingBack && setFlipped((current) => !current)} disabled={!isOwner}>
            <View style={{ minHeight: detailPrintMinHeight }}>
              {/* The shadow lives inside each face so it turns with the print
                  instead of staying behind as a flat rectangle. */}
              <Animated.View
                onLayout={(event) => setFrontHeight(Math.round(event.nativeEvent.layout.height))}
                style={[{ backfaceVisibility: 'hidden' }, frontStyle]}
              >
                <PrintShadow>
                <PolaroidFrame
                  testID="moment-detail-frame"
                  variant={paperVariant(moment.id)}
                  style={{ minHeight: detailPrintMinHeight }}
                >
                  <View
                    style={{
                      borderRadius: radius.printPhoto,
                      overflow: 'hidden',
                      backgroundColor: colors.photoBg,
                      borderColor: colors.photoMatBorder,
                      borderWidth: 1,
                    }}
                  >
                    <FilteredMomentImage
                      uri={moment.imageUrl}
                      filter={moment.photoFilter}
                      aspectRatio={1}
                      resizeMode="cover"
                      style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.photoBg }}
                      accessibilityLabel={moment.frontText || 'Then moment'}
                    />
                    {memoryDate ? (
                      <View style={{ position: 'absolute', right: 12, bottom: 11 }}>
                        <DateStamp value={memoryDate} tone="amber" />
                      </View>
                    ) : null}
                  </View>
                  <View style={{ paddingTop: 17, paddingBottom: 4, gap: 7 }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: fonts.captionSerif, fontSize: 16, lineHeight: 23 }}>
                      {moment.frontText || 'Untitled'}
                    </Text>
                    <Text
                      testID="moment-detail-author-signature"
                      maxFontSizeMultiplier={1.1}
                      style={{
                        color: colors.textSecondary,
                        fontFamily: fonts.signature,
                        fontSize: 21,
                        // Matches MomentCard: 32pt clipped the "j" descender
                        // loop; the padding/margin pair protects the leading
                        // entry swash.
                        lineHeight: 36,
                        paddingTop: 5,
                        paddingBottom: 2,
                        paddingLeft: 6,
                        marginLeft: -6,
                        transform: [{ rotate: '-1.2deg' }],
                      }}
                    >
                      {authorName.toLowerCase()}
                    </Text>
                  </View>
                </PolaroidFrame>
                </PrintShadow>
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
                  <PrintShadow>
                  {/* Same paper, same edge, same size as the front. */}
                  <PolaroidFrame
                    testID="moment-detail-back"
                    variant={paperVariant(moment.id)}
                    // A fixed height, not a minimum: a long reflection scrolls
                    // inside the print instead of spilling over the screen below.
                    style={{ height: printHeight, paddingTop: 24, paddingHorizontal: 24, paddingBottom: 24 }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <SectionLabel>On the back</SectionLabel>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Icon source="lock-outline" color={colors.textFaint} size={iconSize.inline} />
                        <Text style={{ color: colors.textFaint, fontFamily: fonts.bodySemiBold, fontSize: 10 }}>PRIVATE TO YOU</Text>
                      </View>
                    </View>
                    <ScrollView
                      testID="moment-detail-back-scroll"
                      style={{ flex: 1 }}
                      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 20 }}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      {editingBack ? (
                        <TextInput
                          value={backDraft}
                          onChangeText={setBackDraft}
                          maxLength={5000}
                          multiline
                          autoFocus
                          placeholder="What do you want to remember?"
                          mode="flat"
                          underlineColor="transparent"
                          activeUnderlineColor="transparent"
                          disabled={busyAction === 'back'}
                          scrollEnabled={false}
                          style={{ minHeight: 140, backgroundColor: 'transparent' }}
                          contentStyle={{ color: colors.textPrimary, fontFamily: fonts.scriptMedium, fontSize: 25, lineHeight: 34 }}
                        />
                      ) : (
                        <Text style={{ color: colors.textPrimary, fontFamily: fonts.scriptMedium, fontSize: 27, lineHeight: 35 }}>
                          {back?.text || 'Blank for now. What do you want to remember?'}
                        </Text>
                      )}
                    </ScrollView>
                    <View style={{ borderTopColor: colors.borderStrong, borderTopWidth: 1, paddingTop: 14, gap: 12 }}>
                      <Text style={{ color: colors.textFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, letterSpacing: 1 }}>
                        {memoryDate.toUpperCase()} - only you can read this
                      </Text>
                      {editingBack ? (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <PillButton variant="secondary" onPress={cancelBackEdit} disabled={busyAction === 'back'} style={{ flex: 1, minHeight: layout.buttonHeightCompact }}>
                            Cancel
                          </PillButton>
                          <PillButton onPress={submitBack} disabled={busyAction === 'back'} style={{ flex: 1, minHeight: layout.buttonHeightCompact }}>
                            Save back
                          </PillButton>
                        </View>
                      ) : (
                        <PillButton variant="secondary" icon="pencil-outline" onPress={startBackEdit} style={{ minHeight: layout.buttonHeightCompact }}>
                          Edit back
                        </PillButton>
                      )}
                    </View>
                  </PolaroidFrame>
                  </PrintShadow>
                </Animated.View>
              ) : null}
            </View>
          </Pressable>
        </View>

        <View
          testID="moment-detail-actions"
          style={{
            width: detailCardWidth,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <Pressable
              onPress={handleKeep}
              accessibilityRole="button"
              accessibilityLabel={kept ? 'Unkeep this' : 'Keep this'}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, minHeight: layout.touchTarget, flexDirection: 'row', alignItems: 'center', gap: 4 })}
            >
              <Icon source={kept ? 'heart' : 'heart-outline'} color={kept ? colors.primary : colors.textFaint} size={iconSize.action} />
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>
                {moment.keptCount} kept
              </Text>
            </Pressable>
            {canNote ? (
              <>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>-</Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>{notes.length} notes</Text>
              </>
            ) : null}
            <Pressable
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove from saved' : 'Save for later'}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, minWidth: 28, minHeight: layout.touchTarget, alignItems: 'center', justifyContent: 'center' })}
            >
              <Icon source={saved ? 'bookmark' : 'bookmark-outline'} color={saved ? colors.primary : colors.textFaint} size={iconSize.action} />
            </Pressable>
          </View>
          {isOwner ? (
            <PillButton
              variant="secondary"
              icon={flipped ? 'image-outline' : 'pencil-outline'}
              onPress={() => {
                if (flipped) {
                  setFlipped(false);
                  setEditingBack(false);
                } else {
                  startBackEdit();
                }
              }}
              style={{ minHeight: layout.buttonHeightCompact }}
            >
              {flipped ? 'See the front' : back?.text ? 'Edit back' : 'Add back'}
            </PillButton>
          ) : null}
        </View>

        {canNote ? (
        <View testID="moment-detail-notes" style={{ width: detailCardWidth, alignSelf: 'center', gap: 13 }}>
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
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13 }}>
              {isOwner ? 'No notes yet. They land here when your people write.' : 'No notes yet. Leave the first one.'}
            </Text>
          )}
        </View>
        ) : null}

        {canNote ? (
          <View
            testID="moment-detail-note-composer"
            style={{
              width: detailCardWidth,
              alignSelf: 'center',
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.pill,
              paddingLeft: 16,
              paddingRight: 2,
              minHeight: 50,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              maxLength={1000}
              placeholder="leave a quiet note..."
              disabled={Boolean(busyAction)}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={{ flex: 1, backgroundColor: 'transparent' }}
              contentStyle={{ color: colors.textPrimary, fontFamily: fonts.displayItalic, fontSize: 15 }}
            />
            <Pressable
              onPress={submitNote}
              disabled={!text.trim() || Boolean(busyAction)}
              accessibilityRole="button"
              accessibilityLabel="Send note"
              style={{ width: layout.touchTarget, minHeight: layout.touchTarget, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon source="send" color={text.trim() ? colors.primary : colors.textFaint} size={iconSize.action} />
            </Pressable>
          </View>
        ) : null}
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

        <Portal>
          <Dialog style={dialogStyle} visible={confirming === 'delete'} onDismiss={() => setConfirming(null)}>
            <Dialog.Title>Delete this moment?</Dialog.Title>
            <Dialog.Content>
              <Text style={{ color: colors.textSecondary }}>
                The photo, its notes, and your private reflection are removed for good. Like tearing up a polaroid.
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirming(null)} disabled={menuBusy}>Keep it</Button>
              <Button onPress={confirmDelete} loading={menuBusy} disabled={menuBusy} textColor={colors.error}>
                Delete
              </Button>
            </Dialog.Actions>
          </Dialog>

          <Dialog style={dialogStyle} visible={confirming === 'report'} onDismiss={() => setConfirming(null)}>
            <Dialog.Title>Report moment?</Dialog.Title>
            <Dialog.Content>
              <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                Tell us what feels wrong about this moment.
              </Text>
              <TextInput
                label="context"
                value={reportContext}
                onChangeText={setReportContext}
                maxLength={1000}
                multiline
                disabled={menuBusy}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirming(null)} disabled={menuBusy}>Cancel</Button>
              <Button onPress={confirmReport} loading={menuBusy} disabled={menuBusy}>Report</Button>
            </Dialog.Actions>
          </Dialog>

          <Dialog style={dialogStyle} visible={confirming === 'block'} onDismiss={() => setConfirming(null)}>
            <Dialog.Title>Block {authorName}?</Dialog.Title>
            <Dialog.Content>
              <Text style={{ color: colors.textSecondary }}>
                You will not see each other&apos;s moments, and any connection between you is removed.
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirming(null)} disabled={menuBusy}>Cancel</Button>
              <Button onPress={confirmBlock} loading={menuBusy} disabled={menuBusy} textColor={colors.error}>
                Block
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </Screen>
    </KeyboardAvoidingView>
  );
}
