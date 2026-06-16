import { httpsCallable } from 'firebase/functions';

import { functions } from '../firebase/firebase';

export async function callFunction<T = unknown>(name: string, data?: Record<string, unknown>) {
  if (!functions) throw new Error('Firebase Functions is not initialized.');
  const callable = httpsCallable<Record<string, unknown> | undefined, T>(functions, name);
  const result = await callable(data);
  return result.data;
}
