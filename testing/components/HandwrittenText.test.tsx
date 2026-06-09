import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import HandwrittenText from '../../src/components/HandwrittenText';

describe('HandwrittenText', () => {
  it('uses a padded line box so tall and descending letters are not clipped', () => {
    render(<HandwrittenText size={40}>your roll</HandwrittenText>);

    const title = screen.getByText('your roll');
    const mergedStyle = StyleSheet.flatten(title.props.style);

    expect(mergedStyle.lineHeight).toBeGreaterThan(mergedStyle.fontSize);
    expect(mergedStyle.paddingTop).toBeGreaterThan(0);
    expect(mergedStyle.paddingBottom).toBeGreaterThan(0);
    expect(title.props.maxFontSizeMultiplier).toBe(1.25);
  });
});
