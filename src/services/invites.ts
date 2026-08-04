import AsyncStorage from '@react-native-async-storage/async-storage';

import { callFunction } from './cloudFunctions';
import { track } from './telemetry';

/**
 * Invite links pre-connect two people as approved mutual friends - the answer
 * to a friends-only feed's cold-start problem. Codes are minted and redeemed
 * by Cloud Functions; the client only carries the code around.
 */

const PENDING_INVITE_KEY = 'then.pendingInviteCode';
const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6);
}

export function isInviteCode(value: string) {
  return INVITE_CODE_PATTERN.test(value);
}

export function inviteUrl(code: string) {
  return `https://app.munitor.ai/then/invite/${code}`;
}

/** The code inside any invite URL or raw string, or null. */
export function inviteCodeFromUrl(url: string) {
  const match = /invite\/([A-Za-z0-9]{6})(?:[/?#]|$)/.exec(url);
  if (!match) return null;
  const code = normalizeInviteCode(match[1]);
  return isInviteCode(code) ? code : null;
}

export async function createInvite() {
  const result = await callFunction<{ code: string; expiresAt: number }>('createInvite');
  track('invite_created');
  return { code: result.code, url: inviteUrl(result.code), expiresAt: result.expiresAt };
}

export type RedeemedInvite = {
  inviterUid: string;
  displayName: string | null;
  handle: string | null;
};

export async function redeemInvite(rawCode: string): Promise<RedeemedInvite> {
  const code = normalizeInviteCode(rawCode);
  if (!isInviteCode(code)) throw new Error('That does not look like an invite code.');
  const result = await callFunction<RedeemedInvite>('redeemInvite', { code });
  track('invite_redeemed');
  return result;
}

/**
 * A link can arrive before the person has an account - cold start straight
 * from the App Store. The code waits in AsyncStorage until after onboarding,
 * when TabsNavigator redeems it.
 */
export async function stashPendingInviteCode(code: string) {
  // Strict here, unlike normalizeInviteCode: stripping invalid characters can
  // alchemize arbitrary text into six valid letters ("not a code" -> NTACDE),
  // and the stash only ever receives exact codes from URLs.
  const normalized = code.trim().toUpperCase();
  if (!isInviteCode(normalized)) return;
  try {
    await AsyncStorage.setItem(PENDING_INVITE_KEY, normalized);
  } catch {
    // Losing the stash degrades to manual code entry - never worth crashing.
  }
}

export async function takePendingInviteCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    if (code) await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    return code && isInviteCode(code) ? code : null;
  } catch {
    return null;
  }
}
