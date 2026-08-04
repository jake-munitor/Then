import React, { useContext, useEffect, useState } from 'react';
import { Image, Linking, Pressable, Share, View } from 'react-native';
import { Button, Dialog, Icon, Portal, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Screen from '../components/Screen';
import { Avatar, PillButton, SectionLabel, SegmentedControl, Toggle } from '../components/DesignPrimitives';
import type { RootStackParamList } from '../navigation/types';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  subscribeNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notifications';
import { createInvite } from '../services/invites';
import { deleteStoredFile, uploadAvatar } from '../services/photos';
import { track } from '../services/telemetry';
import type { NotificationPreferences, ProfileVisibility } from '../services/types';
import { subscribePublicUsers, updateThenSettings } from '../services/users';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';

type Props = NativeStackScreenProps<RootStackParamList, 'RollSettings'>;

export default function RollSettingsScreen({ navigation }: Props) {
  const { user, deleteAccount, logout, updateDisplayName } = useContext(AuthContext);
  const [name, setName] = useState(user?.displayName ?? '');
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>('private');
  const [appearInWander, setAppearInWander] = useState(false);
  const [handle, setHandle] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribePublicUsers(
      [user.uid],
      (profiles) => {
        const profile = profiles[user.uid];
        if (!profile) return;
        setName(profile.displayName ?? user.displayName ?? '');
        setHandle(profile.handle ?? '');
        setAvatarUri(profile.avatarUrl);
        setProfileVisibility(profile.profileVisibility);
        setAppearInWander(profile.appearInWander);
      },
      () => setError('Your profile could not be loaded.'),
    );
  }, [user?.displayName, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeNotificationPreferences(
      user.uid,
      setNotificationPreferences,
      () => setError('Notification settings could not be loaded.'),
    );
  }, [user?.uid]);

  const saveProfile = async () => {
    if (!user?.uid || busy || !name.trim() || !handle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateDisplayName(name);
      await updateThenSettings({
        uid: user.uid,
        displayName: name,
        handle,
        profileVisibility,
        appearInWander,
        avatarUrl: avatarUri,
        onboardingCompleted: true,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const changeAvatar = async () => {
    if (!user?.uid || !handle.trim()) return;
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
    if (result.canceled) return;

    setBusy(true);
    try {
      const previousAvatar = avatarUri;
      const url = await uploadAvatar({ uid: user.uid, uri: result.assets[0].uri });
      await updateThenSettings({
        uid: user.uid,
        displayName: name || user.displayName || 'Then Friend',
        handle,
        profileVisibility,
        appearInWander,
        avatarUrl: url,
        onboardingCompleted: true,
      });
      setAvatarUri(url);
      await deleteStoredFile(previousAvatar).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update avatar.');
    } finally {
      setBusy(false);
    }
  };

  const shareInvite = async () => {
    try {
      const invite = await createInvite();
      const result = await Share.share({
        message: `Join me on Then - one photo, one moment, just our people. ${invite.url}`,
      });
      if (result.action === Share.sharedAction) track('invite_shared');
    } catch {
      setError('Your invite could not be created. Try again.');
    }
  };

  const shareProfile = async () => {
    const profileHandle = handle ? `@${handle}` : user?.displayName ?? 'me';
    await Share.share({
      message: `Find ${profileHandle} on Then: then://profile/${handle ?? ''}\n\nIf Then is not installed: https://apps.apple.com/app/id6778068657`,
    });
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://app.munitor.ai/then/privacy').catch(() => {
      setError('Could not open the privacy page.');
    });
  };

  const setNotificationPreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user?.uid) return;
    const next = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(next);
    try {
      await updateNotificationPreferences(user.uid, next);
      setError(null);
    } catch (e) {
      setNotificationPreferences(notificationPreferences);
      setError(e instanceof Error ? e.message : 'Could not update notifications.');
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(deletePassword);
      setShowDeleteAccount(false);
    } catch (e: any) {
      const message =
        e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password'
          ? 'Password is incorrect.'
          : e instanceof Error
            ? e.message
            : 'Could not delete the account.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ gap: 20, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 42 }}>
        <Text numberOfLines={1} onPress={() => navigation.goBack()} style={{ width: 82, color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 14 }}>
          ‹ Your roll
        </Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          style={{ flex: 1, textAlign: 'center', color: colors.textPrimary, fontFamily: fonts.captionSerifMedium, fontSize: 22 }}
        >
          Settings
        </Text>
        <Text numberOfLines={1} onPress={saveProfile} style={{ width: 82, textAlign: 'right', color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>
          Done
        </Text>
      </View>

      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

      <SettingsGroup label="Profile">
        <SettingsRow>
          <Pressable
            onPress={changeAvatar}
            accessibilityRole="button"
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              {avatarUri ? <Image source={{ uri: avatarUri }} style={{ width: 46, height: 46, borderRadius: 23 }} /> : <Avatar name={name} size={46} />}
              <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 14 }}>
                Change photo
              </Text>
            </View>
            <Icon source="chevron-right" color={colors.textFaintest} size={20} />
          </Pressable>
        </SettingsRow>
        <SettingsRow>
          <TextInput
            label="Display name"
            value={name}
            onChangeText={setName}
            maxLength={80}
            disabled={busy}
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor={colors.primary}
            style={{ flex: 1, backgroundColor: 'transparent' }}
          />
        </SettingsRow>
        <SettingsRow isLast>
          <TextInput
            label="Handle"
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            disabled={busy}
            left={<TextInput.Affix text="@" />}
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor={colors.primary}
            style={{ flex: 1, backgroundColor: 'transparent' }}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup label="Privacy">
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodySemiBold, fontSize: 14 }}>Let people find you</Text>
          <SegmentedControl
            value={profileVisibility}
            onChange={(value) => setProfileVisibility(value)}
            options={[
              { value: 'public', label: 'Findable' },
              { value: 'private', label: 'Hidden' },
            ]}
          />
          <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12.5, lineHeight: 18 }}>
            Findable means people can look you up by name or handle — they see only your
            name and photo. Your moments always require your approval to see, either way.
          </Text>
        </View>
      </SettingsGroup>

      <SettingsGroup label="Sharing">
        <SettingsRow>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 14 }}>Default to Wander</Text>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>New moments start opted in.</Text>
          </View>
          <Toggle value={appearInWander} onValueChange={setAppearInWander} disabled={busy} />
        </SettingsRow>
        <SettingsRow>
          <Pressable
            onPress={shareInvite}
            accessibilityRole="button"
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Icon source="email-plus-outline" color={colors.primary} size={18} />
              <View>
                <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 14 }}>
                  Invite friends
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 12 }}>
                  A link that connects you both instantly.
                </Text>
              </View>
            </View>
            <Icon source="chevron-right" color={colors.textFaintest} size={20} />
          </Pressable>
        </SettingsRow>
        <SettingsRow isLast>
          <Pressable
            onPress={shareProfile}
            accessibilityRole="button"
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Icon source="share-variant-outline" color={colors.primary} size={18} />
              <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 14 }}>
                Share my profile
              </Text>
            </View>
            <Icon source="chevron-right" color={colors.textFaintest} size={20} />
          </Pressable>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup label="Notifications">
        {[
          ['notes', 'Notes on your moments'],
          ['friendMoments', 'Moments from your people'],
          ['followRequests', 'Friend requests'],
          ['friendApprovals', 'Friend approvals'],
          ['wander', 'Wander activity'],
          ['reminders', 'Daily posting nudges'],
        ].map(([key, label], index, list) => (
          <SettingsRow key={key} isLast={index === list.length - 1}>
            <Text style={{ flex: 1, color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 14 }}>
              {label}
            </Text>
            <Toggle
              value={notificationPreferences[key as keyof NotificationPreferences]}
              onValueChange={(value) => setNotificationPreference(key as keyof NotificationPreferences, value)}
              disabled={busy}
            />
          </SettingsRow>
        ))}
      </SettingsGroup>

      <SettingsGroup label="Account">
        <SettingsRow>
          <Pressable
            onPress={openPrivacyPolicy}
            accessibilityRole="button"
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: colors.textPrimary, fontFamily: fonts.bodyMedium, fontSize: 14 }}>Privacy & data</Text>
            <Icon source="chevron-right" color={colors.textFaintest} size={20} />
          </Pressable>
        </SettingsRow>
        <View style={{ padding: 16, gap: 10 }}>
          <PillButton variant="danger" onPress={logout}>Sign out</PillButton>
          <PillButton
            variant="danger"
            icon="account-remove-outline"
            onPress={() => {
              setError(null);
              setDeletePassword('');
              setShowDeleteAccount(true);
            }}
          >
            Delete account
          </PillButton>
        </View>
      </SettingsGroup>

      <Text style={{ color: colors.textFaintest, textAlign: 'center', fontFamily: fonts.bodyRegular, fontSize: 11.5 }}>
        then · made for memory, not performance
      </Text>

      <Portal>
        <Dialog visible={showDeleteAccount} onDismiss={() => setShowDeleteAccount(false)}>
          <Dialog.Title>Delete your account?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              This permanently removes your profile, moments, friendships, saved items, and current uploaded media. Enter your password to confirm.
            </Text>
            <TextInput
              label="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              disabled={busy}
            />
            {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteAccount(false)} disabled={busy}>Cancel</Button>
            <Button
              onPress={confirmDeleteAccount}
              loading={busy}
              disabled={busy || !deletePassword}
              textColor={colors.error}
            >
              Delete account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 9 }}>
      <SectionLabel>{label}</SectionLabel>
      <View
        style={{
          borderRadius: radius.lg,
          shadowColor: '#2A2622',
          shadowOpacity: 0.05,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 5 },
          elevation: 2,
        }}
      >
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' }}>
          {children}
        </View>
      </View>
    </View>
  );
}

function SettingsRow({ children, isLast }: { children: React.ReactNode; isLast?: boolean }) {
  return (
    <View
      style={{
        minHeight: 50,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottomColor: colors.border,
        borderBottomWidth: isLast ? 0 : 1,
      }}
    >
      {children}
    </View>
  );
}
