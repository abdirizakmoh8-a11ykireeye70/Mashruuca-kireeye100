// ============================================================
//  KIREEYE — Payment Service
//  Telesom (Zaad): 252 63 6089179
//  Somtel:         252 65 7699381
//  Waafi App:      integration
// ============================================================
import {
  collection, addDoc, updateDoc, doc, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { recordChatPayment } from './chatService';

export const PAYMENT_METHODS = {
  ZAAD:   { id: 'zaad',   name: 'Telesom (Zaad)', number: '252636089179', icon: '📱' },
  SOMTEL: { id: 'somtel', name: 'Somtel',          number: '252657699381', icon: '📡' },
  WAAFI:  { id: 'waafi',  name: 'Waafi App',       number: '',             icon: '💳' },
};

export const SERVICE_FEE = 3; // USD per user

// ── Initiate Payment ─────────────────────────────────────────
export const initiatePayment = async ({ uid, chatId, listingId, method }) => {
  // Create pending transaction
  const txRef = await addDoc(collection(db, 'transactions'), {
    uid,
    chatId,
    listingId,
    method,
    amount: SERVICE_FEE,
    currency: 'USD',
    status: 'pending',          // pending | completed | failed | refunded
    paymentNumber: PAYMENT_METHODS[method]?.number || '',
    transactionId: null,
    receipt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    txId: txRef.id,
    payTo: PAYMENT_METHODS[method]?.number,
    amount: SERVICE_FEE,
    reference: txRef.id.slice(0, 8).toUpperCase(),
  };
};

// ── Confirm Payment (user submits transaction ID) ────────────
export const confirmPayment = async ({ txId, uid, chatId, transactionId }) => {
  // In production: verify via Telesom/Somtel/Waafi API
  // Here we record the user-supplied transaction ID for admin review
  await updateDoc(doc(db, 'transactions', txId), {
    transactionId,
    status: 'completed',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update chat payment status
  const status = await recordChatPayment(chatId, uid);

  // Generate receipt
  const receipt = {
    receiptId: txId.slice(0, 8).toUpperCase(),
    amount: SERVICE_FEE,
    currency: 'USD',
    paidAt: new Date().toISOString(),
    transactionId,
  };

  await updateDoc(doc(db, 'transactions', txId), { receipt });

  return { success: true, chatPaymentStatus: status, receipt };
};

// ── Get Transaction ──────────────────────────────────────────
export const getTransaction = async (txId) => {
  const snap = await getDoc(doc(db, 'transactions', txId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ── Request Refund ───────────────────────────────────────────
export const requestRefund = async (txId, uid, reason) => {
  await updateDoc(doc(db, 'transactions', txId), {
    status: 'refund_requested',
    refundReason: reason,
    refundRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Notify admin
  await addDoc(collection(db, 'adminNotifications'), {
    type: 'refund_request',
    txId,
    uid,
    reason,
    createdAt: serverTimestamp(),
  });
};

// ── Get Payment Instructions by Method ──────────────────────
export const getPaymentInstructions = (method, amount, reference, lang = 'so') => {
  const m = PAYMENT_METHODS[method];
  const instructions = {
    so: {
      zaad:   `1. Taleefankaaga fur\n2. Dial *881#\n3. Dooro "Send Money"\n4. Geli: ${m.number}\n5. Geli: $${amount}\n6. Reference: ${reference}`,
      somtel: `1. Taleefankaaga fur\n2. Dial *802#\n3. Dooro "Transfer"\n4. Geli: ${m.number}\n5. Geli: $${amount}\n6. Reference: ${reference}`,
      waafi:  `1. Waafi App fur\n2. "Send Money" dooro\n3. Geli: ${m.number}\n4. Geli: $${amount}\n5. Reference: ${reference}`,
    },
    en: {
      zaad:   `1. Open your phone\n2. Dial *881#\n3. Select "Send Money"\n4. Enter: ${m.number}\n5. Amount: $${amount}\n6. Reference: ${reference}`,
      somtel: `1. Dial *802#\n2. Select "Transfer"\n3. Enter: ${m.number}\n4. Amount: $${amount}\n5. Reference: ${reference}`,
      waafi:  `1. Open Waafi App\n2. Select "Send Money"\n3. Enter: ${m.number}\n4. Amount: $${amount}\n5. Reference: ${reference}`,
    },
  };
  return instructions[lang]?.[method] ?? instructions.en[method];
};

