import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { deleteAvatarFiles, deleteStoredFile } from './photos';

async function deleteReferences(references: DocumentReference[]) {
  if (!db) throw new Error('Firebase is not initialized.');
  for (let index = 0; index < references.length; index += 400) {
    const batch = writeBatch(db);
    references.slice(index, index + 400).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
}

export async function deleteAccountData(uid: string) {
  if (!db) throw new Error('Firebase is not initialized.');

  const userRef = doc(db, 'users', uid);
  const publicUserRef = doc(db, 'publicUsers', uid);
  const [userSnap, publicUserSnap, momentsSnap, publicUsersSnap, followingSnap, followersSnap, requestsSnap, savedSnap, keptSnap] =
    await Promise.all([
      getDoc(userRef),
      getDoc(publicUserRef),
      getDocs(query(collection(db, 'moments'), where('authorUid', '==', uid))),
      getDocs(collection(db, 'publicUsers')),
      getDocs(collection(db, 'users', uid, 'following')),
      getDocs(collection(db, 'users', uid, 'followers')),
      getDocs(collection(db, 'users', uid, 'followRequests')),
      getDocs(collection(db, 'users', uid, 'saved')),
      getDocs(collection(db, 'users', uid, 'kept')),
    ]);

  const references: DocumentReference[] = [];
  const mediaUrls = new Set<string>();
  const avatarUrl = String(publicUserSnap.data()?.avatarUrl ?? userSnap.data()?.avatarUrl ?? '');
  if (avatarUrl) mediaUrls.add(avatarUrl);

  for (const momentDoc of momentsSnap.docs) {
    const [backSnap, keepsSnap, notesSnap] = await Promise.all([
      getDocs(collection(db, 'moments', momentDoc.id, 'back')),
      getDocs(collection(db, 'moments', momentDoc.id, 'keeps')),
      getDocs(collection(db, 'moments', momentDoc.id, 'notes')),
    ]);
    references.push(...backSnap.docs.map((item) => item.ref));
    references.push(...keepsSnap.docs.map((item) => item.ref));
    references.push(...notesSnap.docs.map((item) => item.ref));
    references.push(momentDoc.ref);
    const imageUrl = String(momentDoc.data().imageUrl ?? '');
    if (imageUrl) mediaUrls.add(imageUrl);
  }

  followingSnap.docs.forEach((item) => {
    references.push(item.ref);
    references.push(doc(db!, 'users', item.id, 'followers', uid));
  });
  followersSnap.docs.forEach((item) => {
    references.push(item.ref);
    references.push(doc(db!, 'users', item.id, 'following', uid));
  });
  requestsSnap.docs.forEach((item) => references.push(item.ref));
  savedSnap.docs.forEach((item) => references.push(item.ref));
  keptSnap.docs.forEach((item) => references.push(item.ref));

  publicUsersSnap.docs.forEach((profileDoc) => {
    if (profileDoc.id !== uid) {
      references.push(doc(db!, 'users', profileDoc.id, 'followRequests', uid));
    }
  });

  await deleteReferences(references);
  await Promise.all([deleteAvatarFiles(uid), ...Array.from(mediaUrls).map((url) => deleteStoredFile(url))]);
  await Promise.all([deleteDoc(publicUserRef), deleteDoc(userRef)]);
}
