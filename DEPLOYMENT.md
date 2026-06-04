# Then Deployment Runbook

## Current production targets

- Expo project: `@finnman81/then`
- EAS project id: `3175f2f5-905a-44f5-ae35-37406d04f794`
- Firebase production project: `then-prod-finnman81`
- iOS bundle id: `com.then.app`

## Completed setup

- `app.json` pins Expo owner to `finnman81`.
- `eas.json` declares `development`, `preview`, and `production` EAS environments.
- Production EAS env vars are set for the Firebase web app config.
- Production Firestore database was created in `nam5`.
- Production Firestore rules were deployed.
- `.firebaserc` has a `production` alias for `then-prod-finnman81`.

## Remaining console steps

1. In Firebase Console, open `then-prod-finnman81`.
2. Enable Authentication with the Email/Password provider.
3. Open Storage and click **Get Started** to initialize the default bucket.
4. After Storage is initialized, deploy storage rules:

```powershell
npx firebase deploy --only storage --project then-prod-finnman81
```

5. Run the iOS build once interactively so EAS can create/validate Apple credentials:

```powershell
npx eas-cli@latest build --platform ios --profile production
```

6. Create the App Store Connect app record for `Then` using bundle id `com.then.app`.
7. After the iOS build completes, submit the latest build:

```powershell
npx eas-cli@latest submit --platform ios --profile production --latest
```

## Verification

```powershell
npm run typecheck
npm test -- --runInBand
npx expo-doctor
```

Before inviting TestFlight testers, install the build on a real iPhone and verify sign-in, photo upload, posting, notes, owner-only reflections, and Firebase prod data writes.
