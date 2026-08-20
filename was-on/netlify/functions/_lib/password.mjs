// Hash de contrasenas con scrypt (node:crypto), sin dependencias externas.
// Formato almacenado: scrypt$N$r$p$salt_base64$hash_base64

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
// 128 * N * r = 32 MiB exactos; el limite por defecto es ese mismo valor,
// asi que se amplia para que scrypt no falle al ras.
const MAX_MEM = 64 * 1024 * 1024;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEM });
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, n, r, p, salt, key] = parts;
  const expected = Buffer.from(key, 'base64');
  if (!expected.length) return false;

  try {
    const actual = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEM,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
