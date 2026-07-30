import { MD3LightTheme, configureFonts } from 'react-native-paper';

import { colors } from './colors';
import { fonts } from './fonts';

export const appTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.ink,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceInset,
    outline: colors.border,
    outlineVariant: colors.borderInset,
    error: colors.error,
    onPrimary: colors.white,
    onBackground: colors.textPrimary,
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
  },
  fonts: {
    ...configureFonts({
    config: {
      ...MD3LightTheme.fonts,
      bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: fonts.bodyRegular },
      bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: fonts.bodyRegular },
      bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: fonts.bodyRegular },
      labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: fonts.bodySemiBold },
      labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: fonts.bodyMedium },
      labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: fonts.bodyMedium },
      titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: fonts.displayMedium },
      titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: fonts.displayMedium },
      titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: fonts.bodySemiBold },
      headlineSmall: { ...MD3LightTheme.fonts.headlineSmall, fontFamily: fonts.displayMedium },
      headlineMedium: { ...MD3LightTheme.fonts.headlineMedium, fontFamily: fonts.displayMedium },
    },
    }),
    // Paper falls back to `default` for any <Text> without a `variant` - most
    // of the app's error lines and dialog bodies. Left unset it stays MD3's
    // 'System', so those silently render in the OS face beside our own fonts.
    // Patched after configureFonts because `default` has no fontSize/lineHeight
    // and so doesn't satisfy the sized-variant config type.
    default: { ...MD3LightTheme.fonts.default, fontFamily: fonts.bodyRegular },
  },
};
