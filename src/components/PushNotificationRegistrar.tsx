import React, { useContext, useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { registerPushToken } from '../services/notifications';
import { AuthContext } from '../store/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function PushNotificationRegistrar() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user?.uid) return;
    registerPushToken(user.uid).catch(() => {});
  }, [user?.uid]);

  return null;
}
