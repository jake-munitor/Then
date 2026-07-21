# Roadmap — post build 20

Working plan agreed July 2026. Near-term items are sequenced; "Later" items are parked
with enough design notes to pick up cold.

---

## Where things actually stand (updated 2026-07-18)

**v1.0 (build 23) is LIVE on the App Store.** Approved Jul 15 after three submissions.
Items 1-3 below are shipped; item 4 (invite links) is still the next feature.

**Blocking everything client-side: builds 21-23 have no OTA channel**, so roughly a
dozen finished fixes have never reached a device — including the dead "..." menu fix,
badge clearing, Your Year ordering, deep links, Lauren's shadow, and the whole
de-glitch pass. They are committed and queued on the `production` branch and land
automatically with **build 24**. See the warning at the top of `DEPLOYMENT.md`.

Build 24 is gated until **2026-07-22** by the account-wide Expo build-credit hold.
Jake is deliberately **not inviting more users until it ships**, since the live binary
still has those bugs.

Shipped since this plan was written, beyond items 1-3:
- Notification system rebuild (server side, live now on build 23): pushes for
  friend-posted moments, follow requests, and approvals; `sendPostingNudges` hourly
  Cloud Scheduler job sending activity-aware nudges at each user's local 11:00/19:00;
  every push carries the recipient's true unread count as its badge.
- De-glitch pass (queued for build 24): `snapshotCache` for instant re-render on
  remount, loading-vs-empty gating, `SkeletonPolaroid` shimmer.
- **Deferred to build 25:** swap `Image` → `expo-image` for real disk caching, the last
  de-glitch item. Held back deliberately so build 24 stays focused on proving OTA
  delivery. It is native-only (can never ship over OTA), and its one real risk is that
  it may shift the four photo-filter looks in a way the test suite cannot detect. Full
  pickup notes are in `DEPLOYMENT.md`.

Also landed in build 24, found during the pre-build review:
- Feed and Wander listeners called `limit()` with **no `orderBy`**, so Firestore returned
  moments in document-ID order (random auto-IDs) and the client sorted an arbitrary
  subset — past the page size, an author's newest moments could silently stop appearing.
- `AuthContext.isLoading` started `false`, flashing the Auth screen for a frame on every
  cold start.
- Composite indexes are now tracked in `firestore.indexes.json` instead of existing only
  in the Firebase console.

---

## 1. Observability — Sentry + product analytics (~1–2 days)

**Why:** Real users, zero crash reporting, zero funnel visibility. Every other decision
on this list gets de-risked by this one.

### Crash reporting (Sentry)
- `npx expo install @sentry/react-native`, add the `@sentry/react-native/expo` config
  plugin to `app.json` (source-map upload token goes in EAS secrets, DSN can be an
  `EXPO_PUBLIC_` var — DSNs are safe to embed).
- Init at app entry, wrap the root component. Add `Sentry.captureException` to the
  catch paths in `src/services/*` that currently swallow or re-throw with friendly text
  (notably `photos.ts` upload fallbacks).
- Cloud Functions: no SDK needed day one — set up a GCP log-based alert on function
  error rate instead.

### Product analytics
- **Choice: PostHog RN SDK** (generous free tier, works in Expo without native config,
  self-serve funnels/retention). The Firebase *web* SDK's analytics module doesn't work
  in React Native, and `@react-native-firebase/analytics` would drag in native config
  alongside the JS SDK we already use — not worth it.
- Keep the event list tiny and privacy-respecting (no content, no photos, just flow):
  `sign_up_completed`, `onboarding_completed`, `moment_created`,
  `follow_request_sent`, `follow_request_approved`, `invite_created`,
  `invite_shared`, `invite_redeemed`, `notification_opened`.
- The one dashboard that matters: **signup → first moment → first approved friend →
  week-2 return**.
- Disclose analytics in the privacy policy (item 3); honor a future opt-out toggle in
  Roll Settings.

---

## 2. Client-side image compression (~1 day incl. tests)

**Why:** `uploadMomentPhoto` (`src/services/photos.ts:121`) uploads the picker URI
as-is — modern iPhones produce 5–15 MB files. Slow uploads on cellular, storage/bandwidth
costs scale linearly.

- `npx expo install expo-image-manipulator`.
- New `src/utils/imageProcessing.ts`: `prepareImageForUpload(uri, { maxDimension, quality })`
  → resize longest edge, re-encode JPEG. Moments: 1440px / 0.8. Avatars: 512px / 0.8.
- **Call it inside `uploadMomentPhoto` and `uploadAvatar`** (photos.ts), not at the four
  picker call sites — centralizing guarantees no uncompressed path can ever ship.
  Preview screens keep using the original local URI, so nothing visual changes.
- Side benefit: output is always real JPEG, so the `image.jpg` storage path and
  contentType stop being aspirational.
- Tests: extend `photos.test.ts` — mock the manipulator, assert resize params, assert
  upload receives the processed URI. Keep the existing size-limit validation as the
  backstop after compression.

---

## 3. Privacy policy live + web presence (~1 day + App Store steps) — DONE

