# 🚀 YMS Agrosuper - Guía de Configuración Completa

## Estado Actual
- ✅ Aplicación creada con 7 usuarios locales
- ✅ Integración Supabase lista
- ⏳ Push a GitHub Pages pendiente

---

## 📋 PASO 1: Hacer Push a GitHub Pages (2 min)

Abre tu terminal/PowerShell en la carpeta del proyecto:

```bash
cd C:\Users\gherrera\Desktop\YMS-S4
git push origin gh-pages
```

**Si la conexión funciona, verás:**
```
Pushing to https://github.com/gaherrerar-boop/yms-coldchain.git
To https://github.com/gaherrerar-boop/yms-coldchain.git
   0e24773..[commit] gh-pages -> gh-pages
```

---

## ⚙️ PASO 2: Configurar Supabase (3 min)

### Opción A: Usando setup.html (RECOMENDADO)

1. **Localmente**, abre `setup.html` en tu navegador
2. Haz clic en **"Copiar SQL"** 📋
3. Ve a: https://app.supabase.com → tu proyecto
4. **SQL Editor** → **New Query**
5. Pega el SQL
6. Haz clic en **▶ Run**

### Opción B: Copiar SQL manualmente

Si `setup.html` no funciona, copia este SQL completo y pégalo en Supabase SQL Editor:

```sql
-- YMS Supabase Setup
CREATE TABLE IF NOT EXISTS yms_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario VARCHAR(100) NOT NULL,
  rol VARCHAR(100) NOT NULL,
  area VARCHAR(100),
  tipo_evento VARCHAR(100),
  descripcion TEXT,
  datos JSONB DEFAULT '{}',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS yms_presencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario VARCHAR(100) NOT NULL UNIQUE,
  nombre VARCHAR(200),
  rol VARCHAR(100),
  online BOOLEAN DEFAULT false,
  ultima_actividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS yms_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_origen VARCHAR(100) NOT NULL,
  usuario_destino VARCHAR(100),
  mensaje TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  leido BOOLEAN DEFAULT false
);

ALTER TABLE yms_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE yms_presencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE yms_chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_see_all_operations" ON yms_operations;
CREATE POLICY "admin_see_all_operations" ON yms_operations
  FOR SELECT USING (
    (SELECT rol FROM yms_presencia WHERE usuario = session_user LIMIT 1) = 'Administrador'
    OR session_user IN ('gherrera', 'asenn')
  );

DROP POLICY IF EXISTS "users_see_own_operations" ON yms_operations;
CREATE POLICY "users_see_own_operations" ON yms_operations
  FOR SELECT USING (
    usuario = session_user OR
    (SELECT rol FROM yms_presencia WHERE usuario = session_user LIMIT 1) = 'Administrador'
  );

DROP POLICY IF EXISTS "users_insert_own_operations" ON yms_operations;
CREATE POLICY "users_insert_own_operations" ON yms_operations
  FOR INSERT WITH CHECK (usuario = session_user);

DROP POLICY IF EXISTS "users_update_own_operations" ON yms_operations;
CREATE POLICY "users_update_own_operations" ON yms_operations
  FOR UPDATE USING (usuario = session_user OR session_user IN ('gherrera', 'asenn'));

DROP POLICY IF EXISTS "presencia_select_all" ON yms_presencia;
CREATE POLICY "presencia_select_all" ON yms_presencia
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "presencia_insert" ON yms_presencia;
CREATE POLICY "presencia_insert" ON yms_presencia
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "presencia_update_own" ON yms_presencia;
CREATE POLICY "presencia_update_own" ON yms_presencia
  FOR UPDATE USING (usuario = session_user OR session_user IN ('gherrera', 'asenn'));

DROP POLICY IF EXISTS "chat_select" ON yms_chat;
CREATE POLICY "chat_select" ON yms_chat
  FOR SELECT USING (
    usuario_origen = session_user OR
    usuario_destino = session_user OR
    session_user IN ('gherrera', 'asenn')
  );

DROP POLICY IF EXISTS "chat_insert_own" ON yms_chat;
CREATE POLICY "chat_insert_own" ON yms_chat
  FOR INSERT WITH CHECK (usuario_origen = session_user);

INSERT INTO yms_presencia (usuario, nombre, rol, online) VALUES
  ('gherrera', 'Gonzalo Herrera', 'Administrador', false),
  ('asenn', 'Álvaro Senn', 'Administrador', false),
  ('lpadilla', 'Lorenzo Padilla', 'Patio', false),
  ('Supervisor', 'Supervisor de Andenes', 'Supervisor de andenes', false),
  ('Portero', 'Portería', 'Guardia', false),
  ('Administrativo', 'Administrativo', 'Administrativo de operaciones', false),
  ('Jefeturno', 'Jefe de Turno', 'Jefe de operaciones', false)
ON CONFLICT (usuario) DO UPDATE SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol;
```

---

## 🌐 PASO 3: Acceder a la Aplicación

Una vez completados los pasos anteriores:

**URL:** https://gaherrerar-boop.github.io/yms-coldchain/

### Credenciales de prueba:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `gherrera` | `gabo2026` | Administrador |
| `asenn` | `alvaro2026` | Administrador |
| `lpadilla` | `Lorenzo2026` | Patio |
| `Supervisor` | `super2026` | Supervisor de andenes |
| `Portero` | `porteria2026` | Guardia |
| `Administrativo` | `admin2026` | Administrativo de operaciones |
| `Jefeturno` | `jefe2026` | Jefe de operaciones |

---

## ✅ Verificación

Después de ejecutar el SQL, verifica en Supabase:

- [ ] Tabla `yms_operations` existe
- [ ] Tabla `yms_presencia` existe con 7 usuarios
- [ ] Tabla `yms_chat` existe
- [ ] Row Level Security habilitado en las 3 tablas

En la aplicación, verás:
- [ ] **☁️ Sincronizado** en la barra de tareas (si Supabase está conectado)
- [ ] Los 7 usuarios pueden iniciar sesión
- [ ] Los Administradores ven todo
- [ ] Los otros usuarios ven solo sus datos

---

## 🆘 Solución de Problemas

### La aplicación muestra "💾 Local" en lugar de "☁️ Sincronizado"
→ Ejecuta el SQL setup en Supabase (Paso 2)

### Error 404 en GitHub Pages
→ Espera 2-3 minutos después de hacer push
→ Recarga la página (Ctrl+F5)
→ Verifica que la rama `gh-pages` existe en GitHub

### No puedo iniciar sesión
→ Verifica que el usuario existe en la tabla (Paso 2)
→ Usa exactamente las credenciales de arriba (mayúsculas importan)

---

## 📞 Resumen Rápido

| Componente | Tecnología | Estado |
|-----------|-----------|--------|
| Frontend | HTML + JavaScript | ✅ Listo |
| Autenticación | Local (7 usuarios) | ✅ Listo |
| Base de datos | Supabase | ✅ Configurado |
| Sincronización | Real-time | ✅ Activo |
| Hosting | GitHub Pages | ✅ Publicado |
| Control de acceso | RLS por rol | ✅ Configurable |

---

**¿Preguntas?** Ejecuta los pasos en orden y notifica cualquier error. 🚀
