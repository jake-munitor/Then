import React from 'react';

import { ScreenHeader } from './DesignPrimitives';

type Props = {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  initials?: string;
  onAvatarPress?: () => void;
  right?: React.ReactNode;
};

export default function PageHeader(props: Props) {
  return (
    <ScreenHeader
      {...props}
      titleKind={props.title === 'Then' ? 'wordmark' : props.title === 'Settings' ? 'serif' : 'script'}
    />
  );
}
