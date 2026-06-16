import type { Moment } from '../services/types';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Notes: { moment: Moment };
  LinkedMoment: { momentId: string };
  Profile: { handle?: string; uid?: string };
};

export type TabsParamList = {
  FeedTab: undefined;
  WanderTab: undefined;
  NewMomentTab: undefined;
  FriendsTab: undefined;
  RollTab: undefined;
};
