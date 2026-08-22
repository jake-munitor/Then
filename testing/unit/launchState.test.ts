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

  /**
   * The fourth 2.1.0 rejection. The gates were each bounded, but they ran in
   * SERIES: App.tsx returned early until fonts loaded, so AuthProvider and
   * AppNavigator didn't mount until then, and their own gates started after.
   * Worst case summed to 18s of spinner. The review device gave up at 14s and
   * its breadcrumbs showed no auth traffic at all.
   *
   * App.tsx must therefore render the provider tree unconditionally; fonts may
   * only ever be an overlay on top of the running app.
   */
  it('never gates the provider tree on fonts', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
    const providerIndex = source.indexOf('<AuthProvider>');
    expect(providerIndex).toBeGreaterThan(0);
    const body = source.slice(source.indexOf('function App()'), providerIndex);
    // Top-level `return (` statements sit at two-space indentation. Exactly one
    // is legitimate - the one that renders the provider tree. A second one is
    // an early return that serialises the launch gates again.
    const topLevelReturns = body.match(/\n  return\s*\(/g) ?? [];
    expect(topLevelReturns).toHaveLength(1);
  });

  /**
   * NavigationContainer awaits linking.getInitialURL before its first route
   * and renders nothing meanwhile, so that lookup must be bounded and the
   * container must have a fallback.
   */
  it('bounds the initial-URL lookup and gives the container a fallback', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/navigation/AppNavigator.tsx'),
      'utf8',
    );
    expect(source).toMatch(/INITIAL_URL_TIMEOUT_MS\s*=\s*\d+/);
    const getInitialUrl = source.slice(source.indexOf('async getInitialURL()'), source.indexOf('subscribe(listener)'));
    expect(getInitialUrl).toMatch(/withTimeout\(/);
    expect(source).toMatch(/<NavigationContainer[\s\S]*?fallback=/);
  });
});
