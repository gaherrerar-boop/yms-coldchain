// Presence Repository — Data Access Layer for presence collection
import { getFirebaseDb } from '../firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION = 'presence';

const getDb = () => getFirebaseDb();

export async function getPresence(uid) {
  const db = getDb();
  const presenceRef = doc(db, COLLECTION, uid);
  const snapshot = await getDoc(presenceRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getAllPresence(cd) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('cd', '==', cd));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getOnlineUsers(cd) {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where('cd', '==', cd),
    where('online', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updatePresence(uid, presenceData) {
  const db = getDb();
  const presenceRef = doc(db, COLLECTION, uid);

  await setDoc(presenceRef, {
    ...presenceData,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

export async function setOnline(uid, userData) {
  const db = getDb();
  const presenceRef = doc(db, COLLECTION, uid);

  await setDoc(presenceRef, {
    ...userData,
    online: true,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

export async function setOffline(uid) {
  const db = getDb();
  const presenceRef = doc(db, COLLECTION, uid);

  await setDoc(presenceRef, {
    online: false,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

export async function deletePresence(uid) {
  const db = getDb();
  const presenceRef = doc(db, COLLECTION, uid);
  await deleteDoc(presenceRef);
}
