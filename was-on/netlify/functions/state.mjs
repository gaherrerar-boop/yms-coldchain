// GET  /api/state -> {state, updatedAt, updatedBy}
// PUT  /api/state  {state} -> {updatedAt, updatedBy}   (solo administrador)

import { readState, writeState } from './_lib/db.mjs';
import { fail, json, methodNotAllowed, readJson, serverError } from './_lib/http.mjs';
import { currentUser } from './_lib/session.mjs';

export default async function handler(request) {
  try {
    const user = await currentUser(request);
    // La interfaz reacciona al 401 devolviendo al login, asi que la sesion
    // vencida durante una edicion no se traduce en un guardado perdido en silencio.
    if (!user) return fail(401, 'Sesión no iniciada');

    if (request.method === 'GET') {
      const row = await readState();
      if (!row) return json({ state: null });
      return json({ state: row.state, updatedAt: row.updated_at, updatedBy: row.updated_by });
    }

    if (request.method === 'PUT') {
      if (user.role !== 'admin') return fail(403, 'Tu usuario es de sólo visualización');

      const body = await readJson(request);
      if (!body.state || typeof body.state !== 'object') {
        return fail(400, 'El plano enviado no es válido');
      }

      const row = await writeState(body.state, user.username);
      return json({ updatedAt: row.updated_at, updatedBy: row.updated_by });
    }

    return methodNotAllowed(['GET', 'PUT']);
  } catch (error) {
    return serverError(error, 'state');
  }
}

export const config = { path: '/api/state' };
