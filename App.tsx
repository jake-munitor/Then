import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { PaperProvider } from 'react-native-paper';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
} from '@expo-google-fonts/playfair-display';
import { DancingScript_400Regular } from '@expo-google-fonts/dancing-script';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/store/AuthContext';
import { launchBreadcrumb, Sentry } from './src/services/telemetry';
import { colors } from './src/theme/colors';
import { appTheme } from './src/theme/theme';

/**
 * Fonts are bundled, so they load in well under a second. This is the longest
 * the overlay may cover the already-running app before we show it in system
 * fonts instead; the custom faces swap in whenever they arrive.
 */
const FONT_OVERLAY_MAX_MS = 1500;

function App() {
  const [loaded, fontError] = useFonts({
    HankenGrotesk_400Regular: require('./assets/fonts/HankenGrotesk_400Regular.ttf'),
    HankenGrotesk_500Medium: require('./assets/fonts/HankenGrotesk_500Medium.ttf'),
    HankenGrotesk_600SemiBold: require('./assets/fonts/HankenGrotesk_600SemiBold.ttf'),
    HankenGrotesk_700Bold: require('./assets/fonts/HankenGrotesk_700Bold.ttf'),
    Newsreader_400Regular: require('./assets/fonts/Newsreader_400Regular.ttf'),
    Newsreader_400Regular_Italic: require('./assets/fonts/Newsreader_400Regular_Italic.ttf'),
    Newsreader_500Medium: require('./assets/fonts/Newsreader_500Medium.ttf'),
    Newsreader_500Medium_Italic: require('./assets/fonts/Newsreader_500Medium_Italic.ttf'),
    ThenScript_400Regular: require('./assets/fonts/Caveat_400Regular.ttf'),
    ThenScript_500Medium: require('./assets/fonts/Caveat_500Medium.ttf'),
    ThenScript_700Bold: require('./assets/fonts/Caveat_700Bold.ttf'),
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    ThenSignature_400Regular: DancingScript_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  // The font overlay sits ON TOP of the running app; it never gates it.
  //
  // Until build 26 this was an early return, so AuthProvider and AppNavigator
  // did not even mount until fonts finished - and each of those has its own
  // gate. Worst case stacked to fonts (8s) + auth (4s) + profile (6s) = 18s of
  // spinner with every timer working perfectly. The App Review device gave
  // up at 14s, four submissions running. Breadcrumbs from that device showed
  // no auth traffic at all: the provider had never mounted.
  //
  // Now every gate starts at t=0 and runs in parallel, so time-to-first-screen
  // is the slowest single gate, not the sum.
  const [fontWaitElapsed, setFontWaitElapsed] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setFontWaitElapsed(true), FONT_OVERLAY_MAX_MS);
    return () => clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (loaded) launchBreadcrumb('fonts loaded');
    else if (fontError) launchBreadcrumb('fonts failed, using system fonts', { message: String(fontError) });
  }, [loaded, fontError]);
  useEffect(() => {
    if (fontWaitElapsed && !loaded && !fontError) launchBreadcrumb('fonts still loading, overlay lifted');
  }, [fontWaitElapsed, loaded, fontError]);

  const showFontOverlay = !loaded && !fontError && !fontWaitElapsed;

  return (
    <PaperProvider theme={appTheme}>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="dark" />
      </AuthProvider>
      {showFontOverlay ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </PaperProvider>
  );
}

export default Sentry.wrap(App);
