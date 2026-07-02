import { ImageManipulator } from 'expo-image-manipulator';

import { prepareImageForUpload } from '../../src/utils/imageProcessing';

function mockManipulate(width: number, height: number) {
  const image = { width, height, saveAsync: jest.fn(async () => ({ uri: 'file://processed.jpg', width, height })) };
  const context: any = {
    resize: jest.fn(() => context),
    reset: jest.fn(() => context),
    renderAsync: jest.fn(async () => image),
  };
  (ImageManipulator.manipulate as jest.Mock).mockReturnValue(context);
  return { context, image };
}

describe('prepareImageForUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resizes and re-encodes an image larger than the preset', async () => {
    const { context, image } = mockManipulate(3000, 2000);

    const uri = await prepareImageForUpload('file://photo.heic', { maxDimension: 1440, quality: 0.8 });

    expect(context.reset).toHaveBeenCalled();
    expect(context.resize).toHaveBeenCalledWith({ width: 1440 });
    expect(image.saveAsync).toHaveBeenCalledWith({ compress: 0.8, format: 'jpeg' });
    expect(uri).toBe('file://processed.jpg');
  });

  it('resizes by height for portrait images', async () => {
    const { context } = mockManipulate(2000, 3000);

    await prepareImageForUpload('file://photo.jpg', { maxDimension: 1440, quality: 0.8 });

    expect(context.resize).toHaveBeenCalledWith({ height: 1440 });
  });

  it('skips resizing but still re-encodes images already under the preset', async () => {
    const { context, image } = mockManipulate(800, 600);

    const uri = await prepareImageForUpload('file://photo.jpg', { maxDimension: 1440, quality: 0.8 });

    expect(context.resize).not.toHaveBeenCalled();
    expect(image.saveAsync).toHaveBeenCalledWith({ compress: 0.8, format: 'jpeg' });
    expect(uri).toBe('file://processed.jpg');
  });

  it('falls back to the original uri if manipulation fails', async () => {
    (ImageManipulator.manipulate as jest.Mock).mockImplementation(() => {
      throw new Error('unsupported image');
    });

    const uri = await prepareImageForUpload('file://weird.bmp', { maxDimension: 1440, quality: 0.8 });

    expect(uri).toBe('file://weird.bmp');
  });
});
