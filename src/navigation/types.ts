import type { Moment } from '../services/types';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  MomentDetail: { momentId: string; moment?: Moment; canNote?: boolean };
  RollSettings: undefined;
  Notifications: undefined;
  YourYear: { year?: number } | undefined;
  Notes: { moment: Moment };
  LinkedMoment: { momentId: string; target?: string };
  Profile: { handle?: string; uid?: string };
};

export type TabsParamList = {
  FeedTab: undefined;
  WanderTab: undefined;
  NewMomentTab: undefined;
  FriendsTab: undefined;
  RollTab: undefined;
};
