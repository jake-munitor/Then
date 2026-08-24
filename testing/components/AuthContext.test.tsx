import React, { useContext } from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
} from 'firebase/auth';

import { AuthContext, AuthProvider } from '../../src/store/AuthContext';
import { deleteAccountData } from '../../src/services/account';

const mockCurrentUser = { uid: 'user-1', email: 'jake@example.com', displayName: 'Jake' };

jest.mock('../../src/firebase/firebase', () => ({
  auth: { currentUser: { uid: 'user-1', email: 'jake@example.com', displayName: 'Jake' } },
  db: {},
}));
jest.mock('../../src/services/account', () => ({
  deleteAccountData: jest.fn(async () => {}),
}));

function DeleteAccountHarness() {
  const { deleteAccount, user } = useContext(AuthContext);
  return (
    <>
      <Text>{user?.displayName ?? 'signed out'}</Text>
      <Pressable accessibilityRole="button" onPress={() => deleteAccount('password')}>
        <Text>Delete now</Text>
      </Pressable>
    </>
  );
}

describe('AuthProvider account deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, onChange) => {
      onChange(mockCurrentUser);
      return () => {};
    });
  });

  it('reauthenticates before asking the backend to delete the account', async () => {
    render(
      <AuthProvider>
        <DeleteAccountHarness />
      </AuthProvider>,
    );

    expect(screen.getByText('Jake')).toBeTruthy();
    fireEvent.press(screen.getByText('Delete now'));

    await waitFor(() => expect(deleteAccountData).toHaveBeenCalled());
    expect(EmailAuthProvider.credential).toHaveBeenCalledWith('jake@example.com', 'password');
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(expect.objectContaining({ uid: 'user-1' }), expect.anything());
    expect(deleteAccountData).toHaveBeenCalledWith();
    expect(signOut).toHaveBeenCalled();
    expect((reauthenticateWithCredential as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (deleteAccountData as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  // The signed-out launch-gate regression lives in authLaunchGate.test.tsx -
  // it needs an async onAuthStateChanged mock, which this file's global sync
  // mock cannot express (and under which the bug does not reproduce).

});

