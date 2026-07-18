import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import type { AppNotification, ListenerErrorHandler, NotificationPreferences } from './types';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notes: true,
  followRequests: true,
  friendApprovals: true,
  wander: false,
  reminders: true,
  friendMoments: true,
};

function preferencesFromData(data: any): NotificationPreferences {
  const raw = data?.notificationPreferences ?? {};
  return {
    notes: typeof raw.notes === 'boolean' ? raw.notes : DEFAULT_NOTIFICATION_PREFERENCES.notes,
    followRequests:
      typeof raw.followRequests === 'boolean' ? raw.followRequests : DEFAULT_NOTIFICATION_PREFERENCES.followRequests,
    friendApprovals:
      typeof raw.friendApprovals === 'boolean' ? raw.friendApprovals : DEFAULT_NOTIFICATION_PREFERENCES.friendApprovals,
    wander: typeof raw.wander === 'boolean' ? raw.wander : DEFAULT_NOTIFICATION_PREFERENCES.wander,
    reminders: typeof raw.reminders === 'boolean' ? raw.reminders : DEFAULT_NOTIFICATION_PREFERENCES.reminders,
    friendMoments:
      typeof raw.friendMoments === 'boolean' ? raw.friendMoments : DEFAULT_NOTIFICATION_PREFERENCES.friendMoments,
  };
}

export function subscribeNotifications(
  uid: string,
  onChange: (notifications: AppNotification[]) => void,
  onError?: ListenerErrorHandler,
) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc')),
    (snap) =>
      onChange(
        snap.docs.map((notificationDoc) => {
          const data = notificationDoc.data();
          return {
            id: notificationDoc.id,
            type: 'note',
            actorUid: String(data.actorUid ?? ''),
            momentId: String(data.momentId ?? ''),
            noteId: String(data.noteId ?? ''),
            frontText: String(data.frontText ?? ''),
            text: String(data.text ?? ''),
            readAt: data.readAt ?? null,
            createdAt: data.createdAt ?? null,
          };
        }),
      ),
    onError,
  );
}

export async function markAllNotificationsRead(uid: string) {
  if (!db) return;
  const snap = await getDocs(collection(db, 'users', uid, 'notifications'));
  const unread = snap.docs.filter((item) => !item.data().readAt);
  if (!unread.length) return;
  const batch = writeBatch(db);
  unread.forEach((item) => batch.update(item.ref, { readAt: serverTimestamp() }));
  await batch.commit();
}

export async function markMomentNotificationsRead(uid: string, momentId: string) {
  if (!db) return;
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'notifications'), where('momentId', '==', momentId)),
  );
  const unread = snap.docs.filter((item) => !item.data().readAt);
  if (!unread.length) return;
  const batch = writeBatch(db);
  unread.forEach((item) => batch.update(item.ref, { readAt: serverTimestamp() }));
  await batch.commit();
}

export function subscribeNotificationPreferences(
  uid: string,
  onChange: (preferences: NotificationPreferences) => void,
  onError?: ListenerErrorHandler,
) {
  if (!db) {
    onChange(DEFAULT_NOTIFICATION_PREFERENCES);
    return () => {};
  }

  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onChange(preferencesFromData(snap.data())),
    onError,
  );
}

export async function updateNotificationPreferences(uid: string, preferences: NotificationPreferences) {
  if (!db) throw new Error('Firebase is not initialized.');
  await setDoc(
    doc(db, 'users', uid),
    {
      notificationPreferences: preferences,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
