// ============================================================
//  KIREEYE — Auth Service
// ============================================================
import {
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebase/firebaseConfig';

// ── Phone OTP ────────────────────────────────────────────────
export const sendOTP = async (phoneNumber) => {
  try {
    // Format: +252XXXXXXXXX
    const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const recaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    const confirmation = await signInWithPhoneNumber(auth, formatted, recaptcha);
    return { success: true, confirmation };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const verifyOTP = async (confirmation, otp) => {
  try {
    const result = await confirmation.confirm(otp);
    return { success: true, user: result.user };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ── Google Sign In ───────────────────────────────────────────
export const signInWithGoogle = async (idToken) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return { success: true, user: result.user };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ── Create / Get User Profile ────────────────────────────────
export const createUserProfile = async (uid, data) => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      fullName: data.fullName || '',
      phone: data.phone || '',
      email: data.email || '',
      photoURL: '',
      selfieURL: '',
      isVerified: false,
      verificationStatus: 'unverified', // unverified | pending | verified
      isAdmin: false,
      isBanned: false,
      banReason: '',
      totalReports: 0,
      trustScore: 0,
      trustBadge: '',           // 'trusted_tenant' | 'top_landlord' | ''
      totalListings: 0,
      totalRented: 0,
      rating: 0,
      ratingCount: 0,
      bio: '',
      preferredLocations: [],
      emergencyContact: '',
      notifSettings: {
        push: true,
        sms: true,
        email: true,
        chat: true,
        payment: true,
        system: true,
        doNotDisturb: false,
        dndStart: '22:00',
        dndEnd: '07:00',
      },
      securitySettings: {
        twoFactorEnabled: false,
        biometricEnabled: false,
      },
      language: 'so',
      darkMode: false,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, { lastActive: serverTimestamp() });
  }
  return (await getDoc(ref)).data();
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = async (uid, data) => {
  const allowed = [
    'fullName', 'bio', 'preferredLocations', 'emergencyContact',
    'notifSettings', 'securitySettings', 'language', 'darkMode',
    'photoURL',
  ];
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  );
  await updateDoc(doc(db, 'users', uid), { ...filtered, updatedAt: serverTimestamp() });
};

// ── Delete Account ───────────────────────────────────────────
export const deleteUserAccount = async (uid) => {
  // Cloud Function handles cascade delete of all user data
  await fetch('/api/deleteAccount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid }),
  });
  await auth.currentUser?.delete();
};

// ── Sign Out ─────────────────────────────────────────────────
export const logOut = async () => {
  await signOut(auth);
};

// ── Auth State Listener ──────────────────────────────────────
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

