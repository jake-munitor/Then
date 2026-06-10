import React, { createContext, useEffect, useMemo, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '../firebase/firebase';
import { deleteAccountData } from '../services/account';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

function toAuthUser(user: FirebaseUser): AuthUser {
  return { uid: user.uid, email: user.email, displayName: user.displayName };
}

function handleFromDisplayName(displayName: string, email: string | null) {
  const value = displayName || email?.split('@')[0] || 'friend';
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const loadingFallback = setTimeout(() => {
      setIsLoading(false);
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(loadingFallback);
      setUser(firebaseUser ? toAuthUser(firebaseUser) : null);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(loadingFallback);
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (email, password) => {
        if (!auth) throw new Error('Firebase is not initialized.');
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      register: async (displayName, email, password) => {
        if (!auth || !db) throw new Error('Firebase is not initialized.');
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const cleanName = displayName.trim();
        await updateProfile(credential.user, { displayName: cleanName });

        const baseProfile = {
          displayName: cleanName,
          handle: handleFromDisplayName(cleanName, credential.user.email),
          avatarUrl: null,
          profileVisibility: 'private',
          appearInWander: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', credential.user.uid), {
          ...baseProfile,
          email: credential.user.email,
        });
        await setDoc(doc(db, 'publicUsers', credential.user.uid), baseProfile);
      },
      resetPassword: async (email) => {
        if (!auth) throw new Error('Firebase is not initialized.');
        await sendPasswordResetEmail(auth, email.trim());
      },
      updateDisplayName: async (displayName) => {
        if (!auth?.currentUser || !db) throw new Error('Firebase is not initialized.');
        const cleanName = displayName.trim();
        await updateProfile(auth.currentUser, { displayName: cleanName });
        await setDoc(
          doc(db, 'users', auth.currentUser.uid),
          { displayName: cleanName, updatedAt: serverTimestamp() },
          { merge: true },
        );
        await setDoc(
          doc(db, 'publicUsers', auth.currentUser.uid),
          { displayName: cleanName, updatedAt: serverTimestamp() },
          { merge: true },
        );
      },
      deleteAccount: async (password) => {
        if (!auth?.currentUser || !auth.currentUser.email) throw new Error('Sign in again before deleting your account.');
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
        const uid = auth.currentUser.uid;
        await deleteAccountData(uid);
        await deleteUser(auth.currentUser);
      },
      logout: async () => {
        if (!auth) throw new Error('Firebase is not initialized.');
        await signOut(auth);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
