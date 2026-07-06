import React, { useContext, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { Icon, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import Screen from '../components/Screen';
import { Avatar, PillButton, Wordmark } from '../components/DesignPrimitives';
import { uploadAvatar } from '../services/photos';
import { track } from '../services/telemetry';
import { updateThenSettings } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';

function handleFromName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}

export default function OnboardingScreen() {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<'principles' | 'profile'>('principles');
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
      track('onboarding_completed', { target });
      navigation.replace('MainTabs', { screen: target === 'friends' ? 'FriendsTab' : 'NewMomentTab' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup.');
    } finally {
      setBusyTarget(null);
    }
  };

  if (step === 'principles') {
    return (
      <Screen contentStyle={{ flexGrow: 1, paddingHorizontal: 26, paddingTop: 42, paddingBottom: 34 }}>
        <View style={{ gap: 7, marginBottom: 30 }}>
          <Wordmark size={38}>A slower kind of sharing</Wordmark>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 14 }}>
            Four things that make Then, Then.
          </Text>
        </View>
        <View style={{ gap: 24, flex: 1 }}>
          <Principle icon="camera-outline" title="One photo, one moment" body="No video, reels, or stories. Just the picture and who was there." />
          <Principle icon="flip-horizontal" title="A front and a back" body="A short caption everyone sees, and a private note only you can read." />
          <Principle icon="heart-off-outline" title="Nothing to chase" body="No likes shown, no counts, no algorithm deciding what you see." />
          <Principle icon="lock-outline" title="Following needs a yes" body="Every follow is approved. Your moments stay with your people." />
        </View>
        <PillButton onPress={() => setStep('profile')}>Continue</PillButton>
        <View style={{ marginTop: 18, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#CFC4B2' }} />
          <View style={{ width: 22, height: 7, borderRadius: 4, backgroundColor: colors.primary }} />
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#CFC4B2' }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
      <View style={{ gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Wordmark size={44}>Set your roll</Wordmark>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13.5, textAlign: 'center' }}>
            Start private. Invite deliberately. Share one good moment.
          </Text>
        </View>

        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 18, gap: 14 }}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 88, height: 88, borderRadius: 44 }} />
            ) : (
              <Avatar name={displayName} size={88} />
            )}
            <PillButton variant="secondary" icon="image-outline" onPress={chooseAvatar} disabled={Boolean(busyTarget)} style={{ minHeight: 42 }}>
              Change photo
            </PillButton>
          </View>

          <TextInput label="Display name" value={displayName} onChangeText={setDisplayName} maxLength={80} disabled={Boolean(busyTarget)} style={{ backgroundColor: colors.surfaceInset }} />
          <TextInput
            label="Handle"
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            disabled={Boolean(busyTarget)}
            left={<TextInput.Affix text="@" />}
            style={{ backgroundColor: colors.surfaceInset }}
          />
          <Text style={{ color: colors.textFaint, fontFamily: fonts.bodyRegular, fontSize: 12 }}>then://profile/{previewHandle || 'handle'}</Text>
          {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PillButton
              variant="secondary"
              icon="account-plus-outline"
              onPress={() => finish('friends')}
              disabled={Boolean(busyTarget) || !displayName.trim()}
              style={{ flex: 1 }}
            >
              Friends
            </PillButton>
            <PillButton
              icon="camera-outline"
              onPress={() => finish('moment')}
              disabled={Boolean(busyTarget) || !displayName.trim()}
              style={{ flex: 1 }}
            >
              First moment
            </PillButton>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Principle({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceInset,
          borderColor: colors.borderInset,
          borderWidth: 1,
        }}
      >
        <Icon source={icon} color={colors.textSecondary} size={21} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemiBold, fontSize: 15 }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 19.5 }}>{body}</Text>
      </View>
    </View>
  );
}
