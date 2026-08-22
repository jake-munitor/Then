import { withTimeout } from '../../src/utils/async';

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the value when the promise settles in time', async () => {
    const result = withTimeout(Promise.resolve('fast'), 1000, 'fallback');
    await expect(result).resolves.toBe('fast');
  });

  it('returns the fallback when the promise never settles', async () => {
    const never = new Promise<string>(() => {});
    const result = withTimeout(never, 1000, 'fallback');
    jest.advanceTimersByTime(1000);
    await expect(result).resolves.toBe('fallback');
  });

  it('returns the fallback instead of rejecting', async () => {
    const result = withTimeout(Promise.reject(new Error('boom')), 1000, 'fallback');
    await expect(result).resolves.toBe('fallback');
  });
});
