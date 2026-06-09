import type { PublicUser } from '../../src/services/types';
import { filterDiscoverableUsers } from '../../src/services/users';

const users: PublicUser[] = [
  {
    uid: 'current-user',
    displayName: 'Jake',
    handle: 'jake',
    avatarUrl: null,
    profileVisibility: 'public',
    appearInWander: true,
  },
  {
    uid: 'public-user',
    displayName: 'Lauren Miles',
    handle: 'lauren',
    avatarUrl: null,
    profileVisibility: 'public',
    appearInWander: false,
  },
  {
    uid: 'private-user',
    displayName: 'Maisie K',
    handle: 'maisiek',
    avatarUrl: null,
    profileVisibility: 'private',
    appearInWander: false,
  },
  {
    uid: 'wander-user',
    displayName: 'Sam Lee',
    handle: 'sam',
    avatarUrl: null,
    profileVisibility: 'private',
    appearInWander: true,
  },
];

describe('friend discovery', () => {
  it('lists every other profile, including private accounts and existing friends', () => {
    const result = filterDiscoverableUsers({
      users,
      currentUid: 'current-user',
      query: '',
    });

    expect(result.map((user) => user.uid)).toEqual(['public-user', 'private-user', 'wander-user']);
  });

  it('finds private profiles by partial handle or display name', () => {
    const byHandle = filterDiscoverableUsers({
      users,
      currentUid: 'current-user',
      query: '@mais',
    });
    const byDisplayName = filterDiscoverableUsers({
      users,
      currentUid: 'current-user',
      query: 'Maisie',
    });

    expect(byHandle.map((user) => user.uid)).toEqual(['private-user']);
    expect(byDisplayName.map((user) => user.uid)).toEqual(['private-user']);
  });
});
