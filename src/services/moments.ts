import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { uploadMomentPhoto } from './photos';
import type { Moment, MomentBack, Note } from './types';

function momentFromSnap(id: string, data: any): Moment {
  return {
    id,
    authorUid: String(data?.authorUid ?? ''),
    imageUrl: String(data?.imageUrl ?? ''),
    frontText: String(data?.frontText ?? ''),
    memoryDate: String(data?.memoryDate ?? ''),
    keptCount: Number(data?.keptCount ?? 0),
    noteCount: Number(data?.noteCount ?? 0),
    appearInWander: Boolean(data?.appearInWander),
    createdAt: data?.createdAt ?? null,
  };
}

function sortMoments(moments: Moment[]) {
  return moments.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export function subscribeMomentsByAuthors(authorUids: string[], onChange: (moments: Moment[]) => void) {
  if (!db || authorUids.length === 0) {
    onChange([]);
    return () => {};
  }

  const unique = Array.from(new Set(authorUids));
  const grouped = new Map<string, Moment[]>();
  const unsubscribes = unique.map((authorUid) => {
    const momentsQuery = query(
      collection(db!, 'moments'),
      where('authorUid', '==', authorUid),
      limit(50),
    );
    return onSnapshot(momentsQuery, (snap) => {
      grouped.set(
        authorUid,
        snap.docs.map((momentDoc) => momentFromSnap(momentDoc.id, momentDoc.data())),
      );
      onChange(sortMoments(Array.from(grouped.values()).flat()));
    });
  });

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

export function subscribeWanderMoments(onChange: (moments: Moment[]) => void) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  const momentsQuery = query(
    collection(db, 'moments'),
    where('appearInWander', '==', true),
    limit(100),
  );
  return onSnapshot(momentsQuery, (snap) => {
    onChange(sortMoments(snap.docs.map((momentDoc) => momentFromSnap(momentDoc.id, momentDoc.data()))));
  });
}

export function subscribeSavedMomentIds(uid: string, onChange: (momentIds: string[]) => void) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  const savedIds = new Set<string>();
  const legacyIds = new Set<string>();
  const emit = () => onChange(Array.from(new Set([...savedIds, ...legacyIds])));

  const unsubscribeSaved = onSnapshot(
    query(collection(db, 'users', uid, 'saved'), orderBy('savedAt', 'desc')),
    (snap) => {
      savedIds.clear();
      snap.docs.forEach((savedDoc) => savedIds.add(savedDoc.id));
      emit();
    },
  );
  const unsubscribeLegacy = onSnapshot(
    query(collection(db, 'users', uid, 'kept'), orderBy('keptAt', 'desc')),
    (snap) => {
      legacyIds.clear();
      snap.docs.forEach((keptDoc) => legacyIds.add(keptDoc.id));
      emit();
    },
  );

  return () => {
    unsubscribeSaved();
    unsubscribeLegacy();
  };
}

