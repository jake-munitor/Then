import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import HandwrittenText from '../../src/components/HandwrittenText';
import { fonts } from '../../src/theme/fonts';

describe('HandwrittenText', () => {
  it('uses the editorial display face with a padded line box', () => {
    render(<HandwrittenText size={40}>your roll</HandwrittenText>);

    const title = screen.getByText('your roll');
    const mergedStyle = StyleSheet.flatten(title.props.style);

    expect(mergedStyle.lineHeight).toBeGreaterThan(mergedStyle.fontSize);
    expect(mergedStyle.paddingTop).toBeGreaterThan(0);
    expect(mergedStyle.paddingBottom).toBeGreaterThan(0);
    expect(mergedStyle.fontFamily).toBe(fonts.displayRegular);
    expect(title.props.maxFontSizeMultiplier).toBe(1.25);
  });
});
