import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import MomentDetailScreen from '../../src/screens/MomentDetailScreen';
import { AuthContext } from '../../src/store/AuthContext';
import { appTheme } from '../../src/theme/theme';

const moment = {
  id: 'moment-1',
  authorUid: 'owner',
  imageUrl: 'https://example.com/photo.jpg',
  frontText: 'the whole table showed up',
  photoFilter: 'normal',
  memoryDate: '2026-06-20',
  keptCount: 6,
  noteCount: 0,
  appearInWander: false,
};

jest.mock('../../src/services/moments', () => ({
  addNote: jest.fn(async () => {}),
  subscribeMoment: jest.fn((_momentId, onChange) => {
    onChange(moment);
    return () => {};
  }),
  subscribeMomentBack: jest.fn((_momentId, onChange) => {
    onChange({ text: 'Everyone actually came.' });
    return () => {};
  }),
  subscribeMomentKeep: jest.fn((_params, onChange) => {
    onChange(false);
    return () => {};
  }),
  subscribeMomentSaved: jest.fn((_params, onChange) => {
    onChange(false);
    return () => {};
  }),
  subscribeNotes: jest.fn((_momentId, onChange) => {
    onChange([]);
    return () => {};
  }),
  toggleKeep: jest.fn(async () => {}),
  toggleSave: jest.fn(async () => {}),
}));

jest.mock('../../src/services/notifications', () => ({
  markMomentNotificationsRead: jest.fn(async () => {}),
}));

jest.mock('../../src/services/users', () => ({
  subscribePublicUsers: jest.fn((_uids, onChange) => {
    onChange({ owner: { uid: 'owner', displayName: 'Owner', handle: 'owner', avatarUrl: null, profileVisibility: 'private', appearInWander: false } });
    return () => {};
  }),
}));

function renderDetail(uid: string, canNote = true) {
  render(
    <PaperProvider theme={appTheme}>
      <AuthContext.Provider
        value={{
          user: { uid, email: `${uid}@example.com`, displayName: uid },
          isLoading: false,
          login: jest.fn(),
          register: jest.fn(),
          resetPassword: jest.fn(),
          updateDisplayName: jest.fn(),
          deleteAccount: jest.fn(),
          logout: jest.fn(),
        }}
      >
        <MomentDetailScreen
          route={{ key: 'detail', name: 'MomentDetail', params: { momentId: moment.id, moment, canNote } } as any}
          navigation={{ goBack: jest.fn(), navigate: jest.fn() } as any}
        />
      </AuthContext.Provider>
    </PaperProvider>,
  );
}

describe('MomentDetailScreen', () => {
  it('shows the private back affordance only to the owner', () => {
    renderDetail('owner');

    expect(screen.getByText('Everyone actually came.')).toBeTruthy();
    expect(screen.getByText('Turn it over')).toBeTruthy();
  });

  it('does not render the private back for another viewer', () => {
    renderDetail('friend');

    expect(screen.queryByText('Everyone actually came.')).toBeNull();
    expect(screen.queryByText('Turn it over')).toBeNull();
  });

  it('hides the note composer when the route is not note eligible', () => {
    renderDetail('friend', false);

    expect(screen.queryByPlaceholderText('leave a quiet note...')).toBeNull();
  });
});
