import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
import { Sentry } from './src/services/telemetry';
import { colors } from './src/theme/colors';
import { appTheme } from './src/theme/theme';

const FONT_TIMEOUT_MS = 8000;

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

  // Never gate the app on fonts indefinitely. useFonts reports an error we
  // previously discarded, and a stalled load reported neither - either one
  // left this spinner on screen forever, the same shape as the launch hang
  // Apple rejected 1.0.1 for. Rendering in system fonts is far better than
  // rendering nothing.
  const [fontWaitElapsed, setFontWaitElapsed] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setFontWaitElapsed(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (!loaded && !fontError && !fontWaitElapsed) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <PaperProvider theme={appTheme}>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="dark" />
      </AuthProvider>
    </PaperProvider>
  );
}

export default Sentry.wrap(App);
