import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';

import { auth, storage } from '../firebase/firebase';

async function uriToBlob(uri: string) {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Could not read the selected image.');
  return await res.blob();
}

export const MAX_MOMENT_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_AVATAR_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
const FIREBASE_STORAGE_URL = 'https://firebasestorage.googleapis.com/v0/b';

function validateImage(blob: Blob, maxBytes: number) {
  const contentType = blob.type || 'image/jpeg';
  if (!ALLOWED_IMAGE_CONTENT_TYPES.includes(contentType)) {
    throw new Error('Choose a JPEG, PNG, HEIC, or WebP image.');
  }
  if (blob.size > maxBytes) {
    throw new Error(`Image must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
  return contentType;
}

function isStorageUnauthorized(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'storage/unauthorized';
}

function downloadUrlFromMetadata(bucket: string, fullPath: string, metadata: { downloadTokens?: string }) {
  const token = metadata.downloadTokens?.split(',')[0];
  if (!token) throw new Error('Uploaded image is missing a download token.');
  return `${FIREBASE_STORAGE_URL}/${encodeURIComponent(bucket)}/o/${encodeURIComponent(fullPath)}?alt=media&token=${encodeURIComponent(token)}`;
}

async function uploadWithExplicitAuthToken(params: { uid: string; fullPath: string; blob: Blob; contentType: string }) {
  const currentUser = auth?.currentUser;
  if (!currentUser || currentUser.uid !== params.uid) {
    throw new Error('Sign in again before sharing.');
  }

  const bucket = storage?.app.options.storageBucket;
  if (!bucket) throw new Error('Firebase Storage is not initialized.');

  const idToken = await currentUser.getIdToken(true);
  const boundary = `then-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const metadata = JSON.stringify({
    name: params.fullPath,
    fullPath: params.fullPath,
    contentType: params.contentType,
    size: params.blob.size,
  });
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${params.contentType}\r\n\r\n`,
      params.blob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );
  const response = await fetch(
    `${FIREBASE_STORAGE_URL}/${encodeURIComponent(bucket)}/o?name=${encodeURIComponent(params.fullPath)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Firebase ${idToken}`,
        'X-Goog-Upload-Protocol': 'multipart',
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`Could not upload image. Firebase Storage returned ${response.status}.`);
  }

  return downloadUrlFromMetadata(bucket, params.fullPath, await response.json());
}

export async function uploadMomentPhoto(params: { uid: string; momentId: string; uri: string }) {
  if (!storage) throw new Error('Firebase Storage is not initialized.');
  const blob = await uriToBlob(params.uri);
  const contentType = validateImage(blob, MAX_MOMENT_IMAGE_BYTES);
  const fullPath = `users/${params.uid}/moments/${params.momentId}/image.jpg`;
  const objectRef = ref(storage, fullPath);
  try {
    await uploadBytes(objectRef, blob, { contentType });
    return await getDownloadURL(objectRef);
  } catch (error) {
    if (!isStorageUnauthorized(error)) throw error;
    return uploadWithExplicitAuthToken({ uid: params.uid, fullPath, blob, contentType });
  }
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
