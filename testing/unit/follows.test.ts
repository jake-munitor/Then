import { approveFollow, blockUser, cancelFollowRequest, declineFollow, removeFollow, reportUser } from '../../src/services/follows';
import { callFunction } from '../../src/services/cloudFunctions';

jest.mock('../../src/firebase/firebase', () => ({ db: {} }));
jest.mock('../../src/services/cloudFunctions', () => ({
  callFunction: jest.fn(async () => ({ ok: true })),
}));

describe('friend relationship server calls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('approves a request through the backend', async () => {
    await approveFollow({ ownerUid: 'owner', requesterUid: 'requester' });
    expect(callFunction).toHaveBeenCalledWith('approveFollowRequest', { requesterUid: 'requester' });
  });

  it('declines a request through the backend', async () => {
    await declineFollow({ ownerUid: 'owner', requesterUid: 'requester' });
    expect(callFunction).toHaveBeenCalledWith('declineFollowRequest', { requesterUid: 'requester' });
  });

  it('cancels an outgoing request through the backend', async () => {
    await cancelFollowRequest({ requesterUid: 'requester', targetUid: 'owner' });
    expect(callFunction).toHaveBeenCalledWith('cancelFollowRequest', { targetUid: 'owner' });
  });

  it('removes both sides of an approved friendship through the backend', async () => {
    await removeFollow({ followerUid: 'requester', targetUid: 'owner' });
    expect(callFunction).toHaveBeenCalledWith('removeFriend', { targetUid: 'owner' });
  });

  it('blocks and reports through backend moderation functions', async () => {
    await blockUser('target');
    await reportUser({ targetUid: 'target', reason: 'profile', context: 'spam' });

    expect(callFunction).toHaveBeenCalledWith('blockUser', { targetUid: 'target' });
    expect(callFunction).toHaveBeenCalledWith('reportUser', {
      targetUid: 'target',
      reason: 'profile',
      context: 'spam',
    });
  });
});
