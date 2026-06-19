import type { Moment } from '../../src/services/types';
import { sortMomentsForDisplay } from '../../src/utils/momentSorting';

function moment(id: string, memoryDate: string, postedAt: number): Moment {
  return {
    id,
    authorUid: 'user-1',
    imageUrl: `https://example.com/${id}.jpg`,
    frontText: id,
    photoFilter: 'normal',
    memoryDate,
    keptCount: 0,
    noteCount: 0,
    appearInWander: false,
    createdAt: { toMillis: () => postedAt } as Moment['createdAt'],
  };
}

describe('moment sorting', () => {
  const moments = [
    moment('newly-posted-old-photo', '2022-06-01', Date.UTC(2026, 5, 12)),
    moment('middle-posted-new-photo', '2026-06-10', Date.UTC(2026, 5, 11)),
    moment('old-posted-middle-photo', '2025-01-01', Date.UTC(2026, 5, 10)),
  ];

  it('defaults conceptually to newest posting date', () => {
    expect(sortMomentsForDisplay(moments, 'posted').map((item) => item.id)).toEqual([
      'newly-posted-old-photo',
      'middle-posted-new-photo',
      'old-posted-middle-photo',
    ]);
  });

  it('sorts newest picture date first', () => {
    expect(sortMomentsForDisplay(moments, 'picture').map((item) => item.id)).toEqual([
      'middle-posted-new-photo',
      'old-posted-middle-photo',
      'newly-posted-old-photo',
    ]);
  });

  it('falls back to posting date when the picture date is invalid', () => {
    const missingDate = moment('missing-date', '', Date.UTC(2026, 5, 13));
    expect(sortMomentsForDisplay([...moments, missingDate], 'picture')[0].id).toBe('missing-date');
  });
});
