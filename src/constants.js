/**
 * YMS Constants — Configuración global
 */

// Firebase Configuration from environment variables
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate Firebase config
if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.includes('VITE_')) {
  console.error('[YMS] Missing Firebase configuration. Copy .env.example to .env and fill in your Firebase credentials.');
}

// Roles y permisos
export const ROLES = {
  ADMINISTRADOR: 'administrador',
  SUPERVISOR: 'supervisor',
  GUARDIA: 'guardia',
  PATIO: 'patio',
  ANDEN: 'anden',
  VISUALIZADOR: 'visualizador'
};

// Estados de tareas
export const TASK_STATES = {
  PENDIENTE: 'pendiente',
  OFRECIDA: 'ofrecida',
  ACEPTADA: 'aceptada',
  EN_PROCESO: 'en_proceso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada'
};

// Estados de andenes
export const DOCK_STATES = {
  LIBRE: 'libre',
  OCUPADO: 'ocupado',
  BLOQUEADO: 'bloqueado'
};

// Estados de visitas
export const VISIT_STATES = {
  EN_PATIO: 'en_patio',
  EN_ANDEN: 'en_anden',
  COMPLETADA: 'completada'
};

// Presencia heartbeat interval (ms)
export const PRESENCE_HEARTBEAT_INTERVAL = 60000; // 60 segundos

// Colecciones Firestore
export const COLLECTIONS = {
  USERS: 'users',
  YARD_TASKS: 'yard_tasks',
  YARD_VISITS: 'yard_visits',
  DOCKS: 'docks',
  QUEUE_TICKETS: 'queue_tickets',
  CARRIERS: 'carriers',
  PLANTS: 'plants',
  AUDIT_LOG: 'audit_log',
  CHAT: 'chat',
  RETURN_AUTHORIZATIONS: 'return_authorizations',
  PRESENCE: 'presence'
};
