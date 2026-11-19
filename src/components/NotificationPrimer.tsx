import React, { useEffect, useRef, useState } from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

import { registerForPushNotifications } from '../services/pushNotifications';
import {
  shouldOfferNotifications,
  snoozeNotificationOffer,
  subscribeNotificationSuggestions,
  type NotificationReason,
} from '../services/pushPrimer';
import { colors } from '../theme/colors';
import { dialogStyle } from '../theme/theme';

const TITLES: Record<NotificationReason, string> = {
  'first-moment': 'Hear back, quietly',
  friend: 'Know when your people share',
};

// Long enough for the screen change that triggered it to settle first.
const SHOW_DELAY_MS = 900;

/**
 * Our own question before the system one. iOS asks only once, so the system
 * dialog is spent only on someone who has already said yes here.
 * Mounted once, in TabsNavigator.
 */
export default function NotificationPrimer() {
  const [reason, setReason] = useState<NotificationReason | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeNotificationSuggestions((nextReason) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        shouldOfferNotifications()
          .then((offer) => {
            if (active && offer) setReason(nextReason);
          })
          .catch(() => {});
      }, SHOW_DELAY_MS);
    });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      unsubscribe();
    };
  }, []);

  const notNow = () => {
    setReason(null);
    void snoozeNotificationOffer();
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      await registerForPushNotifications({ prompt: true });
    } catch {
      // A failed registration retries on the next launch.
    } finally {
      setBusy(false);
      setReason(null);
    }
  };

  return (
    <Portal>
      <Dialog style={dialogStyle} visible={reason !== null} onDismiss={notNow}>
        <Dialog.Title>{reason ? TITLES[reason] : ''}</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
            Then can tell you when a friend shares a moment or leaves you a note. You choose which ones in Settings.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={notNow} disabled={busy} textColor={colors.textMuted}>
            Not now
          </Button>
          <Button onPress={turnOn} loading={busy} disabled={busy}>
            Turn on
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
