import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Screen from '../components/Screen';
import { PillButton, SectionLabel } from '../components/DesignPrimitives';
import type { RootStackParamList } from '../navigation/types';
import { subscribeMomentsByAuthors } from '../services/moments';
import type { Moment } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';
import { isValidYYYYMMDD } from '../utils/dates';

type Props = NativeStackScreenProps<RootStackParamList, 'YourYear'>;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function YourYearScreen({ route, navigation }: Props) {
  const { user } = useContext(AuthContext);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const year = route.params?.year ?? new Date().getFullYear();

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeMomentsByAuthors(
      [user.uid],
      setMoments,
      () => setError('Your year could not be loaded.'),
      undefined,
      200,
    );
  }, [user?.uid]);

  const yearMoments = useMemo(
    () =>
      moments
        .filter((moment) => moment.authorUid === user?.uid && moment.memoryDate.startsWith(`${year}-`) && isValidYYYYMMDD(moment.memoryDate))
        .sort((a, b) => a.memoryDate.localeCompare(b.memoryDate)),
    [moments, user?.uid, year],
  );
  const monthCount = new Set(yearMoments.map((moment) => moment.memoryDate.slice(5, 7))).size;
  const coverMoments = yearMoments.slice(0, 3);
  const chapters = yearMoments.reduce<Array<{ month: string; moment: Moment }>>((items, moment) => {
    const monthIndex = Number(moment.memoryDate.slice(5, 7)) - 1;
    const month = MONTHS[monthIndex] ?? 'Memory';
    if (!items.some((item) => item.month === month)) items.push({ month, moment });
    return items;
  }, []);

  return (
    <Screen contentStyle={{ paddingHorizontal: 0, paddingTop: 18, paddingBottom: 36 }}>
      <View style={{ paddingHorizontal: 22, gap: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={{ flex: 1 }}>
            <Icon source="chevron-left" color={colors.textPrimary} size={25} />
          </Pressable>
          <View style={{ borderColor: colors.borderInset, borderWidth: 1, borderRadius: radius.pill, backgroundColor: colors.surfaceInset, paddingHorizontal: 13, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon source="lock-outline" color={colors.textMuted} size={13} />
            <Text style={{ color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 12 }}>Private to you</Text>
          </View>
        </View>

        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

        <View style={{ alignItems: 'center', gap: 5 }}>
          <SectionLabel>Your year on Then</SectionLabel>
          <Text style={{ color: colors.textPrimary, fontFamily: fonts.script, fontSize: 76, lineHeight: 78 }}>
            {year}
          </Text>
          <Text style={{ color: colors.textSecondary, fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24 }}>
            A quiet look back at what you kept.
          </Text>
        </View>

        <View style={{ height: 146, alignItems: 'center', justifyContent: 'center' }}>
          {coverMoments.length ? (
            coverMoments.map((moment, index) => (
              <View
                key={moment.id}
                style={{
                  position: 'absolute',
                  width: index === 1 ? 128 : 112,
                  padding: 7,
                  paddingBottom: 20,
                  borderRadius: radius.print,
                  backgroundColor: colors.polaroid,
                  shadowColor: '#2A2622',
                  shadowOpacity: 0.18,
                  shadowRadius: 28,
                  shadowOffset: { width: 0, height: 14 },
                  elevation: 4,
                  transform: [
                    { translateX: index === 0 ? -82 : index === 2 ? 82 : 0 },
                    { rotate: index === 0 ? '-9deg' : index === 2 ? '10deg' : '3deg' },
                  ],
                  zIndex: index === 1 ? 2 : 1,
                }}
              >
                <Image source={{ uri: moment.imageUrl }} style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.photoBg }} />
              </View>
            ))
          ) : (
            <View style={{ width: 142, height: 112, borderRadius: radius.print, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.borderInset, alignItems: 'center', justifyContent: 'center' }}>
              <Icon source="image-outline" color={colors.textFaintest} size={30} />
            </View>
          )}
        </View>

        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13, textAlign: 'center' }}>
          {yearMoments.length} {yearMoments.length === 1 ? 'moment' : 'moments'} · across {monthCount || 0} {monthCount === 1 ? 'month' : 'months'}
        </Text>
      </View>

      <View style={{ marginTop: 26, paddingHorizontal: 22, gap: 16 }}>
        <SectionLabel>The year, in order</SectionLabel>
        {chapters.length ? (
          chapters.map(({ month, moment }) => (
            <Pressable
              key={month}
              onPress={() => navigation.navigate('MomentDetail', { momentId: moment.id, moment, canNote: true })}
              accessibilityRole="button"
              accessibilityLabel={`Open ${month} moment`}
              style={({ pressed }) => ({
                opacity: pressed ? 0.72 : 1,
                paddingTop: 13,
                borderTopColor: colors.borderStrong,
                borderTopWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 13,
              })}
            >
              <View style={{ width: 54, height: 54, borderRadius: radius.print, backgroundColor: colors.polaroid, padding: 4, shadowColor: '#2A2622', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }}>
                <Image source={{ uri: moment.imageUrl }} style={{ flex: 1, borderRadius: 3, backgroundColor: colors.photoBg }} />
              </View>
              <View style={{ flex: 1 }}>
                <SectionLabel>{month}</SectionLabel>
                <Text style={{ color: colors.textPrimary, fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 23, marginTop: 2 }}>
                  {moment.frontText || 'Untitled'}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19 }}>
            This year is still quiet here. When you share moments dated {year}, they will appear in order.
          </Text>
        )}
      </View>

      <View style={{ marginTop: 28, paddingHorizontal: 22, gap: 12 }}>
        <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 12.5, lineHeight: 18, textAlign: 'center' }}>
          Made only from your own photos, captions, and private notes. Never shared, never ranked.
        </Text>
        <PillButton icon="book-open-page-variant-outline" onPress={() => {}}>
          Open your preview
        </PillButton>
        <Text style={{ color: colors.textFaintest, fontFamily: fonts.bodyRegular, fontSize: 11.5, textAlign: 'center' }}>
          Free, always. A printed edition, someday.
        </Text>
      </View>
    </Screen>
  );
}
