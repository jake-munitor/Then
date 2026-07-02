import {
  captureException,
  identifyUser,
  isAnalyticsConfigured,
  isSentryConfigured,
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
});
