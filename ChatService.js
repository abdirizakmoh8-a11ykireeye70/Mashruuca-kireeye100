// ============================================================
//  KIREEYE — Chat Service
// ============================================================
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, query,
  where, orderBy, limit, onSnapshot, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/firebaseConfig';

// ── Get or Create Chat ───────────────────────────────────────
export const getOrCreateChat = async (uid1, uid2, listingId) => {
  const chatId = [uid1, uid2].sort().join('_') + '_' + listingId;
  const chatRef = doc(db, 'chats', chatId);
  const snap = await getDoc(chatRef);

  if (!snap.exists()) {
    await setDoc(chatRef, {
      id: chatId,
      participants: [uid1, uid2],
      listingId,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastMessageBy: '',
      unreadCount: { [uid1]: 0, [uid2]: 0 },
      paymentStatus: 'unpaid',  // unpaid | uid1_paid | uid2_paid | both_paid
      dealConfirmed: false,
      contactShared: false,
      createdAt: serverTimestamp(),
      archivedAt: new Date(Date.now() + 4 * 30 * 24 * 60 * 60 * 1000), // 4 months
    });
  }
  return chatId;
};

// ── Send Message ─────────────────────────────────────────────
export const sendMessage = async (chatId, senderId, content, type = 'text') => {
  const msgRef = await addDoc(
    collection(db, 'chats', chatId, 'messages'),
    {
      senderId,
      content,
      type,           // text | image | audio | system | payment
      read: false,
      readAt: null,
      reactions: {},
      isPinned: false,
      createdAt: serverTimestamp(),
    }
  );

  // Update chat last message
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: type === 'text' ? content : `[${type}]`,
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
  });

  return msgRef.id;
};

// ── Send Image / Audio ───────────────────────────────────────
export const sendMedia = async (chatId, senderId, file, type) => {
  const ext = type === 'audio' ? 'aac' : 'jpg';
  const mediaRef = ref(storage, `chats/${chatId}/${Date.now()}.${ext}`);
  await uploadBytes(mediaRef, file);
  const url = await getDownloadURL(mediaRef);
  return sendMessage(chatId, senderId, url, type);
};

// ── Listen to Messages ───────────────────────────────────────
export const listenToMessages = (chatId, callback) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ── Mark Messages as Read ────────────────────────────────────
export const markMessagesRead = async (chatId, uid) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    where('read', '==', false),
    where('senderId', '!=', uid),
  );
  const snap = await getDocs(q);
  const updates = snap.docs.map(d =>
    updateDoc(d.ref, { read: true, readAt: serverTimestamp() })
  );
  await Promise.all(updates);
  await updateDoc(doc(db, 'chats', chatId), {
    [`unreadCount.${uid}`]: 0,
  });
};

// ── Pin Message ──────────────────────────────────────────────
export const pinMessage = async (chatId, msgId) => {
  await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), {
    isPinned: true,
  });
};

// ── React to Message ─────────────────────────────────────────
export const reactToMessage = async (chatId, msgId, uid, emoji) => {
  await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), {
    [`reactions.${uid}`]: emoji,
  });
};

// ── Get All Chats for User ───────────────────────────────────
export const getUserChats = (uid, callback) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ── Record Payment in Chat ───────────────────────────────────
export const recordChatPayment = async (chatId, uid) => {
  const chatSnap = await getDoc(doc(db, 'chats', chatId));
  const chat = chatSnap.data();
  const [p1, p2] = chat.participants;
  let newStatus = chat.paymentStatus;
  if (uid === p1) newStatus = newStatus === 'uid2_paid' ? 'both_paid' : 'uid1_paid';
  if (uid === p2) newStatus = newStatus === 'uid1_paid' ? 'both_paid' : 'uid2_paid';

  await updateDoc(doc(db, 'chats', chatId), { paymentStatus: newStatus });

  // Both paid — share contact details
  if (newStatus === 'both_paid') {
    await updateDoc(doc(db, 'chats', chatId), { contactShared: true });
    await sendMessage(chatId, 'system',
      '✅ Labada qof lacagta way bixiyeen. Xiriirka ayaa la wadaagay!', 'system'
    );
  }
  return newStatus;
};

// ── Confirm Deal (both tap confirm) ─────────────────────────
export const confirmDeal = async (chatId, uid) => {
  const chatSnap = await getDoc(doc(db, 'chats', chatId));
  const chat = chatSnap.data();
  const confirmField = `confirmed_${uid}`;
  await updateDoc(doc(db, 'chats', chatId), { [confirmField]: true });

  const [p1, p2] = chat.participants;
  const otherUid = uid === p1 ? p2 : p1;
  const otherConfirmed = chat[`confirmed_${otherUid}`];

  if (otherConfirmed) {
    await updateDoc(doc(db, 'chats', chatId), { dealConfirmed: true });
    await sendMessage(chatId, 'system',
      '🤝 Heshiiska waa la xaqiijiyay! Aad baad ugu mahadsantihiin.', 'system'
    );
  }
};

// ── Auto Reply ───────────────────────────────────────────────
export const sendAutoReply = async (chatId, ownerId, lang = 'so') => {
  const msgs = {
    so: 'Hadda kuma jiro, waan ku soo celceliyaa 🏠',
    en: "I'm not available right now, I'll get back to you soon 🏠",
    ar: 'لست متاحاً الآن، سأرد عليك قريباً 🏠',
  };
  await sendMessage(chatId, ownerId, msgs[lang] || msgs.so, 'system');
};

// ── Auto Translation ─────────────────────────────────────────
export const translateMessage = async (text, targetLang) => {
  try {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: targetLang }),
      }
    );
    const data = await res.json();
    return data?.data?.translations?.[0]?.translatedText || text;
  } catch (_) {
    return text;
  }
};

