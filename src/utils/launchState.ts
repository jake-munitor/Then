import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Remembers whether a signed-in user has finished onboarding, so the launch
 * gate can proceed even when Firestore never answers.
 *
 * Apple rejected 1.0.1 (2.1.0, "App was loading indefinitely on launch"):
 * AppNavigator gated the whole app on a `publicUsers` snapshot that had no
 * timeout, so a connection that neither resolved nor errored left the app on
 * "Opening Then..." forever. A timeout alone would fix the hang but drop a
 * returning user into onboarding, so the last known answer is cached here.
 */
const KEY_PREFIX = 'then.onboardingCompleted.';

export async function readCachedOnboarding(uid: string): Promise<boolean | null> {
  try {
    const value = await AsyncStorage.getItem(KEY_PREFIX + uid);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

export async function cacheOnboarding(uid: string, completed: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + uid, completed ? 'true' : 'false');
  } catch {
    // A missing cache only costs a slower launch on the next cold start.
  }
}
