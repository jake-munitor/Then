import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import MomentCard from '../../src/components/MomentCard';
import type { Moment } from '../../src/services/types';
import { AuthContext } from '../../src/store/AuthContext';
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
});
