import type { Moment } from '../services/types';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  Notes: { moment: Moment };
};

export type TabsParamList = {
  FeedTab: undefined;
  WanderTab: undefined;
  NewMomentTab: undefined;
  FriendsTab: undefined;
  RollTab: undefined;
};
