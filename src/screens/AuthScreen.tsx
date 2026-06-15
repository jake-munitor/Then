import React, { useContext, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import FilmStripe from '../components/FilmStripe';
import PageHeader from '../components/PageHeader';
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
        <PageHeader title="Then" subtitle="Photos from people you choose." />

        <View
          style={{
            width: '100%',
            maxWidth: 440,
            alignSelf: 'center',
            backgroundColor: colors.paper,
            borderColor: colors.borderStrong,
            borderWidth: 1,
            borderRadius: 2,
            paddingHorizontal: 22,
            paddingTop: 24,
            paddingBottom: 20,
            gap: 13,
            shadowColor: '#332A21',
            shadowOpacity: 0.1,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 3,
          }}
        >
          <View style={{ gap: 5, marginBottom: 3 }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fonts.displayMedium,
                fontSize: 31,
                lineHeight: 35,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontFamily: fonts.bodyMedium,
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Your private photo circle
            </Text>
          </View>
          {mode === 'register' ? (
            <TextInput
              label="Your name"
              value={displayName}
              onChangeText={setDisplayName}
              disabled={busy}
              style={{ backgroundColor: colors.surface }}
            />
          ) : null}
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            disabled={busy}
            style={{ backgroundColor: colors.surface }}
          />
          {mode !== 'reset' ? (
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              disabled={busy}
              style={{ backgroundColor: colors.surface }}
            />
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

          <View style={{ alignItems: 'center', gap: 9, marginTop: 1 }}>
            <FilmStripe width={62} height={3} />
            <Text
              style={{
                color: colors.textMuted,
                fontFamily: fonts.bodyMedium,
                fontSize: 9,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              Keep the moment, skip the noise
            </Text>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
