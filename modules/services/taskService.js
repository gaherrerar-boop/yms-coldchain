// Task Service — Business logic for task operations with transactions
import { getFirebaseDb, getFirebaseAuth } from '../firebase.js';
import { STATE } from '../state.js';
import { runTransaction, doc, collection, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import * as taskRepository from '../repositories/taskRepository.js';
import * as dockRepository from '../repositories/dockRepository.js';
import * as auditService from './auditService.js';

export async function createTask(taskData) {
  try {
    // Validate required fields
    if (!taskData.cd || !taskData.descripcion) {
      throw new Error('Missing required fields: cd, descripcion');
    }

    const auth = getFirebaseAuth();

    // Add default values
    const newTask = {
      ...taskData,
      estado: 'pendiente',
      creado_por: auth.currentUser?.uid,
      creado_en: new Date().toISOString()
    };

    const taskId = await taskRepository.createTask(newTask);
    await auditService.auditTaskCreated(taskId, newTask);

    console.log(`[TaskService] ✅ Task created: ${taskId}`);
    return taskId;
  } catch (err) {
    console.error('[TaskService] Error creating task:', err);
    throw err;
  }
}

export async function acceptTask(taskId, userId = null) {
  try {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const uid = userId || auth.currentUser?.uid;
    if (!uid) throw new Error('No user context for task acceptance');

    await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, 'yard_tasks', taskId);
      const taskSnap = await transaction.get(taskRef);

      if (!taskSnap.exists()) {
        throw new Error('Task not found');
      }

      const task = taskSnap.data();

      // Validate state transition
      if (task.estado !== 'pendiente' && task.estado !== 'ofrecida') {
        throw new Error(`Cannot accept task in estado: ${task.estado}`);
      }

      // Update task state
      transaction.update(taskRef, {
        estado: 'aceptada',
        aceptado_por: uid,
        aceptado_en: serverTimestamp()
      });
    });

    await auditService.auditTaskAccepted(taskId, uid);
    console.log(`[TaskService] ✅ Task accepted: ${taskId}`);
  } catch (err) {
    console.error('[TaskService] Error accepting task:', err);
    throw err;
  }
}

export async function completeTask(taskId) {
  try {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, 'yard_tasks', taskId);
      const taskSnap = await transaction.get(taskRef);

      if (!taskSnap.exists()) {
        throw new Error('Task not found');
      }

      const task = taskSnap.data();

      // Update task state
      transaction.update(taskRef, {
        estado: 'completada',
        completada_en: serverTimestamp()
      });

      // Free dock if assigned
      if (task.dock_id) {
        const dockRef = doc(db, 'docks', task.dock_id);
        transaction.update(dockRef, {
          estado: 'libre',
          task_id: null,
          truck_id: null,
          updatedAt: serverTimestamp()
        });
      }
    });

    await auditService.auditTaskCompleted(taskId, auth.currentUser?.uid);
    console.log(`[TaskService] ✅ Task completed: ${taskId}`);
  } catch (err) {
    console.error('[TaskService] Error completing task:', err);
    throw err;
  }
}

export async function cancelTask(taskId, reason = '') {
  try {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, 'yard_tasks', taskId);
      const taskSnap = await transaction.get(taskRef);

      if (!taskSnap.exists()) {
        throw new Error('Task not found');
      }

      const task = taskSnap.data();

      // Only allow cancellation if task is in early state
      if (task.estado !== 'pendiente' && task.estado !== 'ofrecida') {
        throw new Error(`Cannot cancel task in estado: ${task.estado}`);
      }

      // Delete task
      transaction.delete(taskRef);

      // Free dock if assigned
      if (task.dock_id) {
        const dockRef = doc(db, 'docks', task.dock_id);
        transaction.update(dockRef, {
          estado: 'libre',
          task_id: null,
          truck_id: null,
          updatedAt: serverTimestamp()
        });
      }
    });

    await auditService.auditTaskCancelled(taskId, auth.currentUser?.uid, reason);
    console.log(`[TaskService] ✅ Task cancelled: ${taskId}`);
  } catch (err) {
    console.error('[TaskService] Error cancelling task:', err);
    throw err;
  }
}

export async function updateTaskState(taskId, estado) {
  try {
    const validStates = ['pendiente', 'ofrecida', 'aceptada', 'en_proceso', 'completada', 'cancelada'];
    if (!validStates.includes(estado)) {
      throw new Error(`Invalid estado: ${estado}`);
    }

    await taskRepository.updateTask(taskId, { estado });
    console.log(`[TaskService] ✅ Task state updated: ${taskId} → ${estado}`);
  } catch (err) {
    console.error('[TaskService] Error updating task state:', err);
    throw err;
  }
}

export async function assignDock(taskId, dockId) {
  try {
    const db = getFirebaseDb();

    await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, 'yard_tasks', taskId);
      const dockRef = doc(db, 'docks', dockId);

      const taskSnap = await transaction.get(taskRef);
      const dockSnap = await transaction.get(dockRef);

      if (!taskSnap.exists() || !dockSnap.exists()) {
        throw new Error('Task or dock not found');
      }

      const dock = dockSnap.data();
      if (dock.estado !== 'libre') {
        throw new Error(`Dock is not available: ${dock.estado}`);
      }

      // Update both documents
      transaction.update(taskRef, {
        dock_id: dockId,
        updatedAt: serverTimestamp()
      });

      transaction.update(dockRef, {
        estado: 'ocupado',
        task_id: taskId,
        updatedAt: serverTimestamp()
      });
    });

    await auditService.auditDockAssigned(dockId, taskId);
    console.log(`[TaskService] ✅ Dock assigned: ${dockId} → Task ${taskId}`);
  } catch (err) {
    console.error('[TaskService] Error assigning dock:', err);
    throw err;
  }
}

export async function unassignDock(taskId, dockId) {
  try {
    const db = getFirebaseDb();

    await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, 'yard_tasks', taskId);
      const dockRef = doc(db, 'docks', dockId);

      transaction.update(taskRef, {
        dock_id: null,
        updatedAt: serverTimestamp()
      });

      transaction.update(dockRef, {
        estado: 'libre',
        task_id: null,
        truck_id: null,
        updatedAt: serverTimestamp()
      });
    });

    await auditService.auditDockFreed(dockId);
    console.log(`[TaskService] ✅ Dock unassigned: ${dockId}`);
  } catch (err) {
    console.error('[TaskService] Error unassigning dock:', err);
    throw err;
  }
}
