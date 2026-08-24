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

/**
 * Opens a Sentry transaction per screen navigation and closes it when the
 * screen renders, which is what turns `tracesSampleRate` into actual
 * per-screen timing. Without this registered against the NavigationContainer
 * (see AppNavigator), performance monitoring is enabled but almost nothing
 * generates a transaction.
 *
 * `enableTimeToInitialDisplay` is off by default in the SDK; it is the
 * measurement we actually care about - dispatch to first rendered frame.
 */
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

if (isSentryConfigured) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
    // Merged with the SDK defaults, not a replacement for them.
    integrations: [navigationIntegration],
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

/**
 * One breadcrumb per launch-gate transition (fonts, auth, profile, initial
 * URL, navigation ready). The fourth 2.1.0 rejection was diagnosed entirely
 * from breadcrumbs on the review device; these make the next one diagnosable
 * in a single look rather than by inference from what is absent.
 */
const launchLog: string[] = [];
const launchStartedAt = Date.now();

export function launchBreadcrumb(message: string, data?: Record<string, unknown>) {
  if (isSentryConfigured) Sentry.addBreadcrumb({ category: 'launch', level: 'info', message, data });
  // Mirrored locally so the launch watchdog screen can display the log even
  // when telemetry cannot leave the device - the build-26 repro iPad sent
  // nothing to Sentry across five stuck launches.
  const elapsed = ((Date.now() - launchStartedAt) / 1000).toFixed(1);
  launchLog.push(`${elapsed}s  ${message}${data ? ' ' + JSON.stringify(data) : ''}`);
  if (launchLog.length > 20) launchLog.shift();
}

export function getLaunchLog(): string[] {
  return [...launchLog];
}

export function captureException(error: unknown, context?: TelemetryProperties) {
  if (isSentryConfigured) Sentry.captureException(error, { extra: context });
  posthogClient?.captureException(error, context);
}

export { Sentry };
