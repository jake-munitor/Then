import type { Timestamp } from 'firebase/firestore';
import type { PhotoFilter } from '../utils/photoFilters';

export type ProfileVisibility = 'public' | 'private';

export type PublicUser = {
  uid: string;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  profileVisibility: ProfileVisibility;
  appearInWander: boolean;
  onboardingCompleted?: boolean;
};

export type NotificationPreferences = {
  notes: boolean;
  followRequests: boolean;
  friendApprovals: boolean;
  wander: boolean;
  reminders: boolean;
  friendMoments: boolean;
};

export type FollowRequest = {
  requesterUid: string;
  displayName: string | null;
  context: string;
  createdAt?: Timestamp | null;
};

export type Moment = {
  id: string;
  authorUid: string;
  imageUrl: string;
  frontText: string;
  photoFilter: PhotoFilter;
  memoryDate: string;
  keptCount: number;
  noteCount: number;
  appearInWander: boolean;
  createdAt?: Timestamp | null;
};

export type MomentBack = {
  text: string;
};

export type Note = {
  id: string;
  authorUid: string;
  text: string;
  createdAt?: Timestamp | null;
};

export type AppNotification = {
  id: string;
  type: 'note';
  actorUid: string;
  momentId: string;
  noteId: string;
  frontText: string;
  text: string;
  readAt?: Timestamp | null;
  createdAt?: Timestamp | null;
};

export type ListenerErrorHandler = (error: Error) => void;
