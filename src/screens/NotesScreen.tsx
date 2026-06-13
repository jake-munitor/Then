import React, { useContext, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ListenerError from '../components/ListenerError';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import type { RootStackParamList } from '../navigation/types';
import { addNote, subscribeNotes } from '../services/moments';
import { markMomentNotificationsRead } from '../services/notifications';
import { subscribePublicUsers } from '../services/users';
import type { Note, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Notes'>;

export default function NotesScreen({ route, navigation }: Props) {
  const { user } = useContext(AuthContext);
  const { moment } = route.params;
  const [notes, setNotes] = useState<Note[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      subscribeNotes(
        moment.id,
        (nextNotes) => {
          setNotes(nextNotes);
          setLoading(false);
        },
        () => {
          setListenerError('Notes could not be loaded.');
          setLoading(false);
        },
      ),
    [moment.id],
  );

  useEffect(() => {
    if (user?.uid === moment.authorUid) {
      markMomentNotificationsRead(user.uid, moment.id).catch(() => {});
    }
  }, [moment.authorUid, moment.id, user?.uid]);

  const uids = useMemo(() => notes.map((note) => note.authorUid).concat(moment.authorUid), [notes, moment.authorUid]);
  useEffect(
    () => subscribePublicUsers(uids, setPublicUsers, () => setListenerError('Some profile details could not be loaded.')),
    [uids.join('|')],
  );

  const submit = async () => {
    if (!user?.uid || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addNote({ momentId: moment.id, uid: user.uid, text });
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send note.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen contentStyle={{ alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 560, gap: 16 }}>
        <PageHeader
          title="Notes"
          subtitle="A quiet conversation around this moment."
          right={
            <IconButton
              icon="close"
              onPress={() => navigation.goBack()}
              accessibilityLabel="Close notes"
            />
          }
        />
        <ListenerError message={listenerError} onRetry={() => setListenerError(null)} />
        <View style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 18 }}>
          <Text variant="headlineSmall">{moment.frontText}</Text>
          <Text style={{ color: colors.textSecondary }}>
            From {publicUsers[moment.authorUid]?.displayName ?? 'Then Friend'}
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {loading ? (
            <ActivityIndicator />
          ) : notes.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No notes yet.</Text>
          ) : (
            notes.map((note) => (
              <View key={note.id} style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 16 }}>
                <Text variant="titleMedium">{publicUsers[note.authorUid]?.displayName ?? 'Then Friend'}</Text>
                <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 4 }}>{note.text}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
          <TextInput label="leave a note" value={text} onChangeText={setText} multiline disabled={busy} />
          {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
          <Button mode="contained" onPress={submit} loading={busy} disabled={busy || !text.trim()}>
            Send
          </Button>
        </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
