import fs from 'fs';
import path from 'path';

import { cacheOnboarding, readCachedOnboarding } from '../../src/utils/launchState';

describe('launch gate', () => {
  it('round-trips the cached onboarding answer per user', async () => {
    expect(await readCachedOnboarding('user-1')).toBeNull();
    await cacheOnboarding('user-1', true);
    expect(await readCachedOnboarding('user-1')).toBe(true);
    await cacheOnboarding('user-1', false);
    expect(await readCachedOnboarding('user-1')).toBe(false);
    // Cached per uid, so switching accounts never inherits the wrong answer.
    expect(await readCachedOnboarding('user-2')).toBeNull();
  });

  /**
   * Apple rejected 1.0.1 under 2.1.0 - "App was loading indefinitely on
   * launch". AppNavigator gated the entire app on a publicUsers snapshot with
   * no timeout, so a Firestore connection that neither resolved nor errored
   * held the launch screen forever. Every launch gate must be time-bounded;
   * this asserts the ceiling still exists.
   */
  it('bounds the profile gate with a timeout', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/navigation/AppNavigator.tsx'),
      'utf8',
    );
    expect(source).toMatch(/PROFILE_GATE_TIMEOUT_MS\s*=\s*\d+/);
    // The gate must be released by a timer, not only by snapshot callbacks.
    expect(source).toMatch(/setTimeout\([\s\S]*?setProfileLoading\(false\)[\s\S]*?PROFILE_GATE_TIMEOUT_MS/);
  });
});
