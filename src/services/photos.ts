import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '../firebase/firebase';

async function uriToBlob(uri: string) {
  const res = await fetch(uri);
  return await res.blob();
}

export async function uploadMomentPhoto(params: { uid: string; momentId: string; uri: string }) {
  if (!storage) throw new Error('Firebase Storage is not initialized.');
  const blob = await uriToBlob(params.uri);
  const objectRef = ref(storage, `users/${params.uid}/moments/${params.momentId}/image.jpg`);
  await uploadBytes(objectRef, blob);
  return await getDownloadURL(objectRef);
}

export async function uploadAvatar(params: { uid: string; uri: string }) {
  if (!storage) throw new Error('Firebase Storage is not initialized.');
  const blob = await uriToBlob(params.uri);
  const objectRef = ref(storage, `users/${params.uid}/avatar/${Date.now()}.jpg`);
  await uploadBytes(objectRef, blob);
  return await getDownloadURL(objectRef);
}
