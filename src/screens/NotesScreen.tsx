import React, { useContext, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Screen from '../components/Screen';
import type { RootStackParamList } from '../navigation/types';
import { addNote, subscribeNotes } from '../services/moments';
import { subscribePublicUsers } from '../services/users';
import type { Note, PublicUser } from '../services/types';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

type Props = NativeStackScreenProps<RootStackParamList, 'Notes'>;

export default function NotesScreen({ route }: Props) {
  const { user } = useContext(AuthContext);
  const { moment } = route.params;
  const [notes, setNotes] = useState<Note[]>([]);
  const [publicUsers, setPublicUsers] = useState<Record<string, PublicUser>>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeNotes(moment.id, setNotes), [moment.id]);

  const uids = useMemo(() => notes.map((note) => note.authorUid).concat(moment.authorUid), [notes, moment.authorUid]);
  useEffect(() => subscribePublicUsers(uids, setPublicUsers), [uids.join('|')]);

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
        <View style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, padding: 16 }}>
          <Text style={{ fontFamily: fonts.handwriting, fontSize: 28, color: colors.ink }}>{moment.frontText}</Text>
          <Text style={{ color: colors.textSecondary }}>
            by {publicUsers[moment.authorUid]?.displayName ?? 'Then Friend'}
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {notes.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No notes yet.</Text>
          ) : (
            notes.map((note) => (
              <View key={note.id} style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, padding: 14 }}>
                <Text variant="labelLarge">{publicUsers[note.authorUid]?.displayName ?? 'Then Friend'}</Text>
                <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 4 }}>{note.text}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, padding: 14, gap: 10 }}>
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
