# Then

Then is a quiet photo-sharing app built on one belief: connection is not the same as engagement.

Tagline: **see your people, not the algorithm.**

## Product Principles

- Memory, not performance.
- One photo. One moment. The people who were there.
- No video, reels, stories, ads, suggested posts, promoted content, public follower counts, reach, impressions, or engagement dashboards.
- Follow approval is required for every account. No exceptions.
- Wander is opt-in, friends-of-friends in spirit, chronological, and never algorithmic.
- Notes require an approved follow.
- Posts cannot be edited after sharing. Like a polaroid, you can delete, but not revise.
- Kept moments are private.
- Archive is yours to find. Then never pushes old moments at you.
- Core functionality is free. No ads, no algorithm, and no subscription required.
- Revenue must come from optional support and memory artifacts, never user performance.

## Revenue Philosophy

- Users may optionally support Then with a one-time contribution.
- Then may offer printed or digital memory artifacts, beginning with an annual Yearbook.
- Contributions and purchases never unlock core social features or increase distribution.
- Then does not sell attention, rank users, boost posts, or monetize engagement metrics.
- Payments, ordering, and print fulfillment are intentionally outside the v1 app.

## Your Year on Then

The annual recap is a private reflection experience, not a performance report. It may organize a user's own photos, captions, dates, and private reflections into a consistent digital Yearbook preview.

- No like totals, follower growth, rankings, streaks, or "top post" language.
- The digital preview can be saved or ignored without affecting the app.
- A future print option may offer hardcover and softcover copies through print-on-demand fulfillment.
- High-resolution print files should only be generated after an order is placed.
- See `YEARBOOK.md` for the product contract and phased implementation boundary.

## Vocabulary

- **moment**: what other apps call a post.
- **on the front**: the short polaroid-border caption, capped at 50 characters.
- **on the back**: the optional private reflection, visible only in your roll.
- **kept this**: what other apps call a like.
- **your roll**: profile.
- **wander**: opt-in discovery.
- **keeping up with**: following.
- **kept by**: followers.
- **develop & share**: post action.
- **a new moment**: upload flow.
- **your archive**: every moment you have shared.
- **saved**: moments from other people you bookmarked privately.
- **note**: comment.

## App Root

```powershell
C:\Users\jakef\Projects\Then
```

## Tech Stack

- Expo SDK 54 + React Native
- React Navigation
- react-native-paper
- Firebase Auth, Firestore, and Storage
- Jest + React Native Testing Library

## Firebase Setup

Create a Firebase project with Email/Password Auth, Firestore, and Storage enabled. Then copy `.env.example` to `.env` and fill in:

```powershell
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

Deploy rules from this folder when ready:

```powershell
npx firebase deploy --only firestore:rules,storage --project then-prod-finnman81
```

## Commands

```powershell
npm install
npm run typecheck
npm test
npm run start
```

## Data Model

- `users/{uid}`: private profile/settings.
- `publicUsers/{uid}`: display name, handle, avatar URL, profile visibility, wander opt-in.
- `users/{uid}/following/{targetUid}`: approved people this user is keeping up with.
- `users/{uid}/followers/{followerUid}`: approved people kept by this user.
- `users/{uid}/followRequests/{requesterUid}`: approval queue with context.
- `users/{uid}/saved/{momentId}`: private saved moments.
- `users/{uid}/kept/{momentId}`: legacy saved moments retained for existing beta users.
- `moments/{momentId}`: front-facing moment metadata.
- `moments/{momentId}/back/details`: optional private back reflection, visible only to the author.
- `moments/{momentId}/keeps/{uid}`: private keep marker.
- `moments/{momentId}/notes/{noteId}`: quiet notes from approved followers.

See `PRIVACY_SEMANTICS.md` for the enforceable privacy, discovery, moderation, and notification contract.

## Links and Notifications

- Profile links open as `then://profile/<handle>`.
- Note notifications open as `then://moments/<momentId>/notes`.
- Shared profile text includes the App Store fallback URL.
- Universal links for `https://then.app/profile/<handle>` require the Apple App Site Association file described in `DEPLOYMENT.md`.
