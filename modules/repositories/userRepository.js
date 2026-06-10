// User Repository — Data Access Layer for users collection
import { getFirebaseDb } from '../firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION = 'users';

const getDb = () => getFirebaseDb();

export async function getUserById(uid) {
  const db = getDb();
  const userRef = doc(db, COLLECTION, uid);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getAllUsers(cd) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('cd', '==', cd));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getUsersByRole(rol) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('rol', '==', rol));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getUsersByRoleAndCD(rol, cd) {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where('rol', '==', rol),
    where('cd', '==', cd)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getActiveUsers() {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('activo', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createUser(uid, userData) {
  const db = getDb();
  const userRef = doc(db, COLLECTION, uid);

  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return uid;
}

export async function updateUser(uid, updates) {
  const db = getDb();
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function deleteUser(uid) {
  const db = getDb();
  const userRef = doc(db, COLLECTION, uid);
  await deleteDoc(userRef);
}

export async function deactivateUser(uid) {
  const db = getDb();
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    activo: false,
    updatedAt: serverTimestamp()
  });
}

export async function activateUser(uid) {
  const db = getDb();
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    activo: true,
    updatedAt: serverTimestamp()
  });
}

export async function updateUserRole(uid, rol) {
  const db = getDb();
  const userRef = doc(db, COLLECTION, uid);
  await updateDoc(userRef, {
    rol,
    updatedAt: serverTimestamp()
  });
}
