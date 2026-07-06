import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import NewMomentScreen from '../../src/screens/NewMomentScreen';
import { AuthContext } from '../../src/store/AuthContext';
import { appTheme } from '../../src/theme/theme';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../src/services/moments', () => ({
  createMoment: jest.fn(async () => 'moment-1'),
}));

jest.mock('../../src/services/users', () => ({
  subscribePublicUsers: jest.fn((_uids, onChange) => {
    onChange({});
    return () => {};
  }),
}));

function renderScreen() {
  return render(
    <PaperProvider theme={appTheme}>
      <AuthContext.Provider
        value={{
          user: { uid: 'author', email: 'author@example.com', displayName: 'Author' },
          isLoading: false,
          login: jest.fn(),
          register: jest.fn(),
          resetPassword: jest.fn(),
          updateDisplayName: jest.fn(),
          deleteAccount: jest.fn(),
          logout: jest.fn(),
        }}
      >
        <NewMomentScreen />
      </AuthContext.Provider>
    </PaperProvider>,
  );
}

describe('NewMomentScreen', () => {
  it('accepts typed input in the front caption field', () => {
    renderScreen();

    const caption = screen.getByPlaceholderText('first light, no plans');
    fireEvent.changeText(caption, 'golden hour');

    expect(caption.props.value).toBe('golden hour');
    expect(screen.getByText('11 / 50')).toBeTruthy();
  });

  it('caps the front caption at 50 characters', () => {
    renderScreen();

    const caption = screen.getByPlaceholderText('first light, no plans');
    fireEvent.changeText(caption, 'x'.repeat(80));

    expect(caption.props.value).toHaveLength(50);
    expect(screen.getByText('50 / 50')).toBeTruthy();
  });
});
