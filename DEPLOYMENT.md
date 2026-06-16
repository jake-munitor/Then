# Then Deployment Runbook

## Current production targets

- Expo project: `@finnman81/then`
- EAS project id: `3175f2f5-905a-44f5-ae35-37406d04f794`
- Firebase production project: `then-prod-finnman81`
- Firebase Storage bucket: `gs://then-prod-finnman81.firebasestorage.app`
- iOS bundle id: `com.then.app`

## Completed setup

- `app.json` pins Expo owner to `finnman81`.
- `app.json` declares the native deep-link scheme `then://` and the future universal-link domain `then.app`.
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

## Universal link follow-up

The native scheme works as `then://profile/<handle>` and `then://moments/<momentId>/notes`.
For `https://then.app/profile/<handle>` to open the app directly, host a valid Apple App Site Association file at:

```text
https://then.app/.well-known/apple-app-site-association
```

The iOS entitlement is already configured as `applinks:then.app`.

## App Store steps

1. In Firebase Console, open `then-prod-finnman81`.
2. Enable Authentication with the Email/Password provider.
3. Run the iOS build so EAS can create/validate Apple credentials and generate a production binary:

```powershell
npx eas build --platform ios --profile production
```

4. Create the App Store Connect app record for `Then` using bundle id `com.then.app`.
5. After the iOS build completes, submit the latest build:

```powershell
npx eas submit --platform ios --profile production --latest
```
