import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { StyleSheet } from 'react-native';

import MomentCard from '../../src/components/MomentCard';
import type { Moment } from '../../src/services/types';
import { AuthContext } from '../../src/store/AuthContext';
import { fonts } from '../../src/theme/fonts';
import { appTheme } from '../../src/theme/theme';
import { colors } from '../../src/theme/colors';

jest.mock('../../src/services/moments', () => ({
  subscribeMomentKeep: jest.fn((_params, onChange) => {
    onChange(false);
    return () => {};
  }),
  subscribeMomentSaved: jest.fn((_params, onChange) => {
    onChange(false);
    return () => {};
  }),
  toggleKeep: jest.fn(async () => {}),
  toggleSave: jest.fn(async () => {}),
}));

const moment: Moment = {
  id: 'moment-1',
  authorUid: 'user-2',
  imageUrl: 'https://example.com/photo.jpg',
  frontText: 'golden hour.',
  photoFilter: 'normal',
  memoryDate: '2026-05-09',
  keptCount: 47,
  noteCount: 0,
  appearInWander: false,
};

describe('MomentCard', () => {
  function renderCard(props: Partial<React.ComponentProps<typeof MomentCard>> = {}) {
    render(
      <PaperProvider theme={appTheme}>
        <AuthContext.Provider
          value={{
            user: { uid: 'user-1', email: 'jake@example.com', displayName: 'Jake' },
            isLoading: false,
            login: jest.fn(),
            register: jest.fn(),
            resetPassword: jest.fn(),
            updateDisplayName: jest.fn(),
            deleteAccount: jest.fn(),
            logout: jest.fn(),
          }}
        >
          <MomentCard
            moment={moment}
            author={{ uid: 'user-2', displayName: 'Maisie K', handle: 'maisie', avatarUrl: null, profileVisibility: 'private', appearInWander: false }}
            onNotes={jest.fn()}
            {...props}
          />
        </AuthContext.Provider>
      </PaperProvider>,
    );
  }

  it('renders the public front without the private back in feed mode', () => {
    renderCard();

    expect(screen.getByText('golden hour.')).toBeTruthy();
    expect(screen.getByText('maisie k')).toBeTruthy();
    expect(screen.queryByText("the field behind gran's.")).toBeNull();
  });

  it('keeps the private back out of roll cards because detail owns flipping', () => {
    renderCard({ mode: 'roll', canFlipBack: true });

    expect(screen.queryByText("the field behind gran's.")).toBeNull();
  });

  it('does not expose the private back in wander mode', () => {
    renderCard({ mode: 'wander', canFlipBack: false });

    expect(screen.getByText('golden hour.')).toBeTruthy();
    expect(screen.queryByText("the field behind gran's.")).toBeNull();
  });

  it('renders only the normal heart, note, and save actions', () => {
    renderCard();

    expect(screen.getByLabelText('Keep this')).toBeTruthy();
    expect(screen.getByLabelText('Open notes')).toBeTruthy();
    expect(screen.getByLabelText('Save for later')).toBeTruthy();
    expect(screen.queryByLabelText('Delete moment')).toBeNull();
  });

  it('shows owner deletion only when an explicit delete action is provided', () => {
    const onDelete = jest.fn();
    renderCard({ mode: 'roll', onDelete });

    fireEvent.press(screen.getByLabelText('Delete moment'));
    expect(onDelete).toHaveBeenCalledWith(moment);
  });

  it('gives long captions enough line height and vertical padding to wrap cleanly', () => {
    renderCard({
      moment: {
        ...moment,
        frontText: 'A longer memory title with letters that descend.',
      },
    });

    const caption = screen.getByTestId('moment-caption');
    const mergedStyle = StyleSheet.flatten(caption.props.style);

    expect(caption.props.numberOfLines).toBeUndefined();
    expect(mergedStyle.lineHeight).toBeGreaterThan(mergedStyle.fontSize);
  });

  it('uses the feed photo ratio and editorial caption treatment', () => {
    renderCard();

    const photoStyle = StyleSheet.flatten(screen.getByTestId('moment-photo-image').props.style);
    const captionStyle = StyleSheet.flatten(screen.getByTestId('moment-caption').props.style);
    const signature = screen.getByTestId('moment-author-signature');
    const signatureStyle = StyleSheet.flatten(signature.props.style);

    expect(photoStyle.aspectRatio).toBe(1);
    expect(captionStyle.fontFamily).toBe(fonts.captionSerif);
    expect(signature).toHaveStyle({ fontFamily: fonts.signature });
    expect(signature.props.numberOfLines).toBeUndefined();
    expect(signatureStyle.lineHeight).toBeGreaterThan(signatureStyle.fontSize * 1.3);
  });

  it('renders the saved photo tone over the image', () => {
    renderCard({
      moment: {
        ...moment,
        photoFilter: 'sunfade',
      },
    });

    expect(screen.getByTestId('moment-photo-image-filter-sunfade-peach-wash')).toBeTruthy();
  });

  it('frames the square photo in a warm polaroid card', () => {
    renderCard();

    const frameStyle = StyleSheet.flatten(screen.getByTestId('moment-frame').props.style);
    const photoMatStyle = StyleSheet.flatten(screen.getByTestId('moment-photo-mat').props.style);

    expect(frameStyle.backgroundColor).toBe(colors.polaroid);
    expect(frameStyle.borderRadius).toBe(8);
    expect(frameStyle.paddingTop).toBe(14);
    expect(frameStyle.paddingHorizontal).toBe(14);
    expect(photoMatStyle.borderRadius).toBe(5);
    expect(photoMatStyle.borderWidth).toBe(1);
  });

});
