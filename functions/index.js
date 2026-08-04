const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { logger } = require('firebase-functions');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const db = getFirestore();

function requireUid(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  return uid;
}

async function sendExpoPush(messages) {
  if (!messages.length) return;
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    logger.error('Expo push request failed', { status: response.status, body: await response.text() });
  }
}

// Every push carries the recipient's true unread count so the home-screen
// badge self-corrects. Builds shipped before the badge-sync client update
// have no other way to clear a stale badge.
async function unreadBadgeFor(uid) {
  try {
    const snap = await db.collection('users').doc(uid).collection('notifications').where('readAt', '==', null).count().get();
    return snap.data().count;
  } catch (error) {
    logger.warn('Unread badge count failed', { uid, error: error.message });
    return 0;
  }
}

async function pushTokensFor(uid) {
  const snap = await db.collection('users').doc(uid).collection('pushTokens').get();
  return snap.docs.map((item) => item.data()).filter((data) => data.token);
}

function stringValue(value, field, options = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (options.required && !text) throw new HttpsError('invalid-argument', `${field} is required.`);
  if (options.max && text.length > options.max) {
    throw new HttpsError('invalid-argument', `${field} is too long.`);
  }
  return text;
}

function booleanValue(value) {
  return value === true;
}

function normalizeHandle(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9_]/g, '');
}

function assertHandle(handle) {
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    throw new HttpsError('invalid-argument', 'Use 3-24 letters, numbers, or underscores for your handle.');
  }
}

async function approvedFollower(authorUid, viewerUid) {
  const snap = await db.collection('users').doc(authorUid).collection('followers').doc(viewerUid).get();
  return snap.exists;
}

async function blockedEitherWay(leftUid, rightUid) {
  const [leftBlocksRight, rightBlocksLeft] = await Promise.all([
    db.collection('users').doc(leftUid).collection('blocks').doc(rightUid).get(),
    db.collection('users').doc(rightUid).collection('blocks').doc(leftUid).get(),
  ]);
  return leftBlocksRight.exists || rightBlocksLeft.exists;
}

async function canSeeMoment(moment, viewerUid) {
  const authorUid = String(moment.authorUid ?? '');
  if (!authorUid) return false;
  if (await blockedEitherWay(authorUid, viewerUid)) return false;
  return viewerUid === authorUid || moment.appearInWander === true || (await approvedFollower(authorUid, viewerUid));
}

async function canNoteMoment(moment, viewerUid) {
  const authorUid = String(moment.authorUid ?? '');
  if (!authorUid) return false;
  if (await blockedEitherWay(authorUid, viewerUid)) return false;
  return viewerUid === authorUid || (await approvedFollower(authorUid, viewerUid));
}

