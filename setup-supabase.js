#!/usr/bin/env node

/**
 * Script de configuración de Supabase para YMS
 * Crea tablas y configura RLS automáticamente
 *
 * Uso: node setup-supabase.js
 */

const https = require('https');

const config = {
  projectUrl: 'https://puhifcigfsmsnqytdlhb.supabase.co',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1aGlmY2lnZnNtc25xeXRkbGhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMyNzc3MSwiZXhwIjoyMDk1OTAzNzcxfQ.aTUIm2nDmwjeSeFYMPxRKWhyEWvcSmsG9gccdCcgqp4'
};

// SQL para crear tablas e RLS
const setupSQL = `
-- Crear tabla principal de operaciones
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

-- Crear tabla de presencia
CREATE TABLE IF NOT EXISTS yms_presencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario VARCHAR(100) NOT NULL UNIQUE,
  nombre VARCHAR(200),
  rol VARCHAR(100),
  online BOOLEAN DEFAULT false,
  ultima_actividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de chat
CREATE TABLE IF NOT EXISTS yms_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_origen VARCHAR(100) NOT NULL,
  usuario_destino VARCHAR(100),
  mensaje TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  leido BOOLEAN DEFAULT false
);

-- Habilitar RLS
ALTER TABLE yms_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE yms_presencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE yms_chat ENABLE ROW LEVEL SECURITY;

-- POLÍTICA: Administradores ven todo
DROP POLICY IF EXISTS "admin_see_all_operations" ON yms_operations;
CREATE POLICY "admin_see_all_operations" ON yms_operations
  FOR SELECT USING (
    (SELECT rol FROM yms_presencia WHERE usuario = session_user LIMIT 1) = 'Administrador'
    OR session_user IN ('gherrera', 'asenn')
  );

-- POLÍTICA: Otros usuarios ven solo sus propios datos
DROP POLICY IF EXISTS "users_see_own_operations" ON yms_operations;
CREATE POLICY "users_see_own_operations" ON yms_operations
  FOR SELECT USING (
    usuario = session_user OR
    (SELECT rol FROM yms_presencia WHERE usuario = session_user LIMIT 1) = 'Administrador'
  );

-- POLÍTICA: Todos pueden escribir sus propios datos
DROP POLICY IF EXISTS "users_insert_own_operations" ON yms_operations;
CREATE POLICY "users_insert_own_operations" ON yms_operations
  FOR INSERT WITH CHECK (usuario = session_user);

-- POLÍTICA: Todos pueden actualizar sus propios datos
DROP POLICY IF EXISTS "users_update_own_operations" ON yms_operations;
CREATE POLICY "users_update_own_operations" ON yms_operations
  FOR UPDATE USING (usuario = session_user OR session_user IN ('gherrera', 'asenn'));

-- RLS para presencia (todos ven, cada uno edita el suyo)
DROP POLICY IF EXISTS "presencia_select_all" ON yms_presencia;
CREATE POLICY "presencia_select_all" ON yms_presencia
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "presencia_update_own" ON yms_presencia;
CREATE POLICY "presencia_update_own" ON yms_presencia
  FOR UPDATE USING (usuario = session_user OR session_user IN ('gherrera', 'asenn'));

DROP POLICY IF EXISTS "presencia_insert" ON yms_presencia;
CREATE POLICY "presencia_insert" ON yms_presencia
  FOR INSERT WITH CHECK (true);

-- RLS para chat
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
`;

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'puhifcigfsmsnqytdlhb.supabase.co',
      path: '/rest/v1/rpc/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${config.serviceRoleKey}`,
        'apikey': config.serviceRoleKey
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: responseData });
        } else {
          reject({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function setup() {
  console.log('🔧 Iniciando configuración de Supabase para YMS...\n');

  try {
    console.log('📊 Creando tablas y configurando RLS...');
    const result = await executeSQL(setupSQL);
    console.log('✅ Tablas creadas exitosamente\n');

    // Insertar usuarios en la tabla de presencia
    console.log('👥 Registrando usuarios...');
    const users = [
      { username: 'gherrera', nombre: 'Gonzalo Herrera', rol: 'Administrador' },
      { username: 'asenn', nombre: 'Álvaro Senn', rol: 'Administrador' },
      { username: 'lpadilla', nombre: 'Lorenzo Padilla', rol: 'Patio' },
      { username: 'Supervisor', nombre: 'Supervisor de Andenes', rol: 'Supervisor de andenes' },
      { username: 'Portero', nombre: 'Portería', rol: 'Guardia' },
      { username: 'Administrativo', nombre: 'Administrativo', rol: 'Administrativo de operaciones' },
      { username: 'Jefeturno', nombre: 'Jefe de Turno', rol: 'Jefe de operaciones' }
    ];

    for (const user of users) {
      const insertSQL = `
        INSERT INTO yms_presencia (usuario, nombre, rol, online)
        VALUES ('${user.username}', '${user.nombre}', '${user.rol}', false)
        ON CONFLICT (usuario) DO UPDATE SET nombre = '${user.nombre}', rol = '${user.rol}'
      `;
      await executeSQL(insertSQL);
      console.log(`  ✓ ${user.nombre}`);
    }

    console.log('\n✅ ¡Configuración completada exitosamente!');
    console.log('\n📋 Tablas creadas:');
    console.log('  • yms_operations - Registro de operaciones');
    console.log('  • yms_presencia - Estado de usuarios');
    console.log('  • yms_chat - Mensajes entre usuarios');
    console.log('\n🔒 Row Level Security configurado:');
    console.log('  • Administradores: Ven todo');
    console.log('  • Otros usuarios: Ven solo sus datos');
    console.log('\n✨ La aplicación está lista para sincronización en tiempo real');

  } catch (error) {
    console.error('❌ Error en configuración:', error.data || error.message);
    process.exit(1);
  }
}

setup();
