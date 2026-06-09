// Presence Service — User presence tracking with heartbeat
import { auth } from '../firebase.js';
import { STATE } from '../state.js';
import * as presenceRepository from '../repositories/presenceRepository.js';
import * as auditService from './auditService.js';

let heartbeatInterval = null;

export async function startHeartbeat(intervalMs = 60000) {
  if (heartbeatInterval) {
    console.warn('[Presence] Heartbeat already running');
    return;
  }

  await updatePresence('online');

  heartbeatInterval = setInterval(async () => {
    try {
      await updatePresence('online');
    } catch (err) {
      console.error('[Presence] Heartbeat error:', err);
    }
  }, intervalMs);

  console.log(`[Presence] Heartbeat started (${intervalMs}ms interval)`);
}

export async function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[Presence] Heartbeat stopped');
  }
}

export async function updatePresence(status = 'online') {
  try {
    if (!auth.currentUser || !STATE.profile) {
      console.warn('[Presence] User or profile not available');
      return;
    }

    const presenceData = {
      online: status === 'online',
      nombre: STATE.profile.nombre || 'Unknown',
      rol: STATE.profile.rol || 'unknown',
      cd: STATE.currentSite || STATE.profile.cd || 'unknown',
      email: auth.currentUser.email || 'unknown'
    };

    await presenceRepository.updatePresence(auth.currentUser.uid, presenceData);
  } catch (err) {
    console.error('[Presence] Error updating presence:', err);
  }
}

export async function goOnline() {
  try {
    if (!auth.currentUser || !STATE.profile) {
      console.warn('[Presence] Cannot mark online: user or profile not available');
      return;
    }

    const userData = {
      online: true,
      nombre: STATE.profile.nombre || 'Unknown',
      rol: STATE.profile.rol || 'unknown',
      cd: STATE.currentSite || STATE.profile.cd || 'unknown',
      email: auth.currentUser.email || 'unknown'
    };

    await presenceRepository.setOnline(auth.currentUser.uid, userData);
    await startHeartbeat();
    console.log('[Presence] ✅ User marked online');
  } catch (err) {
    console.error('[Presence] Error marking online:', err);
  }
}

export async function goOffline() {
  try {
    await stopHeartbeat();

    if (auth.currentUser) {
      await presenceRepository.setOffline(auth.currentUser.uid);
      console.log('[Presence] ✅ User marked offline');
    }
  } catch (err) {
    console.error('[Presence] Error marking offline:', err);
  }
}

// Get current online users in the same CD
export async function getOnlineUsers() {
  try {
    const cd = STATE.currentSite;
    if (!cd) return [];
    return await presenceRepository.getOnlineUsers(cd);
  } catch (err) {
    console.error('[Presence] Error fetching online users:', err);
    return [];
  }
}

// Get all presence data for a CD
export async function getAllPresence() {
  try {
    const cd = STATE.currentSite;
    if (!cd) return [];
    return await presenceRepository.getAllPresence(cd);
  } catch (err) {
    console.error('[Presence] Error fetching all presence:', err);
    return [];
  }
}

// Handle browser close/tab close
export function setupUnloadHandler() {
  window.addEventListener('beforeunload', async () => {
    await goOffline();
  });

  // Also handle page visibility changes
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      // Page hidden — schedule offline after 5 min if still hidden
      setTimeout(async () => {
        if (document.hidden && heartbeatInterval) {
          await stopHeartbeat();
          console.log('[Presence] Page hidden — heartbeat paused');
        }
      }, 300000); // 5 minutes
    } else {
      // Page visible again — resume heartbeat
      if (heartbeatInterval === null && auth.currentUser) {
        await startHeartbeat();
        console.log('[Presence] Page visible — heartbeat resumed');
      }
    }
  });
}
