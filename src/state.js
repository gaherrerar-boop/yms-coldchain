/**
 * Global State Management
 * Objeto de estado centralizado (sin Redux, simple y eficiente)
 */

export const STATE = {
  // ═══ Autenticación ═══
  user: null,           // firebase.auth().currentUser
  profile: null,        // documento users/{uid}

  // ═══ Datos principales ═══
  currentSite: null,    // CD seleccionado
  currentView: 'patio', // Vista actual

  // Datos de operaciones
  tasks: [],            // Tareas activas
  docks: [],            // Andenes
  visits: [],           // Camiones en patio
  carriers: [],         // Transportistas
  plants: [],           // Plantas
  queue: [],            // Cola de turnomático

  // Datos sociales
  users: [],            // Lista de usuarios del sistema
  presence: [],         // Quién está online ahora
  chatMessages: [],     // Últimos mensajes (últimas 50)
  auditLog: [],         // Auditoría (cargado bajo demanda)

  // ═══ UI State ═══
  sidebarOpen: localStorage.getItem('yms_sidebar_open') === 'true',
  theme: localStorage.getItem('yms_theme') || 'light',
  soundEnabled: localStorage.getItem('yms_sound') === 'true',

  // ═══ Modal/Modal states ═══
  modalsOpen: {},       // Qué modales están abiertos
};

/**
 * Guardar preferencias en localStorage
 * SOLO para UI prefs, NUNCA para datos de negocio
 */
export function savePrefences() {
  localStorage.setItem('yms_theme', STATE.theme);
  localStorage.setItem('yms_sidebar_open', STATE.sidebarOpen);
  localStorage.setItem('yms_sound', STATE.soundEnabled);
}

/**
 * Limpiar estado (al logout)
 */
export function clearState() {
  STATE.user = null;
  STATE.profile = null;
  STATE.currentSite = null;
  STATE.tasks = [];
  STATE.docks = [];
  STATE.visits = [];
  STATE.users = [];
  STATE.presence = [];
  STATE.chatMessages = [];
  STATE.auditLog = [];
}
