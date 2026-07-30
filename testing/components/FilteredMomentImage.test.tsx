import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import FilteredMomentImage from '../../src/components/FilteredMomentImage';
import { PHOTO_FILTER_VALUES } from '../../src/utils/photoFilters';

function renderFilter(filter: string) {
  render(
    <FilteredMomentImage
      uri="https://example.com/photo.jpg"
      filter={filter}
      accessibilityLabel="a moment"
      testID="photo"
    />,
  );
  return screen.getByLabelText('a moment');
}

describe('FilteredMomentImage', () => {
  /**
   * The photo tones were originally built by dropping the image's opacity so
   * the card colour bled through. That washes out contrast and reads as hazy
   * rather than filmic, which is the bug the grading pass fixed. Grading must
   * never come at the cost of the photo's opacity again.
   */
  it.each(PHOTO_FILTER_VALUES)('renders %s at full photo opacity', (filter) => {
    const style = StyleSheet.flatten(renderFilter(filter).props.style);

    expect(style.opacity ?? 1).toBe(1);
  });

  it('grades every tone except normal, and leaves normal untouched', () => {
    for (const filter of PHOTO_FILTER_VALUES) {
      const { unmount } = render(
        <FilteredMomentImage uri="https://example.com/photo.jpg" filter={filter} testID={`photo-${filter}`} />,
      );

      const graded = screen.UNSAFE_getAllByType(require('react-native').View).some((node: any) => {
        const style = StyleSheet.flatten(node.props.style);
        return Array.isArray(style?.filter) && style.filter.length > 0;
      });

      expect(graded).toBe(filter !== 'normal');
      unmount();
    }
  });
});
