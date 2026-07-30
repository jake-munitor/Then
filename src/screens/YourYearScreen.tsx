import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FilteredMomentImage from '../components/FilteredMomentImage';
import ListenerError from '../components/ListenerError';
import Screen from '../components/Screen';
import { PillButton, SectionLabel } from '../components/DesignPrimitives';
import type { RootStackParamList } from '../navigation/types';
import { fetchMomentBacks, fetchMomentsForYear, fetchYearsWithMoments } from '../services/moments';
import type { Moment } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';
import { formatMemoryDate } from '../utils/dates';

type Props = NativeStackScreenProps<RootStackParamList, 'YourYear'>;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type Chapter = { month: string | null; moment: Moment };

/**
 * Three photos spread across the year rather than the first three, which were
 * always January. Deliberately positional, never "best" - YEARBOOK.md forbids
 * ranking, so this picks by place in the timeline and nothing else.
 */
function pickCoverMoments(moments: Moment[]): Moment[] {
  if (moments.length <= 3) return moments;
  const positions = [0, Math.floor(moments.length / 2), moments.length - 1];
  return positions.map((position) => moments[position]);
}

export default function YourYearScreen({ route, navigation }: Props) {
  const { user } = useContext(AuthContext);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [year, setYear] = useState(route.params?.year ?? new Date().getFullYear());

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    fetchYearsWithMoments(user.uid)
      .then((years) => {
        if (active) setAvailableYears(years);
      })
      .catch(() => {
        // The picker is a convenience; the year itself still loads without it.
      });
    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    setLoading(true);
    setError(null);

    fetchMomentsForYear({ authorUid: user.uid, year })
      .then(async (yearMoments) => {
        if (!active) return;
        setMoments(yearMoments);
        // Reflections are supporting material - the year renders without them.
        const backs = await fetchMomentBacks(yearMoments.map((moment) => moment.id));
        if (active) setReflections(backs);
      })
      .catch(() => {
        if (active) setError('Your year could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey, user?.uid, year]);

  const monthCount = useMemo(
    () => new Set(moments.map((moment) => moment.memoryDate.slice(5, 7))).size,
    [moments],
  );
  const coverMoments = useMemo(() => pickCoverMoments(moments), [moments]);
  const chapters = useMemo<Chapter[]>(
    () =>
      moments.map((moment, index) => {
        const month = MONTHS[Number(moment.memoryDate.slice(5, 7)) - 1] ?? 'Memory';
        const previous = moments[index - 1];
        const previousMonth = previous ? MONTHS[Number(previous.memoryDate.slice(5, 7)) - 1] ?? 'Memory' : null;
        return { month: month === previousMonth ? null : month, moment };
      }),
    [moments],
  );

  const openMoment = useCallback(
    (moment: Moment) => navigation.navigate('MomentDetail', { momentId: moment.id, moment, canNote: true }),
    [navigation],
  );

  const yearOptions = useMemo(
    () => (availableYears.includes(year) ? availableYears : [year, ...availableYears].sort((a, b) => b - a)),
    [availableYears, year],
  );

  return (
    <Screen contentStyle={{ paddingBottom: 96 }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 44 }}>
          <Icon source="chevron-left" color={colors.textPrimary} size={25} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon source="lock-outline" color={colors.textFaint} size={13} />
          <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 12 }}>Private to you</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
        <ListenerError message={error} onRetry={() => setReloadKey((current) => current + 1)} />
      </View>

      <View style={{ alignItems: 'center', gap: 5, marginTop: 8 }}>
        <SectionLabel>Your year on Then</SectionLabel>
        <Text style={{ color: colors.textPrimary, fontFamily: fonts.script, fontSize: 76, lineHeight: 100 }}>
          {year}
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24 }}>
          A quiet look back at what you kept.
        </Text>
      </View>

      {yearOptions.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 22, paddingTop: 16 }}
        >
          {yearOptions.map((option) => {
            const selected = option === year;
            return (
              <Pressable
                key={option}
                onPress={() => setYear(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Show ${option}`}
                style={{
                  minHeight: 34,
                  justifyContent: 'center',
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  borderWidth: selected ? 1.5 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.paper : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: selected ? colors.primary : colors.textMuted,
                    fontFamily: selected ? fonts.bodySemiBold : fonts.bodyRegular,
                    fontSize: 13,
                  }}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={{ paddingTop: 56, alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13 }}>
            Gathering your year...
          </Text>
        </View>
      ) : (
        <>
          <View style={{ marginTop: 26, alignItems: 'center', minHeight: 150, justifyContent: 'center' }}>
            {coverMoments.length ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {coverMoments.map((moment, index) => (
                  <View
                    key={moment.id}
                    style={{
                      position: index === 1 || coverMoments.length === 1 ? 'relative' : 'absolute',
                      width: 142,
                      padding: 7,
                      paddingBottom: 20,
                      borderRadius: radius.print,
                      backgroundColor: colors.polaroid,
                      shadowColor: '#785A46',
                      shadowOpacity: 0.08,
                      shadowRadius: 24,
                      shadowOffset: { width: 0, height: 8 },
                      elevation: 4,
                      transform: [
                        { translateX: index === 0 ? -82 : index === 2 ? 82 : 0 },
                        { rotate: index === 0 ? '-9deg' : index === 2 ? '10deg' : '3deg' },
                      ],
                    }}
                  >
                    <FilteredMomentImage
                      uri={moment.imageUrl}
                      filter={moment.photoFilter}
                      aspectRatio={1}
                      style={{ borderRadius: radius.printPhoto, backgroundColor: colors.photoBg }}
                      accessibilityLabel={moment.frontText || 'Then moment'}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ width: 142, height: 112, borderRadius: radius.print, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.borderInset, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon source="image-outline" color={colors.textFaintest} size={26} />
                <Text style={{ color: colors.textFaintest, fontFamily: fonts.bodyRegular, fontSize: 11.5 }}>
                  No moments yet
                </Text>
              </View>
            )}
          </View>

          <View style={{ marginTop: 22, paddingHorizontal: 22 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13, textAlign: 'center' }}>
              {moments.length} {moments.length === 1 ? 'moment' : 'moments'} · across {monthCount}{' '}
              {monthCount === 1 ? 'month' : 'months'}
            </Text>
          </View>

          <View style={{ marginTop: 26, paddingHorizontal: 22, gap: 16 }}>
            <SectionLabel>The year, in order</SectionLabel>
            {chapters.length ? (
              chapters.map(({ month, moment }) => {
                const readableDate = formatMemoryDate(moment.memoryDate);
                const reflection = reflections[moment.id];
                return (
                  <View key={moment.id} style={{ gap: 16 }}>
                    {month ? <SectionLabel>{month}</SectionLabel> : null}
                    <Pressable
                      onPress={() => openMoment(moment)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open moment from ${readableDate || 'this year'}`}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.72 : 1,
                        paddingTop: 13,
                        borderTopColor: colors.borderStrong,
                        borderTopWidth: 1,
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 13,
                      })}
                    >
                      <View style={{ width: 54, height: 54, borderRadius: radius.print, backgroundColor: colors.polaroid, padding: 4, shadowColor: '#785A46', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
                        <FilteredMomentImage
                          uri={moment.imageUrl}
                          filter={moment.photoFilter}
                          aspectRatio={1}
                          style={{ flex: 1, borderRadius: radius.printPhoto, backgroundColor: colors.photoBg }}
                          accessibilityLabel={moment.frontText || 'Then moment'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textFaint, fontFamily: fonts.cameraRegular, fontSize: 11.5, letterSpacing: 0.6 }}>
                          {readableDate}
                        </Text>
                        <Text style={{ color: colors.textPrimary, fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 23, marginTop: 2 }}>
                          {moment.frontText || 'Untitled'}
                        </Text>
                        {reflection ? (
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontFamily: fonts.script,
                              fontSize: 16,
                              lineHeight: 24,
                              marginTop: 6,
                            }}
                          >
                            {reflection}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  </View>
                );
              })
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
            {moments.length ? (
              <PillButton icon="book-open-page-variant-outline" onPress={() => openMoment(moments[0])}>
                Open first memory
              </PillButton>
            ) : (
              <PillButton variant="secondary" icon="filmstrip" onPress={() => navigation.goBack()}>
                Back to your roll
              </PillButton>
            )}
            <Text style={{ color: colors.textFaintest, fontFamily: fonts.bodyRegular, fontSize: 11.5, textAlign: 'center' }}>
              Free, always. A printed edition, someday.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}
