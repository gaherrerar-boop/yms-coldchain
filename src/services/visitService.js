// Visit Service — Critical business logic for yard visits and entry/exit
import { getFirebaseDb } from '../firebase.js';
import { STATE } from '../state.js';
import { runTransaction, doc, collection, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as visitRepository from '../repositories/visitRepository.js';
import * as dockRepository from '../repositories/dockRepository.js';
import * as auditService from './auditService.js';

// CRITICAL ATOMIC OPERATION: Truck entry to yard
export async function confirmarIngreso(visitData, dockId) {
  try {
    if (!dockId) {
      throw new Error('Dock ID required for entry confirmation');
    }

    const db = getFirebaseDb();
    let visitId;

    // Atomic transaction: all or nothing
    await runTransaction(db, async (transaction) => {
      // 1. Check dock availability
      const dockRef = doc(db, 'docks', dockId);
      const dockSnap = await transaction.get(dockRef);

      if (!dockSnap.exists()) {
        throw new Error('Dock not found');
      }

      const dock = dockSnap.data();
      if (dock.estado !== 'libre') {
        throw new Error(`Dock is not available: ${dock.estado}`);
      }

      // 2. Create visit
      const visitsRef = collection(db, 'yard_visits');
      const newVisitRef = doc(visitsRef);
      visitId = newVisitRef.id;

      transaction.set(newVisitRef, {
        ...visitData,
        dock_id: dockId,
        estado: 'en_patio',
        ingreso_en: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // 3. Update dock (mark as busy)
      transaction.update(dockRef, {
        estado: 'ocupado',
        truck_id: visitId,
        visit_id: visitId,
        updatedAt: serverTimestamp()
      });

      // 4. Create queue ticket
      const queueRef = collection(db, 'queue_tickets');
      const newTicketRef = doc(queueRef);

      transaction.set(newTicketRef, {
        visit_id: visitId,
        dock_id: dockId,
        cd: visitData.cd,
        estado: 'activo',
        createdAt: serverTimestamp()
      });
    });

    // Audit log (after transaction succeeds)
    await auditService.auditVisitCreated(visitId, visitData);

    console.log(`[VisitService] ✅ Entry confirmed: ${visitId} at dock ${dockId}`);
    return { visitId, dockId };
  } catch (err) {
    console.error('[VisitService] Error confirming entry:', err);
    throw err;
  }
}

// Finalize truck exit from yard
export async function finalizarVisita(visitId, dockId) {
  try {
    const db = getFirebaseDb();

    await runTransaction(db, async (transaction) => {
      const visitRef = doc(db, 'yard_visits', visitId);
      const dockRef = doc(db, 'docks', dockId);

      const visitSnap = await transaction.get(visitRef);
      if (!visitSnap.exists()) {
        throw new Error('Visit not found');
      }

      // Update visit
      transaction.update(visitRef, {
        estado: 'completada',
        salida_en: serverTimestamp()
      });

      // Free dock
      transaction.update(dockRef, {
        estado: 'libre',
        truck_id: null,
        visit_id: null,
        updatedAt: serverTimestamp()
      });
    });

    console.log(`[VisitService] ✅ Visit finalized: ${visitId}`);
  } catch (err) {
    console.error('[VisitService] Error finalizing visit:', err);
    throw err;
  }
}

// Move truck to different dock
export async function moverAndén(visitId, dockOriginId, dockDestinyId) {
  try {
    const db = getFirebaseDb();

    await runTransaction(db, async (transaction) => {
      const visitRef = doc(db, 'yard_visits', visitId);
      const dockOriginRef = doc(db, 'docks', dockOriginId);
      const dockDestinyRef = doc(db, 'docks', dockDestinyId);

      // Check origin dock
      const dockOriginSnap = await transaction.get(dockOriginRef);
      if (!dockOriginSnap.exists()) {
        throw new Error('Origin dock not found');
      }

      // Check destiny dock availability
      const dockDestinySnap = await transaction.get(dockDestinyRef);
      if (!dockDestinySnap.exists()) {
        throw new Error('Destiny dock not found');
      }

      const dockDestiny = dockDestinySnap.data();
      if (dockDestiny.estado !== 'libre') {
        throw new Error(`Destiny dock is not available: ${dockDestiny.estado}`);
      }

      // Update visit
      transaction.update(visitRef, {
        dock_id: dockDestinyId,
        updatedAt: serverTimestamp()
      });

      // Free origin dock
      transaction.update(dockOriginRef, {
        estado: 'libre',
        truck_id: null,
        visit_id: null,
        updatedAt: serverTimestamp()
      });

      // Occupy destiny dock
      transaction.update(dockDestinyRef, {
        estado: 'ocupado',
        truck_id: visitId,
        visit_id: visitId,
        updatedAt: serverTimestamp()
      });
    });

    console.log(`[VisitService] ✅ Moved to dock: ${visitId} ${dockOriginId} → ${dockDestinyId}`);
  } catch (err) {
    console.error('[VisitService] Error moving to dock:', err);
    throw err;
  }
}

export async function updateVisitState(visitId, estado) {
  try {
    const validStates = ['en_patio', 'en_anden', 'completada'];
    if (!validStates.includes(estado)) {
      throw new Error(`Invalid estado: ${estado}`);
    }

    await visitRepository.updateVisitState(visitId, estado);
    console.log(`[VisitService] ✅ Visit state updated: ${visitId} → ${estado}`);
  } catch (err) {
    console.error('[VisitService] Error updating visit state:', err);
    throw err;
  }
}

export async function getActiveVisits() {
  try {
    const cd = STATE.currentSite;
    if (!cd) return [];
    return await visitRepository.getActiveVisits(cd);
  } catch (err) {
    console.error('[VisitService] Error fetching active visits:', err);
    return [];
  }
}
