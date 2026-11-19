import React from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';

import type { PendingMoment } from '../services/momentOutbox';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { layout } from '../theme/layout';
import { radius } from '../theme/radius';
import { PillButton } from './DesignPrimitives';
import FilteredMomentImage from './FilteredMomentImage';
import PolaroidFrame, { paperVariant, PrintShadow } from './PolaroidFrame';

type Props = {
  moment: PendingMoment;
  onRetry: (momentId: string) => void;
  onEdit: (momentId: string) => void;
  onDiscard: (momentId: string) => void;
};

/**
 * A moment that has left the composer but is not on the server yet. Same
 * print as a feed card, with a status line where the signature and actions
 * will be. A failure keeps the photo and caption here until the person
 * decides what to do with them.
 */
export default function PendingMomentCard({ moment, onRetry, onEdit, onDiscard }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(Math.max(windowWidth - 36, 286), 430);
  const failed = moment.status === 'failed';

  return (
    <PrintShadow style={{ width: cardWidth, alignSelf: 'center', marginBottom: 22 }}>
      <PolaroidFrame testID="pending-moment-frame" variant={paperVariant(moment.momentId)}>
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
            uri={moment.params.uri}
            filter={moment.params.photoFilter}
            aspectRatio={1}
            style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.photoBg }}
            accessibilityLabel={moment.params.frontText || 'Your new moment'}
          />
        </View>

        <Text
          maxFontSizeMultiplier={1.2}
          style={{ paddingTop: 18, color: colors.textPrimary, fontFamily: fonts.captionSerif, fontSize: 16, lineHeight: 23 }}
        >
          {moment.params.frontText.trim() || 'Untitled'}
        </Text>

        {failed ? (
          <View style={{ paddingTop: 10, gap: 10 }}>
            <Text accessibilityRole="alert" style={{ color: colors.error, fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19 }}>
              This moment didn't go out. Your photo and words are safe here.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <PillButton onPress={() => onRetry(moment.momentId)} style={{ flex: 1, minHeight: layout.buttonHeightCompact }}>
                Try again
              </PillButton>
              <PillButton variant="secondary" onPress={() => onEdit(moment.momentId)} style={{ flex: 1, minHeight: layout.buttonHeightCompact }}>
                Edit
              </PillButton>
              <PillButton variant="danger" onPress={() => onDiscard(moment.momentId)} style={{ flex: 1, minHeight: layout.buttonHeightCompact }}>
                Discard
              </PillButton>
            </View>
          </View>
        ) : (
          <View style={{ paddingTop: 8, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={colors.textFaint} />
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13 }}>Sharing with your people...</Text>
          </View>
        )}
      </PolaroidFrame>
    </PrintShadow>
  );
}
