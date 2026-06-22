import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import DateStamp from '../../src/components/DateStamp';
import { fonts } from '../../src/theme/fonts';

describe('DateStamp', () => {
  it('renders an elegant over-photo date without a time', () => {
    render(<DateStamp value="Jun 9, 2026" />);

    const date = screen.getByText('Jun 9, 2026');
    const style = StyleSheet.flatten(date.props.style);

    expect(style.fontFamily).toBe(fonts.bodySemiBold);
    expect(style.fontVariant).toContain('tabular-nums');
    expect(style.textTransform).toBe('uppercase');
    expect(style.color).toBeDefined();
    expect(screen.queryByText('7:42 PM')).toBeNull();
    expect(screen.getByTestId('date-stamp')).toBeTruthy();
  });
});
