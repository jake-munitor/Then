import { notificationDataToURL } from '../../src/services/pushNotifications';

describe('push notification links', () => {
  it('uses explicit Then URLs when present', () => {
    expect(notificationDataToURL({ url: 'then://profile/jake', type: 'note', momentId: 'moment-1' })).toBe(
      'then://profile/jake',
    );
  });

  it('builds a notes link from note notification data', () => {
    expect(notificationDataToURL({ type: 'note', momentId: 'moment 1' })).toBe('then://moments/moment%201/notes');
  });

  it('ignores unknown or non-Then links', () => {
    expect(notificationDataToURL({ url: 'https://example.com', type: 'note' })).toBeNull();
    expect(notificationDataToURL({ type: 'other' })).toBeNull();
  });
});
