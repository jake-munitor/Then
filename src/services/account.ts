import { callFunction } from './cloudFunctions';

export async function deleteAccountData() {
  await callFunction('deleteAccount');
}
