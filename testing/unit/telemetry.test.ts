import * as Sentry from '@sentry/react-native';

import {
  captureException,
  identifyUser,
  isAnalyticsConfigured,
  isSentryConfigured,
  navigationIntegration,
  resetUser,
  track,
} from '../../src/services/telemetry';

describe('telemetry', () => {
  it('is unconfigured without env vars and every call is a safe no-op', () => {
    expect(isSentryConfigured).toBe(false);
    expect(isAnalyticsConfigured).toBe(false);
    expect(() => track('moment_created')).not.toThrow();
    expect(() => identifyUser('user-1')).not.toThrow();
    expect(() => resetUser()).not.toThrow();
    expect(() => captureException(new Error('boom'))).not.toThrow();
  });

  // Screen timing fails silently: drop the integration or the time-to-initial-display
  // flag and Sentry still boots, still reports crashes, and simply records no screen
  // transactions. Assert the wiring exists so it cannot disappear unnoticed.
  it('builds a navigation integration that measures time to initial display', () => {
    expect(Sentry.reactNavigationIntegration).toHaveBeenCalledWith(
      expect.objectContaining({ enableTimeToInitialDisplay: true }),
    );
    expect(typeof navigationIntegration.registerNavigationContainer).toBe('function');
  });
});
