import { normalizePhotoFilter } from '../../src/utils/photoFilters';

describe('photo filters', () => {
  it('keeps known filter values', () => {
    expect(normalizePhotoFilter('film')).toBe('film');
    expect(normalizePhotoFilter('sunfade')).toBe('sunfade');
    expect(normalizePhotoFilter('coolFlash')).toBe('coolFlash');
  });

  it('maps the retired classic filter to film', () => {
    expect(normalizePhotoFilter('classic')).toBe('film');
  });

  it('falls back to normal for older or unexpected moment data', () => {
    expect(normalizePhotoFilter(undefined)).toBe('normal');
    expect(normalizePhotoFilter('sepia')).toBe('normal');
  });
});
