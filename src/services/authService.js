// Auth Service — Authentication wrapper with profile loading
import { auth } from '../firebase.js';
import { STATE } from '../state.js';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import * as userRepository from '../repositories/userRepository.js';
import * as presenceService from './presenceService.js';
import * as auditService from './auditService.js';

export async function login(email, password) {
  try {
    // Firebase authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Load user profile from Firestore
    const profile = await userRepository.getUserById(user.uid);

    if (!profile) {
      await signOut(auth);
      throw new Error('User profile not found in system');
    }

    // Update STATE
    STATE.user = user;
    STATE.profile = profile;
    STATE.currentSite = profile.cd;

    // Mark presence online
    await presenceService.goOnline();

    // Audit log
    await auditService.auditLogin(email);

    console.log(`[Auth] ✅ Logged in as ${email} (${profile.rol})`);
    return { user, profile };
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    throw new Error(err.message || 'Login failed');
  }
}

export async function logout() {
  try {
    const userId = auth.currentUser?.uid;

    // Mark offline and stop heartbeat
    await presenceService.goOffline();

    // Firebase sign out
    await signOut(auth);

    // Clear STATE
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

    // Audit log (before clearing user context)
    if (userId) {
      await auditService.auditLogout();
    }

    console.log('[Auth] ✅ Logged out');
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    // Even if error, clear local state
    STATE.user = null;
    STATE.profile = null;
  }
}

export async function loadProfile(uid) {
  try {
    const profile = await userRepository.getUserById(uid);
    if (profile) {
      STATE.profile = profile;
      STATE.currentSite = profile.cd;
      return profile;
    }
    return null;
  } catch (err) {
    console.error('[Auth] Error loading profile:', err);
    return null;
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function getCurrentProfile() {
  return STATE.profile;
}

export function isAuthenticated() {
  return !!(auth.currentUser && STATE.profile);
}

export function getAuthState() {
  return {
    user: auth.currentUser,
    profile: STATE.profile,
    isAuthenticated: isAuthenticated(),
    role: STATE.profile?.rol || null,
    cd: STATE.currentSite || null
  };
}
