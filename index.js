// ============================================================
//  KIREEYE — Cloud Functions (Firebase Functions)
//  Deploy: firebase deploy --only functions
// ============================================================
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const fetch     = require('node-fetch');
admin.initializeApp();

const db      = admin.firestore();
const storage = admin.storage();

// ── 1. Delete Account (cascade) ──────────────────────────────
exports.deleteAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const uid = context.auth.uid;
  const batch = db.batch();

  // Delete user doc
  batch.delete(db.collection('users').doc(uid));

  // Delete listings
  const listings = await db.collection('listings').where('ownerId', '==', uid).get();
  listings.docs.forEach(d => batch.delete(d.ref));

  // Delete chats
  const chats = await db.collection('chats').where('participants', 'array-contains', uid).get();
  chats.docs.forEach(d => batch.delete(d.ref));

  // Delete transactions
  const txs = await db.collection('transactions').where('uid', '==', uid).get();
  txs.docs.forEach(d => batch.delete(d.ref));

  // Delete notifications
  const notifs = await db.collection('notifications').where('userId', '==', uid).get();
  notifs.docs.forEach(d => batch.delete(d.ref));

  await batch.commit();

  // Delete storage files
  try {
    await storage.bucket().deleteFiles({ prefix: `users/${uid}/` });
  } catch (_) {}

  // Delete Firebase Auth user
  await admin.auth().deleteUser(uid);
  return { success: true };
});

// ── 2. Send Push Notification ────────────────────────────────
exports.sendPushNotification = functions.firestore
  .document('fcmQueue/{docId}')
  .onCreate(async (snap) => {
    const { userId, type, data } = snap.data();
    const userSnap = await db.collection('users').doc(userId).get();
    const user     = userSnap.data();

    if (!user?.fcmToken) return;

    const notifMap = {
      new_message:   { title: '💬 Fariin Cusub',        body: data.preview || 'Fariin cusub ayaad haysaa' },
      deal_confirmed:{ title: '🤝 Heshiis la Xaqiijiyay', body: 'Heshiiska la xaqiijiyay!' },
      payment_received: { title: '💰 Lacag la Qaatay', body: `$${data.amount} ayaa la qaatay` },
      verification_approved: { title: '✅ Xaqiijin', body: 'Xisaabta si guul leh ayaa la xaqiijiyay' },
      listing_expiring: { title: '⏰ Listing-kaaga', body: '30 cisho ayuu gaadhay — cusboonaysii' },
      account_banned: { title: '🚫 Xisaabta', body: 'Xisaabta waa la joojiyay' },
      sos_alert:    { title: '🆘 SOS', body: `${data.userName} caawimaad baahan yahay!` },
    };

    const notif = notifMap[type] || { title: 'Kireeye', body: 'Ogeysiis cusub' };
    const { notifSettings } = user;

    if (!notifSettings?.push) return;
    if (notifSettings?.doNotDisturb) {
      const now = new Date();
      const h   = now.getHours();
      if (h >= 22 || h < 7) return; // DND hours
    }

    await admin.messaging().send({
      token:        user.fcmToken,
      notification: notif,
      data:         { type, ...data },
      android:      { priority: 'high' },
      apns:         { payload: { aps: { sound: 'default', badge: 1 } } },
    });

    await snap.ref.delete();
  });

// ── 3. AI Fake Listing Detection ─────────────────────────────
exports.aiListingCheck = functions.firestore
  .document('listings/{listingId}')
  .onCreate(async (snap, context) => {
    const listing = snap.data();
    const listingId = context.params.listingId;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': functions.config().anthropic.key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 256,
          system: `You are a listing verification AI for Kireeye, a house rental app in Somaliland.
Analyze the listing data and respond with JSON only: {"passed": true/false, "reason": "brief reason"}
Flag if: price is unrealistically low/high for Somaliland (normal: $50-$500/month),
description seems fake/copy-pasted, title is gibberish, or data is inconsistent.`,
          messages: [{
            role: 'user',
            content: `Verify this listing:
Title: ${listing.title}
Price: $${listing.price}/month
City: ${listing.city}, ${listing.district}
Rooms: ${listing.rooms}, Bathrooms: ${listing.bathrooms}, Area: ${listing.area}m²
Description: ${listing.description}
Type: ${listing.type}`,
          }],
        }),
      });

      const aiData = await res.json();
      const text   = aiData.content?.[0]?.text || '{"passed": true}';
      const clean  = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      await db.collection('listings').doc(listingId).update({
        isVerifiedByAI: true,
        aiCheckPassed:  result.passed,
        aiCheckReason:  result.reason || '',
        aiCheckedAt:    admin.firestore.FieldValue.serverTimestamp(),
        // Auto-reject fake listings
        status: result.passed ? 'available' : 'rejected_ai',
      });

      // Notify admin if rejected
      if (!result.passed) {
        await db.collection('adminNotifications').add({
          type:      'ai_listing_rejected',
          listingId,
          reason:    result.reason,
          ownerId:   listing.ownerId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('AI check failed:', e);
      await db.collection('listings').doc(listingId).update({ isVerifiedByAI: false });
    }
  });

