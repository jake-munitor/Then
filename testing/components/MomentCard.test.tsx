import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { Image, StyleSheet } from 'react-native';

import MomentCard from '../../src/components/MomentCard';
import { subscribeMomentBack } from '../../src/services/moments';
import type { Moment } from '../../src/services/types';
import { AuthContext } from '../../src/store/AuthContext';
import { fonts } from '../../src/theme/fonts';
import { appTheme } from '../../src/theme/theme';

jest.mock('../../src/services/moments', () => ({
  subscribeMomentBack: jest.fn((_momentId, onChange) => {
    onChange({ text: "the field behind gran's." });
    return () => {};
  }),
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
    expect(screen.getByText(/Maisie K/i)).toBeTruthy();
    expect(screen.queryByText("the field behind gran's.")).toBeNull();
  });

  it('reveals the private back only when the owner roll card flips', () => {
    renderCard({ mode: 'roll', canFlipBack: true });

    expect(screen.queryByText("the field behind gran's.")).toBeNull();
    fireEvent.press(screen.getByLabelText('Flip moment'));
    expect(screen.getByText("the field behind gran's.")).toBeTruthy();
    expect(screen.getByLabelText('Show photo front')).toBeTruthy();
  });

  it('allows an owner to add a reflection after posting without one', () => {
    (subscribeMomentBack as jest.Mock).mockImplementationOnce((_momentId, onChange) => {
      onChange(null);
      return () => {};
    });
    const onEditBack = jest.fn();
    renderCard({ mode: 'roll', canFlipBack: true, onEditBack });

    fireEvent.press(screen.getByLabelText('Flip moment'));
    expect(screen.getByText('No private reflection yet.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Add private reflection'));
    expect(onEditBack).toHaveBeenCalledWith(moment, '');
  });

  it('does not expose the private back in wander mode', () => {
    renderCard({ mode: 'wander', canFlipBack: false });

    expect(screen.getByText('golden hour.')).toBeTruthy();
    expect(screen.queryByText("the field behind gran's.")).toBeNull();
  });

  it('renders only the normal heart, note, and save actions', () => {
    renderCard();

    expect(screen.getByLabelText('Like this')).toBeTruthy();
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
    expect(mergedStyle.paddingTop).toBeGreaterThan(0);
    expect(mergedStyle.paddingBottom).toBeGreaterThan(0);
  });

  it('uses the editorial 4:3 photo and serif caption treatment', () => {
    renderCard();

    const photo = screen.UNSAFE_getAllByType(Image)[0];
    const photoStyle = StyleSheet.flatten(photo.props.style);
    const captionStyle = StyleSheet.flatten(screen.getByTestId('moment-caption').props.style);

    expect(photoStyle.aspectRatio).toBe(4 / 3);
    expect(captionStyle.fontFamily).toBe(fonts.displayMedium);
    expect(screen.getByText('From Maisie K')).toBeTruthy();
  });
});
