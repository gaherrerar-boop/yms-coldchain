// Dock Repository — Data Access Layer for docks collection
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

const getDb = () => getFirebaseDb();

const COLLECTION = 'docks';

export async function getDockById(dockId) {
  const db = getDb();
  const dockRef = doc(db, COLLECTION, dockId);
  const snapshot = await getDoc(dockRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getAllDocks(cd) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('cd', '==', cd));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getDocksByState(estado) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('estado', '==', estado));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getDocksByStateAndCD(cd, estado) {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where('cd', '==', cd),
    where('estado', '==', estado)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createDock(dockData) {
  const db = getDb();
  const docksRef = collection(db, COLLECTION);
  const newDoc = doc(docksRef);

  await setDoc(newDoc, {
    ...dockData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return newDoc.id;
}

export async function updateDock(dockId, updates) {
  const db = getDb();
  const dockRef = doc(db, COLLECTION, dockId);
  await updateDoc(dockRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function updateDockState(dockId, estado) {
  const db = getDb();
  const dockRef = doc(db, COLLECTION, dockId);
  await updateDoc(dockRef, {
    estado,
    updatedAt: serverTimestamp()
  });
}

export async function deleteDock(dockId) {
  const db = getDb();
  const dockRef = doc(db, COLLECTION, dockId);
  await deleteDoc(dockRef);
}

export async function assignDockToTask(dockId, taskId, truckId = null) {
  const db = getDb();
  const dockRef = doc(db, COLLECTION, dockId);
  await updateDoc(dockRef, {
    estado: 'ocupado',
    task_id: taskId,
    truck_id: truckId,
    updatedAt: serverTimestamp()
  });
}

export async function freeDock(dockId) {
  const db = getDb();
  const dockRef = doc(db, COLLECTION, dockId);
  await updateDoc(dockRef, {
    estado: 'libre',
    task_id: null,
    truck_id: null,
    updatedAt: serverTimestamp()
  });
}
