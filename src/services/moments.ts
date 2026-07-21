import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { normalizePhotoFilter, type PhotoFilter } from '../utils/photoFilters';
import { callFunction } from './cloudFunctions';
import { uploadMomentPhoto } from './photos';
import { withSnapshotCache } from './snapshotCache';
import { track } from './telemetry';
import type { ListenerErrorHandler, Moment, MomentBack, Note } from './types';

function momentFromSnap(id: string, data: any): Moment {
  return {
    id,
    authorUid: String(data?.authorUid ?? ''),
    imageUrl: String(data?.imageUrl ?? ''),
    frontText: String(data?.frontText ?? ''),
    photoFilter: normalizePhotoFilter(data?.photoFilter),
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

export type MomentPageCursor = QueryDocumentSnapshot<DocumentData> | null;

export type MomentPage = {
  moments: Moment[];
  nextCursor: MomentPageCursor;
};

export type SavedMomentIdPage = {
  momentIds: string[];
  nextCursor: MomentPageCursor;
};

export async function fetchMomentsByAuthorPage(params: {
  authorUid: string;
  pageSize?: number;
  after?: MomentPageCursor;
}): Promise<MomentPage> {
  if (!db) return { moments: [], nextCursor: null };
  const constraints = [
    where('authorUid', '==', params.authorUid),
    orderBy('createdAt', 'desc'),
    limit(params.pageSize ?? 20),
  ];
  const pageQuery = params.after
    ? query(collection(db, 'moments'), ...constraints, startAfter(params.after))
    : query(collection(db, 'moments'), ...constraints);
  const snap = await getDocs(pageQuery);
  return {
    moments: snap.docs.map((momentDoc) => momentFromSnap(momentDoc.id, momentDoc.data())),
    nextCursor: snap.docs[snap.docs.length - 1] ?? null,
  };
}

export async function fetchWanderMomentPage(params: {
  pageSize?: number;
  after?: MomentPageCursor;
}): Promise<MomentPage> {
  if (!db) return { moments: [], nextCursor: null };
  const constraints = [
    where('appearInWander', '==', true),
    orderBy('createdAt', 'desc'),
    limit(params.pageSize ?? 20),
  ];
  const pageQuery = params.after
    ? query(collection(db, 'moments'), ...constraints, startAfter(params.after))
    : query(collection(db, 'moments'), ...constraints);
  const snap = await getDocs(pageQuery);
  return {
    moments: snap.docs.map((momentDoc) => momentFromSnap(momentDoc.id, momentDoc.data())),
    nextCursor: snap.docs[snap.docs.length - 1] ?? null,
  };
}

export async function fetchMomentById(momentId: string) {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'moments', momentId));
  return snap.exists() ? momentFromSnap(snap.id, snap.data()) : null;
}

export function subscribeMoment(
  momentId: string,
  onChange: (moment: Moment | null) => void,
  onError?: ListenerErrorHandler,
) {
  if (!db || !momentId) {
    onChange(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, 'moments', momentId),
    (snap) => onChange(snap.exists() ? momentFromSnap(snap.id, snap.data()) : null),
    onError,
  );
}

export async function fetchSavedMomentIdPage(params: {
  uid: string;
  pageSize?: number;
  after?: MomentPageCursor;
}): Promise<SavedMomentIdPage> {
  if (!db) return { momentIds: [], nextCursor: null };
  const constraints = [orderBy('savedAt', 'desc'), limit(params.pageSize ?? 20)];
  const pageQuery = params.after
    ? query(collection(db, 'users', params.uid, 'saved'), ...constraints, startAfter(params.after))
    : query(collection(db, 'users', params.uid, 'saved'), ...constraints);
  const snap = await getDocs(pageQuery);
  return {
    momentIds: snap.docs.map((savedDoc) => savedDoc.id),
    nextCursor: snap.docs[snap.docs.length - 1] ?? null,
  };
}

export function subscribeMomentsByAuthors(
  authorUids: string[],
  onChange: (moments: Moment[]) => void,
  onError?: ListenerErrorHandler,
  onPageInfo?: (cursor: MomentPageCursor) => void,
  pageSize = 50,
) {
  if (!db || authorUids.length === 0) {
    onChange([]);
    return () => {};
  }

  const unique = Array.from(new Set(authorUids));
  const emit = withSnapshotCache<Moment[]>(`momentsByAuthors:${[...unique].sort().join(',')}:${pageSize}`, onChange);
  const grouped = new Map<string, Moment[]>();
  const unsubscribes = unique.map((authorUid) => {
    const momentsQuery = query(
      collection(db!, 'moments'),
      where('authorUid', '==', authorUid),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    );
    return onSnapshot(
      momentsQuery,
      (snap) => {
        const docs = snap.docs;
        grouped.set(
          authorUid,
          docs.map((momentDoc) => momentFromSnap(momentDoc.id, momentDoc.data())),
        );
        if (unique.length === 1) onPageInfo?.(docs[docs.length - 1] ?? null);
        emit(sortMoments(Array.from(grouped.values()).flat()));
      },
      onError,
    );
  });

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

export function subscribeWanderMoments(
  onChange: (moments: Moment[]) => void,
  onError?: ListenerErrorHandler,
  onPageInfo?: (cursor: MomentPageCursor) => void,
) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  const emit = withSnapshotCache<Moment[]>('wanderMoments', onChange);
  const momentsQuery = query(
    collection(db, 'moments'),
    where('appearInWander', '==', true),
    orderBy('createdAt', 'desc'),
    limit(100),
  );
  return onSnapshot(
    momentsQuery,
    (snap) => {
      onPageInfo?.(snap.docs[snap.docs.length - 1] ?? null);
      emit(sortMoments(snap.docs.map((momentDoc) => momentFromSnap(momentDoc.id, momentDoc.data()))));
    },
    onError,
  );
}

