// Chat Repository — Data Access Layer for chat collection
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
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION = 'chat';

const getDb = () => getFirebaseDb();

export async function createMessage(messageData) {
  const db = getDb();
  const messagesRef = collection(db, COLLECTION);
  const newDoc = doc(messagesRef);

  await setDoc(newDoc, {
    ...messageData,
    createdAt: serverTimestamp()
  });

  return newDoc.id;
}

export async function getMessages(cd, limitNum = 50) {
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

export async function getMessagesByUser(cd, userId) {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION),
    where('cd', '==', cd),
    where('sender_uid', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteMessage(messageId) {
  const db = getDb();
  const messageRef = doc(db, COLLECTION, messageId);
  await deleteDoc(messageRef);
}
