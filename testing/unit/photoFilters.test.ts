import { normalizePhotoFilter } from '../../src/utils/photoFilters';

describe('photo filters', () => {
  it('keeps known filter values', () => {
    expect(normalizePhotoFilter('classic')).toBe('classic');
    expect(normalizePhotoFilter('sunfade')).toBe('sunfade');
    expect(normalizePhotoFilter('coolFlash')).toBe('coolFlash');
  });

  it('falls back to normal for older or unexpected moment data', () => {
    expect(normalizePhotoFilter(undefined)).toBe('normal');
    expect(normalizePhotoFilter('sepia')).toBe('normal');
  });
});
