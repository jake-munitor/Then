const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');

const maybeDescribe = process.env.FIREBASE_STORAGE_EMULATOR_HOST ? describe : describe.skip;
const BUCKET = 'then-rules-test.appspot.com';

maybeDescribe('storage security rules', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'then-rules-test',
      firestore: {
        rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      },
      storage: {
        rules: fs.readFileSync(path.resolve(__dirname, '../../storage.rules'), 'utf8'),
      },
    });
  });

  afterEach(async () => {
    await Promise.all([testEnv.clearFirestore(), testEnv.clearStorage()]);
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  function storageFor(uid) {
    return testEnv.authenticatedContext(uid).storage(`gs://${BUCKET}`);
  }

  function imageBytes(size = 12) {
    return new Uint8Array(size).fill(1);
  }

  function momentImageRef(uid, momentId, requesterUid = uid) {
    return storageFor(requesterUid).ref(`users/${uid}/moments/${momentId}/image.jpg`);
  }

  it('allows an owner to upload a moment image with approved image metadata', async () => {
    await assertSucceeds(
      momentImageRef('owner', 'moment-1').put(imageBytes(), {
        contentType: 'image/jpeg',
      }),
    );
  });

  it('rejects signed-out and cross-user moment uploads', async () => {
    await assertFails(
      testEnv
        .unauthenticatedContext()
        .storage(`gs://${BUCKET}`)
        .ref('users/owner/moments/moment-1/image.jpg')
        .put(imageBytes(), { contentType: 'image/jpeg' }),
    );
    await assertFails(
      momentImageRef('owner', 'moment-1', 'stranger').put(imageBytes(), {
        contentType: 'image/jpeg',
      }),
    );
  });

  it('rejects non-image moment uploads', async () => {
    await assertFails(
      momentImageRef('owner', 'moment-1').put(imageBytes(), {
        contentType: 'text/plain',
      }),
    );
  });

  it('rejects moment images over the 25 MB limit', async () => {
    await assertFails(
      momentImageRef('owner', 'moment-1').put(imageBytes(25 * 1024 * 1024 + 1), {
        contentType: 'image/jpeg',
      }),
    );
  });

  it('allows jpg metadata for moment images', async () => {
    await assertSucceeds(
      momentImageRef('owner', 'moment-1').put(imageBytes(), {
        contentType: 'image/jpg',
      }),
    );
  });
});
