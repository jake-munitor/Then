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

Use EAS Update only for JS/assets that are compatible with the currently installed native binary:

```powershell
npx eas update --branch production --platform all --message "<release note>" --environment production
```

Use a production EAS build when native config, permissions, Expo modules, entitlements, or App Store metadata changed.

### Build 24 checklist (first build after the OTA-channel fix)

1. Bump `ios.buildNumber` in `app.json` (hand-managed; `autoIncrement` is off).
2. Confirm `eas.json` still has `"channel": "production"` on the production profile.
3. Build + submit as usual.
4. **Verify the channel stuck** (see the warning at the top of this file) — if `channel`
   comes back null again, no OTA will ever reach that binary either.
5. Once installed, confirm the queued updates apply: the Settings screen should show the
   "Moments from your people" and "Daily posting nudges" toggles, and the "..." menu on a
   moment should open.

Queued native-only work to roll into that same build (Expo build credits are limited —
see the account-wide hold that resets 2026-07-22): swap `Image` for `expo-image` to get
real disk caching, the last outstanding de-glitch item.

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
