import type { Moment } from '../services/types';
import { isValidYYYYMMDD } from './dates';

export type MomentSort = 'posted' | 'picture';

function postedTime(moment: Moment) {
  return moment.createdAt?.toMillis?.() ?? 0;
}

function pictureTime(moment: Moment) {
  if (!isValidYYYYMMDD(moment.memoryDate)) return postedTime(moment);
  const [year, month, day] = moment.memoryDate.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

export function sortMomentsForDisplay(moments: Moment[], sort: MomentSort) {
  return [...moments].sort((a, b) => {
    const primaryDifference =
      sort === 'picture' ? pictureTime(b) - pictureTime(a) : postedTime(b) - postedTime(a);
    if (primaryDifference !== 0) return primaryDifference;
    return postedTime(b) - postedTime(a);
  });
}
