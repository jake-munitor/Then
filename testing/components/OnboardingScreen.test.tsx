import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import OnboardingScreen from '../../src/screens/OnboardingScreen';
import { stashPendingInviteCode } from '../../src/services/invites';
import { updateThenSettings } from '../../src/services/users';
import { AuthContext } from '../../src/store/AuthContext';
import { OnboardingGateContext } from '../../src/store/OnboardingGate';
import { appTheme } from '../../src/theme/theme';

jest.mock('../../src/services/users', () => ({
  updateThenSettings: jest.fn(async () => {}),
}));

jest.mock('../../src/services/invites', () => ({
  ...jest.requireActual('../../src/services/invites'),
  createInvite: jest.fn(async () => ({ code: 'ABCDEF', url: 'https://app.munitor.ai/then/invite/ABCDEF' })),
  stashPendingInviteCode: jest.fn(async () => {}),
}));

jest.mock('../../src/services/photos', () => ({
  uploadAvatar: jest.fn(async () => 'https://example.com/avatar.jpg'),
}));

function renderScreen(finishOnboarding = jest.fn()) {
  render(
    <PaperProvider theme={appTheme}>
      <AuthContext.Provider
        value={{
          user: { uid: 'new-user', email: 'new@example.com', displayName: 'Maisie' },
          isLoading: false,
          login: jest.fn(),
          register: jest.fn(),
          resetPassword: jest.fn(),
          updateDisplayName: jest.fn(),
          deleteAccount: jest.fn(),
          logout: jest.fn(),
        }}
      >
        <OnboardingGateContext.Provider value={{ finishOnboarding, initialTab: 'FeedTab' }}>
          <OnboardingScreen />
        </OnboardingGateContext.Provider>
      </AuthContext.Provider>
    </PaperProvider>,
  );
  return finishOnboarding;
}

async function reachInviteStep(profileButton: 'First moment' | 'Friends') {
  fireEvent.press(screen.getByLabelText('Continue'));
  fireEvent.press(screen.getByLabelText(profileButton));
  await screen.findByLabelText('Maybe later');
}

describe('OnboardingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  // Field report: a new user tapped the last button five times in seven
  // seconds. It used to call navigation.replace('MainTabs') before that route
  // existed, which failed silently and re-enabled the button.
  it('hands off to the app as soon as the profile saves, and stays busy', async () => {
    const finishOnboarding = renderScreen();
    await reachInviteStep('First moment');

    fireEvent.press(screen.getByLabelText('Maybe later'));

    await waitFor(() => expect(finishOnboarding).toHaveBeenCalledWith('NewMomentTab'));
    expect(updateThenSettings).toHaveBeenLastCalledWith(expect.objectContaining({ onboardingCompleted: true }));
    expect(screen.getByLabelText('Maybe later')).toBeDisabled();

    fireEvent.press(screen.getByLabelText('Maybe later'));
    expect(finishOnboarding).toHaveBeenCalledTimes(1);
  });

  it('opens on Friends when that was the choice', async () => {
    const finishOnboarding = renderScreen();
    await reachInviteStep('Friends');

    fireEvent.press(screen.getByLabelText('Maybe later'));

    await waitFor(() => expect(finishOnboarding).toHaveBeenCalledWith('FriendsTab'));
  });

  // iOS forgets an invite link across an App Store install, so a new person
  // arrives with only the code in their head. Onboarding asks for it.
  it('stashes a friend\'s invite code so the app connects them on arrival', async () => {
    const finishOnboarding = renderScreen();
    await reachInviteStep('First moment');

    fireEvent.changeText(screen.getByTestId('onboarding-invite-code'), 'k7m2qx');
    fireEvent.press(screen.getByLabelText('Maybe later'));

    await waitFor(() => expect(finishOnboarding).toHaveBeenCalled());
    expect(stashPendingInviteCode).toHaveBeenCalledWith('K7M2QX');
  });

  it('refuses a half-typed invite code instead of dropping it silently', async () => {
    const finishOnboarding = renderScreen();
    await reachInviteStep('First moment');

    fireEvent.changeText(screen.getByTestId('onboarding-invite-code'), 'K7M');
    fireEvent.press(screen.getByLabelText('Maybe later'));

    expect(await screen.findByText(/Invite codes are 6 letters and numbers/)).toBeTruthy();
    expect(finishOnboarding).not.toHaveBeenCalled();
    expect(stashPendingInviteCode).not.toHaveBeenCalled();
  });

  it('re-enables the buttons and stays put when the save fails', async () => {
    const finishOnboarding = renderScreen();
    await reachInviteStep('First moment');
    (updateThenSettings as jest.Mock).mockRejectedValueOnce(new Error('offline'));

    fireEvent.press(screen.getByLabelText('Maybe later'));

    expect(await screen.findByText('offline')).toBeTruthy();
    expect(finishOnboarding).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Maybe later')).not.toBeDisabled();
  });
});
