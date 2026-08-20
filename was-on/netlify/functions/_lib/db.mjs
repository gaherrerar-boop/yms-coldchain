// Acceso a Supabase por PostgREST con la clave secreta. Se usa fetch directo
// para no arrastrar dependencias al bundle de las funciones.

const REQUIRED = ['SUPABASE_URL'];

function credentials() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  for (const name of REQUIRED) {
    if (!process.env[name]) throw new Error(`Falta la variable de entorno ${name}`);
  }
  if (!key) throw new Error('Falta la variable de entorno SUPABASE_SECRET_KEY');
  return { url: url.replace(/\/+$/, ''), key };
}

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const { url, key } = credentials();
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  };
  if (prefer) headers.prefer = prefer;

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(payload?.message || `PostgREST respondió ${response.status}`);
    error.status = response.status;
    error.code = payload?.code;
    error.details = payload?.details;
    throw error;
  }
  return payload;
}

const USER_COLUMNS = 'id,username,role,password_hash,password_changed_at';

// Nombre de usuario normalizado en minusculas: la columna username_key es
// generada, asi que la comparacion es exacta y no interpreta comodines.
export function usernameKey(username) {
  return String(username || '').trim().toLowerCase();
}

export async function findUserByUsername(username) {
  const key = encodeURIComponent(usernameKey(username));
  const rows = await rest(`was_on_users?username_key=eq.${key}&select=${USER_COLUMNS}&limit=1`);
  return rows?.[0] || null;
}

export async function findUserById(id) {
  const rows = await rest(`was_on_users?id=eq.${encodeURIComponent(id)}&select=${USER_COLUMNS}&limit=1`);
  return rows?.[0] || null;
}

// La proyeccion se repite en el cliente a proposito: esta lista viaja al
// navegador y un `select` mal escrito no debe poder filtrar hashes.
export async function listUsers() {
  const rows = (await rest('was_on_users?select=id,username,role&order=role.asc,username.asc')) || [];
  return rows.map((row) => ({ id: row.id, username: row.username, role: row.role }));
}

export async function countUsers() {
  const { url, key } = credentials();
  const response = await fetch(`${url}/rest/v1/was_on_users?select=id&limit=1`, {
    method: 'HEAD',
    headers: { apikey: key, authorization: `Bearer ${key}`, prefer: 'count=exact' },
  });
  if (!response.ok) throw new Error(`No fue posible contar usuarios (${response.status})`);
  return Number(response.headers.get('content-range')?.split('/')?.[1] || 0);
}

export async function createUser({ username, passwordHash, role = 'viewer' }) {
  const rows = await rest('was_on_users', {
    method: 'POST',
    body: [{
      username: String(username).trim(),
      password_hash: passwordHash,
      role,
      // Marca del reloj del servidor de funciones, no de la base: la validez
      // de las sesiones se compara contra este valor.
      password_changed_at: new Date().toISOString(),
    }],
    prefer: 'return=representation',
  });
  return rows?.[0] || null;
}

export async function updateUser(id, patch) {
  const rows = await rest(`was_on_users?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
    prefer: 'return=representation',
  });
  return rows?.[0] || null;
}

export async function deleteUser(id) {
  const rows = await rest(`was_on_users?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    prefer: 'return=representation',
  });
  return rows?.[0] || null;
}

export async function readState() {
  const rows = await rest('was_on_state?id=eq.1&select=state,updated_at,updated_by&limit=1');
  return rows?.[0] || null;
}

export async function writeState(state, updatedBy) {
  const rows = await rest('was_on_state', {
    method: 'POST',
    body: [{ id: 1, state, updated_at: new Date().toISOString(), updated_by: updatedBy }],
    prefer: 'resolution=merge-duplicates,return=representation',
  });
  return rows?.[0] || null;
}

export const UNIQUE_VIOLATION = '23505';
