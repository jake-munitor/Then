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
- The business model is subscription-only. No advertising. Ever.

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
- **kept**: moments from other people you saved privately.
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
npx firebase deploy --only firestore:rules,storage
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
- `users/{uid}/kept/{momentId}`: private saved moments.
- `moments/{momentId}`: front-facing moment metadata.
- `moments/{momentId}/back/details`: optional private back reflection, visible only to the author.
- `moments/{momentId}/keeps/{uid}`: private keep marker.
- `moments/{momentId}/notes/{noteId}`: quiet notes from approved followers.
