import AsyncStorage from '@react-native-async-storage/async-storage';

import { callFunction } from '../../src/services/cloudFunctions';
import {
  createInvite,
  inviteCodeFromUrl,
  inviteUrl,
  normalizeInviteCode,
  redeemInvite,
  stashPendingInviteCode,
  takePendingInviteCode,
} from '../../src/services/invites';

jest.mock('../../src/services/cloudFunctions', () => ({
  callFunction: jest.fn(async (name: string) =>
    name === 'createInvite'
      ? { code: 'ABC234', expiresAt: 1234567890 }
      : { inviterUid: 'inviter-1', displayName: 'Jake', handle: 'jake' },
  ),
}));

describe('invites', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('normalizes sloppy code entry to the server alphabet', () => {
    expect(normalizeInviteCode(' abc234 ')).toBe('ABC234');
    // I, O, 0 and 1 are not in the alphabet - they get stripped, not mapped.
    expect(normalizeInviteCode('a1b0c2i34o')).toBe('ABC234');
  });

  it('extracts codes from share URLs and scheme URLs, and rejects noise', () => {
    expect(inviteCodeFromUrl('https://app.munitor.ai/then/invite/ABC234')).toBe('ABC234');
    expect(inviteCodeFromUrl('then://invite/abc234')).toBe('ABC234');
    expect(inviteCodeFromUrl('then://invite/ABC234?utm=x')).toBe('ABC234');
    expect(inviteCodeFromUrl('then://profile/jake')).toBeNull();
    expect(inviteCodeFromUrl('then://invite/TOOLONG99')).toBeNull();
  });

  it('mints through the backend and returns a shareable URL', async () => {
    const invite = await createInvite();
    expect(callFunction).toHaveBeenCalledWith('createInvite');
    expect(invite.url).toBe(inviteUrl('ABC234'));
  });

  it('redeems a normalized code through the backend', async () => {
    const result = await redeemInvite(' abc234 ');
    expect(callFunction).toHaveBeenCalledWith('redeemInvite', { code: 'ABC234' });
    expect(result.inviterUid).toBe('inviter-1');
  });

  it('rejects malformed codes before calling the backend', async () => {
    await expect(redeemInvite('nope')).rejects.toThrow();
    expect(callFunction).not.toHaveBeenCalled();
  });

  it('stashes a pending code once and clears it on take', async () => {
    await stashPendingInviteCode('abc234');
    expect(await takePendingInviteCode()).toBe('ABC234');
    // Taken means gone - the same code must not redeem twice on later starts.
    expect(await takePendingInviteCode()).toBeNull();
  });

  it('refuses to stash garbage', async () => {
    await stashPendingInviteCode('not a code');
    expect(await takePendingInviteCode()).toBeNull();
  });
});