**Update:** `then.app` turned out to already be reserved by an unrelated third party
(doesn't even resolve) — never ours to claim. Landed on **`app.munitor.ai/then`**
instead: zero new DNS, since that domain is already live on Vercel via the
`munitor-dashboard` repo. All Then-specific paths are namespaced under `/then` to avoid
any collision with that app's `[client]` dynamic routing.

- Site lives in `munitor-dashboard` (`src/app/then/`), not in this repo:
  - `/then` — landing page (polaroid aesthetic, App Store link)
  - `/then/privacy` — real privacy policy (account data, content, diagnostics via
    Sentry, anonymous analytics via PostHog — see item 1/2)
  - `/then/support` — contact email
  - `/.well-known/apple-app-site-association` (Route Handler, domain root, team
    `T354RR2A88`) — paths `/then/profile/*`, `/then/moments/*`, `/then/invite/*`
- App side: `associatedDomains: ["applinks:app.munitor.ai"]` in `app.json`; linking
  config in `AppNavigator.tsx` updated to `then/profile/:handle` and
  `then/moments/:momentId/notes`; RollSettings TODO replaced with the live URL.
  Ships in build 23 (build 22 was already committed pre-Sentry/PostHog work).
- App Store Connect: set privacy policy URL to `https://app.munitor.ai/then/privacy`,
  support URL to `https://app.munitor.ai/then/support`, fill privacy nutrition labels
  (account info, photos, user content; analytics = "data not linked to you").

---

## 4. Invite links that pre-connect (~2–3 days)

**Why:** Friends-only app ⇒ a solo signup sees an empty feed and churns. Getting new
users to 2–3 connections in their first session is the growth metric.

### Data model
- `invites/{code}` — `{ inviterUid, createdAt, expiresAt (30 days), redeemedBy: uid[], maxRedemptions: 10 }`.
  Code from the existing (currently unused) `inviteCode()` in `src/utils/formatters.ts:17`.
- Two new callable Cloud Functions:
  - `createInvite` — mints a code for the caller (reuse the caller's active
    non-expired code if one exists).
  - `redeemInvite` — validates (exists, not expired, not self, neither party blocked,
    under redemption cap) then **creates an approved mutual follow** (inviter explicitly
    invited; both consented — no request/approve friction on either side). Idempotent.
- Firestore rules: `invites` readable by inviter only; all writes via functions.
- Rules tests + functions tests alongside the existing suites.

### Link format & routing
- Share URL: `https://app.munitor.ai/then/invite/<code>` (universal link, AASA already
  live; web fallback page in `munitor-dashboard` shows App Store link + the code to
  enter manually).
- Add `invite/<code>` to the linking config (`AppNavigator.tsx`), scheme
  `then://invite/<code>` works immediately.
- **Pending-code stash:** deep link can arrive before auth/onboarding. Capture the code
  on cold start → store in AsyncStorage → redeem automatically after onboarding
  completes → land on the inviter's profile with a "You and X are now friends" moment.
- **Manual entry fallback** on FriendsScreen ("Have an invite code?") — covers the
  App-Store-install path without building deferred deep linking.

### Surfaces
1. **Onboarding final step** (highest impact): "Then is better with a few friends —
   invite them" → native share sheet with the invite link. Skippable, never blocking.
2. FriendsScreen header action.
3. Roll Settings (replaces/augments the existing plain profile share).
- Instrument with `invite_created` / `invite_shared` / `invite_redeemed` (item 1).

---

## Sequencing

| Week | Work |
|------|------|
| 1 | Image compression (½–1d) → Sentry + PostHog (1–2d) — done |
| 2 | Web presence (`app.munitor.ai/then`) + privacy policy + AASA; `associatedDomains`; build 23; App Store Connect metadata — done pending your review/deploy |
| 2–3 | Invite links (functions + rules + client flows + tests); ship in build 23 or 24 |

---

## Later — parked with intent

### Posting ritual ("develop day") — small, do after invite links prove out
- Opt-in weekly nudge, on-brand and quiet: a local notification, e.g. Sunday evening —
  "Anything worth developing this week?" Configurable day/time, default off or asked
  once during onboarding (never streak-shaming, no badges).
- Implementation: `expo-notifications` scheduled local notification (already a
  dependency); preference lives with the existing granular notification prefs in
  `users/{uid}`; deep-links to NewMomentScreen.
- Optional server-side companion later: "a friend shared their first moment in a while"
  — needs a scheduled function; skip for v1 of the ritual.
- Estimate: 1–2 days.

### iOS home-screen widget — biggest retention lever, medium project (~1–2 weeks)
- Widget shows the latest polaroid from friends (Locket's entire growth engine;
  perfectly on-brand).
- Requires a native widget extension: config plugin such as `@bacons/apple-targets`
  (or expo-targets), SwiftUI WidgetKit target, shared App Group container.
- Data path: app writes the most recent friend-moment image + caption to the App Group
  on foreground/notification; widget reads locally (no network in the widget for v1).
  Push-triggered refresh (silent push → background fetch → update App Group →
  `WidgetCenter.reloadAllTimelines`) as v2.
- Prereqs before starting: analytics live (to measure retention effect), image
  compression shipped (widget downloads stay small).
- Note: widgets can't be built in Expo Go — dev-client / EAS builds only.

### Deferred scale items (do when wander/discovery gets real traffic)
- Paginate `subscribeDiscoverableUsers()` (currently unbounded) and wander moments
  (currently 100-cap, no cursor).
- Enable Firebase App Check; verify API-key restrictions in Firebase console (quick —
  can do anytime).
- Offline write queue (failed writes are currently lost, not queued).
- Consolidate N+1 per-friend profile listeners if friend lists grow past ~100.
