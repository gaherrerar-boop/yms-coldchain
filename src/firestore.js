/**
 * Firestore Operations Module
 * CRUD + Transacciones para operaciones atómicas
 */

import {
  runTransaction,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase.js';
import { STATE } from './state.js';
import { COLLECTIONS, TASK_STATES, DOCK_STATES } from './constants.js';
import { registrarAuditLog } from './db.js';

const getDb = () => getFirebaseDb();

/**
 * ═══════════════════════════════════════════════════════════════
 * OPERACIONES ATÓMICAS (con transacciones)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Confirmar ingreso de camión (atómico)
 * Crea: visit + actualiza dock + crea queue_ticket
 */
export async function confirmarIngreso(visitData, dockId) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  return runTransaction(db, async (transaction) => {
    try {
      // 1. Crear visita
      const visitsCollection = collection(db, COLLECTIONS.YARD_VISITS);
      const visitRef = doc(visitsCollection);
      transaction.set(visitRef, {
        ...visitData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Actualizar dock
      const dockRef = doc(db, COLLECTIONS.DOCKS, dockId);
      transaction.update(dockRef, {
        estado: DOCK_STATES.OCUPADO,
        truck_id: visitRef.id,
        patente: visitData.patente,
        updatedAt: serverTimestamp()
      });

      // 3. Crear queue ticket
      const queueCollection = collection(db, COLLECTIONS.QUEUE_TICKETS);
      const queueRef = doc(queueCollection);
      transaction.set(queueRef, {
        visit_id: visitRef.id,
        dock_id: dockId,
        estado: 'en_espera',
        cd: STATE.currentSite,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4. Registrar auditoría
      const auditCollection = collection(db, COLLECTIONS.AUDIT_LOG);
      const auditRef = doc(auditCollection);
      transaction.set(auditRef, {
        accion: 'INGRESO_CONFIRMADO',
        detalle: `Vehículo ${visitData.patente} - ${visitData.chofer}`,
        userId: STATE.user.uid,
        userEmail: STATE.user.email,
        rol: STATE.profile.rol,
        cd: STATE.currentSite,
        createdAt: serverTimestamp()
      });

      return { visitId: visitRef.id, dockId };
    } catch (err) {
      console.error('[YMS] Error en confirmarIngreso (transaction):', err);
      throw err;
    }
  });
}

/**
 * Completar tarea (atómico)
 * Actualiza: task + libera dock si está asignado
 */
export async function completarTarea(taskId) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  return runTransaction(db, async (transaction) => {
    try {
      const taskRef = doc(db, COLLECTIONS.YARD_TASKS, taskId);
      const taskDoc = await transaction.get(taskRef);

      if (!taskDoc.exists()) throw new Error('Tarea no encontrada');

      const taskData = taskDoc.data();

      // Actualizar tarea
      transaction.update(taskRef, {
        estado: TASK_STATES.COMPLETADA,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Si hay dock asignado, liberarlo
      if (taskData.dock_id) {
        const dockRef = doc(db, COLLECTIONS.DOCKS, taskData.dock_id);
        transaction.update(dockRef, {
          estado: DOCK_STATES.LIBRE,
          truck_id: null,
          patente: null,
          updatedAt: serverTimestamp()
        });
      }

      // Registrar auditoría
      const auditCollection = collection(db, COLLECTIONS.AUDIT_LOG);
      const auditRef = doc(auditCollection);
      transaction.set(auditRef, {
        accion: 'TAREA_COMPLETADA',
        detalle: `Tarea ${taskData.tipo}`,
        userId: STATE.user.uid,
        userEmail: STATE.user.email,
        rol: STATE.profile.rol,
        cd: STATE.currentSite,
        createdAt: serverTimestamp()
      });

      return { taskId };
    } catch (err) {
      console.error('[YMS] Error en completarTarea (transaction):', err);
      throw err;
    }
  });
}

/**
 * Cancelar tarea (atómico)
 * Elimina: task + libera dock + actualiza queue
 */
export async function cancelarTarea(taskId) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  return runTransaction(db, async (transaction) => {
    try {
      const taskRef = doc(db, COLLECTIONS.YARD_TASKS, taskId);
      const taskDoc = await transaction.get(taskRef);

      if (!taskDoc.exists()) throw new Error('Tarea no encontrada');

      const taskData = taskDoc.data();

      // Verificar que pueda cancelarse
      if (taskData.estado !== TASK_STATES.PENDIENTE) {
        throw new Error('Solo se pueden cancelar tareas pendientes');
      }

      // Eliminar tarea
      transaction.delete(taskRef);

      // Liberar dock si está asignado
      if (taskData.dock_id) {
        const dockRef = doc(db, COLLECTIONS.DOCKS, taskData.dock_id);
        transaction.update(dockRef, {
          estado: DOCK_STATES.LIBRE,
          truck_id: null,
          patente: null,
          updatedAt: serverTimestamp()
        });
      }

      // Registrar auditoría
      const auditCollection = collection(db, COLLECTIONS.AUDIT_LOG);
      const auditRef = doc(auditCollection);
      transaction.set(auditRef, {
        accion: 'TAREA_CANCELADA',
        detalle: `Tarea ${taskData.tipo} cancelada`,
        userId: STATE.user.uid,
        userEmail: STATE.user.email,
        rol: STATE.profile.rol,
        cd: STATE.currentSite,
        createdAt: serverTimestamp()
      });

      return { taskId };
    } catch (err) {
      console.error('[YMS] Error en cancelarTarea (transaction):', err);
      throw err;
    }
  });
}

/**
 * ═══════════════════════════════════════════════════════════════
 * OPERACIONES SIMPLES (sin transacción)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Actualizar estado de tarea
 */
export async function updateTaskState(taskId, newState) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const taskRef = doc(db, COLLECTIONS.YARD_TASKS, taskId);
    await updateDoc(taskRef, {
      estado: newState,
      updatedAt: serverTimestamp()
    });

    await registrarAuditLog('TAREA_ACTUALIZADA', `Estado → ${newState}`);
    return { taskId };
  } catch (err) {
    console.error('[YMS] Error actualizando tarea:', err);
    throw err;
  }
}

/**
 * Crear tarea simple
 */
export async function createTask(taskData) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const tasksCollection = collection(db, COLLECTIONS.YARD_TASKS);
    const taskRef = await addDoc(tasksCollection, {
      ...taskData,
      cd: STATE.currentSite,
      creadoPor: STATE.user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await registrarAuditLog('TAREA_CREADA', `Tarea ${taskData.tipo}`);
    return { id: taskRef.id };
  } catch (err) {
    console.error('[YMS] Error creando tarea:', err);
    throw err;
  }
}

/**
 * Eliminar tarea simple (si permite)
 */
export async function deleteTask(taskId) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const taskRef = doc(db, COLLECTIONS.YARD_TASKS, taskId);
    await deleteDoc(taskRef);
    await registrarAuditLog('TAREA_ELIMINADA', `Tarea eliminada`);
    return { taskId };
  } catch (err) {
    console.error('[YMS] Error eliminando tarea:', err);
    throw err;
  }
}

/**
 * Crear mensaje de chat
 */
export async function createChatMessage(toUserId, mensaje) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const chatCollection = collection(db, COLLECTIONS.CHAT);
    const messageRef = await addDoc(chatCollection, {
      from: STATE.user.uid,
      to: toUserId,
      mensaje: mensaje,
      cd: STATE.currentSite,
      read: false,
      createdAt: serverTimestamp()
    });

    return { id: messageRef.id };
  } catch (err) {
    console.error('[YMS] Error creando mensaje:', err);
    throw err;
  }
}

/**
 * Marcar mensaje como leído
 */
export async function markMessageAsRead(messageId) {
  const db = getDb();
  if (!db) throw new Error('Firestore no inicializado');

  try {
    const messageRef = doc(db, COLLECTIONS.CHAT, messageId);
    await updateDoc(messageRef, {
      read: true
    });
  } catch (err) {
    console.error('[YMS] Error marcando como leído:', err);
  }
}
