import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

const REMINDER_TYPE = 'postingReminder';

async function loadNotifications(): Promise<NotificationsModule | null> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * Posting nudges are sent by the sendPostingNudges cloud function now
 * (activity-aware, timezone-based). This cleanup cancels the on-device
 * schedules that an earlier update created, so nobody gets both.
 */
export async function cancelLocalPostingReminders() {
  if (Platform.OS === 'web') return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((item) => item.content.data?.type === REMINDER_TYPE)
        .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
  } catch {
    // Best effort - stale local reminders stop rescheduling regardless.
  }
}
