const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

const maybeDescribe = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

maybeDescribe('firestore security rules', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'then-rules-test',
      firestore: {
        rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      },
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  async function seed(pathSegments, data) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...pathSegments), data);
    });
  }

  it('allows public profile discovery and hides private profiles from strangers', async () => {
    await seed(['publicUsers', 'public-user'], {
      displayName: 'Public User',
      handle: 'public_user',
      avatarUrl: null,
      profileVisibility: 'public',
      appearInWander: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await seed(['publicUsers', 'private-user'], {
      displayName: 'Private User',
      handle: 'private_user',
      avatarUrl: null,
      profileVisibility: 'private',
      appearInWander: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const stranger = testEnv.authenticatedContext('stranger').firestore();
    await assertSucceeds(getDoc(doc(stranger, 'publicUsers', 'public-user')));
    await assertFails(getDoc(doc(stranger, 'publicUsers', 'private-user')));
  });

  it('rejects client counter edits and note writes on moments', async () => {
    await seed(['moments', 'moment-1'], {
      authorUid: 'author',
      imageUrl: 'https://example.com/photo.jpg',
      frontText: 'hello',
      memoryDate: '2026-06-15',
      keptCount: 0,
      noteCount: 0,
      appearInWander: true,
      createdAt: new Date(),
    });

    const viewer = testEnv.authenticatedContext('viewer').firestore();
    await assertFails(updateDoc(doc(viewer, 'moments', 'moment-1'), { keptCount: 1 }));
    await assertFails(setDoc(doc(viewer, 'moments', 'moment-1', 'notes', 'note-1'), {
      authorUid: 'viewer',
      text: 'nice',
      createdAt: new Date(),
    }));
  });

  it('validates new moment schema', async () => {
    const author = testEnv.authenticatedContext('author').firestore();
    await assertSucceeds(setDoc(doc(author, 'moments', 'valid'), {
      authorUid: 'author',
      imageUrl: 'https://example.com/photo.jpg',
      frontText: 'front',
      photoFilter: 'film',
      memoryDate: '2026-06-15',
      keptCount: 0,
      noteCount: 0,
      appearInWander: false,
      createdAt: new Date(),
    }));
    await assertFails(setDoc(doc(author, 'moments', 'invalid'), {
      authorUid: 'author',
      imageUrl: 'https://example.com/photo.jpg',
      frontText: 'this caption is intentionally far too long for the front of a Then moment',
      photoFilter: 'bad-filter',
      memoryDate: '2026-06-15',
      keptCount: 10,
      noteCount: 0,
      appearInWander: false,
      createdAt: new Date(),
    }));
  });

  it('lets wander viewers read keep markers but never notes', async () => {
    await seed(['moments', 'wander-moment'], {
      authorUid: 'author',
      imageUrl: 'https://example.com/photo.jpg',
      frontText: 'open air',
      memoryDate: '2026-07-01',
      keptCount: 1,
      noteCount: 1,
      appearInWander: true,
      createdAt: new Date(),
    });
    await seed(['moments', 'wander-moment', 'keeps', 'stranger'], { uid: 'stranger', createdAt: new Date() });
    await seed(['moments', 'wander-moment', 'notes', 'note-1'], { authorUid: 'friend', text: 'lovely', createdAt: new Date() });

    const stranger = testEnv.authenticatedContext('stranger').firestore();
    // The heart's state listener must work on wander moments (App Review
    // rejection July 13 2026: heart appeared dead because this read failed).
    await assertSucceeds(getDoc(doc(stranger, 'moments', 'wander-moment', 'keeps', 'stranger')));
    // Notes stay private to the approved circle even on wander moments.
    await assertFails(getDoc(doc(stranger, 'moments', 'wander-moment', 'notes', 'note-1')));
  });

  it('keeps keep markers private on non-wander moments', async () => {
    await seed(['moments', 'circle-moment'], {
      authorUid: 'author',
      imageUrl: 'https://example.com/photo.jpg',
      frontText: 'just us',
      memoryDate: '2026-07-01',
      keptCount: 0,
      noteCount: 0,
      appearInWander: false,
      createdAt: new Date(),
    });

    const stranger = testEnv.authenticatedContext('stranger').firestore();
    await assertFails(getDoc(doc(stranger, 'moments', 'circle-moment', 'keeps', 'stranger')));
  });

  it('allows private notification preferences only on the owner user document', async () => {
    await seed(['users', 'owner'], {
      displayName: 'Owner',
      handle: 'owner',
      avatarUrl: null,
      profileVisibility: 'private',
      appearInWander: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await seed(['publicUsers', 'owner'], {
      displayName: 'Owner',
      handle: 'owner',
      avatarUrl: null,
      profileVisibility: 'public',
      appearInWander: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const owner = testEnv.authenticatedContext('owner').firestore();
    const stranger = testEnv.authenticatedContext('stranger').firestore();
    const preferences = {
      notes: false,
      followRequests: true,
      friendApprovals: true,
      wander: false,
    };

    await assertSucceeds(updateDoc(doc(owner, 'users', 'owner'), {
      notificationPreferences: preferences,
      updatedAt: new Date(),
    }));
    // Newer clients add the optional 'reminders' key; older ones omit it.
    await assertSucceeds(updateDoc(doc(owner, 'users', 'owner'), {
      notificationPreferences: { ...preferences, reminders: false },
      updatedAt: new Date(),
    }));
    await assertFails(updateDoc(doc(owner, 'users', 'owner'), {
      notificationPreferences: { ...preferences, reminders: 'yes' },
      updatedAt: new Date(),
    }));
    await assertFails(updateDoc(doc(stranger, 'users', 'owner'), {
      notificationPreferences: preferences,
      updatedAt: new Date(),
    }));
    await assertFails(updateDoc(doc(owner, 'publicUsers', 'owner'), {
      notificationPreferences: preferences,
      updatedAt: new Date(),
    }));
  });

  it('lets only the inviter read an invite, and nobody write one', async () => {
    await seed(['invites', 'ABC234'], {
      inviterUid: 'inviter',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      redeemedBy: [],
      maxRedemptions: 10,
    });

    const inviter = testEnv.authenticatedContext('inviter').firestore();
    const stranger = testEnv.authenticatedContext('stranger').firestore();

    await assertSucceeds(getDoc(doc(inviter, 'invites', 'ABC234')));
    // A redeemer never reads the invite doc - redemption goes through the
    // callable - so codes cannot be probed or enumerated client-side.
    await assertFails(getDoc(doc(stranger, 'invites', 'ABC234')));
    await assertFails(setDoc(doc(stranger, 'invites', 'ZZZ999'), { inviterUid: 'stranger' }));
    await assertFails(updateDoc(doc(inviter, 'invites', 'ABC234'), { maxRedemptions: 1000 }));
  });
});
