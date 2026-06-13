import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import NotesScreen from '../../src/screens/NotesScreen';
import { AuthContext } from '../../src/store/AuthContext';
import { appTheme } from '../../src/theme/theme';

jest.mock('../../src/services/moments', () => ({
  addNote: jest.fn(async () => {}),
  subscribeNotes: jest.fn((_momentId, onChange) => {
    onChange([]);
    return () => {};
  }),
}));

jest.mock('../../src/services/notifications', () => ({
  markMomentNotificationsRead: jest.fn(async () => {}),
}));

jest.mock('../../src/services/users', () => ({
  subscribePublicUsers: jest.fn((_uids, onChange) => {
    onChange({});
    return () => {};
  }),
}));

describe('NotesScreen', () => {
  it('always provides an explicit close action', () => {
    const goBack = jest.fn();
    render(
      <PaperProvider theme={appTheme}>
        <AuthContext.Provider
          value={{
            user: { uid: 'owner', email: 'owner@example.com', displayName: 'Owner' },
            isLoading: false,
            login: jest.fn(),
            register: jest.fn(),
            resetPassword: jest.fn(),
            updateDisplayName: jest.fn(),
            deleteAccount: jest.fn(),
            logout: jest.fn(),
          }}
        >
          <NotesScreen
            route={{
              key: 'notes',
              name: 'Notes',
              params: {
                moment: {
                  id: 'moment-1',
                  authorUid: 'owner',
                  imageUrl: 'https://example.com/photo.jpg',
                  frontText: 'morning bubbles',
                  memoryDate: '2026-06-11',
                  keptCount: 0,
                  noteCount: 0,
                  appearInWander: false,
                },
              },
            } as any}
            navigation={{ goBack } as any}
          />
        </AuthContext.Provider>
      </PaperProvider>,
    );

    fireEvent.press(screen.getByLabelText('Close notes'));
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText('No notes yet.')).toBeTruthy();
  });
});
