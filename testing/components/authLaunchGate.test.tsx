import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// Override the global mock: fire onAuthStateChanged ASYNC like production.
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((_auth: unknown, onChange: (u: null) => void) => {
    setTimeout(() => onChange(null), 10);
    return () => {};
  }),
  signInWithEmailAndPassword: jest.fn(async () => {}),
  signOut: jest.fn(async () => {}),
  createUserWithEmailAndPassword: jest.fn(async () => ({ user: {} })),
  sendPasswordResetEmail: jest.fn(async () => {}),
  updateProfile: jest.fn(async () => {}),
  deleteUser: jest.fn(async () => {}),
  reauthenticateWithCredential: jest.fn(async () => {}),
  EmailAuthProvider: { credential: jest.fn() },
}));

import { AuthContext, AuthProvider } from '../../src/store/AuthContext';

/**
 * The root cause of four consecutive 2.1.0 App Review rejections ("loading
 * indefinitely on launch"). AuthContext memoized its value with deps [user]
 * only; on a signed-out launch onAuthStateChanged fires with null, user stays
 * null, the memo never recomputes, and consumers hold isLoading: true forever
 * - so the launch gate never opens. Only fresh installs walk that path, which
 * is why no signed-in tester ever reproduced it.
 *
 * The global jest mock fires onAuthStateChanged synchronously, which masks
 * the bug (the sync setState lands before the first memo is consumed). This
 * file overrides the mock to fire on a timer, matching production - the
 * configuration under which the regression actually reproduces. Verified: the
 * buggy deps fail this test; the fix ([user, isLoading]) passes it.
 */
const history: boolean[] = [];
function Probe() {
  const { isLoading } = React.useContext(AuthContext);
  history.push(isLoading);
  return null;
}

it('signed-out launch with async auth: consumers observe isLoading finish', async () => {
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(history[history.length - 1]).toBe(false), { timeout: 3000 });
  expect(history[0]).toBe(true);
});
