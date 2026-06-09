import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import DateStamp from '../../src/components/DateStamp';
import { fonts } from '../../src/theme/fonts';

describe('DateStamp', () => {
  it('renders dates as a compact fixed-width camera imprint', () => {
    render(<DateStamp value="jun 9, 2026" />);

    const date = screen.getByText('jun 9, 2026');
    const style = StyleSheet.flatten(date.props.style);

    expect(style.fontFamily).toBe(fonts.dateStamp);
    expect(style.fontVariant).toContain('tabular-nums');
    expect(style.textTransform).toBe('uppercase');
    expect(screen.getByTestId('date-stamp')).toBeTruthy();
  });
});
