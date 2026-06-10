/**
 * Audit Log Repository
 * Lee/escribe logs de auditoría desde Firestore
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

import { getFirebaseDb } from '../firebase.js';

const db = getFirebaseDb();

/**
 * Crear entrada de auditoría
 */
export async function createAuditEntry(data) {
  return createAuditLog(data);
}

/**
 * Crear log de auditoría
 */
export async function createAuditLog(data) {
  if (!db) {
    console.error('[AuditRepo] Firestore not initialized');
    return null;
  }

  try {
    const doc = await addDoc(collection(db, 'audit_log'), {
      ...data,
      createdAt: serverTimestamp(),
      created_at: new Date()
    });
    return doc.id;
  } catch (error) {
    console.error('[AuditRepo] Error creating audit log:', error);
    return null;
  }
}

/**
 * Obtener logs de auditoría (para loadAudit en UI)
 */
export async function getAuditLogs({ categoria = 'all', max = 100 } = {}) {
  if (!db) {
    console.error('[AuditRepo] Firestore not initialized');
    return [];
  }

  try {
    const constraints = [
      orderBy('createdAt', 'desc'),
      limit(max)
    ];

    const q = query(collection(db, 'audit_log'), ...constraints);
    const snap = await getDocs(q);

    const logs = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.createdAt?.toDate?.() || new Date(data.createdAt),
        categoria: data.categoria || data.action || ''
      };
    });

    // Filtrar en cliente por categoría si es necesario
    if (categoria && categoria !== 'all') {
      return logs.filter(l => l.categoria === categoria);
    }

    return logs;
  } catch (error) {
    console.error('[AuditRepo] Error fetching audit logs:', error);
    return [];
  }
}

/**
 * Obtener logs por CD (para auditService)
 */
export async function getAuditLog(cd, limitNum = 100) {
  if (!db) return [];

  try {
    const constraints = [
      where('cd', '==', cd),
      orderBy('createdAt', 'desc'),
      limit(limitNum)
    ];

    const q = query(collection(db, 'audit_log'), ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().createdAt?.toDate?.() || new Date()
    }));
  } catch (error) {
    console.error('[AuditRepo] Error in getAuditLog:', error);
    return [];
  }
}

/**
 * Obtener logs por usuario (para auditService)
 */
export async function getAuditByUser(userId, limitNum = 50) {
  if (!db) return [];

  try {
    const constraints = [
      where('user_id', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitNum)
    ];

    const q = query(collection(db, 'audit_log'), ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().createdAt?.toDate?.() || new Date()
    }));
  } catch (error) {
    console.error('[AuditRepo] Error in getAuditByUser:', error);
    return [];
  }
}
