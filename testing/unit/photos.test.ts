import { deleteObject, listAll, uploadBytes } from 'firebase/storage';

import { deleteAvatarFiles, uploadAvatar, uploadMomentPhoto } from '../../src/services/photos';

jest.mock('../../src/firebase/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user-1',
      getIdToken: jest.fn(async () => 'test-id-token'),
    },
  },
  storage: {
    app: {
      options: {
        storageBucket: 'then-test-bucket',
      },
    },
  },
}));

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

  it('accepts jpg metadata for moment images', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => ({ type: 'image/jpg', size: 1024 }),
    })) as jest.Mock;

    await uploadMomentPhoto({ uid: 'user-1', momentId: 'moment-1', uri: 'file://photo.jpg' });

    expect(uploadBytes).toHaveBeenCalledWith(expect.anything(), expect.anything(), { contentType: 'image/jpg' });
  });

  it('rejects moment images larger than 25 MB', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => ({ type: 'image/jpeg', size: 25 * 1024 * 1024 + 1 }),
    })) as jest.Mock;

    await expect(uploadMomentPhoto({ uid: 'user-1', momentId: 'moment-1', uri: 'file://large.jpg' })).rejects.toThrow(
      'smaller than 25 MB',
    );
    expect(uploadBytes).not.toHaveBeenCalled();
  });

  it('retries moment uploads with an explicit auth token after Storage denies the SDK request', async () => {
    const photoBlob = new Blob(['ok'], { type: 'image/jpeg' });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => photoBlob,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ downloadTokens: 'download-token' }),
      }) as jest.Mock;
    (uploadBytes as jest.Mock).mockRejectedValueOnce({ code: 'storage/unauthorized' });

    const url = await uploadMomentPhoto({ uid: 'user-1', momentId: 'moment-1', uri: 'file://photo.jpg' });

    expect(url).toContain('download-token');
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/o?name=users%2Fuser-1%2Fmoments%2Fmoment-1%2Fimage.jpg'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Firebase test-id-token',
          'X-Goog-Upload-Protocol': 'multipart',
        }),
      }),
    );
  });

  it('does not retry non-permission Storage upload failures', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => ({ type: 'image/jpeg', size: 1024 }),
    })) as jest.Mock;
    (uploadBytes as jest.Mock).mockRejectedValueOnce({ code: 'storage/retry-limit-exceeded' });

    await expect(uploadMomentPhoto({ uid: 'user-1', momentId: 'moment-1', uri: 'file://photo.jpg' })).rejects.toEqual({
      code: 'storage/retry-limit-exceeded',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('deletes every stored avatar version', async () => {
    (listAll as jest.Mock).mockResolvedValueOnce({ items: [{ path: 'one' }, { path: 'two' }] });

    await deleteAvatarFiles('user-1');

    expect(deleteObject).toHaveBeenCalledTimes(2);
  });
});
