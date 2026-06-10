export function todayYYYYMMDD(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidYYYYMMDD(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatMemoryDate(value?: string | null) {
  if (!value || !isValidYYYYMMDD(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatMomentTime(value?: { toDate?: () => Date; seconds?: number } | Date | null) {
  if (!value) return '';
  const date =
    value instanceof Date
      ? value
      : typeof value.toDate === 'function'
        ? value.toDate()
        : typeof value.seconds === 'number'
          ? new Date(value.seconds * 1000)
          : null;

  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const EXIF_DATE_KEYS = ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime', 'CreateDate', 'ModifyDate'];

export function parseExifMemoryDate(exif?: Record<string, unknown> | null) {
  if (!exif) return null;

  for (const key of EXIF_DATE_KEYS) {
    const value = exif[key];
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const parsed = parseExifDateValue(String(value));
    if (parsed) return parsed;
  }

  return null;
}

export function dateFromImagePickerAsset(asset?: { exif?: Record<string, unknown> | null } | null, fallbackDate = new Date()) {
  return parseExifMemoryDate(asset?.exif) ?? todayYYYYMMDD(fallbackDate);
}

function parseExifDateValue(value: string) {
  const trimmed = value.trim();
  const exifMatch = trimmed.match(/^(\d{4}):(\d{2}):(\d{2})(?:\s+\d{2}:\d{2}:\d{2})?/);
  if (exifMatch) {
    const [, year, month, day] = exifMatch;
    const candidate = `${year}-${month}-${day}`;
    return isValidYYYYMMDD(candidate) ? candidate : null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const candidate = `${year}-${month}-${day}`;
    return isValidYYYYMMDD(candidate) ? candidate : null;
  }

  return null;
}
