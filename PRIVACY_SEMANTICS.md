# Then Privacy Semantics

## Profiles

- `profileVisibility` controls **findability only**: whether the profile card
  (display name, handle, avatar) appears in Friends search for signed-in users. It
  never exposes moments — those always require an approved follow (or per-moment
  Wander opt-in), regardless of this setting.
- As of 1.0.1 profiles default to `public` (surfaced in the UI as "Findable"). A
  user may switch to `private` ("Hidden") at any time; hidden profiles are not
  listed, and since requests require seeing a profile, hidden users can initiate
  connections but not receive them.
- Profiles with `appearInWander` enabled may be shown enough to support Wander discovery.
- Handles are unique and reserved in `handles/{handle}` by Cloud Functions only.

## Moments

- A moment is visible to its author and approved followers.
- A moment with `appearInWander: true` is visible in Wander to signed-in users.
- The private back reflection is visible only to the author.
- Moment counters are server-owned. Clients cannot directly edit `keptCount` or `noteCount`.

## Notes And Keeps

- Notes require an approved connection or authorship. Wander visibility alone is not enough to leave a note.
- Keeps are created and removed by Cloud Functions so the marker and count stay consistent.
- Saved moments are private to the saving user.

## Relationships

- Follow approval, decline, cancellation cleanup, friendship removal, blocking, and account deletion are Cloud Function operations.
- Blocking removes existing relationship and pending-request edges in both directions.
- Broad discovery queries filter blocked users on the client because Firestore rules cannot safely use per-user block documents as query filters without risking whole-query failures.

## Moderation And Notifications

- Reports are server-created in `reports/{reportId}` and are not client-readable.
- Push tokens are server-registered under the signed-in user.
- Note notifications are created by the note callable and delivered by the existing notification trigger.
