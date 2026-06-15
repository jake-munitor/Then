import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import MomentSortControl from '../../src/components/MomentSortControl';
import { appTheme } from '../../src/theme/theme';

describe('MomentSortControl', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('opens a compact menu and selects picture date', async () => {
    const onChange = jest.fn();
    render(
      <PaperProvider theme={appTheme}>
        <MomentSortControl value="posted" onChange={onChange} />
      </PaperProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Sort moments, Date posted'));
      jest.runAllTimers();
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Picture date'));
      jest.runAllTimers();
    });

    expect(onChange).toHaveBeenCalledWith('picture');
  });
});
