import AsyncStorage from '@react-native-async-storage/async-storage';

import { getPushPermission } from './pushNotifications';

/**
 * When to ask for notification permission.
 *
 * The app used to ask the moment the main tabs first opened - before a new
 * person had a friend or a post, so there was nothing a notification could
 * be about. iOS shows its permission dialog once; a "Don't Allow" there is
 * permanent. Now the question waits for a reason to exist (a first friend, a
 * first moment), and our own dialog comes first so "Not now" costs nothing.
 */
export type NotificationReason = 'first-moment' | 'friend';

type Listener = (reason: NotificationReason) => void;

const listeners = new Set<Listener>();

const SNOOZE_KEY = 'then.pushPrimer.snoozedAt';
/** After "Not now", stay quiet this long before offering again. */
export const PRIMER_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/** Called by services at the moments a notification becomes useful. */
export function suggestNotifications(reason: NotificationReason) {
  listeners.forEach((listener) => listener(reason));
}

export function subscribeNotificationSuggestions(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True only if iOS has never been asked and the person hasn't just said "Not now". */
export async function shouldOfferNotifications(now = Date.now()): Promise<boolean> {
  if ((await getPushPermission()) !== 'undetermined') return false;
  try {
    const snoozedAt = Number(await AsyncStorage.getItem(SNOOZE_KEY));
    if (Number.isFinite(snoozedAt) && snoozedAt > 0 && now - snoozedAt < PRIMER_SNOOZE_MS) return false;
  } catch {
    // Unreadable storage: offering once more is the harmless direction.
  }
  return true;
}

export async function snoozeNotificationOffer(now = Date.now()) {
  try {
    await AsyncStorage.setItem(SNOOZE_KEY, String(now));
  } catch {
    // Worst case the offer shows again at the next trigger.
  }
}
