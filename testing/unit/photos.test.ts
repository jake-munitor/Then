import { deleteObject, listAll, uploadBytes } from 'firebase/storage';

import { deleteAvatarFiles, uploadAvatar, uploadMomentPhoto } from '../../src/services/photos';

jest.mock('../../src/firebase/firebase', () => ({ storage: {} }));

describe('photo uploads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-image content before upload', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => ({ type: 'text/plain', size: 12 }),
    })) as jest.Mock;

    await expect(uploadAvatar({ uid: 'user-1', uri: 'file://bad.txt' })).rejects.toThrow('Choose a JPEG');
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  it('rejects avatars larger than 5 MB', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => ({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }),
    })) as jest.Mock;

    await expect(uploadAvatar({ uid: 'user-1', uri: 'file://large.jpg' })).rejects.toThrow('smaller than 5 MB');
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  it('uploads moment images with explicit image metadata', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => ({ type: 'image/png', size: 1024 }),
    })) as jest.Mock;

    await uploadMomentPhoto({ uid: 'user-1', momentId: 'moment-1', uri: 'file://photo.png' });

    expect(uploadBytes).toHaveBeenCalledWith(expect.anything(), expect.anything(), { contentType: 'image/png' });
  });

  it('deletes every stored avatar version', async () => {
    (listAll as jest.Mock).mockResolvedValueOnce({ items: [{ path: 'one' }, { path: 'two' }] });

    await deleteAvatarFiles('user-1');

    expect(deleteObject).toHaveBeenCalledTimes(2);
  });
});
