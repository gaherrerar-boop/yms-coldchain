# 📦 YMS Agrosuper - Módulos Disponibles

## 📍 Ubicación
Todos los módulos están en la carpeta `/modules/`

---

## 🔧 Módulos Core

### **app.js** (5.2 KB)
Punto de entrada principal de la aplicación. Inicializa el estado y los listeners.

### **auth.js** (4.4 KB)
Gestión de autenticación con Firebase Auth. Login, logout, validación de sesión.

### **state.js** (3.3 KB)
Gestión del estado global de la aplicación. Almacena usuario, perfil y datos.

### **firebase.js** (4.4 KB)
Inicialización y configuración de Firebase.

### **supabase-adapter.js** (2.5 KB)
Adaptador para conectar con Supabase (alternativa a Firebase).

---

## 🗄️ Base de Datos

### **db.js** (4.1 KB)
Capa de abstracción para acceso a base de datos.

### **firestore.js** (9.1 KB)
Operaciones directas con Firestore (CRUD).

### **realtime.js** (7.2 KB)
Listeners para sincronización en tiempo real.

---

## 👥 Usuarios y Seguridad

### **roles.js** (2.5 KB)
Definición de roles y permisos. Control de acceso.

### **presence.js** (1.9 KB)
Gestión de presencia en línea de usuarios.

---

## 📚 Repositorios (Data Access)

### **repositories/userRepository.js**
Operaciones CRUD para usuarios.

### **repositories/taskRepository.js**
Gestión de tareas operacionales.

### **repositories/auditRepository.js**
Historial de auditoría y eventos.

### **repositories/chatRepository.js**
Mensajes y comunicaciones.

### **repositories/presenceRepository.js**
Presencia y estado en línea.

### **repositories/dockRepository.js**
Gestión de andenes (dock).

### **repositories/visitRepository.js**
Registro de visitas.

---

## 🎯 Servicios (Business Logic)

### **services/authService.js**
Lógica de autenticación avanzada.

### **services/taskService.js**
Lógica de negocio para tareas.

### **services/presenceService.js**
Lógica de presencia en línea.

### **services/auditService.js**
Registro y auditoría de eventos.

### **services/dockService.js**
Lógica de operaciones de andenes.

### **services/visitService.js**
Gestión de visitas.

---

## 🎨 UI y Notificaciones

### **ui.js** (406 KB)
Componentes visuales y renderización de la interfaz.

### **notifications.js** (933 B)
Sistema de notificaciones y alertas.

---

## ⚙️ Configuración

### **constants.js** (1.9 KB)
Constantes y configuraciones globales.

### **main.js** (555 B)
Punto de entrada alternativo.

---

## 📊 Resumen

| Categoría | Cantidad | Tamaño |
|-----------|----------|--------|
| Core | 5 | 23.7 KB |
| Base de Datos | 3 | 20.4 KB |
| Usuarios/Seguridad | 2 | 4.4 KB |
| Repositorios | 7 | ~45 KB |
| Servicios | 6 | ~35 KB |
| UI | 2 | 407 KB |
| **Total** | **28** | **~535 KB** |

---

## 🚀 Cómo Usar

1. **Desde GitHub Pages:**
   ```
   https://gaherrerar-boop.github.io/yms-coldchain/modules/
   ```

2. **Localmente:**
   ```
   C:\Users\gherrera\Desktop\YMS-S4\modules\
   ```

3. **Importar en tu proyecto:**
   ```javascript
   import { functionName } from './modules/nombrearchivo.js';
   ```

---

## 📝 Dependencias

- Firebase 11.1.0
- Supabase JS 2.38.4
- Browser API nativa (localStorage, fetch, etc.)

---

**Generado:** Junio 2026  
**Estado:** Producción  
**URL Pública:** https://gaherrerar-boop.github.io/yms-coldchain/
