/**
 * Database Abstraction Layer
 * Capa de abstracción para persistencia
 * Permite cambiar implementación sin afectar la UI
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase.js';
import { STATE } from './state.js';
import { COLLECTIONS } from './constants.js';

const getDb = () => getFirebaseDb();

/**
 * Registrar acción en audit log
 */
export async function registrarAuditLog(accion, detalle = '') {
  const db = getDb();
  if (!db || !STATE.user || !STATE.profile) return;

  try {
    const auditCollection = collection(db, COLLECTIONS.AUDIT_LOG);
    await addDoc(auditCollection, {
      accion: accion,
      detalle: detalle,
      userId: STATE.user.uid,
      userEmail: STATE.user.email,
      rol: STATE.profile.rol,
      cd: STATE.currentSite,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('[YMS] Error registrando auditoría:', err);
  }
}

/**
 * SELECT genérico
 */
export async function dbSelect(collectionName, filters = {}, orderByField = null) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const collectionRef = collection(db, collectionName);
    const constraints = [];

    // Aplicar filtros
    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        constraints.push(where(field, 'in', value));
      } else {
        constraints.push(where(field, '==', value));
      }
    });

    // Aplicar ordenamiento
    if (orderByField) {
      if (typeof orderByField === 'string') {
        constraints.push(orderBy(orderByField, 'asc'));
      } else {
        constraints.push(orderBy(orderByField.field, orderByField.direction || 'asc'));
      }
    }

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('[YMS] Error en dbSelect:', err);
    throw err;
  }
}

/**
 * SELECT por ID
 */
export async function dbSelectById(collectionName, id) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (err) {
    console.error('[YMS] Error en dbSelectById:', err);
    throw err;
  }
}

/**
 * INSERT
 */
export async function dbInsert(collectionName, data) {
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const collectionRef = collection(db, collectionName);
    const ref = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: ref.id };
  } catch (err) {
    console.error('[YMS] Error en dbInsert:', err);
    throw err;
  }
}

/**
 * UPDATE
 */
export async function dbUpdate(collectionName, id, data) {
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { id };
  } catch (err) {
    console.error('[YMS] Error en dbUpdate:', err);
    throw err;
  }
}

/**
 * DELETE
 */
export async function dbDelete(collectionName, id) {
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { id };
  } catch (err) {
    console.error('[YMS] Error en dbDelete:', err);
    throw err;
  }
}

/**
 * TRANSACTION (para operaciones atómicas)
 */
export async function dbTransaction(callback) {
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const { runTransaction } = await import('firebase/firestore');
    return await runTransaction(db, callback);
  } catch (err) {
    console.error('[YMS] Error en transacción:', err);
    throw err;
  }
}
