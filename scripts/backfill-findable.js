// One-off runner for the 1.0.1 "findable by default" backfill.
//
// Signs in with the operator's own Then account (email/password prompt; the
// password is never echoed or stored) and invokes the adminBackfillFindable
// callable, which is locked server-side to jake@munitor.ai. Run with --dry-run
// first to see who would be flipped without writing anything.
//
//   node scripts/backfill-findable.js --dry-run
//   node scripts/backfill-findable.js
//
// Requires the callable to be deployed first:
//   npx firebase deploy --only functions --project then-prod-finnman81

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) env[match[1]] = match[2];
    }
  }
  return { ...env, ...process.env };
}

function prompt(question, { muted = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (muted) {
      // Mask typed characters; readline still collects the real input.
      const write = rl._writeToOutput.bind(rl);
      rl._writeToOutput = (text) => {
        if (text.includes(question)) write(text);
        else write('*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (muted) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function main() {
  const env = loadEnv();
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    console.error('EXPO_PUBLIC_FIREBASE_API_KEY / EXPO_PUBLIC_FIREBASE_PROJECT_ID missing from .env');
    process.exit(1);
  }

  const dryRun = process.argv.includes('--dry-run');
  const email = env.THEN_ADMIN_EMAIL || (await prompt('Then account email: '));
  const password = env.THEN_ADMIN_PASSWORD || (await prompt('Password: ', { muted: true }));

  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const signInBody = await signIn.json();
  if (!signIn.ok) {
    console.error('Sign-in failed:', signInBody?.error?.message ?? signIn.status);
    process.exit(1);
  }

  const call = await fetch(
    `https://us-central1-${projectId}.cloudfunctions.net/adminBackfillFindable`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signInBody.idToken}`,
      },
      body: JSON.stringify({ data: { dryRun } }),
    },
  );
  const callBody = await call.json();
  if (!call.ok || callBody.error) {
    console.error('Backfill failed:', callBody?.error?.message ?? call.status);
    process.exit(1);
  }

  const { count, flipped } = callBody.result;
  console.log(dryRun ? `DRY RUN — ${count} profile(s) would be flipped to findable:` : `Flipped ${count} profile(s) to findable:`);
  for (const person of flipped) console.log(`  @${person.handle ?? '?'} (${person.uid})`);
  if (dryRun) console.log('\nRe-run without --dry-run to apply.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
