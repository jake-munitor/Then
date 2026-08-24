import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
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
import { captureException, getLaunchLog, launchBreadcrumb, Sentry } from './src/services/telemetry';
import { colors } from './src/theme/colors';
import { appTheme } from './src/theme/theme';

/**
 * Fonts are bundled, so they load in well under a second. This is the longest
 * the overlay may cover the already-running app before we show it in system
 * fonts instead; the custom faces swap in whenever they arrive.
 */
const FONT_OVERLAY_MAX_MS = 1500;

/**
 * Launch watchdog. Every individual gate below is bounded, so the first route
 * should render within ~6s on any network. If it has not by this point, the
 * cause is something not yet imagined - and the one outcome that must never
 * happen is an indefinite spinner. Show a real screen with a retry instead,
 * and report it with the launch breadcrumbs attached so the cause is visible.
 */
const LAUNCH_WATCHDOG_MS = 10000;

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

  const [navigationReady, setNavigationReady] = useState(false);
  const [launchStalled, setLaunchStalled] = useState(false);
  const [treeKey, setTreeKey] = useState(0);
  useEffect(() => {
    if (navigationReady) return;
    const timeout = setTimeout(() => {
      setLaunchStalled(true);
      captureException(new Error('Launch watchdog: no route rendered'), { afterMs: LAUNCH_WATCHDOG_MS });
    }, LAUNCH_WATCHDOG_MS);
    return () => clearTimeout(timeout);
  }, [navigationReady, treeKey]);

  const retryLaunch = () => {
    launchBreadcrumb('launch retry requested');
    setLaunchStalled(false);
    setNavigationReady(false);
    // Remounting the provider tree restarts every gate from scratch.
    setTreeKey((current) => current + 1);
  };

  return (
    <PaperProvider theme={appTheme}>
      <AuthProvider key={treeKey}>
        <AppNavigator onReady={() => setNavigationReady(true)} />
        <StatusBar style="dark" />
      </AuthProvider>
      {launchStalled && !navigationReady ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, backgroundColor: colors.background },
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 18, textAlign: 'center' }}>
            Then is taking longer than usual to open.
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
            Check your connection, then try again.
          </Text>
          <Pressable
            onPress={retryLaunch}
            accessibilityRole="button"
            style={{ marginTop: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, backgroundColor: colors.primary }}
          >
            <Text style={{ color: colors.white, fontSize: 15 }}>Try again</Text>
          </Pressable>
          {/* On-screen launch log: readable and screenshottable even when
              telemetry cannot leave the device. */}
          <View style={{ marginTop: 18, alignSelf: 'stretch' }}>
            {getLaunchLog().map((line, index) => (
              <Text key={index} style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Courier', textAlign: 'left' }}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
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
