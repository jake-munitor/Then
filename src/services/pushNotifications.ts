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

export async function registerForPushNotifications() {
  if (Platform.OS === 'web') return;

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  if (!notificationHandlerRegistered) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerRegistered = true;
  }

  const existing = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing.status === 'granted' ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  await callFunction('registerPushToken', { token, platform: Platform.OS });
}
