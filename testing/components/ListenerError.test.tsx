import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ListenerError from '../../src/components/ListenerError';

describe('ListenerError', () => {
  it('shows a visible failure and retries', () => {
    const onRetry = jest.fn();
    render(<ListenerError message="Moments could not be loaded." onRetry={onRetry} />);

    expect(screen.getByText('Could not refresh this page')).toBeTruthy();
    expect(screen.getByText('Moments could not be loaded.')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders nothing without an error', () => {
    render(<ListenerError message={null} />);
    expect(screen.queryByText('Could not refresh this page')).toBeNull();
  });
});
