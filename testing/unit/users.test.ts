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
  it('browses public and Wander profiles while excluding self and existing friends', () => {
    const result = filterDiscoverableUsers({
      users,
      currentUid: 'current-user',
      following: ['wander-user'],
      query: '',
    });

    expect(result.map((user) => user.uid)).toEqual(['public-user']);
  });

  it('finds a private profile by its exact handle or display name', () => {
    const byHandle = filterDiscoverableUsers({
      users,
      currentUid: 'current-user',
      following: [],
      query: '@maisiek',
    });
    const byDisplayName = filterDiscoverableUsers({
      users,
      currentUid: 'current-user',
      following: [],
      query: 'Maisie K',
    });

    expect(byHandle.map((user) => user.uid)).toEqual(['private-user']);
    expect(byDisplayName.map((user) => user.uid)).toEqual(['private-user']);
    expect(
      filterDiscoverableUsers({
        users,
        currentUid: 'current-user',
        following: [],
        query: 'Maisie',
      }),
    ).toEqual([]);
  });
});
