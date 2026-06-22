import React, { useContext, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import FilteredMomentImage from '../components/FilteredMomentImage';
import Screen from '../components/Screen';
import { PillButton, SectionLabel, Toggle } from '../components/DesignPrimitives';
import { createMoment } from '../services/moments';
import { subscribePublicUsers } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';
import { dateFromImagePickerAsset, isValidYYYYMMDD, todayYYYYMMDD } from '../utils/dates';
import type { PhotoFilter } from '../utils/photoFilters';

const FRONT_LIMIT = 50;

export default function NewMomentScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [uri, setUri] = useState<string | null>(null);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('normal');
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [memoryDate, setMemoryDate] = useState(todayYYYYMMDD());
  const [appearInWander, setAppearInWander] = useState(false);
  const [wanderDefault, setWanderDefault] = useState(false);
  const [busy, setBusy] = useState(false);
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
      setPhotoFilter('normal');
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
      setPhotoFilter('normal');
    }
  };

  const submit = async () => {
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

    setBusy(true);
    try {
      await createMoment({
        uid: user.uid,
        uri,
        photoFilter,
        frontText,
        backText,
        memoryDate: memoryDate.trim(),
        appearInWander,
      });
      setUri(null);
      setPhotoFilter('normal');
      setFrontText('');
      setBackText('');
      setMemoryDate(todayYYYYMMDD());
      setAppearInWander(wanderDefault);
      navigation.navigate('FeedTab');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not share.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen contentStyle={{ gap: 14, paddingTop: 20, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40 }}>
          <Text onPress={() => navigation.navigate('FeedTab')} style={{ flex: 1, color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 14 }}>
            Cancel
          </Text>
          <Text style={{ flex: 1, textAlign: 'center', color: colors.textPrimary, fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 25 }}>
            a new{'\n'}moment
          </Text>
          <View style={{ flex: 1 }} />
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: 9,
            shadowColor: '#2A2622',
            shadowOpacity: 0.07,
            shadowRadius: 26,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          {uri ? (
            <View style={{ borderRadius: 9, overflow: 'hidden', backgroundColor: colors.photoBg }}>
              <FilteredMomentImage
                uri={uri}
                filter={photoFilter}
                aspectRatio={1}
                style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.photoBg }}
                accessibilityLabel={frontText || 'Selected moment photo'}
                testID="new-moment-photo-preview"
              />
              <Pressable
                onPress={pickPhoto}
                disabled={busy}
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
                  backgroundColor: 'rgba(28,24,20,0.58)',
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <Icon source="camera-outline" color={colors.white} size={14} />
                <Text style={{ color: colors.white, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>Replace</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.photoBg, borderRadius: 9 }}>
              <Icon source="image-outline" color={colors.textFaint} size={34} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <PillButton icon="camera-outline" onPress={takePhoto} disabled={busy} style={{ minHeight: 42 }}>
                  Camera
                </PillButton>
                <PillButton variant="secondary" icon="image-outline" onPress={pickPhoto} disabled={busy} style={{ minHeight: 42 }}>
                  Library
                </PillButton>
              </View>
            </View>
          )}

          <View style={{ paddingHorizontal: 8, paddingTop: 14, paddingBottom: 10, gap: 10 }}>
            <SectionLabel>On the front</SectionLabel>
            <TextInput
              value={frontText}
              onChangeText={(value) => setFrontText(value.slice(0, FRONT_LIMIT))}
              disabled={busy}
              placeholder="first light, no plans"
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={{ backgroundColor: 'transparent', paddingHorizontal: 0 }}
              contentStyle={{ color: colors.textPrimary, fontFamily: fonts.displayItalic, fontSize: 19 }}
            />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Text style={{ textAlign: 'right', color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 12 }}>
              {frontText.length} / {FRONT_LIMIT}
            </Text>
            <TextInput
              label="date stamp"
              value={memoryDate}
              onChangeText={setMemoryDate}
              disabled={busy}
              mode="outlined"
              style={{ backgroundColor: colors.surfaceInset }}
            />
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.surfaceInset,
            borderColor: colors.borderInset,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon source="file-document-outline" color={colors.textMuted} size={18} />
              <SectionLabel>On the back</SectionLabel>
            </View>
            <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 11 }}>private to you</Text>
          </View>
          <TextInput
            value={backText}
            onChangeText={setBackText}
            disabled={busy}
            multiline
            placeholder="What do you want to remember?"
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
          <Toggle value={appearInWander} onValueChange={setAppearInWander} disabled={busy} />
        </View>

        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
        <PillButton icon="camera-outline" onPress={submit} disabled={busy || !uri}>
          Develop & share
        </PillButton>
        <Text style={{ color: colors.textFaint, textAlign: 'center', fontFamily: fonts.bodyRegular, fontSize: 11.5, lineHeight: 17 }}>
          Once shared, a moment can be deleted — but never revised. Like a polaroid.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
