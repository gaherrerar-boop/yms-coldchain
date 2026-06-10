// Audit Service — Centralized audit logging for all critical operations
import { auth } from '../firebase.js';
import { STATE } from '../state.js';
import * as auditRepository from '../repositories/auditRepository.js';

export async function logAction(action, details = {}, userIdOverride = null) {
  try {
    const userId = userIdOverride || auth.currentUser?.uid || 'unknown';
    const userRole = STATE.profile?.rol || 'unknown';
    const cd = STATE.currentSite || STATE.profile?.cd || 'unknown';

    const auditEntry = {
      action,
      details,
      user_id: userId,
      user_email: auth.currentUser?.email || 'unknown',
      user_role: userRole,
      cd,
      ip: 'browser', // Can't get real IP from browser
      user_agent: navigator.userAgent
    };

    await auditRepository.createAuditEntry(auditEntry);
    console.log(`[Audit] ${action}:`, details);
  } catch (err) {
    console.error('[Audit] Error logging action:', err);
    // Don't throw — audit logging should never break operations
  }
}

export async function getAuditLog(limitNum = 100) {
  try {
    const cd = STATE.currentSite;
    if (!cd) {
      console.warn('[Audit] No currentSite set');
      return [];
    }
    return await auditRepository.getAuditLog(cd, limitNum);
  } catch (err) {
    console.error('[Audit] Error fetching log:', err);
    return [];
  }
}

export async function getAuditByUser(userId, limitNum = 50) {
  try {
    return await auditRepository.getAuditByUser(userId, limitNum);
  } catch (err) {
    console.error('[Audit] Error fetching user audit:', err);
    return [];
  }
}

// Common audit actions
export async function auditLogin(email) {
  await logAction('login', { email });
}

export async function auditLogout() {
  await logAction('logout', {});
}

export async function auditTaskCreated(taskId, taskData) {
  await logAction('task_created', { taskId, ...taskData });
}

export async function auditTaskAccepted(taskId, acceptedBy) {
  await logAction('task_accepted', { taskId, acceptedBy });
}

export async function auditTaskCompleted(taskId, completedBy) {
  await logAction('task_completed', { taskId, completedBy });
}

export async function auditTaskCancelled(taskId, cancelledBy, reason) {
  await logAction('task_cancelled', { taskId, cancelledBy, reason });
}

export async function auditDockAssigned(dockId, taskId) {
  await logAction('dock_assigned', { dockId, taskId });
}

export async function auditDockFreed(dockId) {
  await logAction('dock_freed', { dockId });
}

export async function auditVisitCreated(visitId, visitData) {
  await logAction('visit_created', { visitId, ...visitData });
}

export async function auditRoleChanged(userId, oldRole, newRole) {
  await logAction('role_changed', { userId, oldRole, newRole });
}

export async function auditUserDeactivated(userId) {
  await logAction('user_deactivated', { userId });
}
