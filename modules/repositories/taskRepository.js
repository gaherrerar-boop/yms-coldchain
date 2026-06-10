// Task Repository — Data Access Layer for yard_tasks collection
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
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION = 'yard_tasks';

const getDb = () => getFirebaseDb();

export async function getTaskById(taskId) {
  const db = getDb();
  const taskRef = doc(db, COLLECTION, taskId);
  const snapshot = await getDoc(taskRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getTasksByState(estado) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('estado', '==', estado));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getTasksByDock(dockId) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('dock_id', '==', dockId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createTask(taskData) {
  const db = getDb();
  const tasksRef = collection(db, COLLECTION);
  const newDoc = doc(tasksRef);

  await setDoc(newDoc, {
    ...taskData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return newDoc.id;
}

export async function updateTask(taskId, updates) {
  const db = getDb();
  const taskRef = doc(db, COLLECTION, taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function deleteTask(taskId) {
  const db = getDb();
  const taskRef = doc(db, COLLECTION, taskId);
  await deleteDoc(taskRef);
}

export async function getTasksByCDAndState(cd, estados = []) {
  const db = getDb();
  let q;
  if (estados.length > 0) {
    q = query(
      collection(db, COLLECTION),
      where('cd', '==', cd),
      where('estado', 'in', estados)
    );
  } else {
    q = query(collection(db, COLLECTION), where('cd', '==', cd));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getTasksByUser(userId) {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where('asignado_a', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
