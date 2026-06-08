import React, { useContext, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import Screen from '../components/Screen';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

type Mode = 'login' | 'register' | 'reset';

function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('auth/email-already-in-use')) return 'That email is already in use.';
  if (message.includes('auth/weak-password')) return 'Use at least 6 characters.';
  if (message.includes('auth/invalid-credential') || message.includes('auth/user-not-found') || message.includes('auth/wrong-password')) {
    return 'Email or password is wrong.';
  }
  if (message.includes('auth/configuration-not-found')) return 'Email sign-in is not enabled in Firebase.';
  return message || 'Try again.';
}

export default function AuthScreen() {
  const { login, register, resetPassword } = useContext(AuthContext);
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        if (!displayName.trim()) throw new Error('Add your name.');
        await register(displayName, email, password);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setMessage('Password reset email sent.');
      } else {
        await login(email, password);
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'register' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Sign in';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', marginBottom: 28 }}>
          <Text style={{ fontFamily: fonts.handwriting, fontSize: 56, color: colors.ink }}>Then</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 24 }}>Photos for people you choose.</Text>
        </View>

        <View
          style={{
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            backgroundColor: colors.paper,
            borderColor: colors.border,
            borderWidth: 1,
            padding: 18,
            gap: 12,
          }}
        >
          <Text variant="titleLarge">{title}</Text>
          {mode === 'register' ? (
            <TextInput label="Your name" value={displayName} onChangeText={setDisplayName} disabled={busy} />
          ) : null}
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            disabled={busy}
          />
          {mode !== 'reset' ? (
            <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry disabled={busy} />
          ) : null}

          {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
          {message ? <Text style={{ color: colors.primary }}>{message}</Text> : null}

          <Button mode="contained" onPress={submit} loading={busy} disabled={busy || !email.trim() || (mode !== 'reset' && !password)}>
            {mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in'}
          </Button>

          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Button mode="text" onPress={() => setMode(mode === 'register' ? 'login' : 'register')}>
              {mode === 'register' ? 'I have an account' : 'Create account'}
            </Button>
            <Button mode="text" onPress={() => setMode(mode === 'reset' ? 'login' : 'reset')}>
              {mode === 'reset' ? 'Back to sign in' : 'Forgot password'}
            </Button>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
