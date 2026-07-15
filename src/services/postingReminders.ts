import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

const REMINDER_TYPE = 'postingReminder';
const DAYS_TO_SCHEDULE = 7;

// Two quiet nudges a day. Copy stays in the app's voice: an invitation,
// never a streak or a guilt trip.
const SLOTS = [
  {
    hour: 11,
    minute: 30,
    title: 'a quiet nudge',
    body: "If today's given you a moment worth keeping, develop it.",
  },
  {
    hour: 19,
    minute: 30,
    title: 'before today slips away',
    body: 'One photo for the people you keep up with.',
  },
] as const;

async function loadNotifications(): Promise<NotificationsModule | null> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * The next DAYS_TO_SCHEDULE days of reminder times, skipping slots already in
 * the past and skipping the rest of today entirely when the user has already
 * posted - a nudge after sharing would read as nagging.
 */
export function computeReminderSlots(now: Date, postedToday: boolean, days = DAYS_TO_SCHEDULE) {
  const occurrences: Array<{ date: Date; title: string; body: string }> = [];
  for (let day = 0; day < days; day += 1) {
    for (const slot of SLOTS) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, slot.hour, slot.minute, 0, 0);
      if (date <= now) continue;
      if (postedToday && day === 0) continue;
      occurrences.push({ date, title: slot.title, body: slot.body });
    }
  }
  return occurrences;
}

let lastKnownEnabled: boolean | null = null;

/**
 * Cancel every scheduled posting reminder and, when enabled, schedule the
 * next week's worth. Never prompts for permission - reminders only arm for
 * users who already granted notifications via the push registration flow.
 */
export async function rearmPostingReminders(params: { enabled: boolean; postedToday: boolean }) {
  lastKnownEnabled = params.enabled;
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

    if (!params.enabled) return;

    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') return;

    await Promise.all(
      computeReminderSlots(new Date(), params.postedToday).map(({ date, title, body }) =>
        Notifications.scheduleNotificationAsync({
          content: { title, body, sound: false, data: { type: REMINDER_TYPE } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        }),
      ),
    );
  } catch {
    // Reminders are a nicety - never let scheduling break the calling flow.
  }
}

/**
 * Call right after the user shares a moment: silences the rest of today's
 * nudges using the enablement state from the most recent rearm, so a user
 * who turned reminders off is never re-armed by posting.
 */
export async function notePostedToday() {
  if (lastKnownEnabled === null) return;
  await rearmPostingReminders({ enabled: lastKnownEnabled, postedToday: true });
}
