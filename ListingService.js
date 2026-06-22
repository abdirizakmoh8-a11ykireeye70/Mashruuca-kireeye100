// ============================================================
//  KIREEYE — Listing Service
// ============================================================
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter,
  serverTimestamp, increment, onSnapshot,
} from 'firebase/firestore';
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { db, storage } from '../../firebase/firebaseConfig';

const LISTINGS = 'listings';

// ── Create Listing ───────────────────────────────────────────
export const createListing = async (uid, data, images) => {
  // Upload images first (max 6)
  const imageURLs = [];
  const toUpload = images.slice(0, 6);
  for (let i = 0; i < toUpload.length; i++) {
    const imgRef = ref(storage, `listings/temp_${Date.now()}_${i}`);
    await uploadBytes(imgRef, toUpload[i]);
    const url = await getDownloadURL(imgRef);
    imageURLs.push(url);
  }

  const docRef = await addDoc(collection(db, LISTINGS), {
    ownerId: uid,
    title: data.title,
    description: data.description,
    price: Number(data.price),
    priceHistory: [{ price: Number(data.price), date: serverTimestamp() }],
    rooms: Number(data.rooms),
    bathrooms: Number(data.bathrooms),
    area: Number(data.area),
    type: data.type,           // house | apartment | room | villa
    city: data.city,
    district: data.district,
    location: data.location,   // { lat, lng }
    images: imageURLs,
    status: 'available',       // available | pending | rented
    rentedBy: null,
    rentedAt: null,
    viewCount: 0,
    shareCount: 0,
    hasGarage: data.hasGarage || false,
    hasWater: data.hasWater || false,
    hasElectricity: data.hasElectricity || false,
    hasInternet: data.hasInternet || false,
    hasFloorPlan: false,
    hasVirtualTour: false,
    isFeatured: false,
    isVerifiedByAI: false,
    aiCheckPassed: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update image paths with real listing ID
  const finalImageURLs = [];
  for (let i = 0; i < imageURLs.length; i++) {
    const newRef = ref(storage, `listings/${docRef.id}/${i}`);
    const blob = await fetch(imageURLs[i]).then(r => r.blob());
    await uploadBytes(newRef, blob);
    finalImageURLs.push(await getDownloadURL(newRef));
  }
  await updateDoc(docRef, { images: finalImageURLs, id: docRef.id });
  return docRef.id;
};

// ── Get Single Listing ───────────────────────────────────────
export const getListing = async (id) => {
  const snap = await getDoc(doc(db, LISTINGS, id));
  if (!snap.exists()) return null;
  // Increment view count
  await updateDoc(doc(db, LISTINGS, id), { viewCount: increment(1) });
  return { id: snap.id, ...snap.data() };
};

// ── Get Listings with Filters ────────────────────────────────
export const getListings = async ({
  city = null,
  type = null,
  minPrice = null,
  maxPrice = null,
  minRooms = null,
  status = 'available',
  lastDoc = null,
  pageSize = 20,
} = {}) => {
  let q = query(
    collection(db, LISTINGS),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );
  if (city) q = query(q, where('city', '==', city));
  if (type) q = query(q, where('type', '==', type));
  if (minPrice) q = query(q, where('price', '>=', minPrice));
  if (maxPrice) q = query(q, where('price', '<=', maxPrice));
  if (minRooms) q = query(q, where('rooms', '>=', minRooms));
  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snap = await getDocs(q);
  return {
    listings: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  };
};

// ── Real-time Listing Listener ───────────────────────────────
export const listenToListings = (callback, filters = {}) => {
  const q = query(
    collection(db, LISTINGS),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc'),
    limit(30),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ── Update Listing ───────────────────────────────────────────
export const updateListing = async (id, uid, data) => {
  const listing = await getListing(id);
  if (!listing || listing.ownerId !== uid) throw new Error('Unauthorized');
  await updateDoc(doc(db, LISTINGS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// ── Mark as Rented ───────────────────────────────────────────
export const markAsRented = async (listingId, tenantId) => {
  await updateDoc(doc(db, LISTINGS, listingId), {
    status: 'rented',
    rentedBy: tenantId,
    rentedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// ── Renew Listing (reset 30-day expiry) ─────────────────────
export const renewListing = async (listingId, uid) => {
  const listing = await getListing(listingId);
  if (!listing || listing.ownerId !== uid) throw new Error('Unauthorized');
  await updateDoc(doc(db, LISTINGS, listingId), {
    status: 'available',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    updatedAt: serverTimestamp(),
  });
};

// ── Delete Listing ───────────────────────────────────────────
export const deleteListing = async (id, uid) => {
  const listing = await getListing(id);
  if (!listing || listing.ownerId !== uid) throw new Error('Unauthorized');
  for (const url of listing.images) {
    try { await deleteObject(ref(storage, url)); } catch (_) {}
  }
  await deleteDoc(doc(db, LISTINGS, id));
};

// ── Get Owner Listings ───────────────────────────────────────
export const getOwnerListings = async (uid) => {
  const q = query(
    collection(db, LISTINGS),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ── Get Similar Listings ─────────────────────────────────────
export const getSimilarListings = async (listing) => {
  const q = query(
    collection(db, LISTINGS),
    where('city', '==', listing.city),
    where('type', '==', listing.type),
    where('status', '==', 'available'),
    limit(5),
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter(d => d.id !== listing.id)
    .map(d => ({ id: d.id, ...d.data() }));
};

// ── Increment Share Count ────────────────────────────────────
export const incrementShare = async (listingId) => {
  await updateDoc(doc(db, LISTINGS, listingId), { shareCount: increment(1) });
};

