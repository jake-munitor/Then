import React, { useContext, useEffect, useState } from 'react';
import { AppState, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, useTheme } from 'react-native-paper';

import FeedScreen from '../screens/FeedScreen';
import FriendsScreen from '../screens/FriendsScreen';
import NewMomentScreen from '../screens/NewMomentScreen';
import RollScreen from '../screens/RollScreen';
import WanderScreen from '../screens/WanderScreen';
import { subscribeFollowRequests } from '../services/follows';
import { fetchMomentsByAuthorPage } from '../services/moments';
import { subscribeNotificationPreferences, subscribeNotifications } from '../services/notifications';
import { rearmPostingReminders } from '../services/postingReminders';
import { registerForPushNotifications, setAppBadgeCount } from '../services/pushNotifications';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { TabsParamList } from './types';

const Tab = createBottomTabNavigator<TabsParamList>();

export default function TabsNavigator() {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const [requestCount, setRequestCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [remindersEnabled, setRemindersEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setRequestCount(0);
      return;
    }
    return subscribeFollowRequests(user.uid, (requests) => setRequestCount(requests.length));
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid) return;
    registerForPushNotifications().catch(() => {});
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid) {
      setNotificationCount(0);
      setAppBadgeCount(0).catch(() => {});
      return;
    }
    return subscribeNotifications(user.uid, (notifications) => {
      const unread = notifications.filter((item) => !item.readAt).length;
      setNotificationCount(unread);
      // Keep the home-screen icon badge honest: it mirrors unread
      // notifications and clears the moment they're read (previously a
      // hardcoded badge: 1 stuck forever).
      setAppBadgeCount(unread).catch(() => {});
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeNotificationPreferences(user.uid, (preferences) => setRemindersEnabled(preferences.reminders));
  }, [user?.uid]);

  // Arm the daily posting nudges whenever the app comes to the foreground or
  // the preference changes, skipping the rest of today if a moment was
  // already shared.
  useEffect(() => {
    if (!user?.uid || remindersEnabled === null) return;
    const uid = user.uid;
    const enabled = remindersEnabled;
    let active = true;

    const rearm = async () => {
      let postedToday = false;
      try {
        const { moments } = await fetchMomentsByAuthorPage({ authorUid: uid, pageSize: 1 });
        const latest = moments[0]?.createdAt;
        if (latest) postedToday = new Date(latest.seconds * 1000).toDateString() === new Date().toDateString();
      } catch {
        // Offline or slow start - arm anyway; posting later re-silences today.
      }
      if (active) await rearmPostingReminders({ enabled, postedToday });
    };

    rearm().catch(() => {});
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') rearm().catch(() => {});
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [user?.uid, remindersEnabled]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.navBar,
          borderTopColor: colors.borderInset,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 9,
          paddingBottom: 14,
          shadowColor: '#2A2622',
          shadowOpacity: 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        },
        tabBarItemStyle: {
          height: 60,
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 9,
          letterSpacing: 0.54,
          textTransform: 'uppercase',
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.primary,
          color: colors.paper,
          fontFamily: fonts.bodySemiBold,
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Icon source="image-multiple-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="WanderTab"
        component={WanderScreen}
        options={{
          title: 'Wander',
          tabBarIcon: ({ color, size }) => <Icon source="compass-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="NewMomentTab"
        component={NewMomentScreen}
        options={{
          title: '',
          tabBarIcon: ({ color, size }) => <Icon source="plus" color={color} size={size} />,
          tabBarButton: (props) => (
            <TouchableOpacity
              accessibilityRole={props.accessibilityRole}
              accessibilityState={props.accessibilityState ?? undefined}
              testID={props.testID}
              onPress={props.onPress}
              style={[
                props.style,
                {
                  marginTop: -16,
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'center',
                  backgroundColor: theme.colors.primary,
                  shadowColor: colors.primary,
                  shadowOpacity: 0.4,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                },
              ]}
            >
              <Icon source="camera-outline" color={theme.colors.onPrimary} size={25} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="FriendsTab"
        component={FriendsScreen}
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => <Icon source="account-multiple-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="RollTab"
        component={RollScreen}
        options={{
          title: 'Your roll',
          tabBarIcon: ({ color, size }) => <Icon source="filmstrip" color={color} size={size} />,
          tabBarBadge: requestCount + notificationCount || undefined,
        }}
      />
    </Tab.Navigator>
  );
}
