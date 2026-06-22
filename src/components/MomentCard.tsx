import React, { useContext, useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import {
  subscribeMomentKeep,
  subscribeMomentSaved,
  toggleKeep,
  toggleSave,
} from '../services/moments';
import type { Moment, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';
import { formatMemoryDate } from '../utils/dates';
import DateStamp from './DateStamp';
import FilteredMomentImage from './FilteredMomentImage';
import { PillButton } from './DesignPrimitives';

type Props = {
  moment: Moment;
  author?: PublicUser;
  mode?: 'feed' | 'wander' | 'roll' | 'saved';
  connectionLine?: string;
  onPress?: (moment: Moment) => void;
  onNotes?: (moment: Moment) => void;
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
  onPress,
  onNotes,
  onFollow,
  onBlock,
  onDelete,
  onReport,
}: Props) {
  const { user } = useContext(AuthContext);
  const { width: windowWidth } = useWindowDimensions();
  const [kept, setKept] = useState(false);
  const [saved, setSaved] = useState(false);
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

  const authorName = author?.displayName ?? 'Then Friend';
  const memoryDate = formatMemoryDate(moment.memoryDate);
  const canLeaveNote = mode !== 'wander' && Boolean(onNotes);
  const showCounts = mode !== 'wander';
  const cardWidth = Math.min(Math.max(windowWidth - 36, 286), 430);

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
      setListenerError('This keep could not be updated.');
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
        marginBottom: 18,
        shadowColor: '#2A2622',
        shadowOpacity: 0.06,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      <View
        testID="moment-frame"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          overflow: 'hidden',
          padding: 9,
        }}
      >
        <Pressable
          onPress={() => onPress?.(moment)}
          disabled={!onPress}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={moment.frontText || 'Open moment'}
        >
          <View
            testID="moment-photo-mat"
            style={{
              borderRadius: 9,
              backgroundColor: colors.photoBg,
              overflow: 'hidden',
            }}
          >
            <FilteredMomentImage
              uri={moment.imageUrl}
              filter={moment.photoFilter}
              aspectRatio={4 / 5}
              resizeMode="cover"
              style={{ width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.photoBg }}
              accessibilityLabel={moment.frontText || 'Then moment'}
              testID="moment-photo-image"
            />
            {memoryDate ? (
              <View style={{ position: 'absolute', left: 11, top: 11 }}>
                <DateStamp value={memoryDate} />
              </View>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: 8, paddingTop: 15, gap: 10 }}>
            <Text
              testID="moment-caption"
              maxFontSizeMultiplier={1.2}
              style={{
                color: colors.textPrimary,
                fontFamily: fonts.displayItalic,
                fontSize: 18,
                lineHeight: 25,
              }}
            >
              {moment.frontText || 'Untitled'}
            </Text>
          </View>
        </Pressable>

        <View style={{ paddingHorizontal: 8, paddingTop: 10, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Pressable onPress={() => onPress?.(moment)} disabled={!onPress} style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12.5 }}
            >
              from{' '}
              <Text style={{ color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 12.5 }}>
                {authorName}
              </Text>
            </Text>
            {connectionLine ? (
              <Text numberOfLines={1} style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 11.5, marginTop: 2 }}>
                {connectionLine}
              </Text>
            ) : null}
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ActionIcon
              icon={kept ? 'heart' : 'heart-outline'}
              active={kept}
              label={kept ? 'Unkeep this' : 'Keep this'}
              onPress={handleKeep}
              disabled={Boolean(busyAction)}
              count={showCounts ? moment.keptCount : undefined}
            />
            {canLeaveNote ? (
              <ActionIcon
                icon="comment-outline"
                label="Open notes"
                onPress={() => onNotes?.(moment)}
                count={moment.noteCount || undefined}
              />
            ) : null}
            <ActionIcon
              icon={saved ? 'bookmark' : 'bookmark-outline'}
              active={saved}
              label={saved ? 'Remove from saved' : 'Save for later'}
              onPress={handleSave}
              disabled={Boolean(busyAction)}
            />
          </View>
        </View>

        {listenerError ? (
          <Text variant="bodySmall" style={{ color: colors.error, paddingHorizontal: 10, paddingBottom: 12 }}>
            {listenerError}
          </Text>
        ) : null}

        {onDelete ? (
          <View style={{ borderTopColor: colors.border, borderTopWidth: 1, padding: 10 }}>
            <PillButton variant="secondary" icon="trash-can-outline" onPress={() => onDelete(moment)}>
              Delete moment
            </PillButton>
          </View>
        ) : null}

        {mode === 'wander' && (onFollow || onReport || onBlock) ? (
          <View style={{ borderTopColor: colors.border, borderTopWidth: 1, padding: 10, gap: 8 }}>
            {onFollow ? (
              <PillButton variant="secondary" icon="account-plus-outline" onPress={() => onFollow(moment)}>
                Ask to keep up
              </PillButton>
            ) : null}
            {(onReport || onBlock) ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {onReport ? (
                  <PillButton variant="secondary" icon="flag-outline" onPress={() => onReport(moment)} style={{ flex: 1, minHeight: 40 }}>
                    Report
                  </PillButton>
                ) : null}
                {onBlock ? (
                  <PillButton variant="danger" icon="account-cancel-outline" onPress={() => onBlock(moment)} style={{ flex: 1, minHeight: 40 }}>
                    Block
                  </PillButton>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ActionIcon({
  icon,
  label,
  onPress,
  active,
  disabled,
  count,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
  count?: number;
}) {
  const tint = active ? colors.primary : colors.textFaint;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minWidth: count ? 32 : 22,
        minHeight: 26,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 3,
        opacity: disabled ? 0.48 : pressed ? 0.65 : 1,
      })}
    >
      <Icon source={icon} color={tint} size={20} />
      {typeof count === 'number' ? (
        <Text style={{ color: tint, fontFamily: fonts.bodySemiBold, fontSize: 11 }}>{count}</Text>
      ) : null}
    </Pressable>
  );
}
