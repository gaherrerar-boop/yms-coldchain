# Pre-Deployment Checklist

Use this checklist antes de publicar a Netlify.

## Configuración Local ✅

- [ ] Node.js v18+ instalado
- [ ] npm instalado
- [ ] Carpeta `src/` existe con todos los archivos
- [ ] `package.json` existe
- [ ] `vite.config.js` existe
- [ ] `index.html` en raíz existe
- [ ] `.gitignore` protege .env

## Firebase Console ✅

- [ ] Proyecto Firebase creado en https://console.firebase.google.com
- [ ] Firestore habilitado (Database)
- [ ] Authentication → Email/Password habilitado
- [ ] Firestore Security Rules cargadas desde `firestore.rules`
- [ ] Usuario Admin creado:
  - Autenticación: email + password fuerte
  - Firestore: documento `users/{uid}` con:
    ```json
    {
      "nombre": "Admin",
      "email": "admin@example.com",
      "rol": "administrador",
      "cd": "CD01",
      "activo": true
    }
    ```

## Credenciales ✅

- [ ] `.env.local` creado desde `.env.example`
- [ ] VITE_FIREBASE_API_KEY copiado correctamente
- [ ] VITE_FIREBASE_AUTH_DOMAIN copiado correctamente
- [ ] VITE_FIREBASE_PROJECT_ID copiado correctamente
- [ ] VITE_FIREBASE_STORAGE_BUCKET copiado correctamente
- [ ] VITE_FIREBASE_MESSAGING_SENDER_ID copiado correctamente
- [ ] VITE_FIREBASE_APP_ID copiado correctamente
- [ ] VITE_FIREBASE_DATABASE_URL copiado correctamente
- [ ] `.env.local` NO está en git (verificar .gitignore)

## Testing Local ✅

```bash
npm install
npm run dev
```

Luego en http://localhost:5173:

- [ ] Página carga sin errores en consola
- [ ] Login view aparece
- [ ] Login con credenciales admin funciona
- [ ] Después del login aparece dashboard
- [ ] No hay errores rojos en Console (F12)
- [ ] Network tab no muestra errores 403/401 en Firestore

### Crear datos:

- [ ] Crear tarea:
  - Aparecer en "Tareas" view
  - Aparecer en Firestore `yard_tasks` collection

- [ ] Crear andén:
  - Aparecer en "Andenes" view
  - Aparecer en Firestore `docks` collection

- [ ] Crear usuario:
  - Aparecer en lista de usuarios
  - Aparacer en Firestore `users` collection

### Realtime Testing:

- [ ] Abrir segunda ventana en http://localhost:5173
- [ ] Login con otro usuario en segunda ventana
- [ ] Crear tarea en primera ventana
- [ ] Verificar que aparece en segunda ventana **en menos de 2 segundos**
- [ ] Modificar tarea en segunda ventana
- [ ] Verificar que se actualiza en primera ventana

### Session Persistence:

- [ ] Abrir http://localhost:5173
- [ ] Login
- [ ] Presionar F5 (recargar página)
- [ ] Verificar que sesión persiste (no vuelve a pedir login)
- [ ] Cerrar sesión
- [ ] Verificar que se muestra login view

## Build Production ✅

```bash
npm run build
```

- [ ] Comando completa sin errores
- [ ] Carpeta `dist/` creada
- [ ] `dist/index.html` existe
- [ ] Archivos `.js` están minificados en `dist/assets/`
- [ ] No hay archivos `.env` en `dist/`

## Netlify Configuration ✅

- [ ] `netlify.toml` existe
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] SPA redirect configured (`/* → /index.html`)
- [ ] Repository connected to Netlify
- [ ] Netlify domain noted (e.g., `https://yms-xxx.netlify.app`)

## Netlify Environment Variables ✅

En Netlify UI → Site Settings → Build & deploy → Environment:

- [ ] VITE_FIREBASE_API_KEY = [valor]
- [ ] VITE_FIREBASE_AUTH_DOMAIN = [valor]
- [ ] VITE_FIREBASE_PROJECT_ID = [valor]
- [ ] VITE_FIREBASE_STORAGE_BUCKET = [valor]
- [ ] VITE_FIREBASE_MESSAGING_SENDER_ID = [valor]
- [ ] VITE_FIREBASE_APP_ID = [valor]
- [ ] VITE_FIREBASE_DATABASE_URL = [valor]

## Firebase Authorization ✅

En Firebase Console → Authentication → Settings → Authorized domains:

- [ ] Agregar dominio Netlify:
  - Ejemplo: `yms-xxx.netlify.app`
  - Agregar también `localhost:5173` si testeas localmente

## Post-Deployment Testing ✅

En https://yms-xxx.netlify.app:

- [ ] Página carga (no blank screen)
- [ ] Login view aparece
- [ ] Login con admin funciona
- [ ] Dashboard carga
- [ ] Crear tarea funciona
- [ ] Abrir en incognito / otro navegador
- [ ] Verificar que datos vistos en ambos navegadores
- [ ] Cambios visibles en tiempo real

## Troubleshooting ✅

Si algo falla:

1. **Blank white screen**
   - Verificar Console (F12) para errores
   - Buscar "Firestore not initialized"
   - Verificar variables Firebase en Netlify

2. **Login fails with "User profile not found"**
   - Crear documento en Firestore `users/{uid}` manualmente
   - Verificar que tiene campos: nombre, email, rol, cd, activo

3. **Network error in Console**
   - Verificar VITE_FIREBASE_AUTH_DOMAIN en Netlify variables
   - Verificar que dominio Netlify está en Firebase Authorized domains

4. **Firestore rules block access**
   - Temporalmente reemplazar `firestore.rules` con contenido de `firestore.rules.simple`
   - Redeploy en Firebase Console
   - Verificar funcionalidad básica
   - Luego restaurar reglas con control de roles

## Seguridad Final ✅

- [ ] Nunca compartir credenciales Firebase en código
- [ ] .env.local en .gitignore
- [ ] CSP headers en netlify.toml están configurados
- [ ] Firestore rules están en modo restrictivo (no permita acceso global)
- [ ] Admin password es fuerte
- [ ] Dominio Netlify es el único en Firebase Authorized domains

---

**Cuando todo este ✅, la aplicación está lista para producción.**
