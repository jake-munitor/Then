import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';

import { storage } from '../firebase/firebase';

async function uriToBlob(uri: string) {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Could not read the selected image.');
  return await res.blob();
}

export const MAX_MOMENT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_IMAGE_BYTES = 5 * 1024 * 1024;

function validateImage(blob: Blob, maxBytes: number) {
  const contentType = blob.type || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'].includes(contentType)) {
    throw new Error('Choose a JPEG, PNG, HEIC, or WebP image.');
  }
  if (blob.size > maxBytes) {
    throw new Error(`Image must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
  return contentType;
}

export async function uploadMomentPhoto(params: { uid: string; momentId: string; uri: string }) {
  if (!storage) throw new Error('Firebase Storage is not initialized.');
  const blob = await uriToBlob(params.uri);
  const contentType = validateImage(blob, MAX_MOMENT_IMAGE_BYTES);
  const objectRef = ref(storage, `users/${params.uid}/moments/${params.momentId}/image.jpg`);
  await uploadBytes(objectRef, blob, { contentType });
  return await getDownloadURL(objectRef);
}

export async function uploadAvatar(params: { uid: string; uri: string }) {
  if (!storage) throw new Error('Firebase Storage is not initialized.');
  const blob = await uriToBlob(params.uri);
  const contentType = validateImage(blob, MAX_AVATAR_IMAGE_BYTES);
  const objectRef = ref(storage, `users/${params.uid}/avatar/${Date.now()}.jpg`);
  await uploadBytes(objectRef, blob, { contentType });
  return await getDownloadURL(objectRef);
}

export async function deleteStoredFile(url: string | null | undefined) {
  if (!storage || !url) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (error: any) {
    if (error?.code !== 'storage/object-not-found') throw error;
  }
}

export async function deleteAvatarFiles(uid: string) {
  if (!storage) return;
  const result = await listAll(ref(storage, `users/${uid}/avatar`));
  await Promise.all(result.items.map((item) => deleteObject(item)));
}
