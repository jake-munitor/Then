import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { DefaultTheme, NavigationContainer, type LinkingOptions } from '@react-navigation/native';
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
import LinkedMomentScreen from '../screens/LinkedMomentScreen';
import MomentDetailScreen from '../screens/MomentDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RollSettingsScreen from '../screens/RollSettingsScreen';
import YourYearScreen from '../screens/YourYearScreen';
import { getLastNotificationURL, subscribeNotificationURLs } from '../services/pushNotifications';
import TabsNavigator from './TabsNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['then://', 'https://then.app'],
  config: {
    screens: {
      MainTabs: '',
      Profile: 'profile/:handle',
      LinkedMoment: 'moments/:momentId/notes',
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) return url;
    return getLastNotificationURL();
  },
  subscribe(listener) {
    const linkSubscription = Linking.addEventListener('url', ({ url }) => listener(url));
    let notificationCleanup: (() => void) | undefined;
    subscribeNotificationURLs(listener).then((cleanup) => {
      notificationCleanup = cleanup;
    });

    return () => {
      linkSubscription.remove();
      notificationCleanup?.();
    };
  },
};

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);
  const [profileLoading, setProfileLoading] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    if (!user?.uid || !db) {
      setProfileLoading(false);
      setOnboardingCompleted(false);
      return;
    }
    setProfileLoading(true);
    return onSnapshot(
      doc(db, 'publicUsers', user.uid),
      (snap) => {
        const profile = snap.data();
        const hasExistingProfileBasics = Boolean(profile?.displayName && profile?.handle);
        setOnboardingCompleted(profile?.onboardingCompleted !== false && (Boolean(profile?.onboardingCompleted) || hasExistingProfileBasics));
        setProfileLoading(false);
      },
      () => {
        setOnboardingCompleted(false);
        setProfileLoading(false);
      },
    );
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
            <Stack.Screen name="YourYear" component={YourYearScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LinkedMoment" component={LinkedMomentScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notes" component={NotesScreen} options={{ headerShown: false, presentation: 'modal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
