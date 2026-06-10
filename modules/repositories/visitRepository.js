// Visit Repository — Data Access Layer for yard_visits collection
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
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION = 'yard_visits';

const getDb = () => getFirebaseDb();

export async function getVisitById(visitId) {
  const db = getDb();
  const visitRef = doc(db, COLLECTION, visitId);
  const snapshot = await getDoc(visitRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getVisitsByDock(dockId) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('dock_id', '==', dockId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getVisitsByState(estado) {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where('estado', '==', estado),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getVisitsByCD(cd, limitNum = 100) {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where('cd', '==', cd),
    orderBy('createdAt', 'desc'),
    limit(limitNum)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getActiveVisits(cd) {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where('cd', '==', cd),
    where('estado', 'in', ['en_patio', 'en_anden'])
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createVisit(visitData) {
  const db = getDb();
  const visitsRef = collection(db, COLLECTION);
  const newDoc = doc(visitsRef);

  await setDoc(newDoc, {
    ...visitData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return newDoc.id;
}

export async function updateVisit(visitId, updates) {
  const db = getDb();
  const visitRef = doc(db, COLLECTION, visitId);
  await updateDoc(visitRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function updateVisitState(visitId, estado) {
  const db = getDb();
  const visitRef = doc(db, COLLECTION, visitId);
  await updateDoc(visitRef, {
    estado,
    updatedAt: serverTimestamp()
  });
}

export async function deleteVisit(visitId) {
  const db = getDb();
  const visitRef = doc(db, COLLECTION, visitId);
  await deleteDoc(visitRef);
}
