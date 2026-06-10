// YMS Agrosuper — Entry Point for Vite
// Imports all modules in correct order

import './constants.js';
import { ensureFirebaseReady } from './firebase.js';
import './firebase.js';
import './state.js';
import './auth.js';
import './firestore.js';
import './realtime.js';
import './presence.js';
import './roles.js';
import { sb } from './supabase-adapter.js';
import './ui.js';
import './app.js';

// Exponer funciones en el scope global
window.sb = sb;
window.ensureFirebaseReady = ensureFirebaseReady;

console.log('[YMS] Application initialized');
