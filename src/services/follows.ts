import {
  collection,
  deleteDoc,
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
import type { FollowRequest } from './types';

export function subscribeFollowing(uid: string, onChange: (uids: string[]) => void) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(query(collection(db, 'users', uid, 'following'), orderBy('approvedAt', 'desc')), (snap) => {
    onChange(snap.docs.map((followingDoc) => followingDoc.id));
  });
}

export function subscribeFollowers(uid: string, onChange: (uids: string[]) => void) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(query(collection(db, 'users', uid, 'followers'), orderBy('approvedAt', 'desc')), (snap) => {
    onChange(snap.docs.map((followerDoc) => followerDoc.id));
  });
}

export function subscribeFollowRequests(uid: string, onChange: (requests: FollowRequest[]) => void) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(query(collection(db, 'users', uid, 'followRequests'), orderBy('createdAt', 'desc')), (snap) => {
    onChange(
      snap.docs.map((requestDoc) => ({
        requesterUid: requestDoc.id,
        displayName: (requestDoc.data().displayName as string | null | undefined) ?? null,
        context: String(requestDoc.data().context ?? ''),
        createdAt: requestDoc.data().createdAt ?? null,
      })),
    );
  });
}

export async function requestFollow(params: {
  requesterUid: string;
  targetUid: string;
  displayName: string | null;
  context: string;
}) {
  if (!db) throw new Error('Firebase is not initialized.');
  await setDoc(doc(db, 'users', params.targetUid, 'followRequests', params.requesterUid), {
    requesterUid: params.requesterUid,
    displayName: params.displayName ?? 'Then Friend',
    context: params.context.trim(),
    createdAt: serverTimestamp(),
  });
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
  if (!db) throw new Error('Firebase is not initialized.');
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', params.ownerUid, 'followers', params.requesterUid), {
    uid: params.requesterUid,
    approvedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', params.requesterUid, 'following', params.ownerUid), {
    uid: params.ownerUid,
    approvedAt: serverTimestamp(),
  });
  batch.delete(doc(db, 'users', params.ownerUid, 'followRequests', params.requesterUid));
  await batch.commit();
}

export async function declineFollow(params: { ownerUid: string; requesterUid: string }) {
  if (!db) throw new Error('Firebase is not initialized.');
  await deleteDoc(doc(db, 'users', params.ownerUid, 'followRequests', params.requesterUid));
}
