// GET /api/auth/me -> {user} con la sesion vigente, 401 si no hay

import { fail, json, methodNotAllowed, serverError } from './_lib/http.mjs';
import { currentUser, publicUser } from './_lib/session.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);

  try {
    const user = await currentUser(request);
    if (!user) return fail(401, 'Sesión no iniciada');
    return json({ user: publicUser(user) });
  } catch (error) {
    return serverError(error, 'auth-me');
  }
}

export const config = { path: '/api/auth/me' };
