import { createMoment } from '../../src/services/moments';
import {
  clearRestoredDraft,
  discardPendingMoment,
  editPendingMoment,
  resetMomentOutbox,
  retryPendingMoment,
  shareMoment,
  useMomentOutbox,
} from '../../src/services/momentOutbox';
import { subscribeNotificationSuggestions } from '../../src/services/pushPrimer';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('../../src/services/moments', () => ({
  createMoment: jest.fn(async () => 'moment-1'),
  newMomentId: jest.fn(() => 'moment-1'),
}));

const params = {
  uid: 'author',
  uri: 'file://photo.jpg',
  frontText: 'golden hour',
  photoFilter: 'film' as const,
  backText: 'the field behind gran\'s',
  memoryDate: '2026-11-14',
  appearInWander: false,
};

const flush = () => act(async () => {});

describe('momentOutbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => resetMomentOutbox());
  });

  it('returns at once and shows the moment as sharing while the upload runs', async () => {
    let finish: (value: string) => void = () => {};
    (createMoment as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useMomentOutbox());

    act(() => {
      shareMoment(params);
    });

    expect(result.current.pending).toEqual([{ momentId: 'moment-1', params, status: 'sharing' }]);
    // The reserved id is what gets written, so the feed can match the two.
    expect(createMoment).toHaveBeenCalledWith({ ...params, momentId: 'moment-1' });

    await act(async () => finish('moment-1'));
    expect(result.current.pending).toEqual([]);
  });

  // Lauren's spec, point 10: a failed upload must keep the photo and details.
  it('keeps the photo and words when the upload fails, and can retry', async () => {
    (createMoment as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useMomentOutbox());

    act(() => {
      shareMoment(params);
    });
    await flush();

    expect(result.current.pending).toEqual([{ momentId: 'moment-1', params, status: 'failed', error: 'offline' }]);

    act(() => retryPendingMoment('moment-1'));
    await flush();

    expect(createMoment).toHaveBeenCalledTimes(2);
    expect(result.current.pending).toEqual([]);
  });

  it('hands a failed moment back to the composer intact on Edit', async () => {
    (createMoment as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useMomentOutbox());
    act(() => {
      shareMoment(params);
    });
    await flush();

    act(() => editPendingMoment('moment-1'));

    expect(result.current.pending).toEqual([]);
    expect(result.current.draft).toEqual(params);

    act(() => clearRestoredDraft());
    expect(result.current.draft).toBeNull();
  });

  it('drops a failed moment on Discard', async () => {
    (createMoment as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useMomentOutbox());
    act(() => {
      shareMoment(params);
    });
    await flush();

    act(() => discardPendingMoment('moment-1'));

    expect(result.current.pending).toEqual([]);
    expect(result.current.draft).toBeNull();
  });

  it('suggests notifications only after a moment is actually shared', async () => {
    const suggested = jest.fn();
    const unsubscribe = subscribeNotificationSuggestions(suggested);
    (createMoment as jest.Mock).mockRejectedValueOnce(new Error('offline'));

    act(() => {
      shareMoment(params);
    });
    await flush();
    expect(suggested).not.toHaveBeenCalled();

    act(() => retryPendingMoment('moment-1'));
    await flush();
    expect(suggested).toHaveBeenCalledWith('first-moment');
    unsubscribe();
  });
});
