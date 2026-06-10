import { MD3LightTheme, configureFonts } from 'react-native-paper';

import { colors } from './colors';
import { fonts } from './fonts';

export const appTheme = {
  ...MD3LightTheme,
  roundness: 6,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.ink,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceWarm,
    outline: colors.border,
    outlineVariant: colors.border,
    error: colors.error,
    onPrimary: colors.paper,
    onBackground: colors.textPrimary,
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
  },
  fonts: configureFonts({
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
};
