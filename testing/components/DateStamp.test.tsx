import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import DateStamp from '../../src/components/DateStamp';
import { fonts } from '../../src/theme/fonts';
describe('DateStamp', () => {
  it('renders an elegant over-photo date without a time', () => {
    render(<DateStamp value="Jun 9, 2026" />);

    const date = screen.getByText("JUN 09 '26");
    const style = StyleSheet.flatten(date.props.style);

    expect(style.fontFamily).toBeDefined();
    expect(style.fontVariant).toContain('tabular-nums');
    expect(style.color).toBeDefined();
    expect(screen.queryByText('7:42 PM')).toBeNull();
    expect(screen.getByTestId('date-stamp')).toBeTruthy();
  });

  it('makes the amber camera date readable over bright photos', () => {
    render(<DateStamp value="Jun 23, 2026" tone="amber" />);

    const stamp = StyleSheet.flatten(screen.getByTestId('date-stamp').props.style);
    const date = StyleSheet.flatten(screen.getByText("JUN 23 '26").props.style);

    expect(stamp.backgroundColor).toBe('transparent');
    expect(date.fontFamily).toBe(fonts.cameraBold);
    expect(date.fontSize).toBe(12);
    expect(date.textShadowRadius).toBeGreaterThan(2);
  });

  it('does not shift raw ISO memory dates across time zones', () => {
    render(<DateStamp value="2026-06-23" tone="amber" />);

    expect(screen.getByText("JUN 23 '26")).toBeTruthy();
  });
});
