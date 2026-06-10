/**
 * Real-time Listeners Module
 * Listeners optimizados: 3 permanentes + on-demand
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase.js';
import { STATE } from './state.js';
import { COLLECTIONS, TASK_STATES } from './constants.js';

const getDb = () => getFirebaseDb();
const subscriptions = {};

/**
 * ═══════════════════════════════════════════════════════════════
 * LISTENERS PERMANENTES (3 críticos)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Suscribirse a datos críticos (tareas, docks, chat)
 * Se ejecuta al login y se mantiene mientras hay sesión
 */
export function subscribeToCriticalData() {
  const db = getDb();
  if (!db || !STATE.currentSite) return;

  console.log('[YMS] Iniciando listeners críticos...');

  // 1. LISTENER: Tareas activas
  const tasksQuery = query(
    collection(db, COLLECTIONS.YARD_TASKS),
    where('cd', '==', STATE.currentSite),
    where('estado', 'in', [TASK_STATES.PENDIENTE, TASK_STATES.OFRECIDA, TASK_STATES.ACEPTADA, TASK_STATES.EN_PROCESO]),
    orderBy('createdAt', 'desc')
  );

  subscriptions.tasks = onSnapshot(
    tasksQuery,
    (snapshot) => {
      STATE.tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (typeof renderTareas === 'function') renderTareas();
    },
    (err) => console.error('[YMS] Error en listener tasks:', err)
  );

  // 2. LISTENER: Docks (estado en tiempo real)
  const docksQuery = query(
    collection(db, COLLECTIONS.DOCKS),
    where('cd', '==', STATE.currentSite),
    orderBy('codigo')
  );

  subscriptions.docks = onSnapshot(
    docksQuery,
    (snapshot) => {
      STATE.docks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (typeof renderAndenes === 'function') renderAndenes();
    },
    (err) => console.error('[YMS] Error en listener docks:', err)
  );

  // 3. LISTENER: Chat
  const chatQuery = query(
    collection(db, COLLECTIONS.CHAT),
    where('cd', '==', STATE.currentSite),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  subscriptions.chat = onSnapshot(
    chatQuery,
    (snapshot) => {
      STATE.chatMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (typeof renderChat === 'function') renderChat();
    },
    (err) => console.error('[YMS] Error en listener chat:', err)
  );

  console.log('[YMS] Listeners críticos iniciados');
}

/**
 * ═══════════════════════════════════════════════════════════════
 * DATOS ON-DEMAND (cargar cuando se abra la sección)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Cargar visitas (no listener, solo carga inicial)
 */
export async function loadVisits() {
  const db = getDb();
  if (!db || !STATE.currentSite) return;

  try {
    const visitsQuery = query(
      collection(db, COLLECTIONS.YARD_VISITS),
      where('cd', '==', STATE.currentSite),
      where('estado', 'in', ['en_patio', 'en_anden']),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(visitsQuery);
    STATE.visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (typeof renderVisitas === 'function') renderVisitas();
  } catch (err) {
    console.error('[YMS] Error cargando visitas:', err);
  }
}

/**
 * Cargar presencia (polling cada 30s)
 */
export async function loadPresence() {
  const db = getDb();
  if (!db || !STATE.currentSite) return;

  try {
    const presenceQuery = query(
      collection(db, COLLECTIONS.PRESENCE)
    );

    const snapshot = await getDocs(presenceQuery);
    STATE.presence = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => p.cd === STATE.currentSite && p.online);

    if (typeof renderPresence === 'function') renderPresence();
  } catch (err) {
    console.error('[YMS] Error cargando presencia:', err);
  }
}

/**
 * Cargar audit log bajo demanda
 */
export async function loadAuditLog(limitNum = 100) {
  const db = getDb();
  if (!db || !STATE.currentSite) return;

  try {
    const auditQuery = query(
      collection(db, COLLECTIONS.AUDIT_LOG),
      where('cd', '==', STATE.currentSite),
      orderBy('createdAt', 'desc'),
      limit(limitNum)
    );

    const snapshot = await getDocs(auditQuery);
    STATE.auditLog = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (typeof renderAuditLog === 'function') renderAuditLog();
  } catch (err) {
    console.error('[YMS] Error cargando audit log:', err);
  }
}

/**
 * Cargar lista de usuarios del sistema
 */
export async function loadUsers() {
  const db = getDb();
  if (!db || !STATE.currentSite) return;

  try {
    const usersQuery = query(
      collection(db, COLLECTIONS.USERS),
      where('cd', '==', STATE.currentSite),
      where('activo', '==', true)
    );

    const snapshot = await getDocs(usersQuery);
    STATE.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('[YMS] Error cargando usuarios:', err);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * GESTIÓN DE LISTENERS
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Desuscribirse de todos los listeners
 */
export function unsubscribeAll() {
  console.log('[YMS] Limpiando listeners...');

  Object.entries(subscriptions).forEach(([name, unsub]) => {
    if (typeof unsub === 'function') {
      try {
        unsub();
      } catch (err) {
        console.error(`[YMS] Error desuscribiendo ${name}:`, err);
      }
    }
  });

  Object.keys(subscriptions).forEach(key => delete subscriptions[key]);
  console.log('[YMS] Listeners limpios');
}

/**
 * Actualizar listeners cuando cambia el CD
 */
export async function updateListenersForSite(newSite) {
  if (newSite === STATE.currentSite) return;

  STATE.currentSite = newSite;
  unsubscribeAll();

  // Reiniciar listeners críticos
  await loadUsers();
  subscribeToCriticalData();
}

// Iniciar polling de presencia cada 30 segundos
export function startPresencePolling() {
  if (subscriptions.presenceInterval) return;

  subscriptions.presenceInterval = setInterval(() => {
    loadPresence();
  }, 30000); // 30 segundos
}

export function stopPresencePolling() {
  if (subscriptions.presenceInterval) {
    clearInterval(subscriptions.presenceInterval);
    delete subscriptions.presenceInterval;
  }
}
