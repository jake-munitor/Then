import React, { useContext, useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import {
  subscribeMomentBack,
  subscribeMomentKeep,
  subscribeMomentSaved,
  toggleKeep,
  toggleSave,
} from '../services/moments';
import type { Moment, MomentBack, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatMemoryDate } from '../utils/dates';
import DateStamp from './DateStamp';
import FilteredMomentImage from './FilteredMomentImage';

type Props = {
  moment: Moment;
  author?: PublicUser;
  mode?: 'feed' | 'wander' | 'roll' | 'saved';
  connectionLine?: string;
  onNotes: (moment: Moment) => void;
  onFollow?: (moment: Moment) => void;
  onBlock?: (moment: Moment) => void;
  onDelete?: (moment: Moment) => void;
  onReport?: (moment: Moment) => void;
  onEditBack?: (moment: Moment, currentText: string) => void;
  canFlipBack?: boolean;
};

export default function MomentCard({
  moment,
  author,
  mode = 'feed',
  connectionLine,
  onNotes,
  onFollow,
  onBlock,
  onDelete,
  onReport,
  onEditBack,
  canFlipBack = false,
}: Props) {
  const { user } = useContext(AuthContext);
  const { width: windowWidth } = useWindowDimensions();
  const [kept, setKept] = useState(false);
  const [saved, setSaved] = useState(false);
  const [back, setBack] = useState<MomentBack | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [busyAction, setBusyAction] = useState<'keep' | 'save' | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeMomentKeep({ momentId: moment.id, uid: user.uid }, setKept, () => {
      setListenerError('Some moment actions could not be loaded.');
    });
  }, [moment.id, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeMomentSaved({ momentId: moment.id, uid: user.uid }, setSaved, () => {
      setListenerError('Some moment actions could not be loaded.');
    });
  }, [moment.id, user?.uid]);

  useEffect(() => {
    if (!canFlipBack) {
      setBack(null);
      setShowBack(false);
      return;
    }
    return subscribeMomentBack(moment.id, setBack, () => {
      setListenerError('The private reflection could not be loaded.');
    });
  }, [canFlipBack, moment.id]);

  const authorName = author?.displayName ?? 'Then Friend';
  const memoryDate = formatMemoryDate(moment.memoryDate);
  const canLeaveNote = mode !== 'wander';
  const canShowBack = canFlipBack;
  const isBackVisible = canFlipBack && showBack;
  const cardWidth = Math.min(Math.max(windowWidth - 32, 288), 430);
  const stackActions = cardWidth < 350 || (canShowBack && Boolean(onDelete));

  const handleKeep = async () => {
    if (!user?.uid || busyAction) return;
    setBusyAction('keep');
    try {
      await toggleKeep({
        momentId: moment.id,
        authorUid: moment.authorUid,
        uid: user.uid,
        currentlyKept: kept,
      });
      setListenerError(null);
    } catch {
      setListenerError('This like could not be updated.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSave = async () => {
    if (!user?.uid || busyAction) return;
    setBusyAction('save');
    try {
      await toggleSave({
        momentId: moment.id,
        authorUid: moment.authorUid,
        uid: user.uid,
        currentlySaved: saved,
      });
      setListenerError(null);
    } catch {
      setListenerError('This save could not be updated.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <View
      style={{
        width: cardWidth,
        alignSelf: 'center',
        marginBottom: 28,
        shadowColor: '#2A211B',
        shadowOpacity: 0.08,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      <View
        testID="moment-frame"
        style={{
          backgroundColor: colors.paper,
          borderColor: 'rgba(181, 167, 146, 0.22)',
          borderWidth: 1,
          borderRadius: 6,
          overflow: 'hidden',
          padding: 9,
        }}
      >
        <Pressable
          onPress={() => canShowBack && setShowBack((current) => !current)}
          accessibilityRole={canShowBack ? 'button' : undefined}
          accessibilityLabel={canShowBack ? 'Flip moment' : moment.frontText || 'Then moment'}
        >
          {isBackVisible ? (
            <View
              style={{
                width: '100%',
                aspectRatio: 1,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                borderColor: 'rgba(181, 167, 146, 0.34)',
                borderRadius: 6,
                borderWidth: 1,
              }}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fonts.displayRegular,
                  fontSize: 24,
                  lineHeight: 32,
                  textAlign: 'center',
                }}
              >
                {back?.text || 'No private reflection yet.'}
              </Text>
            </View>
          ) : (
            <View
              testID="moment-photo-mat"
              style={{
                borderColor: 'rgba(181, 167, 146, 0.4)',
                borderWidth: 1,
                borderRadius: 6,
                backgroundColor: colors.surfaceWarm,
                overflow: 'hidden',
              }}
            >
              <FilteredMomentImage
                uri={moment.imageUrl}
                filter={moment.photoFilter}
                aspectRatio={1}
                resizeMode="cover"
                style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceWarm }}
                accessibilityLabel={moment.frontText || 'Then moment'}
                testID="moment-photo-image"
              />
              {memoryDate ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: 16,
                  }}
                >
                  <DateStamp value={memoryDate} />
                </View>
              ) : null}
            </View>
          )}
        </Pressable>

        <View
          style={{
            paddingHorizontal: 9,
            paddingTop: 18,
            paddingBottom: 11,
            flexDirection: stackActions ? 'column' : 'row',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => canLeaveNote && onNotes(moment)}
            style={{ flex: 1, minWidth: 0, paddingRight: 2 }}
          >
            <Text
              testID="moment-caption"
              maxFontSizeMultiplier={1.25}
              style={{
                color: colors.textPrimary,
                fontFamily: fonts.displayMedium,
                fontSize: 27,
                lineHeight: 31,
                paddingTop: 1,
                paddingBottom: 2,
                flexShrink: 1,
              }}
            >
              {moment.frontText || 'Untitled'}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fonts.displayRegular,
                fontSize: 17,
                lineHeight: 21,
                marginTop: 0,
                fontStyle: 'italic',
              }}
            >
              from {authorName}
            </Text>
            {connectionLine ? (
              <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12, marginTop: 3 }}>
                {connectionLine}
              </Text>
            ) : null}
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingTop: stackActions ? 0 : 10,
              alignSelf: stackActions ? 'flex-end' : 'auto',
            }}
          >
            <IconButton
              icon={kept ? 'heart' : 'heart-outline'}
              size={23}
              iconColor={kept ? colors.saved : colors.primary}
              onPress={handleKeep}
              disabled={Boolean(busyAction)}
              accessibilityLabel={kept ? 'Unlike this' : 'Like this'}
              style={{ width: 38, height: 38, margin: 0 }}
            />
            {canLeaveNote ? (
              <View
                style={{
                  width: 38,
                  height: 38,
                }}
              >
                <IconButton
                  icon="comment-outline"
                  size={22}
                  iconColor={colors.primary}
                  onPress={() => onNotes(moment)}
                  accessibilityLabel="Open notes"
                  style={{ width: 38, height: 38, margin: 0 }}
                />
                {moment.noteCount > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: -1,
                      minWidth: 17,
                      height: 17,
                      borderRadius: 9,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text style={{ color: colors.paper, fontFamily: fonts.bodySemiBold, fontSize: 9 }}>
                      {moment.noteCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {canShowBack ? (
              <IconButton
                icon="rotate-3d-variant"
                size={22}
                iconColor={showBack ? colors.saved : colors.primary}
                onPress={() => setShowBack((current) => !current)}
                accessibilityLabel={showBack ? 'Show photo front' : 'Show private reflection'}
                style={{ width: 38, height: 38, margin: 0 }}
              />
            ) : null}
            {canFlipBack && onEditBack ? (
              <IconButton
                icon={back?.text ? 'pencil-outline' : 'plus'}
                size={22}
                iconColor={colors.primary}
                onPress={() => onEditBack(moment, back?.text ?? '')}
                accessibilityLabel={back?.text ? 'Edit private reflection' : 'Add private reflection'}
                style={{ width: 38, height: 38, margin: 0 }}
              />
            ) : null}
            <IconButton
              icon={saved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              iconColor={saved ? colors.saved : colors.primary}
              onPress={handleSave}
              disabled={Boolean(busyAction)}
              accessibilityLabel={saved ? 'Remove from saved' : 'Save for later'}
              style={{ width: 38, height: 38, margin: 0 }}
            />
            {onDelete ? (
              <IconButton
                icon="dots-horizontal"
                size={21}
                iconColor={colors.textSecondary}
                onPress={() => onDelete(moment)}
                accessibilityLabel="Delete moment"
                style={{ width: 34, height: 38, margin: 0 }}
              />
            ) : null}
          </View>
        </View>

        {listenerError ? (
          <Text variant="bodySmall" style={{ color: colors.error, paddingHorizontal: 10, paddingBottom: 12 }}>
            {listenerError}
          </Text>
        ) : null}

        {mode === 'wander' && (onFollow || onReport || onBlock) ? (
          <View style={{ borderTopColor: colors.border, borderTopWidth: 1, padding: 12 }}>
            {onFollow ? (
              <Button mode="text" icon="account-plus-outline" onPress={() => onFollow(moment)}>
                Ask to keep up
              </Button>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
              {onReport ? (
                <Button mode="text" icon="flag-outline" onPress={() => onReport(moment)}>
                  Report
                </Button>
              ) : null}
              {onBlock ? (
                <Button mode="text" icon="account-cancel-outline" textColor={colors.error} onPress={() => onBlock(moment)}>
                  Block
                </Button>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
