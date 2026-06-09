/**
 * Authentication Module
 * Maneja login, logout, y autenticación con Firebase Auth
 */

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase.js';
import { STATE, clearState } from './state.js';
import { COLLECTIONS } from './constants.js';
import { showAlert } from './notifications.js';

const auth = getFirebaseAuth();
const db = getFirebaseDb();

/**
 * Login con email y password
 */
export async function onLogin(email, password) {
  if (!auth) {
    showAlert('error', 'Firebase no configurado');
    return;
  }

  email = (email || '').trim();
  password = (password || '').trim();

  if (!email || !password) {
    showAlert('error', 'Email y contraseña requeridos');
    return;
  }

  try {
    // Autenticar con Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Cargar perfil desde Firestore
    const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.warn('[YMS] ⚠️ Perfil faltante para UID:', user.uid);
      showAlert('error', 'Usuario autenticado, pero perfil no existe en Firestore. Contacta al administrador.');
      // NO hacer logout automático - mantener sesión Firebase
      return;
    }

    // Actualizar STATE
    STATE.user = user;
    STATE.profile = userDocSnap.data();

    // Marcar presencia online
    try {
      const presenceRef = doc(db, COLLECTIONS.PRESENCE, user.uid);
      await updateDoc(presenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
        nombre: STATE.profile.nombre,
        rol: STATE.profile.rol,
        cd: STATE.profile.cd,
        email: user.email
      });
    } catch (_) {
      // No fallar si la presencia falla
    }

    console.log('[YMS] Login exitoso:', user.email);
    showAlert('success', `Bienvenido ${STATE.profile.nombre}`);

    // Las vistas se actualizan automáticamente en app.js
  } catch (err) {
    console.error('[YMS] Error en login:', err);

    let errorMessage = 'Error en autenticación';

    if (err.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/Password no está habilitado en Firebase. Contacta al administrador.';
    } else if (err.code === 'auth/user-not-found') {
      errorMessage = 'Usuario no existe.';
    } else if (err.code === 'auth/wrong-password') {
      errorMessage = 'Contraseña incorrecta.';
    } else if (err.code === 'auth/invalid-credential') {
      errorMessage = 'Credenciales inválidas.';
    } else if (err.code === 'auth/network-request-failed') {
      errorMessage = 'Error de red o política de seguridad. Revisa la consola.';
    } else {
      errorMessage = err.message || 'Error desconocido';
    }

    showAlert('error', errorMessage);
  }
}

/**
 * Logout
 */
export async function logout() {
  if (!auth) return;

  try {
    // Marcar presencia offline
    if (STATE.user) {
      const presenceRef = doc(db, COLLECTIONS.PRESENCE, STATE.user.uid);
      try {
        await updateDoc(presenceRef, {
          online: false,
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        console.warn('[YMS] No se pudo actualizar presencia:', err.code);
      }
    }
  } catch (err) {
    console.error('[YMS] Error marcando offline:', err);
  }

  try {
    await signOut(auth);
    clearState();
    console.log('[YMS] Logout exitoso');
    showAlert('success', 'Sesión cerrada');
  } catch (err) {
    console.error('[YMS] Error en logout:', err);
    showAlert('error', `Error: ${err.message}`);
  }
}

/**
 * Suscribirse a cambios de estado de autenticación
 */
export function subscribeToAuthState(callback) {
  if (!auth) {
    console.warn('[YMS] Auth no disponible - Firebase no está listo');
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

/**
 * Obtener usuario actual
 */
export function getCurrentUser() {
  return STATE.user;
}

/**
 * Obtener perfil actual
 */
export function getCurrentProfile() {
  return STATE.profile;
}

/**
 * Verificar si usuario está autenticado
 */
export function isAuthenticated() {
  return !!STATE.user && !!STATE.profile;
}
