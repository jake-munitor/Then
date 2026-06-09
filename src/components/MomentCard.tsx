import React, { useContext, useEffect, useState } from 'react';
import { Image, Pressable, useWindowDimensions, View } from 'react-native';
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
import HandwrittenText from './HandwrittenText';
import PaperTape from './PaperTape';

type Props = {
  moment: Moment;
  author?: PublicUser;
  mode?: 'feed' | 'wander' | 'roll' | 'saved';
  connectionLine?: string;
  onNotes: (moment: Moment) => void;
  onFollow?: (moment: Moment) => void;
  canFlipBack?: boolean;
};

export default function MomentCard({ moment, author, mode = 'feed', connectionLine, onNotes, onFollow, canFlipBack = false }: Props) {
  const { user } = useContext(AuthContext);
  const { width: windowWidth } = useWindowDimensions();
  const [kept, setKept] = useState(false);
  const [saved, setSaved] = useState(false);
  const [back, setBack] = useState<MomentBack | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [busyAction, setBusyAction] = useState<'keep' | 'save' | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeMomentKeep({ momentId: moment.id, uid: user.uid }, setKept);
  }, [moment.id, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeMomentSaved({ momentId: moment.id, uid: user.uid }, setSaved);
  }, [moment.id, user?.uid]);

  useEffect(() => {
    if (!canFlipBack) {
      setBack(null);
      setShowBack(false);
      return;
    }
    return subscribeMomentBack(moment.id, setBack);
  }, [canFlipBack, moment.id]);

  const authorName = author?.displayName ?? 'Then Friend';
  const memoryDate = formatMemoryDate(moment.memoryDate);
  const canLeaveNote = mode !== 'wander';
  const canShowBack = canFlipBack && Boolean(back?.text);
  const isBackVisible = canShowBack && showBack;
  const cardRotation = mode === 'wander' ? '0deg' : rotationForId(moment.id);
  const cardWidth = Math.min(Math.max(windowWidth - 56, 280), 520);

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
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.paper,
        borderColor: colors.border,
        borderWidth: 1,
        width: cardWidth,
        alignSelf: 'center',
        marginBottom: 18,
        padding: 10,
        transform: [{ rotate: cardRotation }],
        shadowColor: '#3B2F25',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
      }}
    >
      <PaperTape />
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
              borderColor: colors.border,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fonts.bodyRegular,
                fontSize: 17,
                lineHeight: 26,
                textAlign: 'center',
              }}
            >
              {back?.text}
            </Text>
          </View>
        ) : (
          <View>
            <Image
              source={{ uri: moment.imageUrl }}
              resizeMode="cover"
              style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceWarm }}
              accessibilityLabel={moment.frontText || 'Then moment'}
            />
            {memoryDate ? (
              <View
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 10,
                  backgroundColor: 'rgba(250, 248, 244, 0.88)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontFamily: fonts.bodySemiBold,
                    fontSize: 11,
                    textTransform: 'uppercase',
                  }}
                >
                  {memoryDate}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </Pressable>

      <HandwrittenText
        testID="moment-caption"
        size={25}
        style={{
          marginTop: 4,
          paddingHorizontal: 8,
          textAlign: 'center',
        }}
      >
        {moment.frontText || 'untitled'}
      </HandwrittenText>

      <View style={{ marginTop: 2, minHeight: 38, flexDirection: 'row', alignItems: 'center' }}>
        <IconButton
          icon={kept ? 'heart' : 'heart-outline'}
          size={22}
          iconColor={kept ? colors.saved : colors.ink}
          onPress={handleKeep}
          disabled={Boolean(busyAction)}
          accessibilityLabel={kept ? 'Unlike this' : 'Like this'}
          style={{ width: 38, height: 38, margin: 0 }}
        />
        {canLeaveNote ? (
          <View>
            <IconButton
              icon="comment-outline"
              size={21}
              iconColor={colors.ink}
              onPress={() => onNotes(moment)}
              accessibilityLabel="Open notes"
              style={{ width: 38, height: 38, margin: 0 }}
            />
            {moment.noteCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 2,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ color: colors.paper, fontFamily: fonts.bodySemiBold, fontSize: 10 }}>{moment.noteCount}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {canShowBack ? (
          <IconButton
            icon="rotate-3d-variant"
            size={21}
            iconColor={showBack ? colors.primary : colors.ink}
            onPress={() => setShowBack((current) => !current)}
            accessibilityLabel={showBack ? 'Show photo front' : 'Show private reflection'}
            style={{ width: 38, height: 38, margin: 0 }}
          />
        ) : null}
        <View style={{ flex: 1 }} />
        <IconButton
          icon={saved ? 'bookmark' : 'bookmark-outline'}
          size={21}
          iconColor={saved ? colors.saved : colors.ink}
          onPress={handleSave}
          disabled={Boolean(busyAction)}
          accessibilityLabel={saved ? 'Remove from saved' : 'Save for later'}
          style={{ width: 38, height: 38, margin: 0 }}
        />
      </View>

      <Pressable
        onPress={() => canLeaveNote && onNotes(moment)}
        style={{ marginTop: 2, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 8 }}
      >
        <Text variant="labelMedium" style={{ color: colors.textMuted, textTransform: 'uppercase' }}>
          {authorName}
        </Text>
        {connectionLine ? (
          <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 4 }}>
            {connectionLine}
          </Text>
        ) : null}
      </Pressable>

      {mode === 'wander' && onFollow ? (
        <Button mode="outlined" icon="account-plus-outline" onPress={() => onFollow(moment)} style={{ marginTop: 12 }}>
          Request
        </Button>
      ) : null}
    </View>
  );
}

function rotationForId(id: string) {
  const total = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const degrees = ((total % 7) - 3) * 0.45;
  return `${degrees}deg`;
}
