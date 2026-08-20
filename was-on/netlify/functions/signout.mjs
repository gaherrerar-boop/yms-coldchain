// GET /signout-with-chatgpt?return_to=/ -> cierra sesion y vuelve al inicio.
// La ruta la conserva was-on.html tal como venia de ChatGPT Sites; aqui solo
// se reimplementa su comportamiento.

import { clearedCookie } from './_lib/session.mjs';

// Solo se acepta un destino relativo dentro del propio sitio: "//host" o una
// URL absoluta permitirian redirigir a un dominio ajeno.
function safeReturnTo(raw) {
  const value = String(raw || '/');
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default async function handler(request) {
  const target = safeReturnTo(new URL(request.url).searchParams.get('return_to'));
  return new Response(null, {
    status: 302,
    headers: {
      location: target,
      'set-cookie': clearedCookie(),
      'cache-control': 'no-store',
    },
  });
}

export const config = { path: '/signout-with-chatgpt' };
