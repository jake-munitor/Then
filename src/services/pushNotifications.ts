import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { callFunction } from './cloudFunctions';
import { track } from './telemetry';

type NotificationsModule = typeof import('expo-notifications');

let notificationHandlerRegistered = false;
type NotificationURLListener = (url: string) => void;

async function loadNotifications(): Promise<NotificationsModule | null> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export function notificationDataToURL(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Record<string, unknown>;
  if (typeof payload.url === 'string' && payload.url.startsWith('then://')) {
    return payload.url;
  }
  if (payload.type === 'note' && typeof payload.momentId === 'string' && payload.momentId) {
    return `then://moments/${encodeURIComponent(payload.momentId)}/notes`;
  }
  return null;
}

export async function getLastNotificationURL() {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return notificationDataToURL(response?.notification.request.content.data);
}

export async function subscribeNotificationURLs(listener: NotificationURLListener) {
  const Notifications = await loadNotifications();
  if (!Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = notificationDataToURL(response.notification.request.content.data);
    if (url) {
      track('notification_opened');
      listener(url);
    }
  });
  return () => subscription.remove();
}

export async function setAppBadgeCount(count: number) {
  if (Platform.OS === 'web') return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => {});
}

export type PushPermission = 'granted' | 'undetermined' | 'denied';

/** Where iOS stands, without asking anything. */
export async function getPushPermission(): Promise<PushPermission> {
  if (Platform.OS === 'web') return 'denied';
  const Notifications = await loadNotifications();
  if (!Notifications) return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    return status === 'undetermined' ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * What to do about permission, given where iOS stands. Kept pure so the rule
 * is testable: the native module itself cannot be loaded under Jest.
 *  - 'register': already allowed, just register the token.
 *  - 'ask': show the system dialog (only ever when `prompt` was passed).
 *  - 'skip': do nothing. This is the answer on a plain app open for anyone
 *    who has not been asked yet, so the one-time dialog is never spent early.
 */
export function pushPermissionAction(status: string, prompt: boolean): 'register' | 'ask' | 'skip' {
  if (status === 'granted') return 'register';
  return prompt ? 'ask' : 'skip';
}

/**
 * Registers this device for pushes. By default it never shows the system
 * permission dialog - it only registers a token if permission was already
 * granted. Pass `prompt: true` to ask, and only from NotificationPrimer,
 * after the person has said yes to our own question (see pushPrimer.ts).
 */
export async function registerForPushNotifications(options: { prompt?: boolean } = {}) {
  if (Platform.OS === 'web') return;

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  if (!notificationHandlerRegistered) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        // While the app is open, the badge is owned by the unread-count sync
        // (setAppBadgeCount) - letting foreground pushes stamp it too caused
        // stale values that never cleared.
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerRegistered = true;
  }

  const existing = await Notifications.getPermissionsAsync();
  const action = pushPermissionAction(existing.status, Boolean(options.prompt));
  if (action === 'skip') return;
  const finalStatus = action === 'ask' ? (await Notifications.requestPermissionsAsync()).status : existing.status;
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  let timezone = '';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    timezone = '';
  }
  await callFunction('registerPushToken', { token, platform: Platform.OS, timezone });
}
