// ============================================================
//  KIREEYE — Report, Verification & Notification Services
// ============================================================
import {
  collection, doc, addDoc, getDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp, increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/firebaseConfig';

// ════════════════════════════════════════════════════════════
//  REPORT SERVICE
// ════════════════════════════════════════════════════════════
export const REPORT_REASONS = {
  so: ['Macluumaad been ah', 'Khiyaano', 'Dabeecad xun', 'Sawirro been abuur', 'Qiime been ah', 'Kale'],
  en: ['Fake information', 'Fraud/Scam', 'Bad behavior', 'Fake photos', 'Wrong price', 'Other'],
  ar: ['معلومات مزيفة', 'احتيال', 'سلوك سيء', 'صور مزيفة', 'سعر خاطئ', 'أخرى'],
};

export const submitReport = async ({ reporterId, targetId, targetType, reason, details, chatId }) => {
  const reportRef = await addDoc(collection(db, 'reports'), {
    reporterId,
    targetId,
    targetType,   // user | listing
    reason,
    details,
    chatId: chatId || null,
    status: 'pending',    // pending | reviewed | dismissed | actioned
    createdAt: serverTimestamp(),
  });

  // Increment user report count
  if (targetType === 'user') {
    const userRef = doc(db, 'users', targetId);
    const userSnap = await getDoc(userRef);
    const currentReports = (userSnap.data()?.totalReports || 0) + 1;
    await updateDoc(userRef, { totalReports: increment(1) });

    // Auto-ban at 3 reports
    if (currentReports >= 3) {
      await updateDoc(userRef, {
        isBanned: true,
        banReason: 'auto_ban_3_reports',
        bannedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'bannedUsers'), {
        uid: targetId,
        reason: 'auto_ban_3_reports',
        bannedAt: serverTimestamp(),
        canAppeal: true,
      });
      // Notify admin
      await addDoc(collection(db, 'adminNotifications'), {
        type: 'auto_ban',
        targetId,
        reportCount: currentReports,
        createdAt: serverTimestamp(),
      });
    }
  }

  // Notify admin
  await addDoc(collection(db, 'adminNotifications'), {
    type: 'new_report',
    reportId: reportRef.id,
    reporterId,
    targetId,
    targetType,
    createdAt: serverTimestamp(),
  });

  return reportRef.id;
};

// Appeal ban
export const submitBanAppeal = async (uid, reason) => {
  await addDoc(collection(db, 'helpTickets'), {
    userId: uid,
    type: 'ban_appeal',
    message: reason,
    status: 'open',
    createdAt: serverTimestamp(),
  });
};

// ════════════════════════════════════════════════════════════
//  VERIFICATION SERVICE
// ════════════════════════════════════════════════════════════
export const submitSelfieVerification = async (uid, selfieBlob) => {
  const selfieRef = ref(storage, `users/${uid}/selfie/selfie.jpg`);
  await uploadBytes(selfieRef, selfieBlob);
  const selfieURL = await getDownloadURL(selfieRef);

  await updateDoc(doc(db, 'users', uid), {
    selfieURL,
    verificationStatus: 'pending',
    selfieSubmittedAt: serverTimestamp(),
  });

  // Notify admin
  await addDoc(collection(db, 'adminNotifications'), {
    type: 'verification_request',
    uid,
    selfieURL,
    createdAt: serverTimestamp(),
  });

  return selfieURL;
};

export const approveVerification = async (uid) => {
  await updateDoc(doc(db, 'users', uid), {
    isVerified: true,
    verificationStatus: 'verified',
    verifiedAt: serverTimestamp(),
  });
  await sendNotification(uid, 'verification_approved', {});
};

export const rejectVerification = async (uid, reason) => {
  await updateDoc(doc(db, 'users', uid), {
    verificationStatus: 'rejected',
    verificationRejectedReason: reason,
    verificationRejectedAt: serverTimestamp(),
  });
  await sendNotification(uid, 'verification_rejected', { reason });
};

// ════════════════════════════════════════════════════════════
//  NOTIFICATION SERVICE
// ════════════════════════════════════════════════════════════
export const NOTIF_TYPES = {
  new_message:              { icon: '💬', titleKey: 'newMessage' },
  deal_confirmed:           { icon: '🤝', titleKey: 'dealConfirmed' },
  payment_received:         { icon: '💰', titleKey: 'paymentReceived' },
  listing_expiring:         { icon: '⏰', titleKey: 'listingExpiring' },
  account_banned:           { icon: '🚫', titleKey: 'accountBanned' },
  report_received:          { icon: '⚠️', titleKey: 'reportReceived' },
  verification_approved:    { icon: '✅', titleKey: 'verified2' },
  verification_rejected:    { icon: '❌', titleKey: 'pendingVerification' },
};

export const sendNotification = async (uid, type, data = {}) => {
  await addDoc(collection(db, 'notifications'), {
    userId: uid,
    type,
    data,
    read: false,
    readAt: null,
    createdAt: serverTimestamp(),
  });
  // Push notification via Cloud Function (FCM)
  await addDoc(collection(db, 'fcmQueue'), {
    userId: uid,
    type,
    data,
    createdAt: serverTimestamp(),
  });
};

export const listenToNotifications = (uid, callback) => {
  const { onSnapshot } = require('firebase/firestore');
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const markNotificationRead = async (notifId) => {
  await updateDoc(doc(db, 'notifications', notifId), {
    read: true,
    readAt: serverTimestamp(),
  });
};

// ════════════════════════════════════════════════════════════
//  SOS SERVICE
// ════════════════════════════════════════════════════════════
export const sendSOS = async (uid, location) => {
  const userSnap = await getDoc(doc(db, 'users', uid));
  const user = userSnap.data();
  await addDoc(collection(db, 'sosAlerts'), {
    uid,
    userName: user?.fullName || '',
    phone: user?.phone || '',
    emergencyContact: user?.emergencyContact || '',
    location: location || null,
    status: 'active',
    createdAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'adminNotifications'), {
    type: 'sos_alert',
    uid,
    userName: user?.fullName,
    phone: user?.phone,
    createdAt: serverTimestamp(),
  });
};

// ════════════════════════════════════════════════════════════
//  HELP CENTER SERVICE
// ════════════════════════════════════════════════════════════
export const submitHelpTicket = async (uid, message) => {
  const ticketRef = await addDoc(collection(db, 'helpTickets'), {
    userId: uid,
    type: 'general',
    message,
    status: 'open',
    createdAt: serverTimestamp(),
  });
  return ticketRef.id;
};

export const escalateToAdmin = async (ticketId) => {
  await updateDoc(doc(db, 'helpTickets', ticketId), {
    status: 'escalated',
    escalatedAt: serverTimestamp(),
  });
};

// ════════════════════════════════════════════════════════════
//  REVIEW SERVICE
// ════════════════════════════════════════════════════════════
export const submitReview = async ({ reviewerId, targetId, rating, comment, listingId }) => {
  if (rating < 1 || rating > 5) throw new Error('Rating must be 1-5');
  await addDoc(collection(db, 'reviews'), {
    reviewerId,
    targetId,
    listingId: listingId || null,
    rating,
    comment,
    createdAt: serverTimestamp(),
  });

  // Recalculate average rating
  const q = query(collection(db, 'reviews'), where('targetId', '==', targetId));
  const snap = await getDocs(q);
  const ratings = snap.docs.map(d => d.data().rating);
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  await updateDoc(doc(db, 'users', targetId), {
    rating: Math.round(avg * 10) / 10,
    ratingCount: ratings.length,
  });
};

