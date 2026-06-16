import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { callFunction } from './cloudFunctions';
import type { FollowRequest, ListenerErrorHandler } from './types';

export function subscribeFollowing(uid: string, onChange: (uids: string[]) => void, onError?: ListenerErrorHandler) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, 'users', uid, 'following'), orderBy('approvedAt', 'desc')),
    (snap) => onChange(snap.docs.map((followingDoc) => followingDoc.id)),
    onError,
  );
}

export function subscribeFollowers(uid: string, onChange: (uids: string[]) => void, onError?: ListenerErrorHandler) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, 'users', uid, 'followers'), orderBy('approvedAt', 'desc')),
    (snap) => onChange(snap.docs.map((followerDoc) => followerDoc.id)),
    onError,
  );
}

export function subscribeFollowRequests(
  uid: string,
  onChange: (requests: FollowRequest[]) => void,
  onError?: ListenerErrorHandler,
) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, 'users', uid, 'followRequests'), orderBy('createdAt', 'desc')),
    (snap) => {
      onChange(
        snap.docs.map((requestDoc) => ({
          requesterUid: requestDoc.id,
          displayName: (requestDoc.data().displayName as string | null | undefined) ?? null,
          context: String(requestDoc.data().context ?? ''),
          createdAt: requestDoc.data().createdAt ?? null,
        })),
      );
    },
    onError,
  );
}

export function subscribeOutgoingFollowRequestIds(
  requesterUid: string,
  onChange: (targetUids: string[]) => void,
  onError?: ListenerErrorHandler,
) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, 'users', requesterUid, 'outgoingFollowRequests'), orderBy('createdAt', 'desc')),
    (snap) => onChange(snap.docs.map((requestDoc) => requestDoc.id)),
    onError,
  );
}

export function subscribeBlockedUserIds(uid: string, onChange: (uids: string[]) => void, onError?: ListenerErrorHandler) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, 'users', uid, 'blocks'), orderBy('createdAt', 'desc')),
    (snap) => onChange(snap.docs.map((blockedDoc) => blockedDoc.id)),
    onError,
  );
}

export async function requestFollow(params: {
  requesterUid: string;
  targetUid: string;
  displayName: string | null;
  context: string;
}) {
  if (!db) throw new Error('Firebase is not initialized.');
  const approved = await getDoc(doc(db, 'users', params.requesterUid, 'following', params.targetUid));
  if (approved.exists()) return;
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', params.targetUid, 'followRequests', params.requesterUid), {
    requesterUid: params.requesterUid,
    displayName: params.displayName ?? 'Then Friend',
    context: params.context.trim(),
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', params.requesterUid, 'outgoingFollowRequests', params.targetUid), {
    targetUid: params.targetUid,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function getPendingFollowRequestIds(requesterUid: string, targetUids: string[]) {
  if (!db || targetUids.length === 0) return [];
  const firestore = db;
  const uniqueTargets = Array.from(new Set(targetUids.filter((uid) => uid && uid !== requesterUid)));
  const snapshots = await Promise.all(
    uniqueTargets.map((targetUid) => getDoc(doc(firestore, 'users', targetUid, 'followRequests', requesterUid))),
  );

  return uniqueTargets.filter((_, index) => snapshots[index].exists());
}

export async function approveFollow(params: { ownerUid: string; requesterUid: string }) {
  await callFunction('approveFollowRequest', { requesterUid: params.requesterUid });
}

export async function declineFollow(params: { ownerUid: string; requesterUid: string }) {
  await callFunction('declineFollowRequest', { requesterUid: params.requesterUid });
}

export async function cancelFollowRequest(params: { requesterUid: string; targetUid: string }) {
  await callFunction('cancelFollowRequest', { targetUid: params.targetUid });
}

export async function removeFollow(params: { followerUid: string; targetUid: string }) {
  await callFunction('removeFriend', { targetUid: params.targetUid });
}

export async function blockUser(targetUid: string) {
  await callFunction('blockUser', { targetUid });
}

export async function unblockUser(targetUid: string) {
  await callFunction('unblockUser', { targetUid });
}

export async function reportUser(params: { targetUid: string; reason: string; context: string }) {
  await callFunction('reportUser', params);
}
