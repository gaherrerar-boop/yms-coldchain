/**
 * Firebase Initialization — Modular SDK v9+
 * SINGLE SOURCE OF TRUTH para Firebase en toda la app
 *
 * Inicializa: App, Auth, Firestore con persistencia multi-tab
 * Evita duplicados usando getApps() check
 */

import {
  initializeApp,
  getApps,
  getApp
} from 'firebase/app';

import {
  getAuth,
  connectAuthEmulator
} from 'firebase/auth';

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  runTransaction,
  serverTimestamp,
  FieldValue
} from 'firebase/firestore';

import { FIREBASE_CONFIG } from './constants.js';

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN ÚNICA Y SEGURA
// ═══════════════════════════════════════════════════════════════

let app;
let auth;
let db;

try {
  // 1. Inicializar app Firebase (prevenir duplicados)
  const apps = getApps();
  app = apps.length ? getApp() : initializeApp(FIREBASE_CONFIG);
  console.log('[YMS Firebase] ✅ App initialized (single instance)');

  // 2. Inicializar Auth
  auth = getAuth(app);
  console.log('[YMS Firebase] ✅ Auth initialized');

  // 3. Inicializar Firestore con persistencia multi-tab
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
    console.log('[YMS Firebase] ✅ Firestore with multi-tab persistence enabled');
  } catch (persistenceError) {
    // Si persistencia falla (e.g., multiple tabs, restricted domain), usar memoria
    console.warn('[YMS Firebase] ⚠️  Persistent cache unavailable, using memory cache', persistenceError.code);
    db = getFirestore(app);
  }

  // Optional: Enable emulators for development
  // if (location.hostname === 'localhost') {
  //   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  //   connectFirestoreEmulator(db, 'localhost', 8080);
  // }

} catch (err) {
  console.error('[YMS Firebase] ❌ Initialization failed:', err);
  // NO lanzar error - permitir que la app continúe sin Firebase
  // Las funciones que usan Firebase validarán disponibilidad
}

// ═══════════════════════════════════════════════════════════════
// EXPORTAR INSTANCIAS
// ═══════════════════════════════════════════════════════════════

/**
 * Obtener instancia de Firebase App
 */
export function getFirebaseApp() {
  return app;
}

/**
 * Obtener instancia de Firebase Auth
 */
export function getFirebaseAuth() {
  return auth;
}

/**
 * Obtener instancia de Firestore
 */
export function getFirebaseDb() {
  return db;
}

// Compatibilidad con imports antiguos
export {
  app,
  auth,
  db,
  runTransaction,
  serverTimestamp
};

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES
// ═══════════════════════════════════════════════════════════════

/**
 * Verificar si Firebase está disponible para operaciones
 */
export function isFirebaseReady() {
  return !!(app && auth && db);
}

/**
 * Obtener estado de inicialización
 */
export function getFirebaseStatus() {
  return {
    appInitialized: !!app,
    authReady: !!auth,
    firestoreReady: !!db,
    isReady: isFirebaseReady()
  };
}

/**
 * Esperar a que Firebase esté listo (async)
 */
export async function ensureFirebaseReady() {
  if (isFirebaseReady()) return true;
  // Firebase no está listo; esperar y reintentar
  let attempts = 0;
  while (!isFirebaseReady() && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  return isFirebaseReady();
}

console.log('[YMS Firebase] Status:', getFirebaseStatus());