export function subscribeSavedMomentIds(
  uid: string,
  onChange: (momentIds: string[]) => void,
  onError?: ListenerErrorHandler,
  onPageInfo?: (cursor: MomentPageCursor) => void,
) {
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
      onPageInfo?.(snap.docs[snap.docs.length - 1] ?? null);
      emit();
    },
    onError,
  );
  const unsubscribeLegacy = onSnapshot(
    query(collection(db, 'users', uid, 'kept'), orderBy('keptAt', 'desc')),
    (snap) => {
      legacyIds.clear();
      snap.docs.forEach((keptDoc) => legacyIds.add(keptDoc.id));
      emit();
    },
    onError,
  );

  return () => {
    unsubscribeSaved();
    unsubscribeLegacy();
  };
}

export function subscribeMomentsByIds(
  momentIds: string[],
  onChange: (moments: Moment[]) => void,
  onError?: ListenerErrorHandler,
) {
  if (!db || momentIds.length === 0) {
    onChange([]);
    return () => {};
  }

  const firestore = db;
  const current = new Map<string, Moment>();
  const unsubscribes = momentIds.map((momentId) =>
    onSnapshot(
      doc(firestore, 'moments', momentId),
      (snap) => {
        if (snap.exists()) current.set(momentId, momentFromSnap(snap.id, snap.data()));
        onChange(momentIds.map((id) => current.get(id)).filter(Boolean) as Moment[]);
      },
      onError,
    ),
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

export async function createMoment(params: {
  uid: string;
  uri: string;
  frontText: string;
  photoFilter: PhotoFilter;
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
    photoFilter: normalizePhotoFilter(params.photoFilter),
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
  track('moment_created', { photoFilter: normalizePhotoFilter(params.photoFilter), appearInWander: params.appearInWander });
  return momentRef.id;
}

export async function saveMomentBack(params: { momentId: string; uid: string; text: string }) {
  if (!db) throw new Error('Firebase is not initialized.');
  const momentRef = doc(db, 'moments', params.momentId);
  const momentSnap = await getDoc(momentRef);
  if (!momentSnap.exists() || String(momentSnap.data().authorUid ?? '') !== params.uid) {
    throw new Error('Only the person who shared this moment can edit its reflection.');
  }

  const text = params.text.trim();
  const backRef = doc(db, 'moments', params.momentId, 'back', 'details');
  if (!text) {
    await deleteDoc(backRef);
    return;
  }

  await setDoc(
    backRef,
    {
      text,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteMoment(params: { momentId: string; uid: string }) {
  await callFunction('deleteMoment', { momentId: params.momentId });
}

export function subscribeMomentBack(
  momentId: string,
  onChange: (back: MomentBack | null) => void,
  onError?: ListenerErrorHandler,
) {
  if (!db) {
    onChange(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'moments', momentId, 'back', 'details'),
    (snap) => onChange(snap.exists() ? ({ text: String(snap.data()?.text ?? '') } as MomentBack) : null),
    onError,
  );
}

export function subscribeMomentKeep(
  params: { momentId: string; uid: string },
  onChange: (kept: boolean) => void,
  onError?: ListenerErrorHandler,
) {
  if (!db) {
    onChange(false);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'moments', params.momentId, 'keeps', params.uid),
    (snap) => onChange(snap.exists()),
    onError,
  );
}

export async function toggleKeep(params: { momentId: string; authorUid: string; uid: string; currentlyKept: boolean }) {
  await callFunction('toggleKeep', { momentId: params.momentId });
}

export function subscribeMomentSaved(
  params: { momentId: string; uid: string },
  onChange: (saved: boolean) => void,
  onError?: ListenerErrorHandler,
) {
  if (!db) {
    onChange(false);
    return () => {};
  }

  let saved = false;
  let legacySaved = false;
  const emit = () => onChange(saved || legacySaved);
  const unsubscribeSaved = onSnapshot(
    doc(db, 'users', params.uid, 'saved', params.momentId),
    (snap) => {
      saved = snap.exists();
      emit();
    },
    onError,
  );
  const unsubscribeLegacy = onSnapshot(
    doc(db, 'users', params.uid, 'kept', params.momentId),
    (snap) => {
      legacySaved = snap.exists();
      emit();
    },
    onError,
  );

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

export function subscribeNotes(momentId: string, onChange: (notes: Note[]) => void, onError?: ListenerErrorHandler) {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const notesQuery = query(collection(db, 'moments', momentId, 'notes'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    notesQuery,
    (snap) => {
      onChange(
        snap.docs.map((noteDoc) => ({
          id: noteDoc.id,
          authorUid: String(noteDoc.data().authorUid ?? ''),
          text: String(noteDoc.data().text ?? ''),
          createdAt: noteDoc.data().createdAt ?? null,
        })),
      );
    },
    onError,
  );
}

export async function addNote(params: { momentId: string; uid: string; text: string }) {
  const text = params.text.trim();
  if (!text) return;
  await callFunction('addNote', { momentId: params.momentId, text });
}
