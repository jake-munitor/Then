import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { PaperProvider, Portal } from 'react-native-paper';

import MomentDetailScreen from '../../src/screens/MomentDetailScreen';
import { AuthContext } from '../../src/store/AuthContext';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
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
  deleteMoment: jest.fn(async () => {}),
  saveMomentBack: jest.fn(async () => {}),
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

jest.mock('../../src/services/follows', () => ({
  blockUser: jest.fn(async () => {}),
  reportUser: jest.fn(async () => {}),
}));

jest.mock('../../src/services/users', () => ({
  subscribePublicUsers: jest.fn((_uids, onChange) => {
    onChange({ owner: { uid: 'owner', displayName: 'Owner', handle: 'owner', avatarUrl: null, profileVisibility: 'private', appearInWander: false } });
    return () => {};
  }),
}));

function renderDetail(uid: string, canNote = true) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn(), canGoBack: () => true, replace: jest.fn() };
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
          navigation={navigation as any}
        />
      </AuthContext.Provider>
    </PaperProvider>,
  );
  return navigation;
}

describe('MomentDetailScreen', () => {
  it('shows the private back affordance only to the owner', () => {
    renderDetail('owner');

    expect(screen.getByText('Everyone actually came.')).toBeTruthy();
    expect(screen.getAllByText('Edit back').length).toBeGreaterThan(0);
  });

  it('does not render the private back for another viewer', () => {
    renderDetail('friend');

    expect(screen.queryByText('Everyone actually came.')).toBeNull();
    expect(screen.queryByText('Edit back')).toBeNull();
  });

  it('hides the note composer when the route is not note eligible', () => {
    renderDetail('friend', false);

    expect(screen.queryByPlaceholderText('leave a quiet note...')).toBeNull();
  });

  it('keeps the detail print constrained instead of stretching full-width on web', () => {
    renderDetail('friend');

    const frameStyle = StyleSheet.flatten(screen.getByTestId('moment-detail-frame').props.style);
    const actionsStyle = StyleSheet.flatten(screen.getByTestId('moment-detail-actions').props.style);
    const composerStyle = StyleSheet.flatten(screen.getByTestId('moment-detail-note-composer').props.style);

    expect(frameStyle.backgroundColor).toBe(colors.polaroid);
    expect(frameStyle.paddingHorizontal).toBe(14);
    expect(frameStyle.overflow).toBe('hidden');
    expect(actionsStyle.alignSelf).toBe('center');
    expect(composerStyle.alignSelf).toBe('center');
  });

  it('uses the handwritten signature instead of metadata under the detail caption', () => {
    renderDetail('friend');

    const signature = screen.getByTestId('moment-detail-author-signature');
    const signatureStyle = StyleSheet.flatten(signature.props.style);

    expect(signature.props.children).toBe('owner');
    expect(signatureStyle.fontFamily).toBe(fonts.signature);
    expect(signatureStyle.lineHeight).toBeGreaterThan(signatureStyle.fontSize * 1.3);
    expect(screen.queryByText('from Owner - Jun 20, 2026')).toBeNull();
  });

  it('deletes the moment through the "..." menu (regression: menu was previously a dead icon)', async () => {
    const { deleteMoment } = require('../../src/services/moments');
    const navigation = renderDetail('owner');

    fireEvent.press(screen.getByTestId('moment-detail-menu-button'));
    fireEvent.press(await screen.findByText('Delete moment'));
    fireEvent.press(await screen.findByText('Delete'));

    await waitFor(() => expect(deleteMoment).toHaveBeenCalledWith({ momentId: moment.id, uid: 'owner' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('offers report/block instead of delete to a non-owner viewer', async () => {
    const { blockUser } = require('../../src/services/follows');
    renderDetail('friend');

    fireEvent.press(screen.getByTestId('moment-detail-menu-button'));
    expect(await screen.findByText('Report moment')).toBeTruthy();
    fireEvent.press(screen.getByText(/^Block /));
    fireEvent.press(await screen.findByText('Block'));

    await waitFor(() => expect(blockUser).toHaveBeenCalledWith('owner'));
  });
});
