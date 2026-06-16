import React, { useContext, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { uploadAvatar } from '../services/photos';
import { updateThenSettings } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';

function handleFromName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}

export default function OnboardingScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [handle, setHandle] = useState(handleFromName(user?.displayName ?? ''));
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [busyTarget, setBusyTarget] = useState<'friends' | 'moment' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewHandle = useMemo(() => handleFromName(handle), [handle]);

  const chooseAvatar = async () => {
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo access denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const finish = async (target: 'friends' | 'moment') => {
    if (!user?.uid || !displayName.trim()) return;
    if (previewHandle.length < 3) {
      setError('Use at least 3 characters for your handle.');
      return;
    }

    setBusyTarget(target);
    setError(null);
    try {
      let avatarUrl: string | null | undefined;
      if (avatarUri) avatarUrl = await uploadAvatar({ uid: user.uid, uri: avatarUri });
      await updateThenSettings({
        uid: user.uid,
        displayName,
        handle: previewHandle,
        profileVisibility: 'private',
        appearInWander: false,
        avatarUrl,
        onboardingCompleted: true,
      });
      navigation.replace('MainTabs', { screen: target === 'friends' ? 'FriendsTab' : 'NewMomentTab' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup.');
    } finally {
      setBusyTarget(null);
    }
  };

  return (
    <Screen contentStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
      <View style={{ width: '100%', maxWidth: 520, gap: 16 }}>
        <PageHeader title="Set your roll" subtitle="Start private. Invite deliberately. Share one good moment." />

        <View style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 18, gap: 14 }}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 88, height: 88, borderRadius: 44 }} />
            ) : (
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: colors.surfaceWarm,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="headlineSmall">{(displayName || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <Button mode="outlined" icon="image-outline" onPress={chooseAvatar} disabled={Boolean(busyTarget)}>
              Avatar
            </Button>
          </View>

          <TextInput label="display name" value={displayName} onChangeText={setDisplayName} disabled={Boolean(busyTarget)} />
          <TextInput
            label="handle"
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            disabled={Boolean(busyTarget)}
            left={<TextInput.Affix text="@" />}
          />
          <Text style={{ color: colors.textSecondary }}>then://profile/{previewHandle || 'handle'}</Text>
          {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              mode="outlined"
              icon="account-plus-outline"
              onPress={() => finish('friends')}
              loading={busyTarget === 'friends'}
              disabled={Boolean(busyTarget) || !displayName.trim()}
              style={{ flex: 1 }}
            >
              Find friends
            </Button>
            <Button
              mode="contained"
              icon="camera-outline"
              onPress={() => finish('moment')}
              loading={busyTarget === 'moment'}
              disabled={Boolean(busyTarget) || !displayName.trim()}
              style={{ flex: 1 }}
            >
              First moment
            </Button>
          </View>
        </View>
      </View>
    </Screen>
  );
}
