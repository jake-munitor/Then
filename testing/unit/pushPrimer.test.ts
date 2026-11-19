import AsyncStorage from '@react-native-async-storage/async-storage';

import { getPushPermission, pushPermissionAction } from '../../src/services/pushNotifications';
import {
  PRIMER_SNOOZE_MS,
  shouldOfferNotifications,
  snoozeNotificationOffer,
} from '../../src/services/pushPrimer';

jest.mock('../../src/services/pushNotifications', () => ({
  ...jest.requireActual('../../src/services/pushNotifications'),
  getPushPermission: jest.fn(async () => 'undetermined'),
}));

const permission = (status: 'granted' | 'undetermined' | 'denied') =>
  (getPushPermission as jest.Mock).mockResolvedValue(status);

describe('notification permission timing', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  /**
   * The app used to show the iOS permission dialog the moment the main tabs
   * opened, before a new person had a friend or a post. iOS asks once only,
   * so a reflexive "Don't Allow" there was permanent.
   */
  it('never spends the system dialog on a plain app open', () => {
    expect(pushPermissionAction('undetermined', false)).toBe('skip');
    expect(pushPermissionAction('denied', false)).toBe('skip');
  });

  it('still registers the token on open for people who already said yes', () => {
    expect(pushPermissionAction('granted', false)).toBe('register');
    expect(pushPermissionAction('granted', true)).toBe('register');
  });

  it('asks iOS only when told to, after our own question was answered yes', () => {
    expect(pushPermissionAction('undetermined', true)).toBe('ask');
  });

  it('offers our question only while iOS has never been asked', async () => {
    permission('undetermined');
    expect(await shouldOfferNotifications()).toBe(true);

    permission('granted');
    expect(await shouldOfferNotifications()).toBe(false);

    permission('denied');
    expect(await shouldOfferNotifications()).toBe(false);
  });

  it('stays quiet for two weeks after "Not now", then offers again', async () => {
    permission('undetermined');
    const now = 1_800_000_000_000;

    await snoozeNotificationOffer(now);

    expect(await shouldOfferNotifications(now + PRIMER_SNOOZE_MS - 1000)).toBe(false);
    expect(await shouldOfferNotifications(now + PRIMER_SNOOZE_MS + 1000)).toBe(true);
  });
});
