const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

initializeApp();

exports.sendNoteNotification = onDocumentCreated(
  'users/{uid}/notifications/{notificationId}',
  async (event) => {
    const notification = event.data?.data();
    const recipientUid = event.params.uid;
    if (!notification || notification.type !== 'note') return;

    const db = getFirestore();
    const [tokensSnap, actorSnap] = await Promise.all([
      db.collection('users').doc(recipientUid).collection('pushTokens').get(),
      db.collection('publicUsers').doc(notification.actorUid).get(),
    ]);
    const tokens = tokensSnap.docs.map((item) => item.data().token).filter(Boolean);
    if (!tokens.length) return;

    const actorName = actorSnap.data()?.displayName || 'A friend';
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: `${actorName} left a note`,
      body: notification.text,
      badge: 1,
      data: {
        type: 'note',
        momentId: notification.momentId,
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
  },
);
