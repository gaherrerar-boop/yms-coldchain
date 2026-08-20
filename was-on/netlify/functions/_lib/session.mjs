// Sesion en cookie firmada con HMAC-SHA256. No hace falta tabla de sesiones:
// el token lleva el id del usuario y su fecha de emision, y se invalida solo
// cuando cambia la contrasena (password_changed_at posterior a la emision).

import { createHmac, timingSafeEqual } from 'node:crypto';
import { findUserById } from './db.mjs';

export const COOKIE_NAME = 'was_on_session';
const MAX_AGE_SECONDS = 12 * 60 * 60;
const MAX_AGE_MS = MAX_AGE_SECONDS * 1000;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('Falta SESSION_SECRET (mínimo 32 caracteres)');
  }
  return value;
}

const encode = (buffer) => Buffer.from(buffer).toString('base64url');

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

// `iat` va en milisegundos: con precision de segundos, cambiar la contrasena
// dentro del mismo segundo en que se emitio el token no invalidaba la sesion.
export function createToken(userId) {
  const payload = encode(JSON.stringify({ uid: userId, iat: Date.now() }));
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims?.uid || !claims?.iat) return null;
    if (Date.now() - claims.iat > MAX_AGE_MS) return null;
    return claims;
  } catch {
    return null;
  }
}

function readCookie(request, name) {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

// En produccion la cookie viaja como Secure; en `netlify dev` (http) no puede
// serlo o el navegador la descarta.
function cookieAttributes() {
  const secure = process.env.NETLIFY_DEV === 'true' ? '' : ' Secure;';
  return `Path=/; HttpOnly;${secure} SameSite=Lax`;
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${token}; ${cookieAttributes()}; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearedCookie() {
  return `${COOKIE_NAME}=; ${cookieAttributes()}; Max-Age=0`;
}

// Devuelve el usuario de la sesion, o null si no hay sesion valida.
export async function currentUser(request) {
  const claims = verifyToken(readCookie(request, COOKIE_NAME));
  if (!claims) return null;

  const user = await findUserById(claims.uid);
  if (!user) return null;

  // password_changed_at siempre lo escribe el propio servidor de funciones
  // (no `now()` de la base), asi que ambas marcas salen del mismo reloj.
  const changedAt = new Date(user.password_changed_at).getTime();
  if (Number.isFinite(changedAt) && changedAt > claims.iat) return null;

  return user;
}

export const publicUser = (user) => ({ id: user.id, username: user.username, role: user.role });
