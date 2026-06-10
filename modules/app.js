/**
 * YMS Main Application Entry Point
 * Coordinación central de inicialización
 */

import { FIREBASE_CONFIG } from './constants.js';
import { isFirebaseReady, getFirebaseStatus, getFirebaseAuth } from './firebase.js';
import { subscribeToAuthState, onLogin, logout } from './auth.js';
import { subscribeToCriticalData, unsubscribeAll, startPresencePolling, stopPresencePolling } from './realtime.js';
import { startPresenceHeartbeat, stopPresenceHeartbeat, goOffline } from './presence.js';
import { STATE, clearState } from './state.js';
import { showAlert } from './notifications.js';

console.log('[YMS] Inicializando aplicación...');

/**
 * Inicializar la aplicación
 */
async function initApp() {
  try {
    // 1. Firebase ya está inicializado automáticamente al importar firebase.js
    console.log('[YMS] Paso 1: Verificar Firebase status');
    console.log('[YMS] Firebase status:', getFirebaseStatus());

    // 2. Escuchar cambios de autenticación
    console.log('[YMS] Paso 2: Suscribirse a cambios de auth');
    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user) {
        console.log('[YMS] Usuario autenticado:', user.email);

        // Mostrar pantalla principal
        showMainView();

        // Establecer CD actual desde el perfil del usuario
        if (STATE.profile?.cd) {
          STATE.currentSite = STATE.profile.cd;
          console.log('[YMS] CD establecido:', STATE.currentSite);
        }

        // Cargar datos e iniciar listeners
        console.log('[YMS] Iniciando listeners y presencia');
        subscribeToCriticalData();
        startPresenceHeartbeat();
        startPresencePolling();

        // Mostrar vista inicial (Dashboard)
        setTimeout(() => {
          if (typeof showView === 'function') {
            console.log('[YMS] Renderizando Dashboard inicial');
            showView('dashboard');
          }
        }, 100);

      } else {
        console.log('[YMS] Usuario no autenticado');

        // Mostrar pantalla de login
        showLoginView();

        // Limpiar listeners y presencia
        unsubscribeAll();
        stopPresenceHeartbeat();
        stopPresencePolling();
        clearState();
      }
    });

    // Si auth no está disponible, mostrar login de todas formas
    const auth = getFirebaseAuth();
    if (!auth) {
      console.log('[YMS] ⚠️  Auth no disponible, mostrando login automaticamente');
      showLoginView();
    } else {
      console.log('[YMS] ✓ Auth disponible, listeners activos');
    }

    console.log('[YMS] Aplicación inicializada');
  } catch (err) {
    console.error('[YMS] Error inicializando app:', err);
    showAlert('error', 'Error inicializando aplicación');
  }
}

/**
 * Mostrar pantalla de login
 */
function showLoginView() {
  const loginView = document.getElementById('login-view');
  const mainView = document.getElementById('app-body');

  if (loginView) loginView.style.display = 'flex';
  if (mainView) mainView.style.display = 'none';

  // Configurar event listener del botón de login
  const loginBtn = document.getElementById('btn-login');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const email = document.getElementById('inp-email')?.value || '';
      const password = document.getElementById('inp-pass')?.value || '';
      onLogin(email, password);
    });
  }
}

/**
 * Mostrar pantalla principal
 */
function showMainView() {
  const loginView = document.getElementById('login-view');
  const mainView = document.getElementById('app-body');

  if (loginView) loginView.style.display = 'none';
  if (mainView) mainView.style.display = 'block';

  // Configurar event listeners de logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Mostrar nombre de usuario
  const userNameEl = document.getElementById('user-name');
  if (userNameEl && STATE.profile) {
    userNameEl.textContent = STATE.profile.nombre;
  }
}

/**
 * Función global para logout (desde UI)
 */
window.appLogout = logout;

/**
 * Función global para cambiar vista (desde UI)
 */
window.appSwitchView = function(viewName) {
  STATE.currentView = viewName;
  if (typeof switchView === 'function') {
    switchView(viewName);
  }
};

// ═══════════════════════════════════════════════════════════════
// INICIALIZAR CUANDO EL DOM ESTÉ LISTO
// ═══════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Cleanup al cerrar la ventana
window.addEventListener('beforeunload', async () => {
  if (STATE.user) {
    try {
      await goOffline();
    } catch (_) {}
  }
});
