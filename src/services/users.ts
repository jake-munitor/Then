import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { callFunction } from './cloudFunctions';
import type { ListenerErrorHandler, ProfileVisibility, PublicUser } from './types';

function profileFromSnap(uid: string, data: Partial<PublicUser> | undefined): PublicUser {
  return {
    uid,
    displayName: data?.displayName ?? null,
    handle: data?.handle ?? null,
    avatarUrl: data?.avatarUrl ?? null,
    profileVisibility: data?.profileVisibility ?? 'private',
    appearInWander: Boolean(data?.appearInWander),
    onboardingCompleted: Boolean(data?.onboardingCompleted),
  };
}

function normalizeHandle(value: string | null) {
  return (value?.split('@')[0] ?? 'friend').toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function subscribePublicUsers(
  uids: string[],
  onChange: (users: Record<string, PublicUser>) => void,
  onError?: ListenerErrorHandler,
) {
  const unique = Array.from(new Set(uids.filter(Boolean)));
  if (!db || unique.length === 0) {
    onChange({});
    return () => {};
  }

  const firestore = db;
  const current: Record<string, PublicUser> = {};
  const unsubscribes = unique.map((uid) =>
    onSnapshot(
      doc(firestore, 'publicUsers', uid),
      (snap) => {
        const data = snap.data() as Partial<PublicUser> | undefined;
        current[uid] = profileFromSnap(uid, data);
        onChange({ ...current });
      },
      onError,
    ),
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

function searchText(user: PublicUser) {
  return `${user.displayName ?? ''} ${user.handle ?? ''}`.toLowerCase();
}

export function filterDiscoverableUsers(params: {
  users: PublicUser[];
  currentUid?: string | null;
  query: string;
}) {
  const queryText = params.query.trim().toLowerCase();

  return params.users
    .filter((publicUser) => {
      if (!publicUser.uid || publicUser.uid === params.currentUid) {
        return false;
      }
      if (publicUser.profileVisibility !== 'public' && !publicUser.appearInWander) {
        return false;
      }

      return !queryText || searchText(publicUser).includes(queryText.replace(/^@/, ''));
    })
    .sort((left, right) => {
      const leftName = left.displayName ?? left.handle ?? '';
      const rightName = right.displayName ?? right.handle ?? '';
      return leftName.localeCompare(rightName);
    });
}

export function subscribeDiscoverableUsers(onChange: (users: PublicUser[]) => void, onError?: ListenerErrorHandler) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  const publicProfilesQuery = query(collection(db, 'publicUsers'), where('profileVisibility', '==', 'public'));
  return onSnapshot(
    publicProfilesQuery,
    (snap) => {
      onChange(
        snap.docs.map((publicDoc) => {
          const data = publicDoc.data() as Partial<PublicUser>;
          return profileFromSnap(publicDoc.id, data);
        }),
      );
    },
    onError,
  );
}

export async function ensurePublicUser(uid: string, fallback: { displayName: string | null; email: string | null }) {
  if (!db) throw new Error('Firebase is not initialized.');
  const publicRef = doc(db, 'publicUsers', uid);
  const snap = await getDoc(publicRef);
  if (snap.exists()) return;

  await setDoc(publicRef, {
    displayName: fallback.displayName ?? 'Then Friend',
    handle: normalizeHandle(fallback.displayName ?? fallback.email),
    avatarUrl: null,
    profileVisibility: 'private',
    appearInWander: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchPublicUser(uid: string) {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'publicUsers', uid));
  return snap.exists() ? profileFromSnap(snap.id, snap.data() as Partial<PublicUser>) : null;
}

export async function fetchPublicUserByHandle(rawHandle: string) {
  if (!db) return null;
  const handle = normalizeHandle(rawHandle);
  const handleSnap = await getDoc(doc(db, 'handles', handle));
  const uid = String(handleSnap.data()?.uid ?? '');
  return uid ? fetchPublicUser(uid) : null;
}

export async function updateThenSettings(params: {
  uid: string;
  displayName: string;
  handle: string;
  profileVisibility: ProfileVisibility;
  appearInWander: boolean;
  avatarUrl?: string | null;
  onboardingCompleted?: boolean;
}) {
  await callFunction('updateProfile', {
    displayName: params.displayName.trim(),
    handle: params.handle.trim(),
    profileVisibility: params.profileVisibility,
    appearInWander: params.appearInWander,
    avatarUrl: params.avatarUrl ?? undefined,
    onboardingCompleted: Boolean(params.onboardingCompleted),
  });
}
