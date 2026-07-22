# Then Deployment Runbook

> ## ⚠️ Read first: OTA updates and build 23
>
> **Builds 21-23 shipped with `channel: None`, so they receive NO over-the-air
> updates.** `eas.json` never declared a `channel`, and no EAS channel existed, so
> roughly ten "successfully published" updates sat on the `production` branch with
> nothing pointing at them and reached zero devices.
>
> Fixed going forward (commit `52891b4`): every build profile now declares a channel
> and a `production` channel is mapped to the `production` branch. **Build 23 cannot be
> rescued — the channel is compiled into the binary.** The currently-live App Store app
> is therefore missing every client-side fix made after it was built; they land
> automatically when build 24 runs.
>
> **After any future build, verify delivery is actually wired up:**
>
> ```powershell
> npx eas channel:list                # must list `production`, mapped to the branch
> npx eas build:list --platform ios --limit 1 --json   # "channel" must NOT be null
> ```
>
> `eas update` printing "Published!" only means the bundle uploaded to a branch. It
> says nothing about whether any device will receive it — always confirm a
> user-visible change on a real device before calling a fix shipped.
>
> Server-side deploys (Firestore rules, Cloud Functions) reach every binary regardless
> and were unaffected by this.

## Current production targets

- Expo project: `@finnman81/then`
- EAS project id: `3175f2f5-905a-44f5-ae35-37406d04f794`
- Firebase production project: `then-prod-finnman81`
- Firebase Storage bucket: `gs://then-prod-finnman81.firebasestorage.app`
- iOS bundle id: `com.then.app`

## Completed setup

- `app.json` pins Expo owner to `finnman81`.
- `app.json` declares the native deep-link scheme `then://` and the universal-link domain `app.munitor.ai` (the `then` site is served under `/then` on the existing `munitor-dashboard` Vercel project - no dedicated `then.app` domain; that name turned out to already be reserved by an unrelated third party).
- `eas.json` declares `development`, `preview`, and `production` EAS environments.
- Production EAS env vars are set for the Firebase web app config.
- Production Firestore database was created in `nam5`.
- Production Firestore rules were deployed.
- Production Firebase Storage was initialized and its rules were deployed.
- `.firebaserc` has a `production` alias for `then-prod-finnman81`.

## Release preflight

Run these before every App Store or TestFlight push:

```powershell
npm run typecheck
npm test -- --runInBand
npm run test:rules
node --check functions/index.js
npx expo-doctor
```

Deploy Firebase only when rules, indexes, or functions changed:

```powershell
npx firebase deploy --only firestore:rules,storage,functions --project then-prod-finnman81
```

Composite indexes live in `firestore.indexes.json` (wired in via `firebase.json`) and
deploy separately:

```powershell
npx firebase deploy --only firestore:indexes --project then-prod-finnman81
```

Two things to know about that file. It was added in build 24 — before then, indexes
existed only in the Firebase console and were untracked, so the repo could not tell you
which queries needed one. It currently declares exactly the two the client needs
(`authorUid`+`createdAt`, `appearInWander`+`createdAt` on `moments`). **If the console
holds other hand-made indexes, this deploy will offer to delete them — decline.** Any
query pairing a `where()` on one field with an `orderBy()` on another needs an entry
here, or it throws at runtime and the affected screen goes blank rather than merely
sorting wrong.

Use EAS Update only for JS/assets that are compatible with the currently installed native binary:

```powershell
npx eas update --branch production --platform all --message "<release note>" --environment production
```

Use a production EAS build when native config, permissions, Expo modules, entitlements, or App Store metadata changed.

### Build 24 checklist (first build after the OTA-channel fix)

1. Bump **both** version fields in `app.json` (hand-managed; `autoIncrement` is off):
   - `expo.ios.buildNumber` — `24`.
   - `expo.version` (`CFBundleShortVersionString`) — `1.0.1`. **Once a version is
     approved and released, that train is closed forever**; App Store Connect rejects any
     further upload carrying it with errors `90062` and `90186`. Build 24 was first
     built as `1.0.0`, which 1.0.0's release on Jul 15 had already closed, and the
     rejection only surfaces at `eas submit` — after the build credit is spent. Bumping
     `buildNumber` alone is never sufficient for the first build after a release.
   - `expo.version` does not affect OTA: `runtimeVersion` is `sdkVersion`
     (`exposdk:54.0.0`), so updates still reach devices across a version bump.
2. Confirm `eas.json` still has `"channel": "production"` on the production profile.
3. Deploy Firestore indexes **before** the build reaches a device — build 24 adds
   `orderBy` to the Feed and Wander listeners, and without the composite indexes those
   queries throw and the screens render blank. Done 2026-07-21.
4. Build + submit as usual.
5. **Verify the channel stuck** (see the warning at the top of this file) — if `channel`
   comes back null again, no OTA will ever reach that binary either. Check this *before*
   submitting; it is the whole purpose of this build.
6. Once installed, confirm the queued updates apply: the Settings screen should show the
   "Moments from your people" and "Daily posting nudges" toggles, and the "..." menu on a
   moment should open.
