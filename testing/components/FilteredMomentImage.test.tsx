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
      const graded = screen.queryAllByTestId(new RegExp(`^photo-${filter}-grade-`)).length > 0;
      expect(graded).toBe(filter !== 'normal');
      unmount();
    }
  });

  /**
   * iOS React Native applies only brightness and opacity from `filter`; it
   * drops sepia, saturate, contrast and hue-rotate without a warning. The
   * tones were once built on those and so did almost nothing on an iPhone.
   * The grade must stay on blend layers, which iOS does render.
   */
  it('builds the grade from flat layers, never from the filter style', () => {
    for (const filter of PHOTO_FILTER_VALUES) {
      const { unmount } = render(
        <FilteredMomentImage uri="https://example.com/photo.jpg" filter={filter} testID={`photo-${filter}`} />,
      );
      const usesFilterStyle = screen.UNSAFE_getAllByType(require('react-native').View).some((node: any) => {
        return StyleSheet.flatten(node.props.style)?.filter !== undefined;
      });
      expect(usesFilterStyle).toBe(false);

      for (const layer of screen.queryAllByTestId(new RegExp(`^photo-${filter}-grade-`))) {
        const style = StyleSheet.flatten(layer.props.style);
        const alpha = Number(/rgba\([^)]*,\s*([\d.]+)\)/.exec(style.backgroundColor)?.[1]);
        expect(alpha).toBeGreaterThan(0);

        // Black and white needs one opaque layer to remove all colour. It
        // must use `color`, the mode the other tones prove on device.
        if (/-grade-blackAndWhite-silver$/.test(layer.props.testID)) {
          expect(style.mixBlendMode).toBe('color');
          expect(alpha).toBe(1);
          continue;
        }

        // Capped so a failed blend could never cover the photo.
        expect(alpha).toBeLessThanOrEqual(0.5);
        // A wash is a plain flat layer; every other layer blends.
        if (!/-wash$/.test(layer.props.testID)) expect(style.mixBlendMode).toBeTruthy();
      }
      unmount();
    }
  });

  it('removes all colour for black and white', () => {
    render(<FilteredMomentImage uri="https://example.com/photo.jpg" filter="blackAndWhite" testID="photo" />);

    expect(screen.getByTestId('photo-grade-blackAndWhite-silver')).toBeTruthy();
  });

  /**
   * The overlays were once flat Views: a 10pt border, a band across the top
   * fifth, a strip down one side. Each showed as a hard edge on a plain sky,
   * and the strip had no height so it never drew at all. They are tinted
   * alpha masks now, stretched over the whole photo.
   */
  it('draws every overlay as a soft mask over the whole photo', () => {
    for (const filter of PHOTO_FILTER_VALUES) {
      const { unmount } = render(
        <FilteredMomentImage uri="https://example.com/photo.jpg" filter={filter} testID={`photo-${filter}`} />,
      );
      for (const overlay of screen.queryAllByTestId(new RegExp(`^photo-${filter}-filter-`))) {
        const style = StyleSheet.flatten(overlay.props.style);
        expect(overlay.props.source).toBeTruthy();
        expect(style.tintColor).toBeTruthy();
        expect(style.width).toBe('100%');
        expect(style.height).toBe('100%');
        expect(style.borderWidth).toBeUndefined();
        expect(style.opacity).toBeGreaterThan(0);
        expect(style.opacity).toBeLessThanOrEqual(0.3);
      }
      unmount();
    }
  });
});
