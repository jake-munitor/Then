/**
 * In-memory write-through cache for Firestore subscription snapshots.
 *
 * Screens cold-mount with empty state and flash spinners/empty-states for the
 * few hundred ms until their listeners deliver - the app's biggest source of
 * perceived jank. Subscription services store their latest snapshot here and
 * replay it synchronously to new subscribers, so a remounted screen renders
 * its last-known content instantly while the live listener refreshes it.
 *
 * Session-scoped by design: cleared on sign-out so no data crosses accounts.
 */

const cache = new Map<string, unknown>();

export function getCachedSnapshot<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCachedSnapshot<T>(key: string, value: T) {
  cache.set(key, value);
}

export function clearSnapshotCache() {
  cache.clear();
}

/**
 * Replay a cached snapshot synchronously (if one exists), and return an
 * onChange wrapper that keeps the cache fresh. Usage in a subscribe function:
 *
 *   const emit = withSnapshotCache(key, onChange);
 *   ...onSnapshot(query, (snap) => emit(transform(snap)))
 */
export function withSnapshotCache<T>(key: string, onChange: (value: T) => void) {
  const cached = getCachedSnapshot<T>(key);
  if (cached !== undefined) onChange(cached);
  return (value: T) => {
    setCachedSnapshot(key, value);
    onChange(value);
  };
}
