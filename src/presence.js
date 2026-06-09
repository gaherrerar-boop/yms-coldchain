/**
 * User Presence Module
 * Mantiene presencia online/offline actualizada
 */

import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseDb, getFirebaseAuth } from './firebase.js';
import { STATE } from './state.js';
import { COLLECTIONS, PRESENCE_HEARTBEAT_INTERVAL } from './constants.js';

const getDb = () => getFirebaseDb();
const getAuth = () => getFirebaseAuth();

let heartbeatInterval;

/**
 * Actualizar presencia del usuario
 */
export async function updatePresence(status = 'online') {
  const auth = getAuth();
  const db = getDb();
  if (!auth.currentUser || !STATE.profile) return;

  try {
    const presenceRef = doc(db, COLLECTIONS.PRESENCE, auth.currentUser.uid);

    await setDoc(presenceRef, {
      online: status === 'online',
      lastSeen: serverTimestamp(),
      nombre: STATE.profile.nombre,
      rol: STATE.profile.rol,
      cd: STATE.currentSite,
      email: auth.currentUser.email
    }, { merge: true });

    console.log(`[YMS] Presencia actualizada: ${status}`);
  } catch (err) {
    console.error('[YMS] Error actualizando presencia:', err);
  }
}

/**
 * Iniciar heartbeat de presencia (cada 60 segundos)
 */
export function startPresenceHeartbeat() {
  if (heartbeatInterval) return;

  console.log('[YMS] Iniciando heartbeat de presencia');

  // Actualizar inmediatamente
  updatePresence('online');

  // Luego cada PRESENCE_HEARTBEAT_INTERVAL
  heartbeatInterval = setInterval(() => {
    updatePresence('online');
  }, PRESENCE_HEARTBEAT_INTERVAL);
}

/**
 * Detener heartbeat de presencia
 */
export function stopPresenceHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[YMS] Heartbeat de presencia detenido');
  }
}

/**
 * Marcar usuario como offline (al logout)
 */
export async function goOffline() {
  stopPresenceHeartbeat();
  await updatePresence('offline');
}
