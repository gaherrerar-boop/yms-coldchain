// Dock Service — Business logic for dock operations
import { getFirebaseDb, getFirebaseAuth } from '../firebase.js';
import { STATE } from '../state.js';
import { runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import * as dockRepository from '../repositories/dockRepository.js';
import * as auditService from './auditService.js';

export async function createDock(dockData) {
  try {
    // Validate required fields
    if (!dockData.codigo || !dockData.cd) {
      throw new Error('Missing required fields: codigo, cd');
    }

    const auth = getFirebaseAuth();

    const newDock = {
      ...dockData,
      estado: 'libre',
      creado_por: auth.currentUser?.uid,
      creado_en: new Date().toISOString()
    };

    const dockId = await dockRepository.createDock(newDock);
    console.log(`[DockService] ✅ Dock created: ${dockId}`);
    return dockId;
  } catch (err) {
    console.error('[DockService] Error creating dock:', err);
    throw err;
  }
}

export async function updateDockState(dockId, estado) {
  try {
    const validStates = ['libre', 'ocupado', 'bloqueado', 'mantenimiento'];
    if (!validStates.includes(estado)) {
      throw new Error(`Invalid estado: ${estado}`);
    }

    await dockRepository.updateDockState(dockId, estado);
    console.log(`[DockService] ✅ Dock state updated: ${dockId} → ${estado}`);
  } catch (err) {
    console.error('[DockService] Error updating dock state:', err);
    throw err;
  }
}

export async function assignDock(dockId, visitId, taskId = null) {
  try {
    const db = getFirebaseDb();

    await runTransaction(db, async (transaction) => {
      const dockRef = doc(db, 'docks', dockId);
      const dockSnap = await transaction.get(dockRef);

      if (!dockSnap.exists()) {
        throw new Error('Dock not found');
      }

      const dock = dockSnap.data();
      if (dock.estado !== 'libre') {
        throw new Error(`Dock is not available: ${dock.estado}`);
      }

      transaction.update(dockRef, {
        estado: 'ocupado',
        visit_id: visitId,
        task_id: taskId,
        asignado_en: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await auditService.auditDockAssigned(dockId, visitId);
    console.log(`[DockService] ✅ Dock assigned: ${dockId}`);
  } catch (err) {
    console.error('[DockService] Error assigning dock:', err);
    throw err;
  }
}

export async function freeDock(dockId) {
  try {
    const db = getFirebaseDb();

    await runTransaction(db, async (transaction) => {
      const dockRef = doc(db, 'docks', dockId);

      transaction.update(dockRef, {
        estado: 'libre',
        visit_id: null,
        task_id: null,
        truck_id: null,
        liberado_en: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await auditService.auditDockFreed(dockId);
    console.log(`[DockService] ✅ Dock freed: ${dockId}`);
  } catch (err) {
    console.error('[DockService] Error freeing dock:', err);
    throw err;
  }
}

export async function blockDock(dockId, reason = '') {
  try {
    const auth = getFirebaseAuth();

    await dockRepository.updateDock(dockId, {
      estado: 'bloqueado',
      bloqueado_razon: reason,
      bloqueado_por: auth.currentUser?.uid,
      bloqueado_en: new Date().toISOString()
    });

    await auditService.logAction('dock_blocked', { dockId, reason });
    console.log(`[DockService] ✅ Dock blocked: ${dockId}`);
  } catch (err) {
    console.error('[DockService] Error blocking dock:', err);
    throw err;
  }
}

export async function unblockDock(dockId) {
  try {
    await dockRepository.updateDock(dockId, {
      estado: 'libre',
      bloqueado_razon: null,
      bloqueado_por: null,
      bloqueado_en: null
    });

    await auditService.logAction('dock_unblocked', { dockId });
    console.log(`[DockService] ✅ Dock unblocked: ${dockId}`);
  } catch (err) {
    console.error('[DockService] Error unblocking dock:', err);
    throw err;
  }
}

export async function maintenanceDock(dockId, reason = '') {
  try {
    await dockRepository.updateDock(dockId, {
      estado: 'mantenimiento',
      mantenimiento_razon: reason,
      mantenimiento_desde: new Date().toISOString()
    });

    await auditService.logAction('dock_maintenance', { dockId, reason });
    console.log(`[DockService] ✅ Dock in maintenance: ${dockId}`);
  } catch (err) {
    console.error('[DockService] Error setting maintenance:', err);
    throw err;
  }
}

export async function exitMaintenance(dockId) {
  try {
    await dockRepository.updateDock(dockId, {
      estado: 'libre',
      mantenimiento_razon: null,
      mantenimiento_desde: null,
      mantenimiento_hasta: new Date().toISOString()
    });

    await auditService.logAction('dock_exit_maintenance', { dockId });
    console.log(`[DockService] ✅ Dock exit maintenance: ${dockId}`);
  } catch (err) {
    console.error('[DockService] Error exiting maintenance:', err);
    throw err;
  }
}

export async function getAllDocks() {
  try {
    const cd = STATE.currentSite;
    if (!cd) return [];
    return await dockRepository.getAllDocks(cd);
  } catch (err) {
    console.error('[DockService] Error fetching docks:', err);
    return [];
  }
}

export async function getFreeDocks() {
  try {
    return await dockRepository.getDocksByStateAndCD(STATE.currentSite, 'libre');
  } catch (err) {
    console.error('[DockService] Error fetching free docks:', err);
    return [];
  }
}

export async function getOccupiedDocks() {
  try {
    return await dockRepository.getDocksByStateAndCD(STATE.currentSite, 'ocupado');
  } catch (err) {
    console.error('[DockService] Error fetching occupied docks:', err);
    return [];
  }
}
