/**
 * Roles and Authorization Module
 * Verificar permisos según rol
 */

import { STATE } from './state.js';
import { ROLES } from './constants.js';

/**
 * Verificar si usuario puede crear un recurso
 */
export function canCreate(resource) {
  const role = STATE.profile?.rol;

  const permissions = {
    'yard_tasks': [ROLES.GUARDIA, ROLES.PATIO, ROLES.ANDEN, ROLES.SUPERVISOR, ROLES.ADMINISTRADOR],
    'yard_visits': [ROLES.GUARDIA, ROLES.ADMINISTRADOR],
    'chat': [ROLES.GUARDIA, ROLES.PATIO, ROLES.ANDEN, ROLES.SUPERVISOR, ROLES.ADMINISTRADOR],
    'docks': [ROLES.ADMINISTRADOR],
    'carriers': [ROLES.ADMINISTRADOR],
    'users': [ROLES.ADMINISTRADOR]
  };

  return permissions[resource]?.includes(role) || false;
}

/**
 * Verificar si usuario puede editar un recurso
 */
export function canEdit(resource, item = {}) {
  const role = STATE.profile?.rol;

  // Admin puede editar todo
  if (role === ROLES.ADMINISTRADOR) return true;

  // Verificar rol
  const editRoles = {
    'yard_tasks': [ROLES.GUARDIA, ROLES.PATIO, ROLES.ANDEN, ROLES.SUPERVISOR, ROLES.ADMINISTRADOR],
    'docks': [ROLES.PATIO, ROLES.ANDEN, ROLES.SUPERVISOR, ROLES.ADMINISTRADOR],
    'yard_visits': [ROLES.GUARDIA, ROLES.PATIO, ROLES.ANDEN, ROLES.ADMINISTRADOR]
  };

  if (!editRoles[resource]?.includes(role)) return false;

  // Verificar CD
  if (item.cd && item.cd !== STATE.currentSite) return false;

  return true;
}

/**
 * Verificar si usuario puede ver un recurso
 */
export function canView(resource) {
  const role = STATE.profile?.rol;

  // Visualizador solo puede ver (no crear/editar)
  if (role === ROLES.VISUALIZADOR) return true;

  // El resto puede ver todo
  return true;
}

/**
 * Verificar si usuario puede eliminar
 */
export function canDelete(resource, item = {}) {
  const role = STATE.profile?.rol;

  // Solo admin puede eliminar
  if (role !== ROLES.ADMINISTRADOR) return false;

  return true;
}

/**
 * Verificar si es administrador
 */
export function isAdmin() {
  return STATE.profile?.rol === ROLES.ADMINISTRADOR;
}

/**
 * Verificar si es supervisor
 */
export function isSupervisor() {
  return STATE.profile?.rol === ROLES.SUPERVISOR;
}

/**
 * Obtener label de rol
 */
export function getRoleLabel(role) {
  const labels = {
    [ROLES.ADMINISTRADOR]: 'Administrador',
    [ROLES.SUPERVISOR]: 'Supervisor',
    [ROLES.GUARDIA]: 'Guardia',
    [ROLES.PATIO]: 'Patio',
    [ROLES.ANDEN]: 'Andén',
    [ROLES.VISUALIZADOR]: 'Visualizador'
  };

  return labels[role] || role;
}
