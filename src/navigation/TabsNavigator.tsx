import React, { useContext, useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, useTheme } from 'react-native-paper';

import FeedScreen from '../screens/FeedScreen';
import FriendsScreen from '../screens/FriendsScreen';
import NewMomentScreen from '../screens/NewMomentScreen';
import RollScreen from '../screens/RollScreen';
import WanderScreen from '../screens/WanderScreen';
import { subscribeFollowRequests } from '../services/follows';
import { AuthContext } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { TabsParamList } from './types';

const Tab = createBottomTabNavigator<TabsParamList>();

export default function TabsNavigator() {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setRequestCount(0);
      return;
    }
    return subscribeFollowRequests(user.uid, (requests) => setRequestCount(requests.length));
  }, [user?.uid]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarItemStyle: {
          height: 58,
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
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
                  marginTop: -20,
                  width: 66,
                  height: 66,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'center',
                  backgroundColor: theme.colors.primary,
                  shadowColor: '#3B2F25',
                  shadowOpacity: 0.16,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 3,
                },
              ]}
            >
              <Icon source="camera-plus-outline" color={theme.colors.onPrimary} size={30} />
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
          tabBarBadge: requestCount || undefined,
        }}
      />
    </Tab.Navigator>
  );
}
