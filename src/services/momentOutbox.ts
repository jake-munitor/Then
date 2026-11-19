import { useSyncExternalStore } from 'react';

import { createMoment, newMomentId, type CreateMomentParams } from './moments';
import { suggestNotifications } from './pushPrimer';

/**
 * Moments on their way out.
 *
 * "Develop & share" used to hold the composer until the upload finished. Now
 * the composer hands the moment here and lets go: the feed shows it at once
 * as a pending print, and the upload runs behind it. If the upload fails,
 * the photo and everything written with it stay here so the person can try
 * again, edit, or discard - nothing typed is ever lost to a bad connection.
 *
 * Held in memory only. The picker's photo is a temporary file, so a queue
 * that outlived the app would point at a photo that may no longer exist.
 */
export type PendingMoment = {
  /** The id the moment will have once shared - lets the feed drop this entry the instant the real one arrives. */
  momentId: string;
  params: CreateMomentParams;
  status: 'sharing' | 'failed';
  error?: string;
};

type OutboxState = {
  pending: PendingMoment[];
  /** A failed moment the person chose to edit; the composer picks it up and clears it. */
  draft: CreateMomentParams | null;
};

let state: OutboxState = { pending: [], draft: null };
const listeners = new Set<() => void>();

function setState(next: OutboxState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function patch(momentId: string, change: Partial<PendingMoment>) {
  setState({
    ...state,
    pending: state.pending.map((entry) => (entry.momentId === momentId ? { ...entry, ...change } : entry)),
  });
}

function remove(momentId: string) {
  setState({ ...state, pending: state.pending.filter((entry) => entry.momentId !== momentId) });
}

async function send(entry: PendingMoment) {
  try {
    await createMoment({ ...entry.params, momentId: entry.momentId });
    remove(entry.momentId);
    suggestNotifications('first-moment');
  } catch (error) {
    patch(entry.momentId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Could not share.',
    });
  }
}

/** Queue a moment and start sharing it. Returns immediately. */
export function shareMoment(params: CreateMomentParams): string {
  const entry: PendingMoment = { momentId: newMomentId(), params, status: 'sharing' };
  setState({ ...state, pending: [entry, ...state.pending] });
  void send(entry);
  return entry.momentId;
}

export function retryPendingMoment(momentId: string) {
  const entry = state.pending.find((candidate) => candidate.momentId === momentId);
  if (!entry || entry.status !== 'failed') return;
  const retried: PendingMoment = { ...entry, status: 'sharing', error: undefined };
  patch(momentId, retried);
  void send(retried);
}

export function discardPendingMoment(momentId: string) {
  remove(momentId);
}

/** Move a failed moment back into the composer. */
export function editPendingMoment(momentId: string) {
  const entry = state.pending.find((candidate) => candidate.momentId === momentId);
  if (!entry || entry.status !== 'failed') return;
  setState({ pending: state.pending.filter((candidate) => candidate.momentId !== momentId), draft: entry.params });
}

/** The composer calls this once it has copied the draft into its own state. */
export function clearRestoredDraft() {
  if (state.draft) setState({ ...state, draft: null });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

export function useMomentOutbox(): OutboxState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Test seam. */
export function resetMomentOutbox() {
  setState({ pending: [], draft: null });
}