export function subscribeMomentsByIds(momentIds: string[], onChange: (moments: Moment[]) => void) {
  if (!db || momentIds.length === 0) {
    onChange([]);
    return () => {};
  }

  const firestore = db;
  const current = new Map<string, Moment>();
  const unsubscribes = momentIds.map((momentId) =>
    onSnapshot(doc(firestore, 'moments', momentId), (snap) => {
      if (snap.exists()) current.set(momentId, momentFromSnap(snap.id, snap.data()));
      onChange(momentIds.map((id) => current.get(id)).filter(Boolean) as Moment[]);
    }),
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

export async function createMoment(params: {
  uid: string;
  uri: string;
  frontText: string;
  backText: string;
  memoryDate: string;
  appearInWander: boolean;
}) {
  if (!db) throw new Error('Firebase is not initialized.');
  const momentRef = doc(collection(db, 'moments'));
  const imageUrl = await uploadMomentPhoto({ uid: params.uid, momentId: momentRef.id, uri: params.uri });
  await setDoc(momentRef, {
    authorUid: params.uid,
    imageUrl,
    frontText: params.frontText.trim(),
    memoryDate: params.memoryDate,
    keptCount: 0,
    noteCount: 0,
    appearInWander: params.appearInWander,
    createdAt: serverTimestamp(),
  });
  if (params.backText.trim()) {
    await setDoc(doc(db, 'moments', momentRef.id, 'back', 'details'), {
      text: params.backText.trim(),
      createdAt: serverTimestamp(),
    });
  }
  return momentRef.id;
}

export async function deleteMoment(params: { momentId: string; uid: string }) {
  if (!db) throw new Error('Firebase is not initialized.');

  const momentRef = doc(db, 'moments', params.momentId);
  const momentSnap = await getDoc(momentRef);
  if (!momentSnap.exists()) return;
  if (String(momentSnap.data().authorUid ?? '') !== params.uid) {
    throw new Error('Only the person who shared this moment can delete it.');
  }

  const batch = writeBatch(db);
  const [backSnap, keepsSnap, notesSnap] = await Promise.all([
    getDocs(collection(db, 'moments', params.momentId, 'back')),
    getDocs(collection(db, 'moments', params.momentId, 'keeps')),
    getDocs(collection(db, 'moments', params.momentId, 'notes')),
  ]);

  backSnap.docs.forEach((detailDoc) => batch.delete(detailDoc.ref));
  keepsSnap.docs.forEach((keepDoc) => batch.delete(keepDoc.ref));
  notesSnap.docs.forEach((noteDoc) => batch.delete(noteDoc.ref));
  batch.delete(momentRef);

  await batch.commit();
}

export function subscribeMomentBack(momentId: string, onChange: (back: MomentBack | null) => void) {
  if (!db) {
    onChange(null);
    return () => {};
  }
  return onSnapshot(doc(db, 'moments', momentId, 'back', 'details'), (snap) => {
    onChange(snap.exists() ? ({ text: String(snap.data()?.text ?? '') } as MomentBack) : null);
  });
}

export function subscribeMomentKeep(params: { momentId: string; uid: string }, onChange: (kept: boolean) => void) {
  if (!db) {
    onChange(false);
    return () => {};
  }
  return onSnapshot(doc(db, 'moments', params.momentId, 'keeps', params.uid), (snap) => {
    onChange(snap.exists());
  });
}

export async function toggleKeep(params: { momentId: string; authorUid: string; uid: string; currentlyKept: boolean }) {
  if (!db) throw new Error('Firebase is not initialized.');
  const keepRef = doc(db, 'moments', params.momentId, 'keeps', params.uid);
  const momentRef = doc(db, 'moments', params.momentId);

  if (params.currentlyKept) {
    await deleteDoc(keepRef);
    await updateDoc(momentRef, { keptCount: increment(-1) });
    return;
  }

  const existing = await getDoc(keepRef);
  if (existing.exists()) return;
  await setDoc(keepRef, { uid: params.uid, createdAt: serverTimestamp() });
  await updateDoc(momentRef, { keptCount: increment(1) });
}

export function subscribeMomentSaved(params: { momentId: string; uid: string }, onChange: (saved: boolean) => void) {
  if (!db) {
    onChange(false);
    return () => {};
  }

  let saved = false;
  let legacySaved = false;
  const emit = () => onChange(saved || legacySaved);
  const unsubscribeSaved = onSnapshot(doc(db, 'users', params.uid, 'saved', params.momentId), (snap) => {
    saved = snap.exists();
    emit();
  });
  const unsubscribeLegacy = onSnapshot(doc(db, 'users', params.uid, 'kept', params.momentId), (snap) => {
    legacySaved = snap.exists();
    emit();
  });

  return () => {
    unsubscribeSaved();
    unsubscribeLegacy();
  };
}

export async function toggleSave(params: {
  momentId: string;
  authorUid: string;
  uid: string;
  currentlySaved: boolean;
}) {
  if (!db) throw new Error('Firebase is not initialized.');
  const savedRef = doc(db, 'users', params.uid, 'saved', params.momentId);
  const legacySavedRef = doc(db, 'users', params.uid, 'kept', params.momentId);

  if (params.currentlySaved) {
    await Promise.all([deleteDoc(savedRef), deleteDoc(legacySavedRef)]);
    return;
  }

  await setDoc(savedRef, {
    momentId: params.momentId,
    authorUid: params.authorUid,
    savedAt: serverTimestamp(),
  });
}

export function subscribeNotes(momentId: string, onChange: (notes: Note[]) => void) {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const notesQuery = query(collection(db, 'moments', momentId, 'notes'), orderBy('createdAt', 'asc'));
  return onSnapshot(notesQuery, (snap) => {
    onChange(
      snap.docs.map((noteDoc) => ({
        id: noteDoc.id,
        authorUid: String(noteDoc.data().authorUid ?? ''),
        text: String(noteDoc.data().text ?? ''),
        createdAt: noteDoc.data().createdAt ?? null,
      })),
    );
  });
}

export async function addNote(params: { momentId: string; uid: string; text: string }) {
  if (!db) throw new Error('Firebase is not initialized.');
  const text = params.text.trim();
  if (!text) return;
  await addDoc(collection(db, 'moments', params.momentId, 'notes'), {
    authorUid: params.uid,
    text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'moments', params.momentId), {
    noteCount: increment(1),
  });
}
