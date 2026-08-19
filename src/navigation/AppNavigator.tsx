import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
  type LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native-paper';
import { doc, onSnapshot } from 'firebase/firestore';

import { db, firebaseInitError, isFirebaseConfigured } from '../firebase/firebase';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import AuthScreen from '../screens/AuthScreen';
import NotesScreen from '../screens/NotesScreen';
import FirebaseConfigScreen from '../screens/FirebaseConfigScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import InviteScreen from '../screens/InviteScreen';
import LinkedMomentScreen from '../screens/LinkedMomentScreen';
import MomentDetailScreen from '../screens/MomentDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RollSettingsScreen from '../screens/RollSettingsScreen';
import YourYearScreen from '../screens/YourYearScreen';
import { inviteCodeFromUrl, stashPendingInviteCode } from '../services/invites';
import { cacheOnboarding, readCachedOnboarding } from '../utils/launchState';
import { getLastNotificationURL, subscribeNotificationURLs } from '../services/pushNotifications';
import { navigationIntegration } from '../services/telemetry';
import TabsNavigator from './TabsNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Longest the launch screen may wait on the profile snapshot. Deliberately
 * longer than AuthContext's 4s auth fallback so the two don't race, and short
 * enough that a stalled network never reads as a hung app.
 */
const PROFILE_GATE_TIMEOUT_MS = 6000;

const linking: LinkingOptions<RootStackParamList> = {
  // The universal-link site lives under /then on app.munitor.ai, so the web
  // prefix carries that segment; scheme URLs (then://profile/x) have no such
  // segment. Route paths must therefore stay segment-free so both forms match.
  prefixes: ['then://', 'https://app.munitor.ai/then'],
  config: {
    screens: {
      MainTabs: '',
      Profile: 'profile/:handle',
      // Matches both moments/<id> (friend-posted push -> detail) and
      // moments/<id>/notes (note notification -> notes thread).
      LinkedMoment: 'moments/:momentId/:target?',
      Invite: 'invite/:code',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) {
      // An invite can land before the person has an account, in which case the
      // Invite screen doesn't exist in the navigator yet and the URL would be
      // silently dropped. Stash the code; TabsNavigator redeems it after
      // onboarding. When signed in, the InviteScreen clears the stash itself.
      const code = inviteCodeFromUrl(url);
      if (code) void stashPendingInviteCode(code);
      return url;
    }
    return getLastNotificationURL();
  },
  subscribe(listener) {
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      const code = inviteCodeFromUrl(url);
      if (code) void stashPendingInviteCode(code);
      listener(url);
    });
    let notificationCleanup: (() => void) | undefined;
    subscribeNotificationURLs(listener)
      .then((cleanup) => {
        notificationCleanup = cleanup;
      })
      // Lazily imported native module; a load failure must not surface as an
      // unhandled rejection during navigation setup.
      .catch(() => {});

    return () => {
      linkSubscription.remove();
      notificationCleanup?.();
    };
  },
};

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [profileLoading, setProfileLoading] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    if (!user?.uid || !db) {
      setProfileLoading(false);
      setOnboardingCompleted(false);
      return;
    }
    const uid = user.uid;
    let active = true;
    setProfileLoading(true);

    // Seed from the last known answer so a slow or dead connection lands the
    // user where they were, rather than back in onboarding.
    void readCachedOnboarding(uid).then((cached) => {
      if (active && cached !== null) setOnboardingCompleted(cached);
    });

    // Hard ceiling on the launch gate. Firestore can neither resolve nor
    // reject on a wedged connection, and this screen previously waited on
    // that forever - the 2.1.0 rejection ("loading indefinitely on launch").
    // Whatever is known by now is good enough to render the app.
    const timeout = setTimeout(() => {
      if (active) setProfileLoading(false);
    }, PROFILE_GATE_TIMEOUT_MS);

    const unsubscribe = onSnapshot(
      doc(db, 'publicUsers', uid),
      (snap) => {
        const profile = snap.data();
        const hasExistingProfileBasics = Boolean(profile?.displayName && profile?.handle);
        const completed =
          profile?.onboardingCompleted !== false &&
          (Boolean(profile?.onboardingCompleted) || hasExistingProfileBasics);
        clearTimeout(timeout);
        if (!active) return;
        setOnboardingCompleted(completed);
        setProfileLoading(false);
        void cacheOnboarding(uid, completed);
      },
      () => {
        // An explicit error is an answer: fall through to onboarding, which is
        // recoverable, rather than holding the launch screen.
        clearTimeout(timeout);
        if (!active) return;
        setOnboardingCompleted(false);
        setProfileLoading(false);
      },
    );

    return () => {
      active = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user?.uid]);

  if (!isFirebaseConfigured() || firebaseInitError) {
    return <FirebaseConfigScreen />;
  }

  if (isLoading || (user && profileLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Opening Then...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        // Must happen after the container is ready, or screen transactions
        // are never attached and perf monitoring silently records nothing.
        navigationIntegration.registerNavigationContainer(navigationRef);
      }}
      linking={linking}
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
          primary: colors.primary,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.displayMedium, fontSize: 24 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : !onboardingCompleted ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabsNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="MomentDetail" component={MomentDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="RollSettings" component={RollSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="YourYear" component={YourYearScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LinkedMoment" component={LinkedMomentScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Invite" component={InviteScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notes" component={NotesScreen} options={{ headerShown: false, presentation: 'modal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
