import React from 'react';

import type { TabsParamList } from '../navigation/types';

export type OnboardingGateValue = {
  /**
   * Called by OnboardingScreen once the server has accepted the finished
   * profile. Swaps the navigator to the main app immediately instead of
   * waiting for the Firestore snapshot to report the same thing.
   */
  finishOnboarding: (firstTab: keyof TabsParamList) => void;
  /** Tab the main navigator opens on - the choice made during onboarding. */
  initialTab: keyof TabsParamList;
};

export const OnboardingGateContext = React.createContext<OnboardingGateValue>({
  finishOnboarding: () => {},
  initialTab: 'FeedTab',
});