async function deleteCollection(path, batchSize = 400) {
  while (true) {
    const snap = await db.collection(path).limit(batchSize).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function deleteRefs(refs) {
  for (let index = 0; index < refs.length; index += 400) {
    const batch = db.batch();
    refs.slice(index, index + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function removeRelationshipRefs(leftUid, rightUid) {
  return [
    db.collection('users').doc(leftUid).collection('following').doc(rightUid),
    db.collection('users').doc(rightUid).collection('followers').doc(leftUid),
    db.collection('users').doc(rightUid).collection('following').doc(leftUid),
    db.collection('users').doc(leftUid).collection('followers').doc(rightUid),
    db.collection('users').doc(rightUid).collection('followRequests').doc(leftUid),
    db.collection('users').doc(leftUid).collection('outgoingFollowRequests').doc(rightUid),
    db.collection('users').doc(leftUid).collection('followRequests').doc(rightUid),
    db.collection('users').doc(rightUid).collection('outgoingFollowRequests').doc(leftUid),
  ];
}

exports.createInitialProfile = onCall(async (request) => {
  const uid = requireUid(request);
  const displayName = stringValue(request.data?.displayName, 'Display name', { required: true, max: 80 });
  const handle = normalizeHandle(request.data?.handle || displayName);
  assertHandle(handle);

  await db.runTransaction(async (tx) => {
    const handleRef = db.collection('handles').doc(handle);
    const profileRef = db.collection('publicUsers').doc(uid);
    const privateRef = db.collection('users').doc(uid);
    const [handleSnap, existingProfile] = await Promise.all([tx.get(handleRef), tx.get(profileRef)]);
    if (handleSnap.exists && handleSnap.data()?.uid !== uid) {
      throw new HttpsError('already-exists', 'That handle is already taken.');
    }

    const previousHandle = existingProfile.data()?.handle;
    if (previousHandle && previousHandle !== handle) {
      tx.delete(db.collection('handles').doc(previousHandle));
    }

    tx.set(handleRef, { uid, updatedAt: FieldValue.serverTimestamp() });
    const profile = {
      displayName,
      handle,
      avatarUrl: null,
      // Findable by default (1.0.1 decision): exposes only the profile card
      // (name/handle/avatar) to signed-in users. Moments stay gated behind an
      // approved follow regardless of this value.
      profileVisibility: 'public',
      appearInWander: false,
      onboardingCompleted: false,
      createdAt: existingProfile.exists ? existingProfile.data().createdAt : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    tx.set(profileRef, profile, { merge: true });
    tx.set(privateRef, { ...profile, email: request.auth?.token?.email ?? null }, { merge: true });
  });

  await getAuth().updateUser(uid, { displayName });
  return { handle };
});

exports.updateProfile = onCall(async (request) => {
  const uid = requireUid(request);
  const displayName = stringValue(request.data?.displayName, 'Display name', { required: true, max: 80 });
  const handle = normalizeHandle(request.data?.handle);
  // Default findable: an explicit 'private' is honored, anything else lands
  // 'public'. Old binaries (<= build 24) still send an explicit 'private'
  // during onboarding, so their signups stay hidden until the client updates.
  const profileVisibility = request.data?.profileVisibility === 'private' ? 'private' : 'public';
  const appearInWander = booleanValue(request.data?.appearInWander);
  const onboardingCompleted = booleanValue(request.data?.onboardingCompleted);
  const avatarUrl = typeof request.data?.avatarUrl === 'string' ? request.data.avatarUrl : undefined;
  assertHandle(handle);

  await db.runTransaction(async (tx) => {
    const profileRef = db.collection('publicUsers').doc(uid);
    const privateRef = db.collection('users').doc(uid);
    const handleRef = db.collection('handles').doc(handle);
    const [profileSnap, handleSnap] = await Promise.all([tx.get(profileRef), tx.get(handleRef)]);
    if (handleSnap.exists && handleSnap.data()?.uid !== uid) {
      throw new HttpsError('already-exists', 'That handle is already taken.');
    }

    const previousHandle = profileSnap.data()?.handle;
    if (previousHandle && previousHandle !== handle) {
      tx.delete(db.collection('handles').doc(previousHandle));
    }

    tx.set(handleRef, { uid, updatedAt: FieldValue.serverTimestamp() });
    const payload = {
      displayName,
      handle,
      profileVisibility,
      appearInWander,
      onboardingCompleted,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (avatarUrl !== undefined) payload.avatarUrl = avatarUrl;
    tx.set(profileRef, payload, { merge: true });
    tx.set(privateRef, payload, { merge: true });
  });

  await getAuth().updateUser(uid, { displayName });
  return { handle };
});

exports.approveFollowRequest = onCall(async (request) => {
  const ownerUid = requireUid(request);
  const requesterUid = stringValue(request.data?.requesterUid, 'Requester', { required: true, max: 128 });
  if (ownerUid === requesterUid) throw new HttpsError('invalid-argument', 'You cannot approve yourself.');
  if (await blockedEitherWay(ownerUid, requesterUid)) throw new HttpsError('failed-precondition', 'This person is blocked.');

  const batch = db.batch();
  batch.set(db.collection('users').doc(ownerUid).collection('followers').doc(requesterUid), {
    uid: requesterUid,
    approvedAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection('users').doc(requesterUid).collection('following').doc(ownerUid), {
    uid: ownerUid,
    approvedAt: FieldValue.serverTimestamp(),
  });
  batch.delete(db.collection('users').doc(ownerUid).collection('followRequests').doc(requesterUid));
  batch.delete(db.collection('users').doc(requesterUid).collection('outgoingFollowRequests').doc(ownerUid));
  await batch.commit();
  return { ok: true };
});

exports.declineFollowRequest = onCall(async (request) => {
  const ownerUid = requireUid(request);
  const requesterUid = stringValue(request.data?.requesterUid, 'Requester', { required: true, max: 128 });
  const batch = db.batch();
  batch.delete(db.collection('users').doc(ownerUid).collection('followRequests').doc(requesterUid));
  batch.delete(db.collection('users').doc(requesterUid).collection('outgoingFollowRequests').doc(ownerUid));
  await batch.commit();
  return { ok: true };
});

exports.cancelFollowRequest = onCall(async (request) => {
  const requesterUid = requireUid(request);
  const targetUid = stringValue(request.data?.targetUid, 'Target', { required: true, max: 128 });
  const batch = db.batch();
  batch.delete(db.collection('users').doc(targetUid).collection('followRequests').doc(requesterUid));
  batch.delete(db.collection('users').doc(requesterUid).collection('outgoingFollowRequests').doc(targetUid));
  await batch.commit();
  return { ok: true };
});

exports.removeFriend = onCall(async (request) => {
  const uid = requireUid(request);
  const targetUid = stringValue(request.data?.targetUid, 'Target', { required: true, max: 128 });
  await deleteRefs(await removeRelationshipRefs(uid, targetUid));
  return { ok: true };
});

exports.toggleKeep = onCall(async (request) => {
  const uid = requireUid(request);
  const momentId = stringValue(request.data?.momentId, 'Moment', { required: true, max: 128 });
  const momentRef = db.collection('moments').doc(momentId);
  const keepRef = momentRef.collection('keeps').doc(uid);
  const momentSnap = await momentRef.get();
  if (!momentSnap.exists) throw new HttpsError('not-found', 'This moment is no longer available.');
  if (!(await canSeeMoment(momentSnap.data(), uid))) throw new HttpsError('permission-denied', 'This moment is private.');

  await db.runTransaction(async (tx) => {
    const keepSnap = await tx.get(keepRef);
    if (keepSnap.exists) {
      tx.delete(keepRef);
      tx.update(momentRef, { keptCount: FieldValue.increment(-1) });
    } else {
      tx.set(keepRef, { uid, createdAt: FieldValue.serverTimestamp() });
      tx.update(momentRef, { keptCount: FieldValue.increment(1) });
    }
  });
  return { ok: true };
});

exports.addNote = onCall(async (request) => {
  const uid = requireUid(request);
  const momentId = stringValue(request.data?.momentId, 'Moment', { required: true, max: 128 });
  const text = stringValue(request.data?.text, 'Note', { required: true, max: 1000 });
  const momentRef = db.collection('moments').doc(momentId);
  const momentSnap = await momentRef.get();
  if (!momentSnap.exists) throw new HttpsError('not-found', 'This moment is no longer available.');
  const moment = momentSnap.data();
  if (!(await canNoteMoment(moment, uid))) {
    throw new HttpsError('permission-denied', 'Notes require an approved connection.');
  }

  const ownerUid = String(moment.authorUid ?? '');
  const noteRef = momentRef.collection('notes').doc();
  const batch = db.batch();
  batch.set(noteRef, {
    authorUid: uid,
    text,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.update(momentRef, { noteCount: FieldValue.increment(1) });
  if (ownerUid && ownerUid !== uid) {
    batch.set(db.collection('users').doc(ownerUid).collection('notifications').doc(noteRef.id), {
      type: 'note',
      actorUid: uid,
      momentId,
      noteId: noteRef.id,
      frontText: String(moment.frontText ?? ''),
      text,
      url: `then://moments/${encodeURIComponent(momentId)}/notes`,
      readAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return { noteId: noteRef.id };
});

exports.deleteMoment = onCall(async (request) => {
  const uid = requireUid(request);
  const momentId = stringValue(request.data?.momentId, 'Moment', { required: true, max: 128 });
  const momentRef = db.collection('moments').doc(momentId);
  const momentSnap = await momentRef.get();
  if (!momentSnap.exists) return { ok: true };
  const moment = momentSnap.data();
  if (String(moment.authorUid ?? '') !== uid) {
    throw new HttpsError('permission-denied', 'Only the person who shared this moment can delete it.');
  }

  const [backSnap, keepsSnap, notesSnap] = await Promise.all([
    momentRef.collection('back').get(),
    momentRef.collection('keeps').get(),
    momentRef.collection('notes').get(),
  ]);
  await deleteRefs([
    ...backSnap.docs.map((item) => item.ref),
    ...keepsSnap.docs.map((item) => item.ref),
    ...notesSnap.docs.map((item) => item.ref),
    momentRef,
  ]);
  await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/moments/${momentId}/`, force: true }).catch((error) => {
    logger.warn('Could not remove moment media', { uid, momentId, error: error.message });
  });
  return { ok: true };
});

exports.blockUser = onCall(async (request) => {
  const uid = requireUid(request);
  const targetUid = stringValue(request.data?.targetUid, 'Target', { required: true, max: 128 });
  if (uid === targetUid) throw new HttpsError('invalid-argument', 'You cannot block yourself.');
  const batch = db.batch();
  batch.set(db.collection('users').doc(uid).collection('blocks').doc(targetUid), {
    uid: targetUid,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection('users').doc(targetUid).collection('blockedBy').doc(uid), {
    uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  (await removeRelationshipRefs(uid, targetUid)).forEach((ref) => batch.delete(ref));
  await batch.commit();
  return { ok: true };
});

exports.unblockUser = onCall(async (request) => {
  const uid = requireUid(request);
  const targetUid = stringValue(request.data?.targetUid, 'Target', { required: true, max: 128 });
  const batch = db.batch();
  batch.delete(db.collection('users').doc(uid).collection('blocks').doc(targetUid));
  batch.delete(db.collection('users').doc(targetUid).collection('blockedBy').doc(uid));
  await batch.commit();
  return { ok: true };
});

exports.reportUser = onCall(async (request) => {
  const reporterUid = requireUid(request);
  const targetUid = stringValue(request.data?.targetUid, 'Target', { required: true, max: 128 });
  const reason = stringValue(request.data?.reason, 'Reason', { required: true, max: 80 });
  const context = stringValue(request.data?.context, 'Context', { max: 1000 });
  if (reporterUid === targetUid) throw new HttpsError('invalid-argument', 'You cannot report yourself.');
  const reportRef = db.collection('reports').doc();
  await reportRef.set({
    reporterUid,
    targetUid,
    reason,
    context,
    status: 'open',
    createdAt: FieldValue.serverTimestamp(),
  });
  return { reportId: reportRef.id };
});

exports.registerPushToken = onCall(async (request) => {
  const uid = requireUid(request);
  const token = stringValue(request.data?.token, 'Push token', { required: true, max: 512 });
  const platform = stringValue(request.data?.platform, 'Platform', { max: 32 }) || 'unknown';
  const timezone = stringValue(request.data?.timezone, 'Timezone', { max: 64 });
  const tokenId = Buffer.from(token).toString('base64url').slice(0, 120);
  await db.collection('users').doc(uid).collection('pushTokens').doc(tokenId).set({
    token,
    platform,
    ...(timezone ? { timezone } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

exports.deleteAccount = onCall(async (request) => {
  const uid = requireUid(request);
  const userRef = db.collection('users').doc(uid);
  const publicUserRef = db.collection('publicUsers').doc(uid);
  const [userSnap, publicUserSnap, momentsSnap, publicUsersSnap, followingSnap, followersSnap, incomingSnap, outgoingSnap] =
    await Promise.all([
      userRef.get(),
      publicUserRef.get(),
      db.collection('moments').where('authorUid', '==', uid).get(),
      db.collection('publicUsers').get(),
      userRef.collection('following').get(),
      userRef.collection('followers').get(),
      userRef.collection('followRequests').get(),
      userRef.collection('outgoingFollowRequests').get(),
    ]);

  const refs = [];
  const oldHandle = publicUserSnap.data()?.handle || userSnap.data()?.handle;
  if (oldHandle) refs.push(db.collection('handles').doc(oldHandle));

  for (const momentDoc of momentsSnap.docs) {
    const [backSnap, keepsSnap, notesSnap] = await Promise.all([
      momentDoc.ref.collection('back').get(),
      momentDoc.ref.collection('keeps').get(),
      momentDoc.ref.collection('notes').get(),
    ]);
    refs.push(...backSnap.docs.map((item) => item.ref));
    refs.push(...keepsSnap.docs.map((item) => item.ref));
    refs.push(...notesSnap.docs.map((item) => item.ref));
    refs.push(momentDoc.ref);
  }

  followingSnap.docs.forEach((item) => {
    refs.push(item.ref, db.collection('users').doc(item.id).collection('followers').doc(uid));
  });
  followersSnap.docs.forEach((item) => {
    refs.push(item.ref, db.collection('users').doc(item.id).collection('following').doc(uid));
  });
  incomingSnap.docs.forEach((item) => refs.push(item.ref));
  outgoingSnap.docs.forEach((item) => {
    refs.push(item.ref, db.collection('users').doc(item.id).collection('followRequests').doc(uid));
  });
  publicUsersSnap.docs.forEach((profileDoc) => {
    if (profileDoc.id !== uid) {
      refs.push(
        db.collection('users').doc(profileDoc.id).collection('followRequests').doc(uid),
        db.collection('users').doc(profileDoc.id).collection('outgoingFollowRequests').doc(uid),
        db.collection('users').doc(profileDoc.id).collection('followers').doc(uid),
        db.collection('users').doc(profileDoc.id).collection('following').doc(uid),
        db.collection('users').doc(profileDoc.id).collection('blockedBy').doc(uid),
        db.collection('users').doc(profileDoc.id).collection('blocks').doc(uid),
      );
    }
  });

  await Promise.all([
    deleteCollection(`users/${uid}/saved`),
    deleteCollection(`users/${uid}/kept`),
    deleteCollection(`users/${uid}/notifications`),
    deleteCollection(`users/${uid}/pushTokens`),
    deleteCollection(`users/${uid}/blocks`),
    deleteCollection(`users/${uid}/blockedBy`),
  ]);
  await deleteRefs(refs);
  await Promise.all([publicUserRef.delete(), userRef.delete()]);
  await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/`, force: true }).catch((error) => {
    logger.warn('Could not remove every stored account file', { uid, error: error.message });
  });
  await getAuth().deleteUser(uid);
  return { ok: true };
});

exports.sendNoteNotification = onDocumentCreated('users/{uid}/notifications/{notificationId}', async (event) => {
  const notification = event.data?.data();
  const recipientUid = event.params.uid;
  if (!notification || notification.type !== 'note') return;

  const [tokensSnap, actorSnap, recipientSnap, unreadSnap] = await Promise.all([
    db.collection('users').doc(recipientUid).collection('pushTokens').get(),
    db.collection('publicUsers').doc(notification.actorUid).get(),
    db.collection('users').doc(recipientUid).get(),
    // Badge must reflect the real unread count - a hardcoded badge: 1 never
    // cleared and left a permanent "1" on the app icon. addNote always writes
    // readAt: null explicitly, so the equality filter is reliable.
    db.collection('users').doc(recipientUid).collection('notifications').where('readAt', '==', null).count().get(),
  ]);
  if (recipientSnap.data()?.notificationPreferences?.notes === false) return;

  const tokens = tokensSnap.docs.map((item) => item.data().token).filter(Boolean);
  if (!tokens.length) return;

  const unreadCount = Math.max(1, unreadSnap.data().count);
  const actorName = actorSnap.data()?.displayName || 'A friend';
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: `${actorName} left a note`,
    body: notification.text,
    badge: unreadCount,
    data: {
      type: 'note',
      momentId: notification.momentId,
      url: notification.url || `then://moments/${encodeURIComponent(notification.momentId)}/notes`,
    },
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    logger.error('Expo push request failed', {
      status: response.status,
      body: await response.text(),
    });
  }
});

// --- Engagement pushes -------------------------------------------------------

exports.sendMomentNotification = onDocumentCreated('moments/{momentId}', async (event) => {
  const moment = event.data?.data();
  if (!moment?.authorUid) return;
  const authorUid = String(moment.authorUid);

  const [followersSnap, authorSnap] = await Promise.all([
    db.collection('users').doc(authorUid).collection('followers').get(),
    db.collection('publicUsers').doc(authorUid).get(),
  ]);
  if (followersSnap.empty) return;
  const authorName = authorSnap.data()?.displayName || 'A friend';

  const messages = [];
  await Promise.all(followersSnap.docs.map(async (followerDoc) => {
    const followerUid = followerDoc.id;
    if (followerUid === authorUid) return;
    const followerUser = await db.collection('users').doc(followerUid).get();
    if (followerUser.data()?.notificationPreferences?.friendMoments === false) return;
    const [tokens, badge] = await Promise.all([pushTokensFor(followerUid), unreadBadgeFor(followerUid)]);
    for (const { token } of tokens) {
      messages.push({
        to: token,
        sound: 'default',
        badge,
        title: `${authorName} developed a moment`,
        body: String(moment.frontText || 'Open Then to see it.'),
        data: { type: 'friendMoment', momentId: event.params.momentId, url: `then://moments/${encodeURIComponent(event.params.momentId)}` },
      });
    }
  }));
  await sendExpoPush(messages);
});

exports.sendFollowRequestNotification = onDocumentCreated('users/{uid}/followRequests/{requesterUid}', async (event) => {
  const ownerUid = event.params.uid;
  const requesterUid = event.params.requesterUid;
  const [ownerSnap, requesterSnap] = await Promise.all([
    db.collection('users').doc(ownerUid).get(),
    db.collection('publicUsers').doc(requesterUid).get(),
  ]);
  if (ownerSnap.data()?.notificationPreferences?.followRequests === false) return;
  const requester = requesterSnap.data() || {};
  const name = requester.displayName || 'Someone';
  const [tokens, badge] = await Promise.all([pushTokensFor(ownerUid), unreadBadgeFor(ownerUid)]);
  await sendExpoPush(tokens.map(({ token }) => ({
    to: token,
    sound: 'default',
    badge,
    title: `${name} wants to keep up`,
    body: String(event.data?.data()?.context || 'Open Then to approve or decline.'),
    data: { type: 'followRequest', url: requester.handle ? `then://profile/${encodeURIComponent(requester.handle)}` : 'then://' },
  })));
});

exports.sendApprovalNotification = onDocumentCreated('users/{requesterUid}/following/{ownerUid}', async (event) => {
  const requesterUid = event.params.requesterUid;
  const ownerUid = event.params.ownerUid;
  const [requesterSnap, ownerSnap] = await Promise.all([
    db.collection('users').doc(requesterUid).get(),
    db.collection('publicUsers').doc(ownerUid).get(),
  ]);
  if (requesterSnap.data()?.notificationPreferences?.friendApprovals === false) return;
  const owner = ownerSnap.data() || {};
  const name = owner.displayName || 'Your friend';
  // Invite redemptions create the same following docs, but "approved your
  // request" is the wrong story when both sides said yes via a link.
  const viaInvite = event.data?.data()?.viaInvite === true;
  const [tokens, badge] = await Promise.all([pushTokensFor(requesterUid), unreadBadgeFor(requesterUid)]);
  await sendExpoPush(tokens.map(({ token }) => ({
    to: token,
    sound: 'default',
    badge,
    title: viaInvite ? `${name} is on Then with you` : `${name} approved`,
    body: viaInvite
      ? "Invite accepted - you're keeping up with each other now."
      : "You're keeping up now - their moments land in your feed.",
    data: { type: 'friendApproval', url: owner.handle ? `then://profile/${encodeURIComponent(owner.handle)}` : 'then://' },
  })));
});

// --- Server-driven posting nudges --------------------------------------------

const NUDGE_SLOTS = { 11: 'midday', 19: 'evening' };
const DEFAULT_NUDGE_TIMEZONE = 'America/New_York';

function localClock(timezone, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    }).formatToParts(at);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
  } catch {
    return null;
  }
}

function nudgeCopy(slot, friendCount) {
  if (slot === 'midday') {
    return {
      title: 'a quiet nudge',
      body: friendCount > 0
        ? `Your people developed ${friendCount === 1 ? 'a moment' : `${friendCount} moments`} today. Add one of yours?`
        : "If today's given you a moment worth keeping, develop it.",
    };
  }
  return {
    title: 'before today slips away',
    body: friendCount > 0
      ? 'Your people shared today. One photo back?'
      : 'One photo for the people you keep up with.',
  };
}

exports.sendPostingNudges = onSchedule('0 * * * *', async () => {
  const usersSnap = await db.collection('users').get();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await Promise.all(usersSnap.docs.map(async (userDoc) => {
    const uid = userDoc.id;
    const data = userDoc.data();
    if (data?.notificationPreferences?.reminders === false) return;

    const tokens = await pushTokensFor(uid);
    if (!tokens.length) return;
    // Builds before the timezone-reporting client update register no
    // timezone; fall back rather than skipping them forever.
    const timezone = tokens.map((t) => t.timezone).find(Boolean) || DEFAULT_NUDGE_TIMEZONE;

    const clock = localClock(timezone);
    if (!clock) return;
    const slot = NUDGE_SLOTS[clock.hour];
    if (!slot) return;
    if (data?.lastNudge?.date === clock.date && data?.lastNudge?.slot === slot) return;

    const latestSnap = await db.collection('moments')
      .where('authorUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const latestCreated = latestSnap.docs[0]?.data()?.createdAt?.toDate();
    if (latestCreated && localClock(timezone, latestCreated)?.date === clock.date) return;

    const followingSnap = await db.collection('users').doc(uid).collection('following').get();
    let friendCount = 0;
    const followingIds = followingSnap.docs.map((d) => d.id);
    for (let i = 0; i < followingIds.length && friendCount < 6; i += 30) {
      const chunk = followingIds.slice(i, i + 30);
      const recent = await db.collection('moments')
        .where('authorUid', 'in', chunk)
        .where('createdAt', '>=', dayAgo)
        .limit(6 - friendCount)
        .get();
      friendCount += recent.size;
    }

    const copy = nudgeCopy(slot, friendCount);
    const badge = await unreadBadgeFor(uid);
    await sendExpoPush(tokens.map(({ token }) => ({
      to: token, sound: 'default', badge, title: copy.title, body: copy.body,
      data: { type: 'postingNudge', url: 'then://' },
    })));
    await userDoc.ref.set({ lastNudge: { date: clock.date, slot } }, { merge: true });
    logger.info('Posting nudge sent', { uid, slot, timezone, friendCount, tokens: tokens.length });
  }));
});

// --- Invite links ------------------------------------------------------------
//
// A friends-only feed makes the empty first session the biggest churn risk, so
// an invite pre-connects both people: the inviter explicitly asked, the
// redeemer explicitly accepted, and both consented - no request/approve
// friction on either side (ROADMAP item 4).

const { randomInt } = require('crypto');

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INVITE_MAX_REDEMPTIONS = 10;

function mintInviteCode() {
  return Array.from({ length: 6 }, () => INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)]).join('');
}

function normalizeInviteCode(value) {
  return String(value ?? '').trim().toUpperCase();
}

exports.createInvite = onCall(async (request) => {
  const uid = requireUid(request);

  // Reuse the caller's active code so a person shares one link, not a trail of
  // them. The pointer lives on the private user doc to avoid needing a
  // composite index on the invites collection.
  const userRef = db.collection('users').doc(uid);
  const existing = (await userRef.get()).data()?.activeInvite;
  if (existing?.code && existing.expiresAt?.toMillis?.() > Date.now()) {
    const inviteSnap = await db.collection('invites').doc(existing.code).get();
    if (inviteSnap.exists) {
      return { code: existing.code, expiresAt: existing.expiresAt.toMillis() };
    }
  }

  let code = null;
  for (let attempt = 0; attempt < 5 && !code; attempt += 1) {
    const candidate = mintInviteCode();
    const clash = await db.collection('invites').doc(candidate).get();
    if (!clash.exists) code = candidate;
  }
  if (!code) throw new HttpsError('resource-exhausted', 'Could not mint an invite code. Try again.');

  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_TTL_MS);
  const batch = db.batch();
  batch.set(db.collection('invites').doc(code), {
    inviterUid: uid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    redeemedBy: [],
    maxRedemptions: INVITE_MAX_REDEMPTIONS,
  });
  batch.set(userRef, { activeInvite: { code, expiresAt } }, { merge: true });
  await batch.commit();
  return { code, expiresAt: expiresAt.toMillis() };
});

exports.redeemInvite = onCall(async (request) => {
  const uid = requireUid(request);
  const code = normalizeInviteCode(request.data?.code);
  if (!INVITE_CODE_PATTERN.test(code)) {
    throw new HttpsError('invalid-argument', 'That does not look like an invite code.');
  }

  const inviteRef = db.collection('invites').doc(code);
  const inviterUid = (await inviteRef.get()).data()?.inviterUid;
  if (!inviterUid) throw new HttpsError('not-found', 'This invite does not exist.');
  if (inviterUid === uid) throw new HttpsError('failed-precondition', 'This is your own invite.');
  if (await blockedEitherWay(inviterUid, uid)) {
    throw new HttpsError('failed-precondition', 'This invite cannot be used.');
  }

  await db.runTransaction(async (tx) => {
    const invite = (await tx.get(inviteRef)).data();
    if (!invite) throw new HttpsError('not-found', 'This invite does not exist.');
    const redeemedBy = invite.redeemedBy ?? [];
    // Idempotent: a second tap on the same link is a no-op, not an error.
    if (redeemedBy.includes(uid)) return;
    if (invite.expiresAt?.toMillis?.() < Date.now()) {
      throw new HttpsError('failed-precondition', 'This invite has expired.');
    }
    if (redeemedBy.length >= (invite.maxRedemptions ?? INVITE_MAX_REDEMPTIONS)) {
      throw new HttpsError('resource-exhausted', 'This invite has been used up.');
    }

    const approvedAt = FieldValue.serverTimestamp();
    // Approved mutual follow, both directions. viaInvite lets the approval
    // notification use invite wording instead of request/approve wording.
    tx.set(db.collection('users').doc(inviterUid).collection('followers').doc(uid), { uid, approvedAt, viaInvite: true });
    tx.set(db.collection('users').doc(uid).collection('following').doc(inviterUid), { uid: inviterUid, approvedAt, viaInvite: true });
    tx.set(db.collection('users').doc(uid).collection('followers').doc(inviterUid), { uid: inviterUid, approvedAt, viaInvite: true });
    tx.set(db.collection('users').doc(inviterUid).collection('following').doc(uid), { uid, approvedAt, viaInvite: true });
    // Any pending requests between the two are now moot.
    tx.delete(db.collection('users').doc(inviterUid).collection('followRequests').doc(uid));
    tx.delete(db.collection('users').doc(uid).collection('followRequests').doc(inviterUid));
    tx.delete(db.collection('users').doc(uid).collection('outgoingFollowRequests').doc(inviterUid));
    tx.delete(db.collection('users').doc(inviterUid).collection('outgoingFollowRequests').doc(uid));
    tx.update(inviteRef, { redeemedBy: FieldValue.arrayUnion(uid) });
  });

  const inviterProfile = (await db.collection('publicUsers').doc(inviterUid).get()).data() ?? {};
  return {
    inviterUid,
    displayName: inviterProfile.displayName ?? null,
    handle: inviterProfile.handle ?? null,
  };
});
