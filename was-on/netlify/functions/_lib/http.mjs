// Respuestas JSON con el formato que espera la interfaz de WAS ON:
// los errores viajan como {error:"mensaje"} y la UI muestra ese texto.

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export function json(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

export function fail(status, message, headers = {}) {
  return json({ error: message }, { status, headers });
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

export function methodNotAllowed(allow) {
  return fail(405, 'Método no permitido', { allow: allow.join(', ') });
}

// Errores inesperados: se registran completos pero al cliente solo le llega
// un mensaje generico, para no filtrar detalles de la base de datos.
export function serverError(error, context) {
  console.error(`[was-on] ${context}:`, error);
  return fail(500, 'Error interno del servidor');
}
