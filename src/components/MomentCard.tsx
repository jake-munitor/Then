import React, { useContext, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
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

function MomentCard({
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
        marginBottom: 22,
        borderRadius: radius.print,
        // Lauren's July 2026 spec: y8 / blur24 / 8%, soft and close to the card.
        shadowColor: '#785A46',
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      }}
    >
      <View
        testID="moment-frame"
        style={{
          backgroundColor: colors.polaroid,
          borderColor: 'rgba(120, 90, 70, 0.05)',
          borderWidth: 1,
          borderRadius: radius.print,
          overflow: 'hidden',
          paddingTop: 14,
          paddingHorizontal: 14,
          paddingBottom: 16,
        }}
      >
        {/* Lauren's July 2026 spec: nearly imperceptible soft-light grain on
            the card surface. The blend lives on the wrapper View (RN types
            don't expose mixBlendMode on ImageStyle). The photo renders above
            this layer, so the grain never touches it. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { mixBlendMode: 'soft-light' }]}>
          <Image
            source={require('../../assets/paper-texture.png')}
            resizeMode="cover"
            style={[StyleSheet.absoluteFillObject, { opacity: 0.02 }]}
          />
        </View>
        <Pressable
          onPress={() => onPress?.(moment)}
          disabled={!onPress}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={moment.frontText || 'Open moment'}
        >
          <View
            testID="moment-photo-mat"
            style={{
              borderRadius: radius.printPhoto,
              backgroundColor: colors.photoBg,
              overflow: 'hidden',
              borderColor: 'rgba(243, 237, 228, 0.75)',
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
              testID="moment-photo-image"
            />
            {memoryDate ? (
              <View style={{ position: 'absolute', right: 12, bottom: 11 }}>
                <DateStamp value={memoryDate} tone="amber" />
              </View>
            ) : null}
          </View>

          <View style={{ paddingTop: 18, gap: 4 }}>
            <Text
              testID="moment-caption"
              maxFontSizeMultiplier={1.2}
              style={{
                color: colors.textPrimary,
                fontFamily: fonts.captionSerif,
                fontSize: 16,
                lineHeight: 23,
              }}
            >
              {moment.frontText || 'Untitled'}
            </Text>
          </View>
        </Pressable>

        <View style={{ paddingTop: 4, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <Pressable onPress={() => onPress?.(moment)} disabled={!onPress} style={{ flex: 1, minWidth: 0 }}>
            {connectionLine ? (
              <Text numberOfLines={1} style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 11.5, marginBottom: 2 }}>
                {connectionLine}
              </Text>
            ) : null}
            <Text
              testID="moment-author-signature"
              maxFontSizeMultiplier={1.1}
              // Deliberately not truncated - the signature wraps rather than
              // ellipsizing, guarded by a test in MomentCard.test.tsx.
              style={{
                color: colors.textSecondary,
                fontFamily: fonts.signature,
                fontSize: 21,
                // Dancing Script's natural span at 21pt is ~32, so a 32pt line
                // box clipped the "j" descender loop (field report: "jake"
                // rendered with the j cut off). The padding/margin pair buys
                // the leading entry swash room left of the glyph origin
                // without moving the signature visually.
                lineHeight: 36,
                paddingLeft: 6,
                marginLeft: -6,
                transform: [{ rotate: '-1.2deg' }],
              }}
            >
              {authorName.toLowerCase()}
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 }}>
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

/**
 * Cards sit in a FlatList and each one holds live Firestore listeners, so an
 * unnecessary re-render is expensive. Firestore rebuilds `moment` and `author`
 * objects on every snapshot even when nothing changed, so reference equality
 * alone would almost never hit - compare the fields the card actually draws.
 */
export default React.memo(MomentCard, (previous, next) => {
  const sameMoment =
    previous.moment.id === next.moment.id &&
    previous.moment.imageUrl === next.moment.imageUrl &&
    previous.moment.frontText === next.moment.frontText &&
    previous.moment.memoryDate === next.moment.memoryDate &&
    previous.moment.photoFilter === next.moment.photoFilter &&
    previous.moment.keptCount === next.moment.keptCount &&
    previous.moment.noteCount === next.moment.noteCount;

  const sameAuthor =
    previous.author?.uid === next.author?.uid &&
    previous.author?.displayName === next.author?.displayName &&
    previous.author?.handle === next.author?.handle &&
    previous.author?.avatarUrl === next.author?.avatarUrl;

  return (
    sameMoment &&
    sameAuthor &&
    previous.mode === next.mode &&
    previous.connectionLine === next.connectionLine &&
    previous.canFlipBack === next.canFlipBack &&
    previous.onPress === next.onPress &&
    previous.onNotes === next.onNotes &&
    previous.onFollow === next.onFollow &&
    previous.onBlock === next.onBlock &&
    previous.onDelete === next.onDelete &&
    previous.onReport === next.onReport
  );
});
