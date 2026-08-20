// POST /api/auth/login  {username, password} -> cookie de sesion

import { timingSafeEqual } from 'node:crypto';
import { countUsers, createUser, findUserByUsername, usernameKey } from './_lib/db.mjs';
import { hashPassword, verifyPassword } from './_lib/password.mjs';
import { fail, json, methodNotAllowed, readJson, serverError } from './_lib/http.mjs';
import { createToken, publicUser, sessionCookie } from './_lib/session.mjs';

const CREDENTIALS_ERROR = 'Usuario o contraseña incorrectos';

function sameValue(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

// Arranque en frio: mientras no exista ningun usuario, el administrador
// definido por variables de entorno puede entrar y queda creado en la base.
async function bootstrapAdmin(username, password) {
  const expectedUser = process.env.WAS_ON_ADMIN_USERNAME || 'ON';
  const expectedPassword = process.env.WAS_ON_ADMIN_PASSWORD;
  if (!expectedPassword) return null;
  if (usernameKey(username) !== usernameKey(expectedUser)) return null;
  if (!sameValue(password, expectedPassword)) return null;
  if ((await countUsers()) > 0) return null;

  return createUser({
    username: String(expectedUser).trim(),
    passwordHash: await hashPassword(password),
    role: 'admin',
  });
}

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);

  try {
    const { username, password } = await readJson(request);
    if (!username || !password) return fail(400, 'Indica usuario y contraseña');

    let user = await findUserByUsername(username);
    if (user) {
      if (!(await verifyPassword(password, user.password_hash))) return fail(401, CREDENTIALS_ERROR);
    } else {
      user = await bootstrapAdmin(username, password);
      if (!user) return fail(401, CREDENTIALS_ERROR);
    }

    return json(
      { user: publicUser(user) },
      { headers: { 'set-cookie': sessionCookie(createToken(user.id)) } },
    );
  } catch (error) {
    return serverError(error, 'auth-login');
  }
}

export const config = { path: '/api/auth/login' };
