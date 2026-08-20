# WAS ON · Slotting

Clon exacto de la aplicación publicada en
`https://was-on-slotting.gabroh1.chatgpt.site/`, capturada el 2026-08-20.

## Archivos

| Archivo | Origen | Estado |
|---|---|---|
| `public/slotting.html` | `/slotting` (485 KB) | Idéntico al original |
| `public/was-on.html` | `/was-on.html?v=chatgpt-auth` | Idéntico al original |
| `public/local-api.js` | `/local-api.js` | Idéntico al original |
| `public/favicon.svg` | `/favicon.svg` | Idéntico al original |
| `public/index.html` | `/` | Reescrito como HTML estático |

`public/slotting.html` y `public/was-on.html` conservan el código original byte a byte; lo
único removido es el script de challenge que Cloudflare inyecta en el borde
(`__CF$cv$params`), que no forma parte de la aplicación.

`public/index.html` es la única pieza reescrita. La página raíz original la renderiza
el runtime React/RSC de ChatGPT Sites, cuyos bundles (`/assets/framework-*.js`,
`/assets/index-*.js`) son plataforma de OpenAI y no funcionan fuera de ese
hosting. Su salida es un contenedor con un `<iframe>`, que aquí se reproduce en
HTML plano con el mismo marcado y el mismo CSS efectivo.

## Arquitectura

Tres capas anidadas por iframes:

```
index.html          host, solo layout
  └─ was-on.html    login + barra de sesión + cierre de sesión
       └─ slotting.html   la aplicación completa (SPA en un archivo)
```

`slotting.html` es autocontenido: no carga librerías externas ni assets
adicionales. Todo el estado vive en `localStorage` y se sincroniza contra la API
de abajo.


## Backend

ChatGPT Sites proveía la autenticación y la persistencia. Ese código es del lado
del servidor y no era accesible, así que aquí está reimplementado como funciones
de Netlify sobre Supabase, respetando el contrato que la aplicación ya esperaba:
`public/slotting.html` y `public/was-on.html` no necesitaron ni un cambio.

```
netlify/functions/
  auth-login.mjs   POST   /api/auth/login
  auth-me.mjs      GET    /api/auth/me
  signout.mjs      GET    /signout-with-chatgpt
  state.mjs        GET    /api/state          PUT /api/state
  users.mjs        GET    /api/users          POST   /api/users
                   PATCH  /api/users/:id      DELETE /api/users/:id
  _lib/            db.mjs · session.mjs · password.mjs · http.mjs
```

Sin dependencias de npm: `fetch` contra PostgREST y `node:crypto` para hash y
firma.

### Contrato

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{username, password}` | `{user}` + cookie |
| `GET` | `/api/auth/me` | — | `{user:{id, username, role}}`, `401` sin sesión |
| `GET` | `/api/state` | — | `{state, updatedAt, updatedBy}` |
| `PUT` | `/api/state` | `{state}` | `{updatedAt, updatedBy}`, `403` si no es admin |
| `GET` | `/api/users` | — | `{users:[{id, username, role}]}` |
| `POST` | `/api/users` | `{username, password}` | Crea visualizador |
| `PATCH` | `/api/users/:id` | `{username, password?}` | `{reauthenticate}` |
| `DELETE` | `/api/users/:id` | — | Elimina el usuario |

Los errores viajan como `{error:"mensaje"}` y la interfaz muestra ese texto.

### Sesión

Cookie `was_on_session` firmada con HMAC-SHA256: lleva el id del usuario y la
fecha de emisión, así que no hace falta tabla de sesiones. Es `HttpOnly`,
`Secure` y `SameSite=Lax`, y dura 12 horas.

Cambiar una contraseña actualiza `password_changed_at`, y todo token emitido
antes de esa marca deja de valer. Por eso `iat` se guarda en milisegundos: con
precisión de segundos, cambiar la contraseña dentro del mismo segundo en que se
emitió el token dejaba viva la sesión anterior.

Las contraseñas se guardan con scrypt (`N=16384, r=8, p=1`) y salt por usuario.

### Roles

`admin` edita y graba el plano; `viewer` solo consulta. La interfaz ya oculta los
controles de edición a los visualizadores, y el servidor lo vuelve a exigir:
`PUT /api/state` y todo `/api/users` responden `403` a un visualizador.

No se puede eliminar a un administrador ni al usuario con el que se está dentro,
para no dejar el plano sin nadie que pueda editarlo.

## Puesta en marcha

### 1. Base de datos

Ya está aplicada en un proyecto Supabase propio de WAS ON, separado del YMS:

| | |
|---|---|
| Proyecto | `WAS ON Slotting` |
| Referencia | `fzohppdhwfemrnikaojy` |
| URL | `https://fzohppdhwfemrnikaojy.supabase.co` |
| Región | `sa-east-1` |

La migración es `supabase/migrations/0001_was_on_backend.sql`. Crea
`was_on_users` y `was_on_state` con RLS activo y sin políticas: solo la clave
secreta —es decir, solo estas funciones— llega a los datos. Ningún cliente con
clave publishable puede leer hashes ni el plano.

### 2. Variables de entorno

En Netlify, *Site settings → Environment variables* (ver `.env.example`):

| Variable | Para qué |
|---|---|
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SECRET_KEY` | Clave secreta; solo la usa el servidor |
| `SESSION_SECRET` | Firma de la cookie, mínimo 32 caracteres |
| `WAS_ON_ADMIN_USERNAME` | Administrador inicial (por defecto `ON`) |
| `WAS_ON_ADMIN_PASSWORD` | Su contraseña inicial |

`SESSION_SECRET` se genera con `openssl rand -base64 48`. Cambiarlo cierra todas
las sesiones abiertas.

El administrador inicial solo funciona mientras la tabla de usuarios esté vacía:
con el primer inicio de sesión queda creado en la base y esas dos variables dejan
de tener efecto. Desde ahí, los usuarios se administran desde la propia interfaz.

### 3. Despliegue

Sitio propio de Netlify con **Base directory = `was-on`**. No sirve desplegarlo
junto al YMS: la aplicación usa rutas absolutas (`/was-on.html`, `/slotting.html`,
`/api/...`) y necesita la raíz del dominio, y el `netlify.toml` del YMS manda
todo `/*` a su propio `index.html`.

`netlify.toml` ya deja `publish = "public"` y las funciones en
`netlify/functions`.

### Desarrollo local

```bash
cd was-on
npm install -g netlify-cli   # si no está
netlify dev
```

`netlify dev` toma las variables de `.env` y enruta `/api/*` a las funciones.
