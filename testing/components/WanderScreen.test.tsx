import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';

import WanderScreen from '../../src/screens/WanderScreen';
import { AuthContext } from '../../src/store/AuthContext';
import { appTheme } from '../../src/theme/theme';

jest.mock('../../src/components/MomentCard', () => {
  const React = require('react');
  const { Text } = require('react-native-paper');

  return (props: any) =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, null, props.moment.frontText),
      React.createElement(Text, null, props.connectionLine),
      React.createElement(Text, null, props.onFollow ? 'request available' : 'no request'),
    );
});

jest.mock('../../src/services/moments', () => ({
  subscribeWanderMoments: jest.fn((onChange) => {
    onChange([
      { id: 'own', authorUid: 'user-1', frontText: 'my post', appearInWander: true },
      { id: 'followed', authorUid: 'user-2', frontText: 'friend post', appearInWander: true },
      { id: 'new', authorUid: 'user-3', frontText: 'new person post', appearInWander: true },
    ]);
    return () => {};
  }),
}));

jest.mock('../../src/services/follows', () => ({
  requestFollow: jest.fn(async () => {}),
  subscribeFollowing: jest.fn((_uid, onChange) => {
    onChange(['user-2']);
    return () => {};
  }),
}));

jest.mock('../../src/services/users', () => ({
  subscribePublicUsers: jest.fn((_uids, onChange) => {
    onChange({});
    return () => {};
  }),
}));

describe('WanderScreen', () => {
  it('keeps opted-in posts visible for the owner, followed people, and new people', () => {
    render(
      <PaperProvider theme={appTheme}>
        <AuthContext.Provider
          value={{
            user: { uid: 'user-1', email: 'jake@example.com', displayName: 'Jake' },
            isLoading: false,
            login: jest.fn(),
            register: jest.fn(),
            resetPassword: jest.fn(),
            updateDisplayName: jest.fn(),
            logout: jest.fn(),
          }}
        >
          <NavigationContainer>
            <WanderScreen />
          </NavigationContainer>
        </AuthContext.Provider>
      </PaperProvider>,
    );

    expect(screen.getByText('my post')).toBeTruthy();
    expect(screen.getByText('friend post')).toBeTruthy();
    expect(screen.getByText('new person post')).toBeTruthy();
    expect(screen.getByText('your Wander post')).toBeTruthy();
    expect(screen.getByText('keeping up')).toBeTruthy();
    expect(screen.getAllByText('no request')).toHaveLength(2);
    expect(screen.getByText('request available')).toBeTruthy();
  });
});
