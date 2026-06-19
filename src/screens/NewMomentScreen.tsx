import React, { useContext, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Switch, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import FilteredMomentImage from '../components/FilteredMomentImage';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import FilmStripe from '../components/FilmStripe';
import PhotoFilterPicker from '../components/PhotoFilterPicker';
import { createMoment } from '../services/moments';
import { subscribePublicUsers } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
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
      <Screen contentStyle={{ alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 560, gap: 14 }}>
          <PageHeader title="New moment" subtitle="One photo, one memory, kept simply." />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button mode="contained" icon="camera-outline" onPress={takePhoto} disabled={busy} style={{ flex: 1 }}>
              Camera
            </Button>
            <Button mode="outlined" icon="image-outline" onPress={pickPhoto} disabled={busy} style={{ flex: 1 }}>
              Library
            </Button>
          </View>

          {uri ? (
            <View
              style={{
                backgroundColor: colors.paper,
                borderColor: colors.borderStrong,
                borderWidth: 1,
                padding: 10,
                paddingBottom: 28,
                shadowColor: '#2A211B',
                shadowOpacity: 0.12,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 7 },
                elevation: 3,
              }}
            >
              <FilteredMomentImage
                uri={uri}
                filter={photoFilter}
                aspectRatio={4 / 3}
                style={{ backgroundColor: colors.surfaceWarm }}
                accessibilityLabel={frontText || 'Selected moment photo'}
                testID="new-moment-photo-preview"
              />
              <View style={{ position: 'absolute', left: 18, bottom: 12 }}>
                <FilmStripe width={48} height={3} />
              </View>
            </View>
          ) : (
            <View
              style={{
                height: 260,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.borderStrong,
                borderRadius: 2,
                backgroundColor: colors.paper,
              }}
            >
              <Text style={{ color: colors.textSecondary }}>Choose a photo</Text>
            </View>
          )}

          {uri ? <PhotoFilterPicker value={photoFilter} onChange={setPhotoFilter} disabled={busy} /> : null}

          <TextInput
            label="on the front"
            value={frontText}
            onChangeText={(value) => setFrontText(value.slice(0, FRONT_LIMIT))}
            disabled={busy}
          />
          <Text style={{ color: colors.textMuted, textAlign: 'right' }}>{frontText.length}/{FRONT_LIMIT}</Text>
          <TextInput label="date stamp" value={memoryDate} onChangeText={setMemoryDate} disabled={busy} />
          <TextInput label="on the back" value={backText} onChangeText={setBackText} multiline disabled={busy} />

          <View
            style={{
              backgroundColor: colors.paper,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 8,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall">show in wander</Text>
              <Text style={{ color: colors.textSecondary }}>Shows the front only.</Text>
            </View>
            <Switch value={appearInWander} onValueChange={setAppearInWander} disabled={busy} />
          </View>

          {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
          <Button mode="contained" icon="send-outline" onPress={submit} loading={busy} disabled={busy || !uri}>
            Share
          </Button>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