7. Spot-check the rest of the backlog. Build 24 carries 13 commits that have never run on
   a device — the App Review fixes (dead heart on Wander, dead "..." menu and header
   icons), badge clearing, Your Year ordering, deep links, and Lauren's refined polaroid
   card spec. This is the first real test of all of it.

### Deferred to build 25: the `expo-image` swap

Swapping React Native's `Image` for `expo-image` (real disk caching — the last
outstanding de-glitch item) was **deliberately held back from build 24** to keep that
build focused on proving OTA delivery works.

Why it is safe to defer, and what to know when picking it up:

- It is a native module, so it must be compiled into a binary — it can never ship over
  OTA. That makes the build itself the decision point.
- Scope is smaller than it looks. Only *remote* images benefit, so it is really two
  paths: `FilteredMomentImage` (every moment photo) and the avatar surfaces. Leave the
  bundled `paper-texture.png` uses in `MomentCard`/`MomentDetailScreen` on RN `Image` —
  local assets gain nothing.
- The migration is mechanical: `resizeMode` → `contentFit`, plus the prop type in
  `FilteredMomentImage.tsx`. The app uses no `Image.getSize`, `resolveAssetSource`,
  `prefetch`, `onLoad`, `defaultSource`, `tintColor`, or `blurRadius` — the APIs that
  make these migrations painful.
- Set `transition={0}` and `cachePolicy="memory-disk"` explicitly rather than trusting
  defaults, and add an `expo-image` mock to `testing/jest.setup.ts`.
- **The real risk is visual, and the test suite cannot catch it.** `FilteredMomentImage`
  builds the polaroid look by layering `opacity: look.imageOpacity` on the image under
  absolute overlays; expo-image composites through its own native view.
  `photoFilterContract.test.ts` asserts overlay testIDs, not pixels, so it stays green
  even if all four filters shift. Check `normal`, `film`, `sunfade`, and `coolFlash` on a
  real device by eye before submitting.
- If they do look wrong, reverting that one component to RN `Image` is a JS-only change
  and ships over OTA — the native module simply sits unused. No new build required.

## Device QA

On a real iPhone production/TestFlight build, verify:

- Sign up, create profile, set handle/avatar, and complete onboarding.
- Share a first moment, open Feed, Your Roll, Saved, and Wander.
- Change sort controls in Feed, Wander, Archive, and Saved.
- Send, receive, and tap a note notification; it should open the moment's Notes view.
- Toggle notification preferences; Notes off should keep in-app activity but stop push sends.
- Open `then://profile/<handle>` from Notes/Safari and request a friendship from that profile.
- Approve, decline, cancel, and remove relationships.
- Block/report a user and confirm their content disappears.
- Delete a moment and then delete a test account.

## Crash reporting & analytics (Sentry + PostHog)

Both are wired up in `src/services/telemetry.ts` and live as of build 22: Sentry
project `munitor-ai/then`, PostHog project `495546` (US cloud). DSN/API key are set as
EAS env vars for `production` and `preview` (`EXPO_PUBLIC_SENTRY_DSN`,
`EXPO_PUBLIC_POSTHOG_API_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`), and locally in `.env`.
`SENTRY_AUTH_TOKEN` is set as an EAS **secret** env var (production + preview) so the
`@sentry/react-native` config plugin uploads source maps during EAS builds; Sentry
`organization`/`project` are non-secret and live directly in the `app.json` plugin
config instead. Analytics is intentionally minimal and manual (autocapture and session
replay are off) - see the `TelemetryEvent` union in `telemetry.ts` for the full event
list. If keys are ever missing, `Sentry.init`/the PostHog client are simply skipped, so
local dev and CI need nothing extra.

## Universal links

The native scheme works as `then://profile/<handle>` and `then://moments/<momentId>/notes`.
`https://app.munitor.ai/then/profile/<handle>` and
`https://app.munitor.ai/then/moments/<momentId>/notes` open the app directly on a device
that has it installed, via the Apple App Site Association file hosted at:

```text
https://app.munitor.ai/.well-known/apple-app-site-association
```

(served by a Route Handler in the `munitor-dashboard` repo, `src/app/.well-known/apple-app-site-association/route.ts`
- that project already owns the `app.munitor.ai` domain on Vercel, so this needed no new
DNS. `then.app` itself is not ours - it's reserved by an unrelated third party and
doesn't resolve - so don't reuse that name anywhere.)

The iOS entitlement is configured as `applinks:app.munitor.ai`. The `then` marketing
site (`/then`, `/then/privacy`, `/then/support`) lives in the same `munitor-dashboard`
repo under `src/app/then/`.

## App Store steps

1. In Firebase Console, open `then-prod-finnman81`.
2. Enable Authentication with the Email/Password provider.
3. Run the iOS build so EAS can create/validate Apple credentials and generate a production binary:

```powershell
npx eas build --platform ios --profile production
```

4. Create the App Store Connect app record for `Then` using bundle id `com.then.app`.
5. In App Store Connect (App Privacy), set the Privacy Policy URL to
   `https://app.munitor.ai/then/privacy` and fill in the privacy nutrition labels
   (account info, photos, user content; analytics is anonymous/not linked to identity).
   Set the Support URL to `https://app.munitor.ai/then/support`.
6. After the iOS build completes, submit the latest build:

```powershell
npx eas submit --platform ios --profile production --latest
```
