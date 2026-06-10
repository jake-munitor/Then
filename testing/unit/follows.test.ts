import { deleteDoc, doc, writeBatch } from 'firebase/firestore';

import { approveFollow, cancelFollowRequest, declineFollow, removeFollow } from '../../src/services/follows';

jest.mock('../../src/firebase/firebase', () => ({ db: {} }));

const mockDelete = jest.fn();
const mockSet = jest.fn();
const mockCommit = jest.fn(async () => {});

describe('friend relationship writes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (doc as jest.Mock).mockImplementation((_db, ...segments: string[]) => ({ path: segments.join('/') }));
    (writeBatch as jest.Mock).mockReturnValue({
      delete: mockDelete,
      set: mockSet,
      commit: mockCommit,
    });
  });

  it('approves a request by writing both sides and removing the request', async () => {
    await approveFollow({ ownerUid: 'owner', requesterUid: 'requester' });

    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/owner/followers/requester' }),
      expect.objectContaining({ uid: 'requester' }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/requester/following/owner' }),
      expect.objectContaining({ uid: 'owner' }),
    );
    expect(mockDelete).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/owner/followRequests/requester' }));
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it('declines a request without creating a relationship', async () => {
    await declineFollow({ ownerUid: 'owner', requesterUid: 'requester' });

    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/owner/followRequests/requester' }));
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('cancels an outgoing request', async () => {
    await cancelFollowRequest({ requesterUid: 'requester', targetUid: 'owner' });

    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/owner/followRequests/requester' }));
  });

  it('removes both sides of an approved friendship', async () => {
    await removeFollow({ followerUid: 'requester', targetUid: 'owner' });

    expect(mockDelete).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/requester/following/owner' }));
    expect(mockDelete).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/owner/followers/requester' }));
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });
});
