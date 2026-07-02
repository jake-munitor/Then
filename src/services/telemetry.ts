import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

type ConfigExtra = Record<string, string | undefined>;

const env = process.env as ConfigExtra;
const manifestExtra =
  (Constants.manifest as { extra?: ConfigExtra } | null | undefined)?.extra ?? {};
const extra = (Constants.expoConfig?.extra ?? manifestExtra ?? {}) as ConfigExtra;

function readConfig(key: string) {
  return env[key] ?? extra[key];
}

const SENTRY_DSN = readConfig('EXPO_PUBLIC_SENTRY_DSN');
const POSTHOG_API_KEY = readConfig('EXPO_PUBLIC_POSTHOG_API_KEY');
const POSTHOG_HOST = readConfig('EXPO_PUBLIC_POSTHOG_HOST') ?? 'https://us.i.posthog.com';

export const isSentryConfigured = Boolean(SENTRY_DSN);
export const isAnalyticsConfigured = Boolean(POSTHOG_API_KEY);

if (isSentryConfigured) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  });
}

const posthogClient = isAnalyticsConfigured
  ? new PostHog(POSTHOG_API_KEY as string, {
      host: POSTHOG_HOST,
      // Manual, flow-level events only - no autocapture, no session replay,
      // in keeping with the app's no-tracking product ethos.
      captureAppLifecycleEvents: false,
      enableSessionReplay: false,
      persistence: 'file',
    })
  : null;

/**
 * Deliberately small: one event per funnel step we actually want to see
 * (signup -> first moment -> first friend -> return), plus invite/notification
 * hooks. No content, no PII - see PRIVACY_SEMANTICS.md.
 */
export type TelemetryEvent =
  | 'sign_up_completed'
  | 'onboarding_completed'
  | 'moment_created'
  | 'follow_request_sent'
  | 'follow_request_approved'
  | 'invite_created'
  | 'invite_shared'
  | 'invite_redeemed'
  | 'notification_opened';

type TelemetryProperties = Record<string, string | number | boolean | null>;

export function track(event: TelemetryEvent, properties?: TelemetryProperties) {
  posthogClient?.capture(event, properties);
}

export function identifyUser(uid: string) {
  posthogClient?.identify(uid);
}

export function resetUser() {
  posthogClient?.reset();
}

export function captureException(error: unknown, context?: TelemetryProperties) {
  if (isSentryConfigured) Sentry.captureException(error, { extra: context });
  posthogClient?.captureException(error, context);
}

export { Sentry };
