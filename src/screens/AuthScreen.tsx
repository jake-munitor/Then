import React, { useContext, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import Screen from '../components/Screen';
import { PillButton } from '../components/DesignPrimitives';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { radius } from '../theme/radius';

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 26, paddingTop: 42, paddingBottom: 36 }}>
        <View style={{ alignItems: 'center', minHeight: 220, justifyContent: 'center' }}>
          <View style={{ width: 246, height: 162 }}>
            <MiniPolaroid
              caption="the long way home"
              rotate="-8deg"
              left={8}
              top={18}
              color="#D1DEE4"
            />
            <MiniPolaroid
              caption="first light, no plans"
              rotate="6deg"
              left={106}
              top={0}
              color="#E2D2B4"
            />
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fonts.captionSerifMedium,
              fontSize: 52,
              lineHeight: 58,
            }}
          >
            then
          </Text>
          <Text style={{ marginTop: 6, color: colors.textSecondary, fontFamily: fonts.displayItalic, fontSize: 19, textAlign: 'center' }}>
            see your people, not the algorithm.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 18, gap: 12 }}>
            {mode === 'register' ? (
              <TextInput label="Your name" value={displayName} onChangeText={setDisplayName} disabled={busy} style={{ backgroundColor: colors.surfaceInset }} />
            ) : null}
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              disabled={busy}
              style={{ backgroundColor: colors.surfaceInset }}
            />
            {mode !== 'reset' ? (
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                disabled={busy}
                style={{ backgroundColor: colors.surfaceInset }}
              />
            ) : null}
            {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
            {message ? <Text style={{ color: colors.primary }}>{message}</Text> : null}
            <PillButton onPress={submit} disabled={busy || !email.trim() || (mode !== 'reset' && !password)}>
              {mode === 'register' ? 'Create your roll' : mode === 'reset' ? 'Send reset email' : 'Sign in'}
            </PillButton>
          </View>

          <Text style={{ color: colors.textMuted, textAlign: 'center', fontFamily: fonts.bodyRegular, fontSize: 13 }}>
            {mode === 'register' ? 'Already keep up here? ' : 'New here? '}
            <Text
              onPress={() => setMode(mode === 'register' ? 'login' : 'register')}
              style={{ color: colors.primary, fontFamily: fonts.bodySemiBold }}
            >
              {mode === 'register' ? 'Sign in' : 'Create your roll'}
            </Text>
          </Text>
          <Text
            onPress={() => setMode(mode === 'reset' ? 'login' : 'reset')}
            style={{ color: colors.textFaint, textAlign: 'center', fontFamily: fonts.bodyRegular, fontSize: 12.5 }}
          >
            {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function MiniPolaroid({
  caption,
  rotate,
  left,
  top,
  color,
}: {
  caption: string;
  rotate: string;
  left: number;
  top: number;
  color: string;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width: 136,
        padding: 8,
        paddingBottom: 19,
        borderRadius: radius.print,
        backgroundColor: colors.polaroid,
        shadowColor: '#785A46',
        shadowOpacity: 0.12,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 5 },
        elevation: 4,
        transform: [{ rotate }],
      }}
    >
      <View style={{ height: 104, backgroundColor: color }} />
      <Text style={{ marginTop: 7, color: colors.textSecondary, fontFamily: fonts.scriptMedium, fontSize: 16 }}>
        {caption}
      </Text>
    </View>
  );
}
