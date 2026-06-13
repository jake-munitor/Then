import * as Notifications from 'expo-notifications';
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import type { AppNotification, ListenerErrorHandler } from './types';

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
  await Notifications.setBadgeCountAsync(0).catch(() => {});
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
