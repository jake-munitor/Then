import { orderBy, where } from 'firebase/firestore';

import { fetchMomentsForYear, fetchYearsWithMoments } from '../../src/services/moments';

jest.mock('../../src/firebase/firebase', () => ({ db: {} }));

describe('Your Year data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * The recap used to load the 200 most recently *uploaded* moments and filter
   * them to the year in JavaScript. createdAt and memoryDate are different
   * things, so past 200 moments it silently dropped the earliest-uploaded ones
   * and a backfilled photo landed in the wrong year. A recap that quietly isn't
   * complete is the one failure this feature cannot have, so assert the year is
   * bounded by the database on memoryDate itself.
   */
  it('asks the database for the year by memoryDate, not by upload time', async () => {
    await fetchMomentsForYear({ authorUid: 'user-1', year: 2026 });

    expect(where).toHaveBeenCalledWith('authorUid', '==', 'user-1');
    expect(where).toHaveBeenCalledWith('memoryDate', '>=', '2026-01-01');
    expect(where).toHaveBeenCalledWith('memoryDate', '<=', '2026-12-31');
    expect(orderBy).toHaveBeenCalledWith('memoryDate', 'asc');

    // The old implementation's tell: a createdAt ordering plus a hard cap.
    expect(orderBy).not.toHaveBeenCalledWith('createdAt', 'desc');
  });

  it('derives the year picker from the archive edges rather than reading it all', async () => {
    await fetchYearsWithMoments('user-1');

    // Two single-document reads (oldest + newest), not a full scan.
    expect(orderBy).toHaveBeenCalledWith('memoryDate', 'asc');
    expect(orderBy).toHaveBeenCalledWith('memoryDate', 'desc');
  });
});
