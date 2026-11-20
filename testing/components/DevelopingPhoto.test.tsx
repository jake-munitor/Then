import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import DevelopingPhoto, { DEVELOP_DURATION_MS } from '../../src/components/DevelopingPhoto';
import { appTheme } from '../../src/theme/theme';

function renderPhoto(uri = 'file://photo-1.jpg') {
  return render(
    <PaperProvider theme={appTheme}>
      <DevelopingPhoto uri={uri} filter="film" accessibilityLabel="golden hour" testID="developing" />
    </PaperProvider>,
  );
}

describe('DevelopingPhoto', () => {
  afterEach(() => jest.restoreAllMocks());

  it('runs within the 5-7 second window from the design spec', () => {
    expect(DEVELOP_DURATION_MS).toBeGreaterThanOrEqual(5000);
    expect(DEVELOP_DURATION_MS).toBeLessThanOrEqual(7000);
  });

  it('starts developing with the finished photo already underneath', () => {
    renderPhoto();

    expect(screen.getByText('developing - tap to reveal')).toBeTruthy();
    // The real, graded photo is mounted from the first frame - the effect is
    // layers on top of it, never a different image.
    expect(screen.getByTestId('developing-image')).toBeTruthy();
    expect(screen.getByTestId('developing-image-filter-film-soft-edge')).toBeTruthy();
  });

  it('reveals the finished photo at once on tap', () => {
    renderPhoto();

    fireEvent.press(screen.getByTestId('developing'));

    expect(screen.queryByText('developing - tap to reveal')).toBeNull();
    expect(screen.getByLabelText('golden hour')).toBeTruthy();
    expect(screen.getByTestId('developing-image')).toBeTruthy();
  });

  it('starts over only when a different photo is chosen', () => {
    const view = renderPhoto('file://photo-1.jpg');
    fireEvent.press(screen.getByTestId('developing'));
    expect(screen.queryByText('developing - tap to reveal')).toBeNull();

    // Same photo, new tone: stays developed.
    view.rerender(
      <PaperProvider theme={appTheme}>
        <DevelopingPhoto uri="file://photo-1.jpg" filter="sunfade" accessibilityLabel="golden hour" testID="developing" />
      </PaperProvider>,
    );
    expect(screen.queryByText('developing - tap to reveal')).toBeNull();

    view.rerender(
      <PaperProvider theme={appTheme}>
        <DevelopingPhoto uri="file://photo-2.jpg" filter="sunfade" accessibilityLabel="golden hour" testID="developing" />
      </PaperProvider>,
    );
    expect(screen.getByText('developing - tap to reveal')).toBeTruthy();
  });

  it('skips the animation entirely when Reduce Motion is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    renderPhoto();

    await waitFor(() => expect(screen.queryByText('developing - tap to reveal')).toBeNull());
    expect(screen.getByLabelText('golden hour')).toBeTruthy();
  });
});
