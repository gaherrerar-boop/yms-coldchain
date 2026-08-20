# WAS ON · Slotting

Clon exacto de la aplicación publicada en
`https://was-on-slotting.gabroh1.chatgpt.site/`, capturada el 2026-08-20.

## Archivos

| Archivo | Origen | Estado |
|---|---|---|
| `slotting.html` | `/slotting` (485 KB) | Idéntico al original |
| `was-on.html` | `/was-on.html?v=chatgpt-auth` | Idéntico al original |
| `local-api.js` | `/local-api.js` | Idéntico al original |
| `favicon.svg` | `/favicon.svg` | Idéntico al original |
| `index.html` | `/` | Reescrito como HTML estático |

`slotting.html` y `was-on.html` conservan el código original byte a byte; lo
único removido es el script de challenge que Cloudflare inyecta en el borde
(`__CF$cv$params`), que no forma parte de la aplicación.

`index.html` es la única pieza reescrita. La página raíz original la renderiza
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

## Requisito: servir desde la raíz del dominio

Las rutas internas son absolutas (`/was-on.html`, `/slotting.html`,
`/local-api.js`, `/api/...`). Servir este directorio en un subdirectorio rompe
la navegación. Para una prueba local:

```bash
cd was-on && python3 -m http.server 8080
```

La UI cargará, pero se quedará en el login: falta el backend.

## Backend requerido

ChatGPT Sites proveía la persistencia y la autenticación. Ese código es del lado
del servidor y no es accesible desde fuera, así que **no está en este clon**.
Este es el contrato que la aplicación espera, derivado de sus llamadas:

### Autenticación (cookie de sesión, `credentials: include`)

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{username, password}` | Cookie de sesión |
| `GET` | `/api/auth/me` | — | `{user:{id, username, role}}`, `401` sin sesión |

`role` es `admin` (edita y graba) o cualquier otro valor (solo lectura).
El botón de cerrar sesión apunta a `/signout-with-chatgpt?return_to=/`, ruta
propia de Sites que hay que reemplazar.

### Estado compartido del plano

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| `GET` | `/api/state` | — | `{state, updatedAt, updatedBy}` |
| `PUT` | `/api/state` | `{state}` | `{updatedAt, updatedBy}` |

`state` es el documento JSON completo de la aplicación (cámaras, ubicaciones,
configuración del motor de slotting). Un `401` en el `PUT` redirige al login.

### Administración de usuarios (solo `admin`)

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| `GET` | `/api/users` | — | `{users:[{id, username, role}]}` |
| `POST` | `/api/users` | `{username, password}` | Crea visualizador |
| `PATCH` | `/api/users/:id` | `{username, password?}` | `{reauthenticate?}` |
| `DELETE` | `/api/users/:id` | — | Elimina el usuario |

Los errores se devuelven como `{error: "mensaje"}` y la UI muestra ese texto.