// ── 4. Auto-Remove Expired Listings ─────────────────────────
exports.checkExpiredListings = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const now  = admin.firestore.Timestamp.now();
    const snap = await db.collection('listings')
      .where('status', '==', 'available')
      .where('expiresAt', '<=', now)
      .get();

    const batch = db.batch();
    const notifPromises = [];

    snap.docs.forEach(d => {
      batch.update(d.ref, { status: 'expired', updatedAt: now });
      // Notify owner
      notifPromises.push(
        db.collection('fcmQueue').add({
          userId: d.data().ownerId,
          type:   'listing_expiring',
          data:   { listingId: d.id, title: d.data().title },
          createdAt: now,
        })
      );
    });

    await batch.commit();
    await Promise.all(notifPromises);
    console.log(`Expired ${snap.size} listings`);
  });

// ── 5. Daily Backup ──────────────────────────────────────────
exports.dailyBackup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const projectId = process.env.GCLOUD_PROJECT;
    const bucket    = `gs://${projectId}-backups`;
    const timestamp = new Date().toISOString().split('T')[0];

    // Export Firestore to GCS
    const client = new (require('@google-cloud/firestore').v1.FirestoreAdminClient)();
    await client.exportDocuments({
      name:           `projects/${projectId}/databases/(default)`,
      outputUriPrefix: `${bucket}/firestore/${timestamp}`,
      collectionIds:  [],
    });

    console.log(`Backup complete: ${timestamp}`);
  });

// ── 6. Suspicious Activity Detection ────────────────────────
exports.detectSuspiciousLogin = functions.auth
  .user()
  .beforeSignIn(async (user, context) => {
    // Check if user is banned
    const banSnap = await db.collection('bannedUsers').doc(user.uid).get();
    if (banSnap.exists()) {
      throw new functions.auth.HttpsError(
        'permission-denied',
        'Xisaabta waa la joojiyay. Help Center la xiriir.'
      );
    }

    // Log login
    await db.collection('loginLogs').add({
      uid:       user.uid,
      ip:        context.ipAddress || 'unknown',
      userAgent: context.userAgent || 'unknown',
      time:      admin.firestore.FieldValue.serverTimestamp(),
    });
  });

// ── 7. Update Trust Score ────────────────────────────────────
exports.updateTrustScore = functions.firestore
  .document('reviews/{reviewId}')
  .onCreate(async (snap) => {
    const { targetId, rating } = snap.data();
    const userSnap = await db.collection('users').doc(targetId).get();
    const user     = userSnap.data();

    const newRating    = user?.rating || 0;
    const ratingCount  = user?.ratingCount || 0;
    const totalRented  = user?.totalRented || 0;

    let badge = '';
    if (newRating >= 4.5 && ratingCount >= 5 && totalRented >= 3) {
      badge = user?.totalListings > 0 ? 'top_landlord' : 'trusted_tenant';
    }

    await db.collection('users').doc(targetId).update({ trustBadge: badge });
  });

// ── 8. Admin Set Custom Claims ───────────────────────────────
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Only callable from Firebase Console or existing admin
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  await admin.auth().setCustomUserClaims(data.uid, { admin: true });
  return { success: true };
});

// ── 9. Verified Claim after selfie approval ──────────────────
exports.setVerifiedClaim = functions.firestore
  .document('users/{uid}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();
    if (!before.isVerified && after.isVerified) {
      await admin.auth().setCustomUserClaims(context.params.uid, { verified: true });
    }
  });

// ── 10. Report Counter & Auto-Ban ───────────────────────────
exports.onReportCreated = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snap) => {
    const { targetId, targetType } = snap.data();
    if (targetType !== 'user') return;

    const userRef  = db.collection('users').doc(targetId);
    const userSnap = await userRef.get();
    const reports  = (userSnap.data()?.totalReports || 0);

    if (reports >= 3) {
      await userRef.update({
        isBanned: true, banReason: 'auto_3_reports',
        bannedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await admin.auth().setCustomUserClaims(targetId, { banned: true });
    }
  });

