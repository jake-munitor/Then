import { collection, deleteDoc, doc, getDoc, getDocs, query, writeBatch } from 'firebase/firestore';

import { deleteAccountData } from '../../src/services/account';
import { deleteAvatarFiles, deleteStoredFile } from '../../src/services/photos';

jest.mock('../../src/firebase/firebase', () => ({ db: {} }));
jest.mock('../../src/services/photos', () => ({
  deleteAvatarFiles: jest.fn(async () => {}),
  deleteStoredFile: jest.fn(async () => {}),
}));

const mockBatchDelete = jest.fn();
const mockCommit = jest.fn(async () => {});

function snapshotDoc(path: string, data: Record<string, unknown> = {}) {
  const id = path.split('/').pop()!;
  return { id, ref: { path }, data: () => data };
}

describe('account cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (collection as jest.Mock).mockImplementation((_db, ...segments: string[]) => ({ path: segments.join('/') }));
    (doc as jest.Mock).mockImplementation((_db, ...segments: string[]) => ({ path: segments.join('/') }));
    (query as jest.Mock).mockImplementation((reference) => reference);
    (writeBatch as jest.Mock).mockReturnValue({ delete: mockBatchDelete, commit: mockCommit });
    (getDoc as jest.Mock)
      .mockResolvedValueOnce({ data: () => ({ avatarUrl: 'https://example.com/avatar.jpg' }) })
      .mockResolvedValueOnce({ data: () => ({ avatarUrl: 'https://example.com/avatar.jpg' }) });
    (getDocs as jest.Mock).mockImplementation(async (reference: { path: string }) => {
      switch (reference.path) {
        case 'moments':
          return {
            docs: [
              snapshotDoc('moments/moment-1', {
                authorUid: 'user-1',
                imageUrl: 'https://example.com/moment.jpg',
              }),
            ],
          };
        case 'publicUsers':
          return { docs: [snapshotDoc('publicUsers/user-1'), snapshotDoc('publicUsers/user-2')] };
        case 'users/user-1/following':
          return { docs: [snapshotDoc('users/user-1/following/user-2')] };
        case 'users/user-1/followers':
          return { docs: [snapshotDoc('users/user-1/followers/user-3')] };
        case 'users/user-1/followRequests':
          return { docs: [snapshotDoc('users/user-1/followRequests/user-4')] };
        case 'users/user-1/saved':
          return { docs: [snapshotDoc('users/user-1/saved/moment-2')] };
        case 'users/user-1/kept':
          return { docs: [snapshotDoc('users/user-1/kept/moment-3')] };
        case 'moments/moment-1/back':
          return { docs: [snapshotDoc('moments/moment-1/back/details')] };
        case 'moments/moment-1/keeps':
          return { docs: [snapshotDoc('moments/moment-1/keeps/user-2')] };
        case 'moments/moment-1/notes':
          return { docs: [snapshotDoc('moments/moment-1/notes/note-1')] };
        default:
          return { docs: [] };
      }
    });
  });

  it('removes owned content, reciprocal social links, profiles, and media', async () => {
    await deleteAccountData('user-1');

    expect(mockBatchDelete).toHaveBeenCalledWith(expect.objectContaining({ path: 'moments/moment-1' }));
    expect(mockBatchDelete).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/user-2/followers/user-1' }));
    expect(mockBatchDelete).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/user-3/following/user-1' }));
    expect(mockBatchDelete).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/user-2/followRequests/user-1' }));
    expect(deleteStoredFile).toHaveBeenCalledWith('https://example.com/avatar.jpg');
    expect(deleteStoredFile).toHaveBeenCalledWith('https://example.com/moment.jpg');
    expect(deleteAvatarFiles).toHaveBeenCalledWith('user-1');
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'publicUsers/user-1' }));
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/user-1' }));
    expect(mockCommit).toHaveBeenCalled();
  });
});
