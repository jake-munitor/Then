import React, { useContext, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import DevelopingPhoto from '../components/DevelopingPhoto';
import PhotoFilterPicker from '../components/PhotoFilterPicker';
import PolaroidFrame, { PrintShadow } from '../components/PolaroidFrame';
import Screen from '../components/Screen';
import { PillButton, SectionLabel, Toggle } from '../components/DesignPrimitives';
import { clearRestoredDraft, shareMoment, useMomentOutbox } from '../services/momentOutbox';
import { subscribePublicUsers } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { iconSize, layout } from '../theme/layout';
import { radius } from '../theme/radius';
import { dateFromImagePickerAsset, isValidYYYYMMDD, todayYYYYMMDD } from '../utils/dates';
import type { PhotoFilter } from '../utils/photoFilters';

const FRONT_LIMIT = 50;
const DEFAULT_PHOTO_FILTER: PhotoFilter = 'film';

export default function NewMomentScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const { width: windowWidth } = useWindowDimensions();
  // Same print width as a feed card, so the composer is the finished object.
  const cardWidth = Math.min(Math.max(windowWidth - 36, 286), 430);
  const [uri, setUri] = useState<string | null>(null);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>(DEFAULT_PHOTO_FILTER);
  const [frontText, setFrontText] = useState('');
  const [frontFocused, setFrontFocused] = useState(false);
  const [backFocused, setBackFocused] = useState(false);
  const [backText, setBackText] = useState('');
  const [memoryDate, setMemoryDate] = useState(todayYYYYMMDD());
  const [appearInWander, setAppearInWander] = useState(false);
  const [wanderDefault, setWanderDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.uid) return;
    return subscribePublicUsers(
      [user.uid],
      (profiles) => {
        const preference = Boolean(profiles[user.uid]?.appearInWander);
        setWanderDefault(preference);
        setAppearInWander(preference);
      },
      () => setError('Your Wander preference could not be loaded.'),
    );
  }, [user?.uid]);

  // A failed share the person chose to edit comes back here with everything
  // they had: photo, tone, caption, back, date.
  const { draft } = useMomentOutbox();
  React.useEffect(() => {
    if (!draft) return;
    setUri(draft.uri);
    setPhotoFilter(draft.photoFilter);
    setFrontText(draft.frontText);
    setBackText(draft.backText);
    setMemoryDate(draft.memoryDate);
    setAppearInWander(draft.appearInWander);
    setError(null);
    clearRestoredDraft();
  }, [draft]);

  const pickPhoto = async () => {
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo access denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      exif: true,
    });
    if (!result.canceled) {
      setUri(result.assets[0].uri);
      setMemoryDate(dateFromImagePickerAsset(result.assets[0]));
      setPhotoFilter(DEFAULT_PHOTO_FILTER);
    }
  };

  const takePhoto = async () => {
    setError(null);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera access denied.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
      exif: true,
    });
    if (!result.canceled) {
      setUri(result.assets[0].uri);
      setMemoryDate(dateFromImagePickerAsset(result.assets[0]));
      setPhotoFilter(DEFAULT_PHOTO_FILTER);
    }
  };

  const submit = () => {
    if (!user?.uid || !uri) return;
    setError(null);
    if (!frontText.trim()) {
      setError('Add front text.');
      return;
    }
    if (frontText.trim().length > FRONT_LIMIT) {
      setError('Keep the front under 50 characters.');
      return;
    }
    if (!isValidYYYYMMDD(memoryDate.trim())) {
      setError('Use YYYY-MM-DD.');
      return;
    }

    // Hand the moment to the outbox and let go. The feed shows it at once as
    // a pending print; if the upload fails, the photo and words wait there
    // with Try again / Edit / Discard.
    shareMoment({
      uid: user.uid,
      uri,
      photoFilter,
      frontText,
      backText,
      memoryDate: memoryDate.trim(),
      appearInWander,
    });
    setUri(null);
    setPhotoFilter(DEFAULT_PHOTO_FILTER);
    setFrontText('');
    setBackText('');
    setMemoryDate(todayYYYYMMDD());
    setAppearInWander(wanderDefault);
    navigation.navigate('FeedTab');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen contentStyle={{ gap: 14, paddingTop: 20, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: layout.headerHeight }}>
          <Pressable
            onPress={() => navigation.navigate('FeedTab')}
            accessibilityRole="button"
            hitSlop={8}
            style={{ width: 62, minHeight: layout.headerHeight, justifyContent: 'center' }}
          >
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 14 }}>
              Cancel
            </Text>
          </Pressable>
          {/* The title used to carry a hardcoded newline to survive the old
              three-column flex:1 header. With real side widths it fits on one line. */}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={{ flex: 1, textAlign: 'center', color: colors.textPrimary, fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 25 }}
          >
            a new moment
          </Text>
          <View style={{ width: 62 }} />
        </View>

        {/* The composer is the print itself: the chosen photo develops inside
            the same ivory frame the feed uses, and the caption is written in
            its bottom border while that happens. */}
        <PrintShadow style={{ width: cardWidth, alignSelf: 'center' }}>
          <PolaroidFrame testID="new-moment-frame" style={{ paddingBottom: 12 }}>
            <View
              style={{
                borderRadius: radius.printPhoto,
                overflow: 'hidden',
                backgroundColor: colors.photoBg,
                borderColor: colors.photoMatBorder,
                borderWidth: 1,
              }}
            >
              {uri ? (
                <>
                  <DevelopingPhoto
                    uri={uri}
                    filter={photoFilter}
                    accessibilityLabel={frontText || 'Selected moment photo'}
                    testID="new-moment-photo-preview"
                  />
                  <Pressable
                    onPress={pickPhoto}
                    accessibilityRole="button"
                    accessibilityLabel="Replace photo"
                    hitSlop={8}
                    style={({ pressed }) => ({
                      position: 'absolute',
                      right: 12,
                      bottom: 12,
                      borderRadius: radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(81, 72, 63, 0.58)',
                      opacity: pressed ? 0.72 : 1,
                    })}
                  >
                    <Icon source="camera-outline" color={colors.white} size={iconSize.inline} />
                    <Text style={{ color: colors.white, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>Replace</Text>
                  </Pressable>
                </>
              ) : (
                <View style={{ width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <Icon source="image-outline" color={colors.textFaint} size={34} />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <PillButton icon="camera-outline" onPress={takePhoto} style={{ minHeight: layout.buttonHeightCompact }}>
                      Camera
                    </PillButton>
                    <PillButton variant="secondary" icon="image-outline" onPress={pickPhoto} style={{ minHeight: layout.buttonHeightCompact }}>
                      Library
                    </PillButton>
                  </View>
                </View>
              )}
            </View>

            <View style={{ paddingTop: 8 }}>
              <TextInput
                value={frontText}
                onChangeText={(value) => setFrontText(value.slice(0, FRONT_LIMIT))}
                onFocus={() => setFrontFocused(true)}
                onBlur={() => setFrontFocused(false)}
                placeholder="first light, no plans"
                // Paper's default placeholder resolves to textSecondary here -
                // dark enough to read as already-entered text (field report).
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.primary}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                style={{ backgroundColor: 'transparent', paddingHorizontal: 0, height: 46 }}
                // Set in the caption face at the caption size, so what is
                // typed here is what the finished print shows.
                contentStyle={{ color: colors.textPrimary, fontFamily: fonts.captionSerif, fontSize: 16 }}
              />
              {/* The Paper underline is intentionally hidden, so this divider is
                  the input's only focus affordance - it warms and thickens while
                  the caption is being written. */}
              <View style={{ height: frontFocused ? 2 : 1, backgroundColor: frontFocused ? colors.primary : colors.border }} />
              <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionLabel>On the front</SectionLabel>
                <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 12 }}>
                  {frontText.length} / {FRONT_LIMIT}
                </Text>
              </View>
            </View>
          </PolaroidFrame>
        </PrintShadow>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.borderInset,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: 16,
            gap: 12,
          }}
        >
          {uri ? <PhotoFilterPicker value={photoFilter} onChange={setPhotoFilter} /> : null}
          <TextInput
            label="date stamp"
            value={memoryDate}
            onChangeText={setMemoryDate}
            mode="outlined"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            style={{ backgroundColor: colors.surfaceInset }}
            contentStyle={{ fontFamily: fonts.cameraRegular, letterSpacing: 0.6 }}
          />
        </View>

        <View
          style={{
            backgroundColor: colors.surfaceInset,
            borderColor: backFocused ? colors.primary : colors.borderInset,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon source="file-document-outline" color={colors.textMuted} size={iconSize.small} />
              <SectionLabel>On the back</SectionLabel>
            </View>
            <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 11 }}>private to you</Text>
          </View>
          <TextInput
            value={backText}
            onChangeText={setBackText}
            onFocus={() => setBackFocused(true)}
            onBlur={() => setBackFocused(false)}
            maxLength={5000}
            multiline
            placeholder="What do you want to remember?"
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.primary}
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            style={{ minHeight: 86, backgroundColor: 'transparent' }}
            contentStyle={{ color: colors.textSecondary, fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 23 }}
          />
        </View>

        <View
          style={{
            backgroundColor: colors.surfaceInset,
            borderColor: colors.borderInset,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>Appear in Wander</Text>
            <Text style={{ marginTop: 2, color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12.5 }}>
              Beyond your circle, chronological.
            </Text>
          </View>
          <Toggle value={appearInWander} onValueChange={setAppearInWander} />
        </View>

        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
        <PillButton icon="camera-outline" onPress={submit} disabled={!uri}>
          Develop & share
        </PillButton>
        <Text style={{ color: colors.textFaint, textAlign: 'center', fontFamily: fonts.bodyRegular, fontSize: 11.5, lineHeight: 17 }}>
          Once shared, a moment can be deleted - but never revised. Like a polaroid.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
