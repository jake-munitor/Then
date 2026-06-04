import { dateFromImagePickerAsset, formatMemoryDate, isValidYYYYMMDD, parseExifMemoryDate, todayYYYYMMDD } from '../../src/utils/dates';
import { initialsFromName, keptCopy } from '../../src/utils/formatters';

describe('date helpers', () => {
  it('formats today as YYYY-MM-DD', () => {
    expect(todayYYYYMMDD(new Date(2026, 4, 9))).toBe('2026-05-09');
  });

  it('validates real calendar dates', () => {
    expect(isValidYYYYMMDD('2026-02-28')).toBe(true);
    expect(isValidYYYYMMDD('2026-02-31')).toBe(false);
    expect(isValidYYYYMMDD('05/09/2026')).toBe(false);
  });

  it('formats memory dates for post cards', () => {
    expect(formatMemoryDate('2026-05-09')).toContain('may');
  });

  it('parses native EXIF date fields', () => {
    expect(parseExifMemoryDate({ DateTimeOriginal: '2026:06:03 21:42:36' })).toBe('2026-06-03');
    expect(parseExifMemoryDate({ CreateDate: '2026-06-03T21:42:36.000Z' })).toBe('2026-06-03');
  });

  it('falls back when image EXIF is missing', () => {
    expect(dateFromImagePickerAsset({ exif: null }, new Date(2026, 5, 4))).toBe('2026-06-04');
  });

  it('rejects invalid EXIF date strings', () => {
    expect(parseExifMemoryDate({ DateTimeOriginal: '2026:02:31 10:00:00' })).toBeNull();
    expect(parseExifMemoryDate({ DateTimeOriginal: 'not a date' })).toBeNull();
  });
});

describe('formatters', () => {
  it('builds compact initials', () => {
    expect(initialsFromName('Maisie K')).toBe('MK');
    expect(initialsFromName('')).toBe('?');
  });

  it('uses Then keep language', () => {
    expect(keptCopy(47)).toBe('47 kept this');
  });
});
