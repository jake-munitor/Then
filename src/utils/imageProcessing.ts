import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type ImageUploadPreset = { maxDimension: number; quality: number };

export const MOMENT_IMAGE_PRESET: ImageUploadPreset = { maxDimension: 1440, quality: 0.8 };
export const AVATAR_IMAGE_PRESET: ImageUploadPreset = { maxDimension: 512, quality: 0.8 };

/**
 * Resizes to the preset's longest edge (never upscales) and re-encodes as JPEG so every
 * uploaded file is a real, predictably-sized JPEG regardless of the source format.
 * Falls back to the original uri if manipulation fails - compression should never block a share.
 */
export async function prepareImageForUpload(uri: string, preset: ImageUploadPreset): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    const original = await context.renderAsync();

    let finalImage = original;
    if (Math.max(original.width, original.height) > preset.maxDimension) {
      const resizeDimension =
        original.width >= original.height
          ? { width: preset.maxDimension }
          : { height: preset.maxDimension };
      finalImage = await context.reset().resize(resizeDimension).renderAsync();
    }

    const saved = await finalImage.saveAsync({ compress: preset.quality, format: SaveFormat.JPEG });
    return saved.uri;
  } catch {
    return uri;
  }
}
