// GET    /api/users      -> {users:[{id, username, role}]}
// POST   /api/users      {username, password}  -> crea un visualizador
// PATCH  /api/users/:id  {username, password?} -> {reauthenticate}
// DELETE /api/users/:id
// Todas las rutas exigen sesion de administrador.

import {
  UNIQUE_VIOLATION, createUser, deleteUser, findUserById, listUsers, updateUser,
} from './_lib/db.mjs';
import { hashPassword } from './_lib/password.mjs';
import { fail, json, methodNotAllowed, readJson, serverError } from './_lib/http.mjs';
import { currentUser } from './_lib/session.mjs';

// Los limites replican los del formulario de la interfaz.
function validateUsername(value) {
  const username = String(value || '').trim();
  if (username.length < 1 || username.length > 32) return { error: 'El nombre debe tener entre 1 y 32 caracteres' };
  return { username };
}

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 3 || password.length > 128) return { error: 'La contraseña debe tener entre 3 y 128 caracteres' };
  return { password };
}

function targetId(request, context) {
  const fromParams = context?.params?.id;
  if (fromParams) return fromParams;
  const [, id] = new URL(request.url).pathname.match(/\/api\/users\/([^/]+)$/) || [];
  return id || null;
}

async function handleCreate(request) {
  const body = await readJson(request);
  const { username, error: usernameError } = validateUsername(body.username);
  if (usernameError) return fail(400, usernameError);
  const { password, error: passwordError } = validatePassword(body.password);
  if (passwordError) return fail(400, passwordError);

  try {
    const created = await createUser({ username, passwordHash: await hashPassword(password) });
    return json({ user: { id: created.id, username: created.username, role: created.role } }, { status: 201 });
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) return fail(409, 'Ya existe un usuario con ese nombre');
    throw error;
  }
}

async function handlePatch(request, id, actor) {
  const target = await findUserById(id);
  if (!target) return fail(404, 'El usuario ya no existe');

  const body = await readJson(request);
  const { username, error: usernameError } = validateUsername(body.username);
  if (usernameError) return fail(400, usernameError);

  const patch = { username };
  const changesPassword = Boolean(body.password);
  if (changesPassword) {
    const { password, error: passwordError } = validatePassword(body.password);
    if (passwordError) return fail(400, passwordError);
    patch.password_hash = await hashPassword(password);
    // Invalida las sesiones abiertas de ese usuario, incluida la propia.
    patch.password_changed_at = new Date().toISOString();
  }

  try {
    await updateUser(id, patch);
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) return fail(409, 'Ya existe un usuario con ese nombre');
    throw error;
  }

  return json({ reauthenticate: changesPassword && Number(target.id) === Number(actor.id) });
}

async function handleDelete(id, actor) {
  const target = await findUserById(id);
  if (!target) return fail(404, 'El usuario ya no existe');
  if (Number(target.id) === Number(actor.id)) return fail(409, 'No puedes eliminar tu propio usuario');
  // Sin este resguardo, borrar al ultimo administrador dejaria el plano sin
  // nadie que pueda editarlo.
  if (target.role === 'admin') return fail(409, 'No es posible eliminar a un administrador');

  await deleteUser(id);
  return json({ ok: true });
}

export default async function handler(request, context) {
  try {
    const actor = await currentUser(request);
    if (!actor) return fail(401, 'Sesión no iniciada');
    if (actor.role !== 'admin') return fail(403, 'Sólo el administrador puede gestionar usuarios');

    const id = targetId(request, context);

    if (!id) {
      if (request.method === 'GET') return json({ users: await listUsers() });
      if (request.method === 'POST') return handleCreate(request);
      return methodNotAllowed(['GET', 'POST']);
    }

    if (request.method === 'PATCH') return handlePatch(request, id, actor);
    if (request.method === 'DELETE') return handleDelete(id, actor);
    return methodNotAllowed(['PATCH', 'DELETE']);
  } catch (error) {
    return serverError(error, 'users');
  }
}

export const config = { path: ['/api/users', '/api/users/:id'] };
