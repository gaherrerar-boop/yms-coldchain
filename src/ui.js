// UI Module â€” Render functions with Firebase Service layer
import * as taskService from './services/taskService.js';
import * as dockService from './services/dockService.js';
import * as visitService from './services/visitService.js';
import * as auditService from './services/auditService.js';
import { STATE } from './state.js';

// Helper: Update element content
function set(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`[YMS UI] Element #${elementId} not found`);
    return;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    el.textContent = value;
  } else {
    el.innerHTML = value;
  }
}

// Helper: Show alert
window.showAlert = function(type, message) {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // TODO: mostrar alerta visual en UI
  const alertEl = document.createElement('div');
  alertEl.className = `alert alert-${type}`;
  alertEl.textContent = message;
  document.body.appendChild(alertEl);
  setTimeout(() => alertEl.remove(), 3000);
};

// Helper: Switch view
window.switchView = function(viewName) {
  STATE.currentView = viewName;
  renderAll();
};

/**
 * Render Tareas
 */
window.renderTareas = function() {
  // TODO: actualizar DOM con STATE.tasks
};

/**
 * Render Andenes
 */
window.renderAndenes = function() {
  // TODO: actualizar DOM con STATE.docks
};

/**
 * Render Visitas
 */
window.renderVisitas = function() {
  // TODO: actualizar DOM con STATE.visits
};

/**
 * Render Chat
 */
window.renderChat = function() {
  // TODO: actualizar DOM con STATE.chatMessages
};

/**
 * Render Presencia
 */
window.renderPresence = function() {
  // TODO: actualizar DOM con STATE.presence
};

/**
 * Render Audit Log
 */
window.renderAuditLog = function() {
  // TODO: actualizar DOM con STATE.auditLog
};

// ... MÃS FUNCIONES DE RENDER SEGÃšN NECESITES
function renderAll() {
  initPlayaConCarriers();
  renderDashboard(); // siempre actualizar KPIs/dashboard
  renderPresence();  // siempre actualizar presencia en header
  // Solo renderizar la vista activa para evitar trabajo innecesario y queries extra
  switch (STATE.currentView) {
    case 'alertas':      renderAlertas();      break;
    case 'guardia':      renderGuardia();      break;
    case 'andenes':      renderAndenes();      break;
    case 'patio':        if(_patioActiveTab==='carros'){renderCarros();renderVisionGeneral();}else{renderPatio();} break;
    case 'turno':        renderTurno();        break;
    case 'tareas':       renderTareas();       break;
    case 'citas':        renderCitas();        break;
    case 'devoluciones': renderDevoluciones(); break;
    case 'config':       renderConfig();       break;
    case 'chat':         renderChat();         break;
    case 'auditoria':    loadAudit();          break;
    case 'wave':         renderWave();         break;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  DASHBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderDashboard() {
  console.log('[TEST] === DASHBOARD RENDER TEST ===');

  // DIAGNÓSTICO DOM
  console.log('[TEST] Body innerHTML length:', document.body.innerHTML.length);
  console.log('[TEST] View containers found:', document.querySelectorAll('.view').length);
  console.log('[TEST] Active view:', document.querySelector('.view.active')?.id);

  const container = document.getElementById('view-dashboard');
  console.log('[TEST] Container #view-dashboard:', !!container);

  if (!container) {
    console.error('[TEST] CRITICAL: #view-dashboard does not exist!');
    console.log('[TEST] All elements with id starting with "view":',
      [...document.querySelectorAll('[id^="view"]')].map(v => ({
        id: v.id,
        display: getComputedStyle(v).display,
        classes: v.className
      })));
    return;
  }

  // DIAGNÓSTICO CONTENEDOR
  console.log('[TEST] Container CSS:', {
    display: getComputedStyle(container).display,
    visibility: getComputedStyle(container).visibility,
    opacity: getComputedStyle(container).opacity,
    width: container.offsetWidth,
    height: container.offsetHeight,
    classes: container.className
  });

  // PRUEBA VISUAL FORZADA CON BORDE ROJO
  console.log('[TEST] Inserting red border test...');
  container.innerHTML = `
    <div style="padding:30px;background:white;color:#111;border:5px solid red;min-height:300px;font-size:18px;font-weight:bold;">
      <h1>🔴 DASHBOARD RENDER TEST</h1>
      <p>Si esto NO se ve con borde rojo, el problema es CSS/layout/visibilidad.</p>
      <p>Si ves esto, el contenedor funciona.</p>
    </div>
  `;

  // Esperar a que el navegador renderice, luego proceder
  setTimeout(() => {
    console.log('[TEST] After render - container height:', container.offsetHeight);
    console.log('[TEST] After render - container innerHTML:', container.innerHTML.substring(0, 200));

    // Si la prueba se ve, proceder con render real
    try {
      updateKPIs();
      renderDockMap('dock-map-dash');
      renderQueueDash();
      renderTaskDash();
      renderAlertsDash();
      console.log('[TEST] Real dashboard rendered');
    } catch(e) {
      console.error('[TEST] Dashboard render error:', e);
    }
  }, 100);
}

function updateKPIs() {
  const free  = (STATE.docks || []).filter(d => d.estado === 'free').length;
  const total = (STATE.docks || []).length;
  const queue = (STATE.queueTickets || []).filter(t => t.estado === 'esperando' || t.estado === 'llamado').length;
  const trucks= (STATE.visits || []).filter(v => v.estado !== 'salida').length;
  const tasks = (STATE.tasks || []).filter(t => ['pendiente','ofertada'].includes(t.estado)).length;
  const online= (STATE.presence || []).filter(p => p.online).length;

  set('kpi-docks-free', free);
  set('kpi-docks-total', total);
  set('kpi-queue', queue);
  set('kpi-trucks', trucks);
  set('kpi-tasks', tasks);
  // kpi-alerts es calculado exclusivamente por renderAlertsDash() para incluir todos los tipos de alerta
  set('kpi-online', online);
  set('dock-count-hdr', `${free}/${total} LIBRES`);
  set('queue-count-hdr', queue);
  set('task-count-hdr', (STATE.tasks || []).length);

  // Dwell promedio
  const finished = (STATE.visits || []).filter(v => v.dwell_minutes);
  const dwell = finished.length ? Math.round(finished.reduce((s,v) => s + v.dwell_minutes, 0) / finished.length) : 0;
  set('kpi-dwell', dwell || 'â€”');
  set('kpi-entries', (STATE.visits || []).length);
}

function renderDockMap(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = '';
  (STATE.docks || []).forEach(d => {
    const visit   = (STATE.visits || []).find(v => v.dock_id === d.id || v.id === d.truck_id);
    const elapsed = d.inicio_ocupacion
      ? Math.round((Date.now() - new Date(d.inicio_ocupacion)) / 60000) : 0;
    const maxT  = d.max_tiempo || STATE.params?.dwell_max || 180;
    const pct   = d.estado === 'busy' ? Math.min(100, Math.round(elapsed / maxT * 100)) : 0;
    const barColor = pct > 85 ? 'var(--c-err)' : pct > 60 ? 'var(--c-warn)' : 'var(--c-ok)';
    const elapsedColor = pct > 85 ? 'var(--c-err)' : pct > 60 ? 'var(--c-warn)' : 'var(--tx-muted)';
    const patente = visit?.patente || (d.estado === 'busy' ? 'â€”' : '');
    const tile = document.createElement('div');
    tile.className = `dock-tile ${d.estado}`;
    tile.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="dt-code">${d.codigo}</div>
        <span class="badge badge-${d.estado === 'free' ? 'ok' : d.estado === 'busy' ? 'warn' : 'err'}" style="font-size:8px;padding:2px 5px;">${d.estado === 'free' ? 'LIBRE' : d.estado === 'busy' ? 'OCUP.' : 'BLOQ.'}</span>
      </div>
      <div class="dt-type">${(d.tipo||'').toUpperCase()} · ${(d.operacion_permitida||'').toUpperCase()}</div>
      <div class="dt-truck" style="font-size:${patente ? '12px' : '10px'};color:${patente ? 'var(--tx-head)' : 'var(--tx-muted)'};">${patente || (d.estado === 'blocked' ? '⚠— BLOQUEADO' : 'LIBRE')}</div>
      ${d.estado === 'busy' ? `
      <div class="dt-bar"><div class="dt-bar-fill" style="width:${pct}%;background:${barColor};"></div></div>
      <div class="dt-elapsed" style="color:${elapsedColor};">${elapsed} min · ${pct}%</div>` : '<div></div>'}`;
    tile.onclick = () => selectDock(d);
    c.appendChild(tile);
  });
}

function getVisitByTruck(truckId) {
  return (STATE.visits || []).find(v => v.id === truckId || v.truck_id === truckId);
}

function renderQueueDash() {
  const c = document.getElementById('queue-dash');
  if (!c) return;
  const active = (STATE.queueTickets || []).filter(t => ['esperando','llamado'].includes(t.estado));
  c.innerHTML = active.length ? '' : '<span class="c-dim fz10">Cola vacía</span>';
  active.forEach((t, i) => {
    const elapsed = Math.round((Date.now() - new Date(t.hora_creacion)) / 60000);
    const urgent = elapsed > (STATE.params?.sla_max || 60);
    c.innerHTML += `
      <div class="queue-item ${urgent ? 'urgent' : ''}">
        <div class="qi-pos">${i+1}</div>
        <div class="qi-data">
          <div class="qi-truck">${t.patente || 'â€”'}</div>
          <div class="qi-sub">${t.tipo_operacion?.replace(/_/g,' ').toUpperCase() || ''}</div>
        </div>
        <div class="qi-wait">
          <div class="qi-min">${elapsed}</div>
          <div class="qi-label">MIN</div>
        </div>
        ${urgent ? '<span class="badge badge b-err">⚠  SLA</span>' : ''}
      </div>`;
  });
  set('queue-active-count', active.length);
}

function renderTaskDash() {
  const tbody = document.getElementById('task-tbl-dash');
  if (!tbody) return;
  tbody.innerHTML = '';
  (STATE.tasks || []).slice(0, 8).forEach(t => {
    const stMap = {
      pendiente: 'warn', ofertada: 'info', aceptada: 'ok',
      en_ejecucion: 'ok', completada: 'dim', rechazada: 'err', vencida: 'err',
    };
    tbody.innerHTML += `<tr>
      <td class="c-dim">${t.id?.slice(-6) || 'â€”'}</td>
      <td>${t.tipo?.replace(/_/g,' ') || ''}</td>
      <td><span class="badge badge-${stMap[t.estado] || 'gray'}">${t.estado?.toUpperCase()}</span></td>
      <td class="c-dim">${t.operador_nombre || 'â€”'}</td>
    </tr>`;
  });
}

function renderAlertsDash() {
  const c = document.getElementById('alerts-dash');
  if (!c) return;
  const alerts = [];
  (STATE.queueTickets || []).forEach(t => {
    const min = Math.round((Date.now() - new Date(t.hora_creacion)) / 60000);
    if (min > STATE.params.sla_max) {
      alerts.push({ type: 'err', msg: `⚠  Cola SLA: ${t.patente} lleva ${min} min esperando andén` });
    }
  });
  (STATE.tasks || []).forEach(t => {
    if (t.estado === 'vencida') alerts.push({ type: 'err', msg: `⚠  Tarea vencida: ${t.tipo?.replace(/_/g,' ')} â€” ${t.patente}` });
  });
  if (alerts.length === 0) {
    c.innerHTML = '<span class="c-ok fz10">âœ“ Sin alertas activas</span>';
    set('kpi-alerts', 0);
    return;
  }
  set('kpi-alerts', alerts.length);
  c.innerHTML = alerts.map(a =>
    `<div style="color:var(--c-${a.type});padding:3px 0;border-bottom:1px solid var(--border);font-size: 8px;">${a.msg}</div>`
  ).join('');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  GUARDIA â€” CONTROL DE ACCESO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderGuardia() {
  initGuardiaEventDelegation();
  const isMobile = document.body.getAttribute('data-mobile') === 'true';
  const dh = document.getElementById('guardia-desktop-hdr');
  const mh = document.getElementById('guardia-mobile-hdr');
  const dm = document.getElementById('guard-date-mobile');
  if (dh) dh.style.display = isMobile ? 'none' : '';
  if (mh) mh.style.display = isMobile ? 'block' : 'none';
  if (dm) dm.textContent   = new Date().toLocaleDateString('es-CL', {weekday:'long', day:'2-digit', month:'long'}).toUpperCase();

  const tbody = document.getElementById('guard-trucks-tbl');
  if (!tbody) return;
  tbody.innerHTML = '';
  const active = (STATE.visits || []).filter(v => v.estado !== 'salida');
  active.forEach(v => {
    const elapsed = Math.round((Date.now() - new Date(v.hora_ingreso)) / 60000);
    const exceded = elapsed > (STATE.params?.dwell_max || 180);
    tbody.innerHTML += `<tr>
      <td class="c-bright fw">${Utils.esc(v.patente)}</td>
      <td><span class="badge badge-${v.tipo === 'primaria' ? 'info' : 'warn'}">${Utils.esc(v.tipo?.toUpperCase())}</span></td>
      <td class="c-dim">${Utils.esc(v.planta_nombre || v.numero_ruta || 'â€”')}</td>
      <td class="c-dim">${Utils.esc(v.carrier_nombre || 'â€”')}</td>
      <td class="c-dim">${fmtTime(v.hora_ingreso)}</td>
      <td>${Utils.esc(v.zona_actual?.replace(/_/g,' ').toUpperCase() || 'â€”')}</td>
      <td class="${exceded ? 'c-err' : elapsed > (STATE.params?.dwell_max || 180)*0.75 ? 'c-warn' : 'c-ok'}">${elapsed} min</td>
      <td><span class="badge badge-${v.estado === 'en_anden' ? 'warn' : 'ok'}">${Utils.esc(v.estado?.replace(/_/g,' ').toUpperCase())}</span></td>
      <td>
        <button class="btn btn-err" style="font-size:10px;padding:2px 6px;" data-action="openSalida" data-id="${v.id}">SALIDA</button>
      </td>
    </tr>`;
  });
  if (active.length === 0) tbody.innerHTML = '<tr><td colspan="9" class="c-dim tc">Sin camiones en patio</td></tr>';
}

let currentIngresoTipo = 'primaria';

function openIngreso() {
  document.getElementById('modal-ingreso').style.display = 'flex';
  document.getElementById('ing-hora').value = new Date().toLocaleTimeString('es-CL');
  setTipoIngreso('primaria');
  fillCarriersSelect('ing-carrier');
  fillPlantsSelect('ing-planta');
  fillSecundariaCarriers();
  // Reset devolución
  const cbDev = document.getElementById('ing2-tiene-devolucion');
  if (cbDev) { cbDev.checked = false; toggleDevolucionSecundaria(); }
  document.getElementById('ing-andén-info').textContent = '';
}

function setTipoIngreso(tipo) {
  currentIngresoTipo = tipo;
  document.getElementById('form-primaria').style.display = tipo === 'primaria' ? '' : 'none';
  document.getElementById('form-secundaria').style.display = tipo === 'secundaria' ? '' : 'none';
  document.getElementById('btn-tipo-primaria').className = 'btn' + (tipo === 'primaria' ? ' btn-ok' : '');
  document.getElementById('btn-tipo-secundaria').className = 'btn' + (tipo === 'secundaria' ? ' btn-ok' : '');
}

function fillCarriersSelect(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = '<option value="">â€” Seleccionar â€”</option>';
  (STATE.carriers || []).forEach(c => sel.innerHTML += `<option value="${Utils.esc(c.id)}" data-nombre="${Utils.esc(c.nombre || '')}" data-codigo="${Utils.esc(c.codigo || '')}">${Utils.esc(c.nombre)}</option>`);
}

function fillPlantsSelect(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = '<option value="">â€” Seleccionar â€”</option>';
  (STATE.plants || []).forEach(p => sel.innerHTML += `<option value="${Utils.esc(p.id)}">${Utils.esc(p.nombre)}</option>`);
}

function buscarAndenCompatible(tipoIngreso, tipoCarga) {
  // Retorna andén libre compatible por tipo térmico y operación.
  const operacion = tipoIngreso === 'secundaria' ? 'carga' : 'descarga';
  const requiereFrio = ['congelado','refrigerado','mixto'].includes(tipoCarga);
  return (STATE.docks || []).find(d => {
    if (d.estado !== 'free') return false;
    // 'mixta' y 'descarga_carga' son compatibles con cualquier operación
    if (d.operacion_permitida && d.operacion_permitida !== operacion &&
        d.operacion_permitida !== 'mixta' && d.operacion_permitida !== 'descarga_carga') return false;
    if (requiereFrio && d.tipo === 'seco') return false;
    if (!requiereFrio && d.tipo === 'frigorifico') return false;
    return true;
  });
}

function buscarRetorno() {
  const patente = (document.getElementById('ing2-patente')?.value || '').trim().toUpperCase();
  const info    = document.getElementById('retorno-info');
  const btnPall = document.getElementById('retorno-pallet-btn');
  if (patente.length < 4) { if(info) info.style.display='none'; if(btnPall) btnPall.style.display='none'; return; }

  const carrier = (STATE.carriers || []).find(x => x.codigo === patente);
  const deuda = STATE.palletDeuda[patente];
  const ultimaCarga = deuda?.historial?.filter(h => h.tipo === 'carga').slice(-1)[0];
  const auth = (STATE.returns || []).find(r => r.patente?.toUpperCase() === patente && r.estado === 'aprobada');

  // Buscar historial de visitas del camión
  const visitas = (STATE.visits || []).filter(v => v.patente === patente);
  const ultimaVisita = visitas.slice(-1)[0];

  if(info) info.style.display = '';
  let html = '';

  // Encabezado: datos del transportista
  if (carrier) {
    html += '<div style="background:var(--bg-alt);padding:10px;border-left:4px solid var(--c-accent);margin-bottom:10px;border-radius:4px;">';
    html += '<strong style="color:var(--tx-head);font-size: 10px;">ðŸš› ' + carrier.nombre + '</strong><br>';
    html += '<span style="color:var(--tx-muted);font-size: 8px;">Ruta: <strong>' + (carrier.numero_ruta||'â€”') + '</strong> · Teléfono: ' + (carrier.telefono||'â€”') + '</span>';
    html += '</div>';
  }

  // Historial de carga
  if (ultimaCarga) {
    html += '<div style="background:rgba(249,115,22,0.08);padding:8px;border-left:3px solid var(--c-warn);margin-bottom:8px;border-radius:3px;">';
    html += '<span style="color:var(--tx-head);font-weight:600;font-size: 9px;">ðŸ“¦ ÃšLTIMA CARGA</span><br>';
    html += '<span style="font-size: 8px;">Pallets: <strong>' + ultimaCarga.pallets + '</strong> · Sello: <strong>' + ultimaCarga.sello + '</strong></span>';
    if (ultimaCarga.hora) {
      const hace = Math.round((Date.now() - new Date(ultimaCarga.hora)) / 60000);
      html += '<br><span style="color:var(--tx-muted);font-size:10px;">Hace ' + (hace > 60 ? Math.round(hace/60) + ' horas' : hace + ' min') + '</span>';
    }
    html += '</div>';
  }

  // Estado de deuda de pallets
  if (deuda && ultimaCarga) {
    if (deuda.deuda !== 0) {
      const esDeuda = deuda.deuda < 0;
      const color = esDeuda ? 'var(--c-err)' : 'var(--c-ok)';
      html += '<div style="background:' + (esDeuda ? 'rgba(220,38,38,0.08)' : 'rgba(14,158,109,0.08)') + ';padding:8px;border-left:3px solid ' + color + ';margin-bottom:8px;border-radius:3px;">';
      html += '<span style="color:' + color + ';font-weight:600;font-size: 9px;">' + (esDeuda ? '⚠  DEUDA' : 'âœ“ CRÃ‰DITO') + '</span><br>';
      html += '<span style="font-size: 8px;">' + (esDeuda ? 'Debe: ' + Math.abs(deuda.deuda) + ' pallets' : 'Disponible: ' + deuda.deuda + ' pallets') + '</span>';
      html += '</div>';
    } else {
      html += '<div style="background:rgba(14,158,109,0.08);padding:8px;border-left:3px solid var(--c-ok);border-radius:3px;margin-bottom:8px;">';
      html += '<span style="color:var(--c-ok);font-size: 8px;">âœ“ Sin deuda de pallets</span></div>';
    }
    if(btnPall) btnPall.style.display = '';
  } else {
    if(btnPall) btnPall.style.display = 'none';
  }

  // Devolución aprobada
  if (auth) {
    html += '<div style="background:rgba(14,158,109,0.10);padding:8px;border-left:3px solid var(--c-ok);margin-bottom:8px;border-radius:3px;">';
    html += '<span style="color:var(--c-ok);font-weight:600;font-size: 9px;">âœ“ DEVOLUCIÃ“N AUTORIZADA</span><br>';
    html += '<span style="font-size: 8px;">Motivo: ' + (auth.motivo||'').replace(/_/g,' ') + ' · Pallets: <strong>' + auth.pallets_devolucion + '</strong></span>';
    html += '</div>';
  }

  // Historial de visitas
  if (visitas.length > 0) {
    html += '<div style="font-size:10px;color:var(--tx-muted);margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">';
    html += '<strong>Historial: ' + visitas.length + ' visita' + (visitas.length !== 1 ? 's' : '') + '</strong><br>';
    visitas.slice(-3).reverse().forEach(v => {
      const horaEntrada = v.hora_ingreso ? new Date(v.hora_ingreso).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'}) : 'â€”';
      html += 'â€¢ ' + horaEntrada + ' â†’ ' + (v.zona_actual || v.estado) + '<br>';
    });
    html += '</div>';
  }

  if (!html || html.length === 0) {
    html = '<span style="color:var(--tx-dim);font-size: 8px;">⚠  Sin registros previos para ' + patente + '</span>';
  }

  if(info) info.innerHTML = html;
}

async function confirmarIngreso() {
  const tipo = currentIngresoTipo;
  let patente, carrierId, plantaId, guia, precinto, obs, routeNumero;

  if (tipo === 'primaria') {
    patente   = document.getElementById('ing-patente').value.trim().toUpperCase();
    carrierId = document.getElementById('ing-carrier').value;
    plantaId  = document.getElementById('ing-planta').value;
    guia      = document.getElementById('ing-guia').value.trim();
    precinto  = document.getElementById('ing-precinto').value.trim();
    obs       = document.getElementById('ing-obs').value.trim();
    const faltIngreso = [];
    if (!patente) faltIngreso.push('Patente');
    if (!carrierId) faltIngreso.push('Empresa Transporte');
    if (!plantaId) faltIngreso.push('Planta Origen');
    if (faltIngreso.length) {
      Audio.play('error');
      notify('â›” Campos obligatorios faltantes: ' + faltIngreso.join(', '), 'error'); return;
    }
  } else {
    patente      = document.getElementById('ing2-patente').value.trim().toUpperCase();
    routeNumero  = document.getElementById('ing2-ruta').value.trim();
    obs          = document.getElementById('ing2-obs').value.trim();
    if (!patente) {
      Audio.play('error');
      notify('â›” La patente es obligatoria para registrar el ingreso', 'error'); return;
    }
    // Manejar devolución si aplica
    const tieneDevol = document.getElementById('ing2-tiene-devolucion')?.checked;
    if (tieneDevol) {
      const motivoDevol = document.getElementById('ing2-motivo-devol')?.value;
      const palletsDevol = parseInt(document.getElementById('ing2-pallets-devol')?.value) || 0;
      const comentDevol  = document.getElementById('ing2-comentario-devol')?.value?.trim();
      if (!comentDevol) {
        Audio.play('error');
        notify('â›” El comentario de devolución es obligatorio', 'error'); return;
      }
      if (palletsDevol < 1) {
        Audio.play('error');
        notify('â›” Indique la cantidad de pallets de devolución', 'error'); return;
      }
      // Crear solicitud de devolución
      const devRet = {
        id: 'ret' + Date.now(),
        numero_ruta: routeNumero,
        patente,
        estado: 'pendiente',
        motivo: motivoDevol,
        pallets_devolucion: palletsDevol,
        comentario: comentDevol,
        hora_solicitud: new Date().toISOString(),
        solicitado_por: STATE.profile?.id,
      };

      if (STATE.usingSeed) {
        STATE.returns.unshift(devRet);
        Audio.play('alert');
        notify('⚠  Devolución registrada â€” pendiente de autorización · ' + patente + ' · ' + palletsDevol + ' pallets', 'warn', 6000);
      } else {
        // Usar safeWrite para persistencia offline
        await safeWrite(
          async () => {
            const { data, error } = await sb.from('return_authorizations').insert({
              numero_ruta: routeNumero, patente, estado: 'pendiente',
              motivo: motivoDevol, pallets_devolucion: palletsDevol,
              comentario: comentDevol, solicitado_por: STATE.user?.id,
            }).select().single();
            if (error) throw error;
            return data;
          },
          // Optimistic
          () => STATE.returns.unshift(devRet),
          // Rollback
          () => { const idx = STATE.returns.indexOf(devRet); if (idx !== -1) STATE.returns.splice(idx, 1); }
        );
        Audio.play('alert');
        notify('⚠  Devolución registrada â€” pendiente de autorización · ' + patente + ' · ' + palletsDevol + ' pallets', 'warn', 6000);
      }

      obs = (obs ? obs + ' | ' : '') + 'DEVOLUCIÃ“N: ' + motivoDevol?.replace(/_/g,' ') + ' · ' + palletsDevol + ' pallets';
    }
  }

  // Validar temperatura cadena de frío (solo aplica a primaria; secundaria no tiene estos campos)
  const tempCabinaEl = tipo === 'primaria' ? document.getElementById('ing-temp-cabina') : null;
  const tempProdEl   = tipo === 'primaria' ? document.getElementById('ing-temp-producto') : null;
  const tipoCargaEl  = tipo === 'primaria' ? document.getElementById('ing-tipo-carga') : null;
  const tempCabina   = tempCabinaEl?.value === '' ? NaN : parseFloat(tempCabinaEl?.value);
  const tempProd     = tempProdEl?.value === '' ? NaN : parseFloat(tempProdEl?.value);
  const tipoCarga    = tipo === 'primaria' ? (tipoCargaEl?.value || 'refrigerado') : 'seco';
  
  if (tipo === 'primaria' && isNaN(tempCabina)) {
    notify('â›” Temperatura de cabina obligatoria (cadena de frío)', 'error');
    return;
  }
  
  // Validar rango sólo cuando existe temperatura; secundaria no debe bloquearse por campo oculto.
  let tempAlerta = false;
  if (!isNaN(tempCabina)) {
    if (tipoCarga === 'congelado' && tempCabina > -15) { tempAlerta = true; }
    if (tipoCarga === 'refrigerado' && (tempCabina < -2 || tempCabina > 6)) { tempAlerta = true; }
  }
  
  // Buscar andén disponible compatible con tipo de operación y carga.
  const andénLibre = buscarAndenCompatible(tipo, tipoCarga);
  const infoEl = document.getElementById('ing-andén-info');

  let visitId, dockId = null;

  if (STATE.usingSeed) {
    // Modo demo
    visitId = 'v' + Date.now();
    const newVisit = {
      id: visitId, patente, tipo, carrier_id: carrierId, planta_id: plantaId,
      numero_guia: guia, precinto, hora_ingreso: new Date().toISOString(),
      zona_actual: andénLibre ? 'anden' : 'espera_anden',
      dock_id: andénLibre?.id || null, estado: andénLibre ? 'en_anden' : 'en_patio',
      carrier_nombre: (STATE.carriers || []).find(c => c.id === carrierId || c.codigo === carrierId)?.nombre || document.getElementById('ing-carrier')?.selectedOptions?.[0]?.dataset?.nombre || document.getElementById('ing-carrier')?.selectedOptions?.[0]?.textContent || 'â€”',
      planta_nombre: (STATE.plants || []).find(p => p.id === plantaId)?.nombre || 'â€”',
      temp_cabina: isNaN(tempCabina) ? null : tempCabina,
      temp_producto: isNaN(tempProd) ? null : tempProd,
      tipo_carga: tipoCarga,
      temp_alerta: tempAlerta,
    };
    if (tempAlerta) {
      addAlert('P1', 'ðŸŒ¡ TEMPERATURA FUERA DE RANGO', 
        `${patente} / ${tipoCarga.toUpperCase()} â€” Cabina: ${tempCabina}Â°C`, visitId);
      Audio.play('alert');
    }
    STATE.visits.push(newVisit);
    if (andénLibre) {
      andénLibre.estado = 'busy';
      andénLibre.truck_id = visitId;
      andénLibre.inicio_ocupacion = new Date().toISOString();
    } else {
      STATE.queueTickets.push({
        id: 'q' + Date.now(), patente, tipo_operacion: 'descarga_frigorifico',
        prioridad: 5, estado: 'esperando', hora_creacion: new Date().toISOString(),
      });
    }
    STATE.auditLog.unshift({
      id: 'a' + Date.now(), categoria: 'gate',
      evento: tipo === 'primaria' ? 'INGRESO_PRIMARIA' : 'INGRESO_SECUNDARIA',
      detalle: `Patente ${patente} ingresó al patio`,
      user_nombre: STATE.profile.nombre,
      created_at: new Date().toISOString(),
    });
  } else {
    // Supabase â€” con manejo de errores y fallback local
    const visitData = {
      patente, tipo, carrier_id: carrierId || null, planta_id: plantaId || null,
      numero_guia: guia, precinto, hora_ingreso: new Date().toISOString(),
      zona_actual: andénLibre ? 'anden' : 'espera_anden',
      dock_id: andénLibre?.id || null,
      estado: andénLibre ? 'en_anden' : 'en_patio',
      site_id: STATE.currentSiteUUID || null,
      guardia_ingreso_id: STATE.user?.id,
      observaciones_ingreso: obs,
      temp_cabina: isNaN(tempCabina) ? null : tempCabina,
      temp_producto: isNaN(tempProd) ? null : tempProd,
      tipo_carga: tipoCarga,
      temp_alerta: tempAlerta,
    };
    if (tempAlerta) {
      addAlert('P1', 'ðŸŒ¡ TEMPERATURA FUERA DE RANGO',
        `${patente} / ${tipoCarga.toUpperCase()} â€” Cabina: ${tempCabina}Â°C`, null);
    }

    // Optimistic state local inmediato
    const localVisit = {
      id: 'v_local_' + Date.now(), ...visitData,
      carrier_nombre: (STATE.carriers || []).find(c => c.id === carrierId)?.nombre || 'â€”',
      planta_nombre: (STATE.plants || []).find(p => p.id === plantaId)?.nombre || 'â€”',
    };
    STATE.visits.push(localVisit);
    visitId = localVisit.id;
    if (andénLibre) {
      andénLibre.estado = 'busy';
      andénLibre.truck_id = localVisit.id;
      andénLibre.inicio_ocupacion = new Date().toISOString();
    }

    try {
      const { data: vData, error: vErr } = await sb.from('yard_visits').insert(visitData).select().single();
      if (vErr) throw vErr;
      // Reemplazar ID local con ID real
      const idx = (STATE.visits || []).findIndex(v => v.id === localVisit.id);
      if (idx >= 0 && vData) { STATE.visits[idx] = { ...STATE.visits[idx], ...vData }; }
      visitId = vData?.id || localVisit.id;

      if (andénLibre) {
        await sb.from('docks').update({
          estado: 'busy', truck_id: visitId, inicio_ocupacion: new Date().toISOString(),
        }).eq('id', andénLibre.id);
        await sb.from('dock_assignments').insert({
          dock_id: andénLibre.id, visit_id: visitId, tipo: 'automatica',
          asignado_por: STATE.user?.id,
        });
      } else {
        await sb.from('queue_tickets').insert({
          visit_id: visitId, patente, tipo_operacion: 'descarga_frigorifico',
          estado: 'esperando', prioridad: 5,
        });
      }
      await sb.from('gate_events').insert({
        visit_id: visitId, tipo: 'ingreso', patente, guardia_id: STATE.user?.id, notas: obs,
      });
      await auditLog('gate', tipo === 'primaria' ? 'INGRESO_PRIMARIA' : 'INGRESO_SECUNDARIA',
        `Patente ${patente} ingresó al patio`);
    } catch(e) {
      console.warn('[YMS] confirmarIngreso DB error:', e.message);
      // El registro ya está en STATE localmente â€” se sincronizará al reconectar
      _pendingOps.push(async () => {
        const { data: vData } = await sb.from('yard_visits').insert(visitData).select().single();
        if (vData && andénLibre) {
          await sb.from('docks').update({ estado: 'busy', truck_id: vData.id, inicio_ocupacion: new Date().toISOString() }).eq('id', andénLibre.id);
        }
      });
      scheduleReconnect();
    }
  }

  if (andénLibre) {
    infoEl.innerHTML = `âœ“ Andén <strong>${andénLibre.codigo}</strong> asignado automáticamente`;
    Audio.play('dock_free');
    notify(`Andén ${andénLibre.codigo} asignado a ${patente}`, 'ok');
  } else {
    infoEl.innerHTML = `â³ Sin andén disponible â€” Ticket generado en Turnomático. Enviar a zona espera.`;
    Audio.play('alert');
    notify(`${patente} en cola Turnomático â€” Sin andén disponible`, 'warn');
  }

  setTimeout(() => {
    closeModal('modal-ingreso');
    renderGuardia(); renderDashboard(); renderAndenes(); renderTurno();
  }, 1800);
}

function openSalida(visitId) {
  const sel = document.getElementById('sal-truck');
  sel.innerHTML = '<option value="">â€” Seleccionar â€”</option>';
  const active = (STATE.visits || []).filter(v => v.estado !== 'salida');
  active.forEach(v => {
    sel.innerHTML += `<option value="${Utils.esc(v.id)}" ${visitId === v.id ? 'selected' : ''}>${Utils.esc(v.patente)} â€” ${Utils.esc(v.carrier_nombre || '')}</option>`;
  });
  document.getElementById('sal-truck-info').textContent = '';
  document.getElementById('sal-dwell').textContent = '';
  document.getElementById('sal-historial').innerHTML = '';

  sel.onchange = () => {
    const v = (STATE.visits || []).find(x => x.id === sel.value);
    if (!v) return;
    const elapsed = Math.round((Date.now() - new Date(v.hora_ingreso)) / 60000);
    document.getElementById('sal-truck-info').innerHTML =
      `Patente: <strong>${v.patente}</strong> · Tipo: ${v.tipo} · Ingreso: ${fmtTime(v.hora_ingreso)} · Zona: ${v.zona_actual?.replace(/_/g,' ')}`;
    document.getElementById('sal-dwell').textContent = `Dwell time: ${elapsed} min`;

    // â”€â”€ Mostrar historial de movimientos del carro â”€â”€
    let historialHtml = '<div style="font-size: 8px;border-top:1px solid var(--border);margin-top:12px;padding-top:12px;">';
    historialHtml += '<strong style="color:var(--tx-head);">ðŸ“ TRAZADO DEL CARRO:</strong><br>';

    // Entrada
    historialHtml += '<div style="margin:8px 0;padding:6px;background:rgba(14,158,109,0.08);border-left:3px solid var(--c-ok);border-radius:2px;">';
    historialHtml += 'ðŸ“¥ <strong>INGRESO</strong> â€” ' + fmtTime(v.hora_ingreso);
    if (v.tipo === 'primaria') historialHtml += '<br>â†³ Planta: ' + (v.planta_nombre || 'â€”');
    historialHtml += '</div>';

    // Andén (si pasó por ahí)
    if (v.dock_id) {
      const dock = (STATE.docks || []).find(d => d.id === v.dock_id);
      historialHtml += '<div style="margin:8px 0;padding:6px;background:rgba(14,158,109,0.08);border-left:3px solid var(--c-ok);border-radius:2px;">';
      historialHtml += 'ðŸš› <strong>ANDÃ‰N</strong> â€” ' + (dock?.codigo || 'Andén ?');
      historialHtml += '</div>';
    }

    // Tareas completadas
    const tareasDelCarro = (STATE.tasks || []).filter(t => t.patente === v.patente && t.estado === 'completada');
    if (tareasDelCarro.length > 0) {
      tareasDelCarro.forEach(t => {
        historialHtml += '<div style="margin:8px 0;padding:6px;background:rgba(99,102,241,0.08);border-left:3px solid var(--c-info);border-radius:2px;">';
        historialHtml += 'âœ“ <strong>' + (t.tipo || '').replace(/_/g,' ').toUpperCase() + '</strong>';
        if (t.zona_destino) historialHtml += '<br>â†³ Destino: ' + (t.zona_destino || '').replace(/_/g,' ');
        historialHtml += '</div>';
      });
    }

    historialHtml += '</div>';
    document.getElementById('sal-historial').innerHTML = historialHtml;
  };

  if (visitId) { sel.value = visitId; sel.dispatchEvent(new Event('change')); }
  document.getElementById('modal-salida').style.display = 'flex';
}

async function confirmarSalida() {
  const visitId = document.getElementById('sal-truck').value;
  const obs = document.getElementById('sal-obs').value.trim();
  if (!visitId) { notify('Seleccione un camión', 'error'); return; }

  const visit = (STATE.visits || []).find(v => v.id === visitId);
  if (!visit) return;
  const elapsed = Math.round((Date.now() - new Date(visit.hora_ingreso)) / 60000);

  if (STATE.usingSeed) {
    visit.estado = 'salida';
    visit.hora_salida = new Date().toISOString();
    visit.dwell_minutes = elapsed;
    // Liberar andén si estaba ocupado
    const dock = (STATE.docks || []).find(d => d.truck_id === visitId || d.id === visit.dock_id);
    if (dock) { dock.estado = 'free'; dock.truck_id = null; dock.inicio_ocupacion = null; }
    clearSLAAlertMarks(visitId);
    STATE.visits = (STATE.visits || []).filter(v => v.id !== visitId);
    if (dock) { ymsDespacharTurnomaticoPatio(dock); }
    STATE.auditLog.unshift({
      id: 'a' + Date.now(), categoria: 'gate', evento: 'SALIDA',
      detalle: `${visit.patente} salió del patio. Dwell: ${elapsed} min`,
      user_nombre: STATE.profile.nombre, created_at: new Date().toISOString(),
    });
  } else {
    // Optimistic update local
    const dock = (STATE.docks || []).find(d => d.truck_id === visitId || d.id === visit.dock_id);
    visit.estado = 'salida';
    visit.hora_salida = new Date().toISOString();
    visit.dwell_minutes = elapsed;
    if (dock) { dock.estado = 'free'; dock.truck_id = null; dock.inicio_ocupacion = null; }
    clearSLAAlertMarks(visitId);
    STATE.visits = (STATE.visits || []).filter(v => v.id !== visitId);

    try {
      await sb.from('yard_visits').update({
        estado: 'salida', hora_salida: new Date().toISOString(),
        dwell_minutes: elapsed, guardia_salida_id: STATE.user?.id,
        observaciones_salida: obs,
      }).eq('id', visitId);

      if (dock) {
        await sb.from('docks').update({ estado: 'free', truck_id: null, inicio_ocupacion: null }).eq('id', dock.id);
        await ymsDespacharTurnomaticoPatio(dock);
      }
      await sb.from('gate_events').insert({
        visit_id: visitId, tipo: 'salida', patente: visit.patente, guardia_id: STATE.user?.id, notas: obs,
      });
      await auditLog('gate', 'SALIDA', `${visit.patente} salió. Dwell: ${elapsed} min`);
    } catch(e) {
      console.warn('[YMS] confirmarSalida DB error:', e.message);
      _pendingOps.push(() => sb.from('yard_visits').update({
        estado: 'salida', hora_salida: new Date().toISOString(), dwell_minutes: elapsed,
        guardia_salida_id: STATE.user?.id, observaciones_salida: obs,
      }).eq('id', visitId));
      scheduleReconnect();
    }
  }

  notify(`${visit.patente} salió del patio. Dwell: ${elapsed} min`, 'ok');
  Audio.play('accepted');
  closeModal('modal-salida');
  renderGuardia(); renderDashboard(); renderAndenes();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ANDENES â€” vista cards
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Event delegation â€” fábrica reutilizable por vista (Fase 2 refactor)
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Reemplaza onclick/onchange inline en las cards generadas dinámicamente.
   - Click:  lee data-action [+ data-id + data-arg2] y delega a window[action].
   - Change: lee data-change-action [+ data-id] y delega con (id, value).
   - data-stop="1" replica el event.stopPropagation() original.
   - IDs/args puramente numéricos se convierten a Number automáticamente.
   - Idempotente: sólo enlaza una vez por contenedor.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function _coerceArg(v) {
  if (v == null) return v;
  if (typeof v !== 'string') return v;
  // Convierte strings de enteros (positivos o negativos) a Number; mantiene UUIDs y strings comunes
  return /^-?\d+$/.test(v) ? parseInt(v, 10) : v;
}

function createDomainDelegation(rootId, tag) {
  const root = document.getElementById(rootId);
  if (!root || root._delegationBound) return;
  root._delegationBound = true;
  const logTag = '[' + (tag || rootId) + ' delegation]';

  root.addEventListener('click', function(ev) {
    const target = ev.target.closest('[data-action]');
    if (!target || !root.contains(target)) return;
    const action = target.getAttribute('data-action');
    const id     = _coerceArg(target.getAttribute('data-id'));
    const arg2   = _coerceArg(target.getAttribute('data-arg2'));
    const fn     = window[action];
    if (typeof fn !== 'function') return;
    if (target.getAttribute('data-stop') === '1') ev.stopPropagation();
    try {
      if (arg2 != null) fn(id, arg2);
      else if (id != null) fn(id);
      else fn();
    } catch(e) {
      console.error(logTag + ' error en ' + action + ':', e);
      if (typeof notify === 'function') notify('Error: ' + (e?.message || action), 'error');
    }
  });

  root.addEventListener('change', function(ev) {
    const target = ev.target.closest('[data-change-action]');
    if (!target || !root.contains(target)) return;
    const action = target.getAttribute('data-change-action');
    const id     = _coerceArg(target.getAttribute('data-id'));
    const fn     = window[action];
    if (typeof fn !== 'function') return;
    try {
      if (id != null) fn(id, target.value);
      else fn(target.value);
    } catch(e) {
      console.error(logTag + ' error en ' + action + ':', e);
      if (typeof notify === 'function') notify('Error: ' + (e?.message || action), 'error');
    }
  });
}

function initAndenesEventDelegation()      { createDomainDelegation('view-andenes', 'andenes'); }
function initPatioEventDelegation()        { createDomainDelegation('view-patio', 'patio'); }
function initTurnoEventDelegation()        { createDomainDelegation('view-turno', 'turno'); }
function initDevolucionesEventDelegation() { createDomainDelegation('view-devoluciones', 'devoluciones'); }
function initChatEventDelegation()         { createDomainDelegation('view-chat', 'chat'); }
function initAlertasEventDelegation()      { createDomainDelegation('view-alertas', 'alertas'); }
function initCitasEventDelegation()        { createDomainDelegation('view-citas', 'citas'); }
function initTareasEventDelegation()       { createDomainDelegation('view-tareas', 'tareas'); }
function initGuardiaEventDelegation()      { createDomainDelegation('view-guardia', 'guardia'); }

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Fase 3 â€” Funciones puras de cómputo para vista Andenes
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Separan cálculos del render para facilitar testing y memoización futura.
   Reciben los datos por parámetro (sin leer STATE global). El render llama
   a compute*() primero y luego pinta el DOM con el resultado.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function computeAndenesKPIs(docks, visits) {
  const safeDocks  = docks || [];
  const safeVisits = visits || [];
  const libres     = safeDocks.filter(function(d){ return d.estado === 'free'; }).length;
  const ocupados   = safeDocks.filter(function(d){ return d.estado === 'busy'; }).length;
  const bloqueados = safeDocks.filter(function(d){ return d.estado === 'blocked'; }).length;
  const total      = safeDocks.length;
  const util       = total > 0 ? Math.round(ocupados / total * 100) : 0;
  const enEspera   = safeVisits.filter(function(v){ return v.zona_actual === 'espera_anden' && v.estado !== 'salida'; }).length;
  return {
    libres: libres, ocupados: ocupados, bloqueados: bloqueados,
    total: total, util: util, enEspera: enEspera,
    resumen: ocupados + ' instalados · ' + enEspera + ' en espera · ' + libres + ' libres · ' + util + '% utilización',
  };
}

function applyAndenesKPIsToDOM(k) {
  set('and-libres', k.libres);
  set('and-ocupados', k.ocupados);
  set('and-espera', k.enEspera);
  set('and-bloqueados', k.bloqueados);
  set('and-util', k.util + '%');
  set('and-resumen', k.resumen);
}

/* Resuelve la visita asociada a un dock â€” tres intentos en orden:
   1. Match directo por dock_id o truck_id.
   2. Fallback: visita en 'anden' no reclamada por otro dock busy.
   3. truck_id como patente (cuando no parece UUID).                          */
function resolveVisitForDock(dock, visits, allDocks) {
  if (!dock || !visits) return null;
  let visit = visits.find(function(v){
    return (v.dock_id === dock.id || v.id === dock.truck_id) && v.estado !== 'salida';
  });
  if (!visit && dock.estado === 'busy') {
    visit = visits.find(function(v){
      return v.zona_actual === 'anden' && v.estado !== 'salida' &&
             !allDocks.some(function(od){
               return od.id !== dock.id && od.estado === 'busy' &&
                      (od.truck_id === v.id || v.dock_id === od.id);
             });
    });
  }
  if (!visit && dock.estado === 'busy' && dock.truck_id && !Utils.isUUID(dock.truck_id)) {
    visit = visits.find(function(v){
      return v.patente === String(dock.truck_id).toUpperCase() && v.estado !== 'salida';
    });
  }
  return visit || null;
}

/* Resuelve la patente "instalada" en un dock busy cuando no hay visita.
   Considera truck_id como patente directa o como UUID de visita.              */
function resolveAndenPatente(dock, visits) {
  if (!dock?.truck_id) return null;
  // Si NO es UUID v4, es patente directa (acepta formato AB-CD-12 con guion)
  if (!Utils.isUUID(dock.truck_id)) {
    return String(dock.truck_id).toUpperCase();
  }
  const vById = (visits || []).find(function(v){ return v.id === dock.truck_id; });
  return vById?.patente ? String(vById.patente).toUpperCase() : null;
}

/* Busca tarea mover_anden activa para el dock (match por dock_id o patente).  */
function resolveAndenTaskActiva(dock, tasks, patenteAnden) {
  if (!tasks) return null;
  const targetPat = patenteAnden ? String(patenteAnden).toUpperCase() : null;
  return tasks.find(function(tk){
    if (tk.tipo !== 'mover_anden') return false;
    if (!['ofertada','en_ejecucion','checklist_ok'].includes(tk.estado)) return false;
    if (tk.dock_id === dock.id) return true;
    if (targetPat && tk.patente && String(tk.patente).toUpperCase() === targetPat) return true;
    return false;
  }) || null;
}

function renderAndenes() {
  initAndenesEventDelegation();
  const filterEstado = document.getElementById('and-filter-estado')?.value || '';
  let docks = STATE.docks;
  if (filterEstado) docks = docks.filter(d => d.estado === filterEstado);

  // KPIs â€” compute puro + apply DOM separados
  applyAndenesKPIsToDOM(computeAndenesKPIs(STATE.docks, STATE.visits));

  const container = document.getElementById('and-cards-container');
  if (!container) return;

  const isAdmin = ['administrador','jefe_ops','supervisor_andenes'].includes(STATE.profile?.rol);
  const now = Date.now();

  if (!docks.length) {
    container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--tx-dim);font-size: 10px;">Sin andenes configurados</div>';
    return;
  }

  const statusColors = { free:'var(--c-ok)', busy:'var(--c-warn)', blocked:'var(--c-err)' };
  const statusLabels = { free:'LIBRE', busy:'OCUPADO', blocked:'BLOQUEADO' };

  // IDs de visitas ya reclamadas por otros andenes (para el fallback)
  const claimedByOther = new Set((STATE.docks || []).map(function(od){ return od.truck_id; }).filter(Boolean));

  const cards = docks.map(function(d) {
    const visit = resolveVisitForDock(d, STATE.visits, STATE.docks);
    const carrier = visit ? (STATE.carriers || []).find(function(c){ return c.codigo === visit.patente; }) : null;
    const elapsed = d.inicio_ocupacion ? Math.round((now - new Date(d.inicio_ocupacion)) / 60000) : 0;
    const maxT    = d.max_tiempo || STATE.params?.dwell_max || 180;
    const pct     = d.estado === 'busy' ? Math.min(100, Math.round(elapsed / maxT * 100)) : 0;
    const timeC   = pct > 85 ? 'var(--c-err)' : pct > 60 ? 'var(--c-warn)' : 'var(--c-ok)';
    // Detectar si hay un carro asignado (planificado) para este andén libre
    const carroAsignadoCard = d.estado === 'free' ? (STATE.carros || []).find(function(c){ return c.anden_destino === d.id; }) : null;
    const sc      = carroAsignadoCard ? 'var(--c-accent)' : (statusColors[d.estado] || 'var(--tx-dim)');
    const sl      = carroAsignadoCard ? 'ASIGNADO' : (statusLabels[d.estado] || d.estado);

    // Tareas relacionadas a este andén/patente
    const relTasks = visit ? (STATE.tasks || []).filter(function(t){
      return t.patente === visit.patente &&
             !['completada','cancelada','rechazada'].includes(t.estado) &&
             (t.zona_origen === 'anden' || t.zona_destino === 'anden');
    }) : [];

    let body = '';
    if (d.estado === 'busy' && visit) {
      const conductorName = carrier?.nombre || visit.carrier_nombre || '';
      const ruta = carrier?.numero_ruta || visit.numero_ruta || 'â€”';
      body = '<div style="margin:10px 0 12px;">' +
        '<div style="font-size: 9px;font-weight:800;font-family:var(--font);color:var(--tx-head);letter-spacing:3px;line-height:1.1;">' + escHtml(visit.patente || 'â€”') + '</div>' +
        (conductorName ? '<div style="font-size: 9px;color:var(--tx-muted);margin-top:4px;">' + escHtml(conductorName) + '</div>' : '') +
        '<div style="font-size: 8px;color:var(--tx-dim);margin-top:2px;">Ruta ' + escHtml(ruta) + ' · desde ' + (d.inicio_ocupacion ? fmtTime(d.inicio_ocupacion) : 'â€”') + '</div>' +
      '</div>' +
      '<div style="margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--tx-dim);margin-bottom:5px;">' +
          '<span>Tiempo en andén</span>' +
          '<span style="font-weight:700;color:' + timeC + ';">' + elapsed + ' min</span>' +
        '</div>' +
        '<div style="height:3px;background:var(--bg);border-radius:2px;overflow:hidden;">' +
          '<div style="height:100%;width:' + pct + '%;background:' + timeC + ';border-radius:2px;transition:width 1s;"></div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;">' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-ok" style="flex:1;font-size: 8px;justify-content:center;" data-action="crearRetiroAndenInmediato" data-id="' + d.id + '" data-arg2="carros_cargados" data-stop="1">â†’ Carros Cargados</button>' +
          '<button class="btn" style="flex:1;font-size: 8px;justify-content:center;" data-action="crearRetiroAndenInmediato" data-id="' + d.id + '" data-arg2="playa" data-stop="1">â†’ Estacionamiento</button>' +
        '</div>' +
        (isAdmin ? '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-warn" style="flex:1;font-size:10px;" data-action="liberarAnden" data-id="' + d.id + '" data-stop="1">Liberar andén</button>' +
          '<button class="btn btn-err" style="font-size:10px;" data-action="bloquearAnden" data-id="' + d.id + '" data-stop="1">Bloquear</button>' +
        '</div>' : '') +
      '</div>';
    } else if (d.estado === 'busy') {
      let patenteAnden = resolveAndenPatente(d, STATE.visits);
      const taskInstalacion = resolveAndenTaskActiva(d, STATE.tasks, patenteAnden);
      if (!patenteAnden && taskInstalacion?.patente) patenteAnden = String(taskInstalacion.patente).toUpperCase();
      if (taskInstalacion) {
        const carrierT = (STATE.carriers || []).find(function(c){ return c.codigo === taskInstalacion.patente; });
        const estadoLabel = taskInstalacion.estado === 'checklist_ok' ? 'âœ“ CHECKLIST OK â€” POSTURA PENDIENTE' :
                            taskInstalacion.estado === 'en_ejecucion' ? '⚠™ EN MOVIMIENTO' : 'â³ OFERTADA';
        body = '<div style="margin:10px 0 12px;padding:10px;background:rgba(245,158,11,0.07);border:1px dashed rgba(245,158,11,0.4);border-radius:6px;">' +
          '<div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--c-warn);margin-bottom:6px;">' + estadoLabel + '</div>' +
          '<div style="font-size: 9px;font-weight:800;font-family:var(--font);color:var(--tx-head);letter-spacing:3px;">' + escHtml(taskInstalacion.patente || 'â€”') + '</div>' +
          (carrierT?.nombre ? '<div style="font-size: 9px;color:var(--tx-muted);margin-top:3px;">' + escHtml(carrierT.nombre) + '</div>' : '') +
          (taskInstalacion.operador_nombre ? '<div style="font-size: 8px;color:var(--tx-dim);margin-top:2px;">Operador: ' + escHtml(taskInstalacion.operador_nombre) + '</div>' : '') +
        '</div>' +
        (isAdmin ? '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-warn" style="flex:1;font-size: 8px;" data-action="liberarAnden" data-id="' + d.id + '" data-stop="1">Liberar andén</button>' +
          '<button class="btn btn-err" style="font-size:10px;" data-action="bloquearAnden" data-id="' + d.id + '" data-stop="1">Bloquear</button>' +
        '</div>' : '');
      } else if (patenteAnden) {
        // Carro instalado en andén â€” postura confirmada pero sin registro de visita (flujo Carros)
        const carrierAnd = (STATE.carriers || []).find(function(c){ return c.codigo === patenteAnden; });
        const carroAnd   = (STATE.carros || []).find(function(c){ return String(c.patente||'').toUpperCase() === patenteAnden; });
        const conductorN = carrierAnd?.nombre || carroAnd?.conductor || '';
        const rutaN      = carrierAnd?.numero_ruta || carroAnd?.ruta || 'â€”';
        body = '<div style="margin:10px 0 12px;">' +
          '<div style="font-size: 9px;font-weight:800;font-family:var(--font);color:var(--tx-head);letter-spacing:3px;line-height:1.1;">' + escHtml(patenteAnden) + '</div>' +
          (conductorN ? '<div style="font-size: 9px;color:var(--tx-muted);margin-top:4px;">' + escHtml(conductorN) + '</div>' : '') +
          '<div style="font-size: 8px;color:var(--tx-dim);margin-top:2px;">' +
            (rutaN && rutaN !== 'â€”' ? 'Ruta ' + escHtml(rutaN) + ' · ' : '') +
            (carroAnd?.pallets ? 'ðŸ“¦ ' + carroAnd.pallets + ' pallets · ' : '') +
            (carroAnd?.vuelta === 'primera' ? '1ra vuelta · ' : carroAnd?.vuelta === 'segunda' ? '2da vuelta · ' : '') +
            'desde ' + (d.inicio_ocupacion ? fmtTime(d.inicio_ocupacion) : 'â€”') +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--tx-dim);margin-bottom:5px;">' +
            '<span>Tiempo en andén</span>' +
            '<span style="font-weight:700;color:' + timeC + ';">' + elapsed + ' min</span>' +
          '</div>' +
          '<div style="height:3px;background:var(--bg);border-radius:2px;overflow:hidden;">' +
            '<div style="height:100%;width:' + pct + '%;background:' + timeC + ';border-radius:2px;transition:width 1s;"></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;">' +
          '<div style="display:flex;gap:6px;">' +
            '<button class="btn btn-ok" style="flex:1;font-size: 8px;justify-content:center;" data-action="crearRetiroAndenInmediato" data-id="' + d.id + '" data-arg2="carros_cargados" data-stop="1">â†’ Carros Cargados</button>' +
            '<button class="btn" style="flex:1;font-size: 8px;justify-content:center;" data-action="crearRetiroAndenInmediato" data-id="' + d.id + '" data-arg2="playa" data-stop="1">â†’ Estacionamiento</button>' +
          '</div>' +
          (isAdmin ? '<div style="display:flex;gap:6px;">' +
            '<button class="btn btn-warn" style="flex:1;font-size:10px;" data-action="liberarAnden" data-id="' + d.id + '" data-stop="1">Liberar andén</button>' +
            '<button class="btn btn-err" style="font-size:10px;" data-action="bloquearAnden" data-id="' + d.id + '" data-stop="1">Bloquear</button>' +
          '</div>' : '') +
        '</div>';
      } else {
        // Andén busy sin patente derivable â€” dato inconsistente
        body = '<div style="margin:10px 0 12px;">' +
          '<div style="font-size: 10px;font-weight:600;color:var(--c-warn);">Ocupado · sin registro de vehículo</div>' +
          (d.inicio_ocupacion ? '<div style="font-size: 8px;color:var(--tx-dim);margin-top:4px;">Desde ' + fmtTime(d.inicio_ocupacion) + ' · ' + elapsed + ' min</div>' : '') +
        '</div>' +
        (isAdmin ? '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-warn" style="flex:1;font-size: 8px;" data-action="liberarAnden" data-id="' + d.id + '" data-stop="1">Liberar andén</button>' +
          '<button class="btn btn-err" style="font-size:10px;" data-action="bloquearAnden" data-id="' + d.id + '" data-stop="1">Bloquear</button>' +
        '</div>' : '');
      }
    } else if (d.estado === 'blocked') {
      body = '<div style="padding:24px 0 12px;text-align:center;color:var(--c-err);font-size: 9px;">Andén bloqueado</div>' +
        (isAdmin ? '<button class="btn" style="width:100%;font-size: 8px;" data-action="liberarAnden" data-id="' + d.id + '" data-stop="1">Desbloquear</button>' : '');
    } else {
      if (carroAsignadoCard) {
        const carrierA = (STATE.carriers || []).find(function(c){ return c.codigo === carroAsignadoCard.patente; });
        body = '<div style="margin:10px 0 12px;padding:10px;background:rgba(99,102,241,0.07);border:1px dashed rgba(99,102,241,0.35);border-radius:6px;">' +
          '<div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--c-accent);margin-bottom:6px;">â© ASIGNADO â€” PENDIENTE DE LLEGADA</div>' +
          '<div style="font-size: 9px;font-weight:800;font-family:var(--font);color:var(--tx-head);letter-spacing:3px;">' + escHtml(carroAsignadoCard.patente || 'â€”') + '</div>' +
          (carrierA?.nombre || carroAsignadoCard.conductor ? '<div style="font-size: 9px;color:var(--tx-muted);margin-top:3px;">' + escHtml(carrierA?.nombre || carroAsignadoCard.conductor || '') + '</div>' : '') +
          '<div style="font-size: 8px;color:var(--tx-dim);margin-top:3px;">ðŸ“¦ ' + (carroAsignadoCard.pallets || 'â€”') + ' pallets · ' + (carroAsignadoCard.vuelta === 'primera' ? '1ra' : '2da') + ' vuelta</div>' +
        '</div>' +
        (isAdmin ? '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-warn" style="flex:1;font-size: 8px;" data-action="bloquearAnden" data-id="' + d.id + '" data-stop="1">Bloquear</button>' +
          '<button class="btn" style="font-size: 8px;" data-action="editAnden" data-id="' + d.id + '" data-stop="1">Editar</button>' +
        '</div>' : '');
      } else {
        body = '<div style="padding:24px 0 12px;text-align:center;color:var(--tx-dim);font-size: 9px;">Disponible para asignación</div>' +
          (isAdmin ? '<div style="display:flex;gap:6px;">' +
            '<button class="btn btn-warn" style="flex:1;font-size: 8px;" data-action="bloquearAnden" data-id="' + d.id + '" data-stop="1">Bloquear</button>' +
            '<button class="btn" style="font-size: 8px;" data-action="editAnden" data-id="' + d.id + '" data-stop="1">Editar</button>' +
          '</div>' : '');
      }
    }

    // Tareas pendientes relacionadas
    const tasksBadge = relTasks.length ? '<span style="font-size:9px;font-weight:700;padding:1px 7px;border-radius:10px;background:rgba(245,158,11,0.15);color:var(--c-warn);border:1px solid rgba(245,158,11,0.3);margin-left:6px;">' + relTasks.length + ' tarea' + (relTasks.length > 1 ? 's' : '') + '</span>' : '';

    const tasksHtml = relTasks.length ? '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);">' +
      relTasks.map(function(t){
        const tColor = t.prioridad === 'critica' ? 'var(--c-err)' : t.prioridad === 'urgente' ? 'var(--c-warn)' : 'var(--tx-muted)';
        return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;padding:3px 0;">' +
          '<span style="color:var(--tx-muted);">' + (t.tipo||'').replace(/_/g,' ') + '</span>' +
          '<span style="font-weight:600;color:' + tColor + ';">' + (t.estado||'').toUpperCase() + '</span>' +
        '</div>';
      }).join('') +
    '</div>' : '';

    return '<div style="background:var(--bg-panel);border:1px solid var(--border);border-top:3px solid ' + sc + ';border-radius:8px;padding:14px 16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">' +
        '<div style="display:flex;align-items:center;">' +
          '<span style="font-size: 10px;font-weight:800;font-family:var(--font);color:var(--tx-head);">' + escHtml(d.codigo) + '</span>' +
          tasksBadge +
        '</div>' +
        '<span style="font-size:9px;font-weight:700;letter-spacing:1px;color:' + sc + ';background:' + sc + '18;padding:2px 9px;border-radius:20px;border:1px solid ' + sc + '40;">' + sl + '</span>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--tx-dim);margin-bottom:8px;">' + (d.tipo||'').toUpperCase() + (d.operacion_permitida ? ' · ' + d.operacion_permitida.replace(/_/g,' ').toUpperCase() : '') + '</div>' +
      body +
      tasksHtml +
    '</div>';
  });

  container.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;">' + cards.join('') + '</div>';

  // â”€â”€ Panel: Carros EN ESPERA de andén (zona_actual='espera_anden') â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const esperaContainer = document.getElementById('and-espera-container');
  if (esperaContainer) {
    const esperaVisits = (STATE.visits || []).filter(function(v){ return v.zona_actual === 'espera_anden' && v.estado !== 'salida'; });
    if (esperaVisits.length) {
      const docksLibres = (STATE.docks || []).filter(function(d){ return d.estado === 'free'; });
      const esperaRows = esperaVisits.map(function(v, idx) {
        const carrier = (STATE.carriers || []).find(function(c){ return c.codigo === v.patente; });
        const wait = v.hora_ingreso ? Math.round((now - new Date(v.hora_ingreso)) / 60000) : 0;
        const tipoLabel = v.tipo === 'primaria' ? 'ðŸ”µ PRIMARIA' : 'ðŸŸ¡ SECUNDARIA';
        const tempInfo = v.temp_cabina ? ' · ðŸŒ¡ ' + v.temp_cabina + 'Â°C' : '';
        const assignBtn = isAdmin && docksLibres.length
          ? '<select data-change-action="asignarAndenDesdeEspera" data-id="' + v.id + '" style="font-size:10px;padding:3px 6px;border-radius:5px;border:1px solid var(--border);background:var(--bg-input);color:var(--tx-base);max-width:120px;">' +
              '<option value="">Asignar â†’</option>' +
              docksLibres.map(function(d){ return '<option value="' + d.id + '">' + d.codigo + '</option>'; }).join('') +
            '</select>'
          : (docksLibres.length === 0 ? '<span style="font-size:10px;color:var(--c-err);">Sin andenes libres</span>' : '');
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg-input);border-radius:6px;flex-wrap:wrap;">' +
          '<span style="font-size: 8px;font-weight:700;color:var(--tx-dim);min-width:22px;">#' + (idx+1) + '</span>' +
          '<span style="font-size: 9px;font-weight:800;font-family:var(--font);color:var(--tx-head);letter-spacing:2px;flex:0 0 auto;">' + escHtml(v.patente || 'â€”') + '</span>' +
          '<span style="font-size:10px;color:var(--tx-muted);flex:1;min-width:80px;">' + escHtml(carrier?.nombre || v.carrier_nombre || 'â€”') + '</span>' +
          '<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;background:rgba(59,130,246,0.12);color:var(--c-info);">' + tipoLabel + '</span>' +
          (v.tipo_carga ? '<span style="font-size:9px;padding:2px 7px;border-radius:10px;background:var(--bg-alt);color:var(--tx-muted);">' + escHtml(v.tipo_carga) + tempInfo + '</span>' : '') +
          '<span style="font-size:10px;color:var(--tx-dim);white-space:nowrap;">â± ' + wait + ' min</span>' +
          assignBtn +
        '</div>';
      }).join('');
      esperaContainer.innerHTML =
        '<div style="background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.3);border-left:4px solid var(--c-info);border-radius:8px;padding:14px 16px;margin-bottom:4px;">' +
          '<div style="font-size: 8px;font-weight:700;color:var(--c-info);letter-spacing:1px;margin-bottom:10px;">ðŸ• EN ESPERA DE ANDÃ‰N (' + esperaVisits.length + ')' +
            (docksLibres.length ? ' &nbsp;·&nbsp; <span style="color:var(--c-ok);font-weight:600;">' + docksLibres.length + ' andén' + (docksLibres.length > 1 ? 'es libres' : ' libre') + '</span>' : ' &nbsp;·&nbsp; <span style="color:var(--c-err);font-weight:600;">Sin andenes libres</span>') +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;">' + esperaRows + '</div>' +
        '</div>';
    } else {
      esperaContainer.innerHTML = '';
    }
  }

  // Cola Turnomático â€” tickets mover_anden en espera de andén libre
  const queueContainer = document.getElementById('and-queue-container');
  if (queueContainer) {
    const queueItems = (STATE.queueTickets || []).filter(function(q){ return q.tipo_operacion === 'mover_anden' && q.estado === 'esperando'; });
    if (queueItems.length) {
      const qRows = queueItems.map(function(q, idx) {
        const visit = (STATE.visits || []).find(function(v){ return v.patente === String(q.patente||'').toUpperCase() && v.estado !== 'salida'; });
        const carrier = visit ? (STATE.carriers || []).find(function(c){ return c.codigo === visit.patente; }) : null;
        const wait = q.hora_creacion ? Math.round((now - new Date(q.hora_creacion)) / 60000) : 0;
        const prioLabel = q.prioridad >= 8 ? 'ðŸ”´ URGENTE' : q.prioridad >= 6 ? 'ðŸŸ¡ ALTA' : 'ðŸŸ¢ NORMAL';
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-input);border-radius:6px;gap:12px;">' +
          '<span style="font-size: 8px;font-weight:700;color:var(--tx-dim);min-width:20px;">#' + (idx+1) + '</span>' +
          '<span style="font-size: 9px;font-weight:800;font-family:var(--font);color:var(--tx-head);letter-spacing:2px;flex:1;">' + escHtml(q.patente||'â€”') + '</span>' +
          (carrier ? '<span style="font-size:10px;color:var(--tx-muted);flex:2;">' + escHtml(carrier.nombre||'') + '</span>' : '') +
          '<span style="font-size:10px;color:var(--tx-dim);">â± ' + wait + ' min</span>' +
          '<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;background:rgba(245,158,11,0.15);color:var(--c-warn);">' + prioLabel + '</span>' +
        '</div>';
      }).join('');
      queueContainer.innerHTML =
        '<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.35);border-left:4px solid var(--c-warn);border-radius:8px;padding:14px 16px;">' +
          '<div style="font-size: 8px;font-weight:700;color:var(--c-warn);letter-spacing:1px;margin-bottom:10px;">ðŸ” COLA TURNOMÃTICO â€” EN ESPERA DE ANDÃ‰N LIBRE (' + queueItems.length + ')</div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;">' + qRows + '</div>' +
        '</div>';
    } else {
      queueContainer.innerHTML = '';
    }
  }

  // Mantener compatibilidad asignación manual
  const selAnden = document.getElementById('asig-anden');
  const selVisita = document.getElementById('asig-visita');
  if (selAnden) selAnden.innerHTML = (STATE.docks || []).filter(d => d.estado === 'free').map(d => '<option value="' + d.id + '">' + d.codigo + ' â€” ' + d.tipo + '</option>').join('') || '<option>Sin andenes libres</option>';
  if (selVisita) selVisita.innerHTML = (STATE.visits || []).filter(v => v.estado === 'en_patio' && !v.dock_id).map(v => '<option value="' + v.id + '">' + v.patente + ' â€” ' + (v.carrier_nombre || v.numero_ruta || '') + '</option>').join('') || '<option>Sin visitas en espera</option>';
}

// â”€â”€ Movimiento desde andén (admin/supervisor inicia, patio completa) â”€â”€â”€â”€â”€â”€
function crearRetiroAnden(dockId, destino) {
  const dock = (STATE.docks || []).find(d => d.id === dockId);
  if (!dock || dock.estado !== 'busy') { notify('El andén no está ocupado', 'warn'); return; }
  const visit = (STATE.visits || []).find(v => (v.dock_id === dockId || v.id === dock.truck_id) && v.estado !== 'salida');
  let patente = visit?.patente || null;
  if (!patente && dock.truck_id && !Utils.isUUID(dock.truck_id)) {
    patente = String(dock.truck_id).toUpperCase();
  }
  if (!patente) { notify('Sin vehículo registrado en este andén', 'warn'); return; }
  const carrier = (STATE.carriers || []).find(c => c.codigo === patente);
  const carroAnd = (STATE.carros || []).find(function(c){ return String(c.patente||'').toUpperCase() === patente; });
  // Poblar modal
  const el = id => document.getElementById(id);
  if (el('mra-dock-id'))   el('mra-dock-id').value   = dockId;
  if (el('mra-destino'))   el('mra-destino').value   = destino;
  if (el('mra-anden'))     el('mra-anden').textContent = dock.codigo;
  if (el('mra-patente'))   el('mra-patente').textContent = patente;
  if (el('mra-conductor')) el('mra-conductor').textContent = carrier?.nombre || visit?.carrier_nombre || carroAnd?.conductor || 'â€”';
  if (el('mra-pallets'))   el('mra-pallets').value   = '';
  if (el('mra-precinto'))  el('mra-precinto').value  = '';
  if (el('mra-destino-sel')) el('mra-destino-sel').value = destino;
  const modal = document.getElementById('modal-mover-anden');
  if (modal) { modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; }
}

async function crearRetiroAndenInmediato(dockId, destino) {
  const dock = (STATE.docks || []).find(d => d.id === dockId);
  if (!dock || dock.estado !== 'busy') { notify('El andén no está ocupado', 'warn'); return; }
  let visit = (STATE.visits || []).find(v => (v.dock_id === dockId || v.id === dock.truck_id) && v.estado !== 'salida');
  let patente = visit?.patente || null;
  if (!patente && dock.truck_id && !Utils.isUUID(dock.truck_id)) {
    patente = String(dock.truck_id).toUpperCase();
  }
  if (!patente) { notify('Sin vehículo registrado en este andén', 'warn'); return; }

  const tareaActiva = (STATE.tasks || []).find(t => t.patente === patente &&
    ['retirar_anden','mover_playa'].includes(t.tipo) &&
    ['ofertada','pendiente','en_proceso'].includes(t.estado));
  if (tareaActiva) { notify('⚠  Ya existe tarea activa para ' + patente, 'warn'); return; }

  const tipo = destino === 'carros_cargados' ? 'retirar_anden' : 'mover_playa';
  const label = destino === 'carros_cargados' ? 'Carros Cargados' : 'Estacionamiento';
  const newTask = {
    id: 't' + Date.now(), tipo, patente,
    zona_origen: 'anden', zona_destino: destino,
    prioridad: 'normal', sla_minutos: 20, estado: 'ofertada',
    hora_creacion: new Date().toISOString(), notas: null,
    dock_id: dock.id,
  };
  STATE.tasks.unshift(newTask);

  if (!STATE.usingSeed && sb) {
    try {
      await sb.from('yard_tasks').insert({
        tipo, patente, zona_origen: 'anden', zona_destino: destino,
        prioridad: 'normal', sla_minutos: 20, estado: 'ofertada',
        notas: null, creado_por: STATE.user?.id,
        dock_id: dock.id,
      });
    } catch(e) { console.warn('crearRetiroAndenInmediato:', e); }
  }

  Audio.play('new_task');
  notify('âœ“ Tarea generada â€” ' + patente + ' â†’ ' + label, 'ok');
  auditLog('task', 'RETIRO_ANDEN_CREADO', patente + ' · Andén ' + dock.codigo + ' â†’ ' + destino);
  renderAndenes();
  if (typeof loadTasks === 'function') loadTasks(); else if (typeof renderTareas === 'function') renderTareas();
}

async function confirmarRetiroAnden() {
  const dockId  = document.getElementById('mra-dock-id')?.value;
  const destino = document.getElementById('mra-destino-sel')?.value || document.getElementById('mra-destino')?.value || 'carros_cargados';
  const pallets = document.getElementById('mra-pallets')?.value || '';
  const precinto= document.getElementById('mra-precinto')?.value || '';
  const dock    = (STATE.docks || []).find(d => d.id === dockId);
  if (!dock) { notify('Error: andén no encontrado', 'error'); return; }
  const visit = (STATE.visits || []).find(v => (v.dock_id === dockId || v.id === dock.truck_id) && v.estado !== 'salida');
  let patente = visit?.patente || null;
  if (!patente && dock.truck_id && !Utils.isUUID(dock.truck_id)) {
    patente = String(dock.truck_id).toUpperCase();
  }
  if (!patente) { notify('Error: vehículo no encontrado', 'error'); return; }

  const tipo  = destino === 'carros_cargados' ? 'retirar_anden' : 'mover_playa';
  const notas = [pallets ? 'Pallets: ' + pallets : '', precinto ? 'Precinto: ' + precinto : ''].filter(Boolean).join(' · ');
  const newTask = {
    id: 't' + Date.now(), tipo, patente,
    zona_origen: 'anden', zona_destino: destino,
    prioridad: 'normal', sla_minutos: 20, estado: 'ofertada',
    hora_creacion: new Date().toISOString(),
    notas: notas || null,
    dock_id: dock.id,
  };
  STATE.tasks.unshift(newTask);

  if (!STATE.usingSeed && sb) {
    try {
      await sb.from('yard_tasks').insert({
        tipo, patente, zona_origen: 'anden', zona_destino: destino,
        prioridad: 'normal', sla_minutos: 20, estado: 'ofertada',
        notas: notas || null, creado_por: STATE.user?.id, dock_id: dock.id,
      });
    } catch(e) { console.warn('confirmarRetiroAnden insert:', e); }
  }

  closeModal('modal-mover-anden');
  Audio.play('new_task');
  notify('Tarea creada â€” ' + patente + ' â†’ ' + (destino === 'carros_cargados' ? 'Carros Cargados' : 'Estacionamiento'), 'ok');
  auditLog('task', 'RETIRO_ANDEN_CREADO', patente + ' · Andén ' + dock.codigo + ' â†’ ' + destino);
  renderAndenes();
  if (typeof loadTasks === 'function') loadTasks(); else if (typeof renderTareas === 'function') renderTareas();
}

function selectDock(d) {
  const detail = document.getElementById('dock-detail');
  if (!detail) return;
  const visit  = (STATE.visits || []).find(v => v.dock_id === d.id || v.id === d.truck_id);
  const carrier = visit ? (STATE.carriers || []).find(c => c.codigo === visit.patente) : null;
  const elapsed = d.inicio_ocupacion ? Math.round((Date.now() - new Date(d.inicio_ocupacion)) / 60000) : 0;
  const maxT = d.max_tiempo || STATE.params?.dwell_max || 180;
  const pct  = d.estado === 'busy' ? Math.min(100, Math.round(elapsed / maxT * 100)) : 0;
  const barCls = pct > 85 ? 'err' : pct > 60 ? 'warn' : '';
  const isAdmin = ['administrador','jefe_ops','supervisor_andenes'].includes(STATE.profile?.rol);

  detail.innerHTML = `
    <div class="panel" style="margin:8px;">
      <div class="ph" style="display:flex;align-items:center;gap:10px;">
        <span style="font-size: 9px;font-weight:800;font-family:var(--font);">${d.codigo}</span>
        <span class="badge badge-${d.estado === 'free' ? 'ok' : d.estado === 'busy' ? 'warn' : 'err'}">${d.estado?.toUpperCase()}</span>
        <span style="font-size:10px;color:var(--tx-muted);">${(d.tipo||'').toUpperCase()} · ${(d.operacion_permitida||'').toUpperCase()}</span>
      </div>
      <div class="pb">
        ${visit ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size: 9px;margin-bottom:10px;">
          <div><div style="font-size:10px;color:var(--tx-muted);text-transform:uppercase;font-weight:600;margin-bottom:2px;">Rampla</div><div style="font-weight:700;font-size: 9px;color:var(--tx-head);font-family:var(--font);">${visit.patente}</div></div>
          <div><div style="font-size:10px;color:var(--tx-muted);text-transform:uppercase;font-weight:600;margin-bottom:2px;">Empresa / Ruta</div><div style="font-weight:600;color:var(--tx-base);">${carrier?.nombre?.split(' ').slice(-2).join(' ') || visit.carrier_nombre || 'â€”'} · ${carrier?.numero_ruta || visit.numero_ruta || 'â€”'}</div></div>
          <div><div style="font-size:10px;color:var(--tx-muted);text-transform:uppercase;font-weight:600;margin-bottom:2px;">Inicio en andén</div><div style="color:var(--tx-base);">${d.inicio_ocupacion ? fmtTime(d.inicio_ocupacion) : 'â€”'}</div></div>
          <div><div style="font-size:10px;color:var(--tx-muted);text-transform:uppercase;font-weight:600;margin-bottom:2px;">Tiempo ocupado</div><div style="font-weight:700;color:${pct>85?'var(--c-err)':pct>60?'var(--c-warn)':'var(--c-ok)'};">${elapsed} min</div></div>
        </div>
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--tx-muted);margin-bottom:3px;"><span>Ocupación</span><span>${pct}% de ${maxT} min máx.</span></div>
          <div class="progress-bar"><div class="progress-fill ${barCls}" style="width:${pct}%"></div></div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-ok" style="flex:1;font-size: 8px;" onclick="abrirTareaDesdeAnden('${d.id}','retirar_anden')">ðŸ“¦ Tarea â†’ Carros Cargados</button>
          <button class="btn btn-info" style="flex:1;font-size: 8px;" onclick="abrirTareaDesdeAnden('${d.id}','anden_a_carros_vacios')">ðŸš› Tarea â†’ Carros Vacíos</button>
        </div>
        ${isAdmin ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
          <button class="btn btn-warn supv-action" style="flex:1;font-size: 8px;" onclick="liberarAnden('${d.id}')">âœ“ LIBERAR ANDÃ‰N</button>
          <button class="btn btn-err admin-action" style="font-size: 8px;" onclick="bloquearAnden('${d.id}')">BLOQUEAR</button>
        </div>` : ''}
        ` : `
        <div style="text-align:center;padding:12px 0;color:var(--tx-muted);font-size: 9px;">
          ${d.estado === 'blocked' ? '⚠— Andén bloqueado â€” sin operación' : 'âœ“ Andén disponible'}
        </div>
        ${d.estado !== 'blocked'
          ? `<button class="btn btn-warn supv-action admin-action" onclick="bloquearAnden('${d.id}')">BLOQUEAR ANDÃ‰N</button>`
          : `<button class="btn supv-action admin-action" onclick="liberarAnden('${d.id}')">DESBLOQUEAR ANDÃ‰N</button>`}
        `}
      </div>
    </div>`;
}

async function liberarAnden(dockId) {
  const dock = (STATE.docks || []).find(d => d.id === dockId);
  if (!dock) return;

  if (STATE.usingSeed) {
    dock.estado = 'free'; dock.truck_id = null; dock.inicio_ocupacion = null;
  } else {
    // Optimistic update
    const prev = { estado: dock.estado, truck_id: dock.truck_id, inicio_ocupacion: dock.inicio_ocupacion };
    dock.estado = 'free'; dock.truck_id = null; dock.inicio_ocupacion = null;
    try {
      await sb.from('docks').update({ estado: 'free', truck_id: null, inicio_ocupacion: null }).eq('id', dockId);
      await auditLog('dock', 'LIBERACION_ANDEN', `Andén ${dock.codigo} liberado manualmente`);
      await loadDocks();
    } catch(e) {
      Object.assign(dock, prev);
      notify('⚠  Error de conexión â€” reintentando guardar...', 'warn', 3000);
      _pendingOps.push(() => sb.from('docks').update({ estado: 'free', truck_id: null, inicio_ocupacion: null }).eq('id', dockId));
      scheduleReconnect();
    }
  }
  Audio.play('dock_free');
  notify('âœ“ Andén ' + dock.codigo + ' liberado â€” disponible para asignación', 'ok');
  ymsPersistYardConfig();
  renderAndenes(); renderDashboard();
}

async function bloquearAnden(dockId) {
  const dock = (STATE.docks || []).find(d => d.id === dockId);
  if (!dock) return;
  if (STATE.usingSeed) {
    dock.estado = 'blocked';
  } else {
    const prevEstado = dock.estado;
    dock.estado = 'blocked';
    try {
      await sb.from('docks').update({ estado: 'blocked' }).eq('id', dockId);
      await auditLog('dock', 'BLOQUEO_ANDEN', `Andén ${dock.codigo} bloqueado`);
      await loadDocks();
    } catch(e) {
      dock.estado = prevEstado;
      notify('⚠  Error de conexión â€” reintentando guardar...', 'warn', 3000);
      _pendingOps.push(() => sb.from('docks').update({ estado: 'blocked' }).eq('id', dockId));
      scheduleReconnect();
    }
  }
  Audio.play('warn');
  notify('⚠  Andén ' + dock.codigo + ' bloqueado â€” no disponible para operaciones', 'warn');
  ymsPersistYardConfig();
  renderAndenes(); renderDashboard();
}

function abrirTareaDesdeAnden(dockId, tipoForzado) {
  const dock = (STATE.docks || []).find(d => d.id === dockId);
  if (!dock || dock.estado !== 'busy') { notify('â›” El andén no está ocupado', 'warn'); return; }
  openNewTask();
  // Andén ocupado â†’ por defecto mover la rampla a carros cargados
  const tipo = tipoForzado || 'retirar_anden';
  const tipoSel = document.getElementById('task-tipo');
  if (tipoSel) { tipoSel.value = tipo; onTaskTipoChange(); }
  // Pre-seleccionar la rampla que está en el andén
  const visit = (STATE.visits || []).find(v => (v.dock_id === dockId || v.id === dock.truck_id) && v.estado !== 'salida');
  if (visit) {
    setTimeout(function() {
      const truckSel = document.getElementById('task-truck');
      if (truckSel) { truckSel.value = visit.id; onTaskTruckChange(); }
    }, 100);
  }
}

function openNewDock() {
  document.getElementById('modal-dock').style.display = 'flex';
}

async function crearAnden() {
  const codigo = document.getElementById('dock-code').value.trim().toUpperCase();
  const tipo   = document.getElementById('dock-type').value;
  const op     = document.getElementById('dock-op').value;
  const st     = document.getElementById('dock-status').value;
  if (!codigo) { notify('Ingrese código de andén', 'error'); return; }

  const newDock = { id: 'd' + Date.now(), codigo, tipo, operacion_permitida: op, estado: st };
  if (STATE.usingSeed) {
    STATE.docks.push(newDock);
  } else {
    const { data } = await sb.from('docks').insert({
      codigo, tipo, operacion_permitida: op, estado: st,
    }).select().single();
    if (data) STATE.docks.push(data);
    await auditLog('dock', 'ANDÃ‰N_CREADO', `Nuevo andén ${codigo} creado`);
  }
  closeModal('modal-dock');
  ymsPersistYardConfig();
  notify(`Andén ${codigo} creado`, 'ok');
  renderAndenes(); renderDashboard();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PATIO â€” TABS (Playa / Carros)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _patioActiveTab = 'playa';

function switchPatioTab(tab) {
  _patioActiveTab = tab;
  const panelPlaya   = document.getElementById('patio-panel-playa');
  const panelCarros  = document.getElementById('patio-panel-carros');
  const tabPlaya     = document.getElementById('ptab-playa');
  const tabCarros    = document.getElementById('ptab-carros');
  const actPlaya     = document.getElementById('patio-playa-actions');
  const actCarros    = document.getElementById('patio-carros-actions');

  if (tab === 'playa') {
    if (panelPlaya)  panelPlaya.style.display  = '';
    if (panelCarros) panelCarros.style.display = 'none';
    if (tabPlaya)  { tabPlaya.classList.add('active-tab');    }
    if (tabCarros) { tabCarros.classList.remove('active-tab'); }
    if (actPlaya)  actPlaya.style.display  = 'flex';
    if (actCarros) actCarros.style.display = 'none';
    renderPatio();
  } else {
    if (panelPlaya)  panelPlaya.style.display  = 'none';
    if (panelCarros) panelCarros.style.display = '';
    if (tabPlaya)  { tabPlaya.classList.remove('active-tab'); }
    if (tabCarros) { tabCarros.classList.add('active-tab');   }
    if (actPlaya)  actPlaya.style.display  = 'none';
    if (actCarros) actCarros.style.display = 'flex';
    renderCarros();
    renderVisionGeneral();
  }
}

function renderVisionGeneral() {
  const el = document.getElementById('vision-general-content');
  if (!el) return;

  const now = Date.now();
  const rows = [];

  // 1. Vehículos en andenes
  (STATE.docks || []).filter(d => d.estado === 'busy').forEach(d => {
    const v = (STATE.visits || []).find(v => v.dock_id === d.id || v.id === d.truck_id);
    const mins = d.inicio_ocupacion ? Math.round((now - new Date(d.inicio_ocupacion)) / 60000) : 0;
    const maxT = d.max_tiempo || STATE.params?.dwell_max || 180;
    const pct  = Math.min(100, Math.round(mins / maxT * 100));
    const barC = pct > 85 ? 'var(--c-err)' : pct > 60 ? 'var(--c-warn)' : 'var(--c-ok)';
    rows.push({ zona: 'Andén ' + d.codigo, patente: v?.patente || 'â€”', carrier: v?.carrier_nombre || 'â€”', mins, pct, barC, estado: 'EN ANDÃ‰N', color: 'var(--c-warn)' });
  });

  // 2. Vehículos en estacionamiento
  (STATE.playaSlots || []).filter(s => s.ocupado).forEach(s => {
    const v = (STATE.visits || []).find(v => v.patente === s.patente && v.estado !== 'salida');
    const mins = s.hora_entrada ? Math.round((now - new Date(s.hora_entrada)) / 60000) : 0;
    const zona = (s.playa_tipo === 'carros_cargados' ? 'Cargado' : s.playa_tipo === 'en_espera' ? 'En Espera' : 'Estac.') + ' F' + s.fila + '-' + String(s.col).padStart(2,'0');
    rows.push({ zona, patente: s.patente || 'â€”', carrier: v?.carrier_nombre || s.nombre || 'â€”', mins, pct: 0, barC: 'var(--c-info)', estado: (s.playa_tipo === 'carros_cargados' ? 'CARGADO' : 'ESTAC.'), color: 'var(--c-info)' });
  });

  // 3. Visitas activas sin slot ni andén (en espera de asignación)
  (STATE.visits || []).filter(v => v.estado === 'en_patio' && !v.dock_id && !(STATE.playaSlots || []).find(s => s.patente === v.patente && s.ocupado)).forEach(v => {
    const mins = v.hora_ingreso ? Math.round((now - new Date(v.hora_ingreso)) / 60000) : 0;
    rows.push({ zona: 'Espera Gate', patente: v.patente || 'â€”', carrier: v.carrier_nombre || 'â€”', mins, pct: 0, barC: 'var(--tx-dim)', estado: 'EN PATIO', color: 'var(--c-ok)' });
  });

  if (!rows.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--tx-dim);font-size: 10px;">Sin vehículos activos en patio</div>';
    return;
  }

  el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:4px;">' +
    rows.map(r =>
      '<div style="background:var(--bg-alt);border:1px solid var(--border);border-left:4px solid ' + r.barC + ';border-radius:8px;padding:12px 14px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<span style="font-size:10px;font-weight:600;color:var(--tx-muted);text-transform:uppercase;">' + r.zona + '</span>' +
          '<span style="font-size:10px;font-weight:700;color:' + r.color + ';background:var(--bg-panel);padding:2px 8px;border-radius:20px;border:1px solid ' + r.color + ';">' + r.estado + '</span>' +
        '</div>' +
        '<div style="font-size: 9px;font-weight:800;color:var(--tx-head);letter-spacing:2px;font-family:var(--font);line-height:1.1;margin-bottom:4px;">' + r.patente + '</div>' +
        '<div style="font-size: 9px;color:var(--tx-muted);margin-bottom:8px;">' + r.carrier + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<div style="flex:1;height:4px;background:var(--bg);border-radius:2px;overflow:hidden;">' +
            (r.pct > 0 ? '<div style="height:100%;width:' + r.pct + '%;background:' + r.barC + ';border-radius:2px;"></div>' : '') +
          '</div>' +
          '<span style="font-size: 8px;color:' + r.barC + ';font-weight:600;white-space:nowrap;">' + r.mins + ' min</span>' +
        '</div>' +
      '</div>'
    ).join('') +
  '</div>';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PATIO â€” MAPA LÃ“GICO DE ZONAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Fase 3 â€” Funciones puras de cómputo para vista Patio
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   computePatioKPIs devuelve los contadores y porcentajes de utilización
   sin tocar DOM ni STATE global. El render los embebe en el template.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function computePatioKPIs(slots, docks) {
  const safeSlots = slots || [];
  const safeDocks = docks || [];
  const libres        = safeSlots.filter(function(s){ return !s.ocupado && s.cfg_tipo !== 'bloqueado'; }).length;
  const ocupados      = safeSlots.filter(function(s){ return s.ocupado; }).length;
  const slotsCargados = safeSlots.filter(function(s){ return s.ocupado && s.playa_tipo === 'carros_cargados'; }).length;
  const slotsEspera   = safeSlots.filter(function(s){ return s.ocupado && s.playa_tipo === 'en_espera'; }).length;
  const totalSlots    = safeSlots.filter(function(s){ return s.cfg_tipo !== 'bloqueado'; }).length || 72;
  const utilSlots     = totalSlots > 0 ? Math.round(ocupados / totalSlots * 100) : 0;

  const docksTotal    = safeDocks.length;
  const docksLibres   = safeDocks.filter(function(d){ return d.estado === 'free'; }).length;
  const docksOcupados = safeDocks.filter(function(d){ return d.estado === 'busy'; }).length;
  const docksBloq     = safeDocks.filter(function(d){ return d.estado === 'blocked'; }).length;
  const utilAndenes   = docksTotal > 0 ? Math.round(docksOcupados / docksTotal * 100) : 0;

  return {
    libres: libres, ocupados: ocupados,
    slotsCargados: slotsCargados, slotsEspera: slotsEspera,
    totalSlots: totalSlots, utilSlots: utilSlots,
    docksTotal: docksTotal, docksLibres: docksLibres,
    docksOcupados: docksOcupados, docksBloq: docksBloq,
    utilAndenes: utilAndenes,
  };
}

function renderPatio() {
  initPatioEventDelegation();
  // Render dock map
  renderDockMap('dock-map-patio');

  // â”€â”€ Sincronizar slots con visitas en patio (admin puede mover en tiempo real) â”€â”€
  sincronizarSlotsConVisitas();

  // SVG playa dinámica
  const svgW = 920, svgH = 530;
  const slotW = 70, slotH = 44, gap = 4;
  const startX = 20, startY = 65;
  const filas = 6, cols = 12;

  const coloresTipo = {
    dedicado:  { libre:'#0a1a3a', ocupado:'#102060', borde:'#4080ff', texto:'#80b0ff' },
    bloqueado: { libre:'#200a0a', ocupado:'#200a0a', borde:'#ff3040', texto:'#ff7080' },
    dinamico:  { libre:'', ocupado:'', borde:'', texto:'' },
  };
  // colores por playa_tipo (superpone al cfg_tipo para trazabilidad)
  const coloresPlaya = {
    carros_cargados: { fill:'#1a0e00', stroke:'var(--c-warn)', texto:'var(--c-warn)' },
    en_espera:       { fill:'#00081a', stroke:'var(--c-info)', texto:'var(--c-info)' },
  };

  let svgSlots = '';
  for (let f = 0; f < filas; f++) {
    for (let c2 = 0; c2 < cols; c2++) {
      const idx = f * cols + c2;
      const slot = STATE.playaSlots[idx];
      if (!slot) continue;
      const x = startX + c2 * (slotW + gap);
      const y = startY + f * (slotH + gap + 2);
      const col = coloresTipo[slot.cfg_tipo] || coloresTipo.dinamico;
      const isBloq = slot.cfg_tipo === 'bloqueado';
      const isDed  = slot.cfg_tipo === 'dedicado';
      const playaTipo = slot.playa_tipo || null;
      const playaCol  = coloresPlaya[playaTipo] || null;
      // Color del rectángulo â€” playa_tipo tiene prioridad visual si está ocupado
      let fillColor = 'var(--bg-panel)';
      let strokeColor = 'var(--border-md)';
      let strokeW = 1;
      if (isBloq)  { fillColor='#1a0505'; strokeColor='var(--c-err)'; strokeW=1.5; }
      else if (playaCol && slot.ocupado) { fillColor=playaCol.fill; strokeColor=playaCol.stroke; strokeW=2; }
      else if (isDed && !slot.ocupado) { fillColor='#05102a'; strokeColor='#4060c0'; strokeW=2; }
      else if (isDed && slot.ocupado)  { fillColor='#0a1840'; strokeColor='#4080ff'; strokeW=2; }
      else if (slot.ocupado) { fillColor='#0a1e0a'; strokeColor='var(--c-ok)'; strokeW=1.5; }

      const lblColor = isBloq ? 'var(--c-err)' : (playaCol && slot.ocupado) ? playaCol.texto : isDed ? '#80b0ff' : 'var(--tx-muted)';
      const patColor = slot.ocupado ? 'var(--tx-head)' : (isDed ? '#5080d0' : 'var(--tx-dim)');
      const badgeIcon = isBloq ? '⚠—' : isDed ? 'ðŸ”’' : playaTipo === 'carros_cargados' ? 'ðŸ“¦' : playaTipo === 'en_espera' ? 'â³' : '';
      const displayPat = slot.ocupado ? slot.patente : (isDed && slot.cfg_patente ? slot.cfg_patente : '');
      const displayNom = slot.ocupado ? ((slot.nombre||'').split(' ').slice(-1)[0]||'') : (isBloq ? 'BLOQ' : isDed ? 'DED' : '');
      const isAdm = STATE.profile?.rol === 'administrador';
      const isPatio = STATE.profile?.rol === 'operador_patio';
      // carros_cargados son read-only para patio (vienen del flujo de andén)
      const slotReadOnly = isPatio && playaTipo === 'carros_cargados';
      const clickAction = slotReadOnly ? 'verInfoSlot' : isAdm ? 'clickSlotAdmin' : (!isBloq ? 'toggleSlot' : '');
      const actionAttr  = clickAction ? ' data-action="' + clickAction + '" data-id="' + idx + '"' : '';

      svgSlots += '<g class="slot-svg" data-slot="' + slot.id + '"' + actionAttr + ' style="cursor:' + (isBloq&&!isAdm?'not-allowed':'pointer') + ';">';
      svgSlots += '<rect x="' + x + '" y="' + y + '" width="' + slotW + '" height="' + slotH + '" fill="' + fillColor + '" stroke="' + strokeColor + '" stroke-width="' + strokeW + '" rx="2"/>';
      svgSlots += '<text x="' + (x+slotW/2) + '" y="' + (y+13) + '" fill="' + lblColor + '" font-size="8" font-family="Consolas" text-anchor="middle">F' + (f+1) + '-' + String(c2+1).padStart(2,'0') + (badgeIcon?' '+badgeIcon:'') + '</text>';
      if (displayPat) svgSlots += '<text x="' + (x+slotW/2) + '" y="' + (y+25) + '" fill="' + patColor + '" font-size="8" font-family="Consolas" text-anchor="middle" font-weight="bold">' + displayPat + '</text>';
      if (displayNom) svgSlots += '<text x="' + (x+slotW/2) + '" y="' + (y+37) + '" fill="' + lblColor + '" font-size="7" font-family="Consolas" text-anchor="middle">' + displayNom + '</text>';
      svgSlots += '</g>';
    }
  }

  // KPIs â€” compute puro separado del render
  const _kp = computePatioKPIs(STATE.playaSlots, STATE.docks);
  const libres        = _kp.libres;
  const ocupados      = _kp.ocupados;
  const slotsCargados = _kp.slotsCargados;
  const slotsEspera   = _kp.slotsEspera;
  const totalSlots    = _kp.totalSlots;
  const utilSlots     = _kp.utilSlots;
  const docksTotal    = _kp.docksTotal;
  const docksLibres   = _kp.docksLibres;
  const docksOcupados = _kp.docksOcupados;
  const utilAndenes   = _kp.utilAndenes;

  const cont = document.getElementById('patio-content');
  if (!cont) return;

  cont.innerHTML = `
    <!-- KPIs ESTACIONAMIENTO -->
    <div style="padding:6px 8px 0;"><div style="font-size:9px;letter-spacing:3px;color:var(--tx-dim);padding-bottom:4px;">â–£ ESTACIONAMIENTO</div></div>
    <div class="kpi-row" style="grid-template-columns:repeat(5,1fr);padding:0 8px 6px;">
      <div class="kpi ok"><div class="kpi-lbl">Slots Libres</div><div class="kpi-val">${libres}</div><div class="kpi-sub">de ${totalSlots}</div></div>
      <div class="kpi warn"><div class="kpi-lbl">Ocupados</div><div class="kpi-val">${ocupados}</div></div>
      <div class="kpi" style="border-color:var(--c-warn);"><div class="kpi-lbl">ðŸ“¦ Cargados</div><div class="kpi-val" style="color:var(--c-warn);">${slotsCargados}</div></div>
      <div class="kpi" style="border-color:var(--c-info);"><div class="kpi-lbl">â³ En Espera</div><div class="kpi-val" style="color:var(--c-info);">${slotsEspera}</div></div>
      <div class="kpi info"><div class="kpi-lbl">Utilización</div><div class="kpi-val">${utilSlots}%</div></div>
    </div>
    <!-- KPIs ANDENES -->
    <div style="padding:2px 8px 0;"><div style="font-size:9px;letter-spacing:3px;color:var(--tx-dim);padding-bottom:4px;">â–¦ ANDENES</div></div>
    <div class="kpi-row" style="grid-template-columns:repeat(4,1fr);padding:0 8px 8px;">
      <div class="kpi ok"><div class="kpi-lbl">Libres</div><div class="kpi-val">${docksLibres}</div><div class="kpi-sub">de ${docksTotal}</div></div>
      <div class="kpi warn"><div class="kpi-lbl">Ocupados</div><div class="kpi-val">${docksOcupados}</div></div>
      <div class="kpi err"><div class="kpi-lbl">Bloqueados</div><div class="kpi-val">${(STATE.docks || []).filter(d=>d.estado==='blocked').length}</div></div>
      <div class="kpi info"><div class="kpi-lbl">Utilización</div><div class="kpi-val">${utilAndenes}%</div></div>
    </div>
    <div style="padding:0 8px;margin-bottom:4px;">
      <div style="color:var(--tx-muted);font-size:10px;letter-spacing:2px;margin-bottom:4px;">PLAYA DE ESTACIONAMIENTO â€” CLICK EN SLOT PARA ASIGNAR/LIBERAR</div>
      <svg width="${svgW}" height="${svgH}" style="background:var(--bg-bar);border:1px solid var(--border);display:block;max-width:100%;">
        <text x="10" y="24" style="fill:var(--tx-muted);font-size: 8px;font-family:Consolas;">PLAYA MIRAFLORES â€” 72 SLOTS (6 FILAS Ã— 12)</text>
        <text x="${svgW-10}" y="24" style="fill:var(--c-ok);font-size:10px;font-family:Consolas;text-anchor:end;">â–  LIBRE</text>
        <text x="${svgW-70}" y="24" style="fill:var(--c-warn);font-size:10px;font-family:Consolas;text-anchor:end;">â–  CARGADO</text>
        <text x="${svgW-160}" y="24" style="fill:var(--c-info);font-size:10px;font-family:Consolas;text-anchor:end;">â–  ESPERA</text>
        ${svgSlots}
      </svg>
    </div>
    <div style="padding:8px;">
      <div class="ph">MOVIMIENTOS EN PATIO</div>
      <div class="tbl-wrap" style="max-height:150px;">
        <table><thead><tr><th>HORA</th><th>PATENTE</th><th>ORIGEN</th><th>DESTINO</th><th>OPERADOR</th></tr></thead>
        <tbody>${STATE.movements ? STATE.movements.map(m => `<tr>
          <td class="c-dim">${fmtTime(m.hora)}</td>
          <td class="c-bright">${m.patente}</td>
          <td>${m.origen}</td>
          <td>${m.destino}</td>
          <td class="c-dim">${m.operador}</td>
        </tr>`).join('') : ''}</tbody>
        </table>
      </div>
    </div>`;
}

function toggleSlot(idx) {
  const slot = STATE.playaSlots[idx];
  if (!slot.ocupado) {
    // Si viene de openNewPlaya con tipo pendiente, usarlo
    const tipoAsignar = STATE._pendingSlotTipo || null;
    const pat = prompt('Ingrese patente a asignar al slot F' + slot.fila + '-' + String(slot.col).padStart(2,'0') + ':');
    if (!pat) return;
    slot.ocupado = true;
    slot.patente = pat.toUpperCase();
    slot.playa_tipo = tipoAsignar;
    const carr = (STATE.carriers || []).find(x => x.codigo === slot.patente);
    slot.ruta   = carr?.numero_ruta || null;
    slot.nombre = carr?.nombre || null;
    slot.tipo   = carr?.tipo || null;
    slot.estado = carr?.estado || '';
    Audio.play('ok');
    const tipoLabel = tipoAsignar === 'carros_cargados' ? ' [ðŸ“¦ CARGADO]' : tipoAsignar === 'en_espera' ? ' [â³ ESPERA]' : '';
    notify('âœ“ Slot F' + slot.fila + '-' + String(slot.col).padStart(2,'0') + ' asignado: ' + slot.patente + tipoLabel, 'ok');
    STATE._pendingSlotTipo = null;
    closeModal('modal-agregar-slot');
  } else {
    // carros_cargados sólo se liberan si no es patio (flujo de trazabilidad)
    if (slot.playa_tipo === 'carros_cargados' && STATE.profile?.rol === 'operador_patio') {
      verInfoSlot(idx); return;
    }
    if (!confirm('Â¿Liberar slot de ' + slot.patente + '?')) return;
    slot.ocupado = false; slot.patente = null; slot.ruta = null; slot.nombre = null;
    slot.tipo = null; slot.estado = ''; slot.playa_tipo = null;
    Audio.play('warn');
    notify('⚠  Slot liberado', 'warn');
  }
  renderPatio();
}

function seleccionarTipoSlot(tipo) {
  STATE._pendingSlotTipo = tipo;
  const labels = { carros_cargados:'ðŸ“¦ PLAYA CARROS CARGADOS', en_espera:'â³ PLAYA CARROS EN ESPERA', libre:'â—» SIN RESTRICCIONES' };
  const btnIds = { carros_cargados:'btn-tipo-cargado', en_espera:'btn-tipo-espera', libre:'btn-tipo-libre' };
  // Highlight seleccionado
  ['btn-tipo-cargado','btn-tipo-espera','btn-tipo-libre'].forEach(function(id){
    const el = document.getElementById(id);
    if (el) el.style.outline = id === btnIds[tipo] ? '2px solid var(--c-accent)' : 'none';
  });
  const sel = document.getElementById('agregar-slot-seleccion');
  const lbl = document.getElementById('agregar-slot-tipo-label');
  if (sel) sel.style.display = 'block';
  if (lbl) lbl.textContent = labels[tipo] || tipo;
  // Cerrar modal y activar modo selección en mapa
  setTimeout(function(){
    closeModal('modal-agregar-slot');
    notify('âœ“ Tipo "' + (labels[tipo]||tipo) + '" seleccionado â€” haga clic en un slot libre del mapa', 'info', 4000);
    renderPatio();
  }, 600);
}

function verInfoSlot(idx) {
  const slot = STATE.playaSlots[idx];
  if (!slot) return;
  const tipoLabel = slot.playa_tipo === 'carros_cargados' ? 'ðŸ“¦ CARRO CARGADO' : slot.playa_tipo === 'en_espera' ? 'â³ EN ESPERA' : 'â—» GENERAL';
  notify('™¹ Slot F' + slot.fila + '-' + String(slot.col).padStart(2,'0') + ' · ' + (slot.patente||'â€”') + ' · ' + tipoLabel + (slot.ruta?' · Ruta: '+slot.ruta:''), 'info', 5000);
}


function renderZone(containerId, zones) {
  const c = document.getElementById(containerId);
  if (!c) return;
  const visits = (STATE.visits || []).filter(v => zones.some(z => v.zona_actual?.includes(z)));
  c.innerHTML = visits.length
    ? visits.map(v => `
      <div style="border:1px solid var(--border);padding:5px 8px;margin-bottom:4px;">
        <div style="color:var(--tx-head);font-size: 9px;">${v.patente}</div>
        <div class="c-dim fz10">${v.carrier_nombre || 'â€”'} · ${fmtTime(v.hora_ingreso)}</div>
        <span class="badge ${v.tipo === 'primaria' ? 'b-info' : 'b-warn'}">${v.tipo?.toUpperCase()}</span>
      </div>`).join('')
    : '<span class="c-dim fz10">Sin camiones en esta zona</span>';
}

function renderMovements() {
  const tbody = document.getElementById('movements-tbl');
  if (!tbody) return;
  const movs = STATE.usingSeed ? SEED.movements : [];
  tbody.innerHTML = movs.length
    ? movs.map(m => `<tr>
        <td class="c-dim">${fmtTime(m.hora)}</td>
        <td class="c-bright">${m.patente}</td>
        <td>${m.origen?.replace(/_/g,' ').toUpperCase()}</td>
        <td>${m.destino?.replace(/_/g,' ').toUpperCase()}</td>
        <td class="c-dim">${m.operador}</td>
        <td class="c-dim">${m.motivo}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="c-dim tc">Sin movimientos registrados hoy</td></tr>';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TURNOMÃTICO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderTurno() {
  initTurnoEventDelegation();
  renderQueueList();
  renderQueueHistory();
}

function renderQueueList() {
  const c = document.getElementById('queue-list');
  if (!c) return;
  const active = (STATE.queueTickets || []).filter(t => ['esperando','llamado','en_maniobra'].includes(t.estado));
  set('queue-active-count', active.length);
  c.innerHTML = active.length ? '' : '<span class="c-dim fz10">Cola vacía âœ“</span>';
  active.sort((a, b) => (b.prioridad - a.prioridad) || new Date(a.hora_creacion) - new Date(b.hora_creacion));
  active.forEach((t, i) => {
    const elapsed = Math.round((Date.now() - new Date(t.hora_creacion)) / 60000);
    const urgent = elapsed > (STATE.params?.sla_max || 60);
    const pct = Math.min(100, elapsed / STATE.params.sla_max * 100);
    c.innerHTML += `
      <div class="queue-item ${urgent ? 'urgent' : ''}">
        <div class="qi-pos" style="color:${urgent ? 'var(--c-err)' : 'var(--tx-muted)'}">${i+1}</div>
        <div class="qi-data">
          <div class="qi-truck">${t.patente || 'â€”'}</div>
          <div class="qi-sub">${t.tipo_operacion?.replace(/_/g,' ').toUpperCase() || ''}</div>
          <div class="progress-bar" style="width:140px;margin-top:3px;">
            <div class="progress-fill ${urgent ? 'err' : pct > 60 ? 'warn' : ''}" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="qi-wait">
          <div class="qi-min" style="color:${urgent ? 'var(--c-err)' : 'var(--c-warn)'}">${elapsed}</div>
          <div class="qi-label">MIN</div>
        </div>
        <div>
          <button class="btn btn-ok" style="font-size:9px;padding:2px 5px;" data-action="llamarTicket" data-id="${t.id}">LLAMAR</button>
          <button class="btn btn-err" style="font-size:9px;padding:2px 5px;" data-action="cancelarTicket" data-id="${t.id}">CANCEL</button>
        </div>
      </div>`;
  });
}

function renderQueueHistory() {
  const tbody = document.getElementById('queue-history-tbl');
  if (!tbody) return;
  const history = (STATE.queueTickets || []).filter(t => ['atendido','cancelado','vencido'].includes(t.estado));
  tbody.innerHTML = history.length
    ? history.map((t, i) => `<tr>
        <td class="c-dim">${i+1}</td>
        <td class="c-bright">${t.patente}</td>
        <td class="c-dim">${t.tipo_operacion?.replace(/_/g,' ') || 'â€”'}</td>
        <td>${t.minutos_espera || 'â€”'} min</td>
        <td><span class="badge badge-${t.estado === 'atendido' ? 'ok' : 'err'}">${t.estado?.toUpperCase()}</span></td>
        <td class="c-dim">${t.dock_id ? (STATE.docks || []).find(d => d.id === t.dock_id)?.codigo || 'â€”' : 'â€”'}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="c-dim tc">Sin historial hoy</td></tr>';
}

async function llamarTicket(ticketId) {
  const t = (STATE.queueTickets || []).find(x => x.id === ticketId);
  if (!t) return;
  const dock = buscarAndenCompatible(t.tipo_operacion === 'carga' ? 'secundaria' : 'primaria', t.tipo_carga || 'seco');
  if (!dock) { notify('No hay andenes compatibles disponibles para este ticket', 'warn'); return; }

  if (STATE.usingSeed) {
    t.estado = 'llamado'; t.dock_id = dock.id; t.hora_llamado = new Date().toISOString();
    dock.estado = 'busy'; dock.truck_id = t.visit_id; dock.inicio_ocupacion = new Date().toISOString();
  } else {
    await sb.from('queue_tickets').update({
      estado: 'llamado', dock_id: dock.id, hora_llamado: new Date().toISOString(),
    }).eq('id', ticketId);
    await sb.from('docks').update({ estado: 'busy', truck_id: t.visit_id, inicio_ocupacion: new Date().toISOString() }).eq('id', dock.id);
    await auditLog('dock', 'TICKET_LLAMADO', `Ticket ${t.patente} â†’ Andén ${dock.codigo}`);
  }
  Audio.play('dock_free');
  notify(`${t.patente} llamado a Andén ${dock.codigo}`, 'ok');
  renderTurno(); renderAndenes();
}

async function cancelarTicket(ticketId) {
  const t = (STATE.queueTickets || []).find(x => x.id === ticketId);
  if (!t) return;
  if (STATE.usingSeed) t.estado = 'cancelado';
  else await sb.from('queue_tickets').update({ estado: 'cancelado' }).eq('id', ticketId);
  notify(`Ticket ${t.patente} cancelado`, 'warn');
  renderTurno();
}

function refreshQueue() { loadQueue().then(() => renderTurno()); }

function saveSLA() {
  STATE.params.sla_min = parseInt(document.getElementById('sla-min').value) || 5;
  STATE.params.sla_max = parseInt(document.getElementById('sla-max').value) || 60;
  notify('Parámetros SLA guardados', 'ok');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TAREAS EN VIVO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderTareas() {
  initTareasEventDelegation();
  var rol = STATE.profile?.rol;
  var isMobile = MOBILE_ROLES.includes(rol) || document.body.getAttribute('data-mobile') === 'true';
  var deskHdr   = document.getElementById('tareas-desktop-hdr');
  var mobileHdr = document.getElementById('tareas-mobile-hdr');
  var deskLayout= document.getElementById('tareas-desktop-layout');
  var mobLayout = document.getElementById('tareas-mobile-layout');
  if (isMobile && deskLayout && mobLayout) {
    if (deskHdr)   deskHdr.style.display   = 'none';
    if (mobileHdr) mobileHdr.style.display = 'block';
    deskLayout.style.display = 'none';
    mobLayout.style.display  = 'block';
    renderTareasMobile();
    return;
  }
  if (deskHdr)   deskHdr.style.display   = '';
  if (mobileHdr) mobileHdr.style.display = 'none';
  if (deskLayout) deskLayout.style.display = 'block';
  if (mobLayout)  mobLayout.style.display  = 'none';
  // Activar filtro inicial si no está seteado
  setTaskFilter(_taskFilter || 'todos');
}

function openNewTask() {
  var tipoSel=document.getElementById('task-tipo'); if(tipoSel)tipoSel.value='';
  var truckSel=document.getElementById('task-truck'); if(truckSel)truckSel.innerHTML='<option value="">â€” Primero seleccione el tipo â€”</option>';
  var infoEl=document.getElementById('task-logica-info'); if(infoEl)infoEl.style.display='none';
  var infoTruck=document.getElementById('task-truck-info'); if(infoTruck)infoTruck.style.display='none';
  var msgEl=document.getElementById('task-form-msg'); if(msgEl){msgEl.style.display='none';msgEl.textContent='';}
  var andWrap=document.getElementById('task-anden-dest-wrap'); if(andWrap)andWrap.style.display='none';
  document.getElementById('modal-task').style.display='flex';
}

// Función crearTarea() movida a la línea 12512 (versión mejorada con safeWrite)

async function completarTarea(taskId) {
  const t = (STATE.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  if (STATE.usingSeed) t.estado = 'completada';
  else {
    const validation = validateStateTransition('yard_tasks', t.estado, 'completada', STATE.user?.id);
    if (!validation.valid) { notify('âŒ ' + validation.reason, 'error'); return; }

    const { data, error } = await sb.from('yard_tasks')
      .update({ estado: 'completada', hora_fin: new Date().toISOString() })
      .eq('id', taskId)
      .eq('estado', t.estado)
      .select().single();

    if (!data) {
      notify('⚠ ï¸  Cambio simultáneo de otro usuario. Recargando...', 'warn');
      await loadTasks();
      return;
    }

    await auditLog('task', 'TAREA_COMPLETADA', `Tarea ${t.tipo?.replace(/_/g,' ')} completada`);
  }
  notify('Tarea completada', 'ok');
  Audio.play('accepted');
  renderTareas();
}

async function cancelarTarea(taskId) {
  const t = (STATE.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  if (STATE.usingSeed) t.estado = 'cancelada';
  else {
    const validation = validateStateTransition('yard_tasks', t.estado, 'cancelada', STATE.user?.id);
    if (!validation.valid) { notify('âŒ ' + validation.reason, 'error'); return; }

    const { data } = await sb.from('yard_tasks')
      .update({ estado: 'cancelada' })
      .eq('id', taskId)
      .eq('estado', t.estado)
      .select().single();

    if (!data) {
      notify('⚠ ï¸  Cambio simultáneo de otro usuario. Recargando...', 'warn');
      await loadTasks();
      return;
    }
  }
  notify('Tarea cancelada', 'warn');
  renderTareas();
}

// â”€â”€ OFERTA A OPERADOR PATIO (Uber style) â”€â”€
let currentOfferTaskId = null;

function ofertarTareaOperador(task) {
  if (!task) return;
  STATE.pendingTaskOffer = task;
  STATE.uberCurrentTask  = task;
  const fields = document.getElementById('tob-fields');
  const sla = document.getElementById('tob-sla');
  if (fields) {
    fields.innerHTML = `
      <div class="tob-field"><span class="tob-label">Tipo</span><span class="tob-val">${(task.tipo||'').replace(/_/g,' ').toUpperCase()}</span></div>
      <div class="tob-field"><span class="tob-label">Patente</span><span class="tob-val">${task.patente||'â€”'}</span></div>
      <div class="tob-field"><span class="tob-label">Origen</span><span class="tob-val">${task.zona_origen||'â€”'}</span></div>
      <div class="tob-field"><span class="tob-label">Destino</span><span class="tob-val">${task.zona_destino||'â€”'}</span></div>
      <div class="tob-field"><span class="tob-label">Prioridad</span><span class="tob-val">${(task.prioridad||'normal').toUpperCase()}</span></div>`;
  }
  if (sla) sla.textContent = 'SLA: ' + (task.sla_minutos || (STATE.params?.task_sla || 20) || 20) + ' min';
  document.getElementById('task-offer-overlay')?.classList.add('show');
  Audio.play('new_task');
}

async function aceptarTarea() {
  if (!STATE.pendingTaskOffer) return;
  const task = STATE.pendingTaskOffer;

  // Actualizar STATE local inmediatamente (para que abrirCarroCargado encuentre la tarea)
  const tLocal = (STATE.tasks || []).find(x => x.id === task.id);
  if (tLocal) {
    tLocal.estado = 'en_ejecucion';
    tLocal.operador_nombre = STATE.profile?.nombre;
    tLocal.operador_id = STATE.profile?.id || STATE.user?.id;
    tLocal.hora_aceptacion = new Date().toISOString();
  } else {
    // Si no estaba en STATE (primer load aÃºn no completó), agregarlo
    STATE.tasks.unshift({
      ...task, estado: 'en_ejecucion',
      operador_nombre: STATE.profile?.nombre,
      operador_id: STATE.profile?.id || STATE.user?.id,
      hora_aceptacion: new Date().toISOString(),
    });
  }

  if (!STATE.usingSeed) {
    try {
      const validation = validateStateTransition('yard_tasks', task.estado, 'en_ejecucion', STATE.user?.id);
      if (!validation.valid) {
        notify('âŒ ' + validation.reason, 'error');
        tLocal.estado = task.estado; tLocal.operador_id = task.operador_id;
        return;
      }

      const { data } = await sb.from('yard_tasks')
        .update({
          estado: 'en_ejecucion', operador_id: STATE.user?.id,
          hora_aceptacion: new Date().toISOString(),
        })
        .eq('id', task.id)
        .eq('estado', task.estado)
        .select().single();

      if (!data) {
        notify('⚠ ï¸  Otro operador aceptó esta tarea primero. Recargando...', 'warn');
        await loadTasks();
        return;
      }
    } catch(e) { console.warn('aceptarTarea update:', e.message); }
  }

  document.getElementById('task-offer-overlay').classList.remove('show');
  STATE.pendingTaskOffer = null;
  Audio.play('accepted');
  notify('Tarea aceptada: ' + (task.tipo?.replace(/_/g,' ') || ''), 'ok');
  renderTareas();

  // Si es retiro de andén o movimiento a carros vacíos, abrir modal de registro pallet/precinto
  const esRetiro = task.tipo === 'retirar_anden' || task.tipo === 'anden_a_carros_vacios' || task.zona_destino === 'carros_cargados' || task.zona_destino === 'estacionamiento_carros_vacios';
  if (esRetiro) {
    setTimeout(function() { abrirCarroCargado(task.id); }, 300);
  }
}

async function rechazarTarea() {
  if (!STATE.pendingTaskOffer) return;
  const task = STATE.pendingTaskOffer;
  document.getElementById('task-offer-overlay').classList.remove('show');
  STATE.pendingTaskOffer = null;

  // Volver a estado 'ofertada' para que otro operador pueda tomarla
  if (!STATE.usingSeed) {
    const validation = validateStateTransition('yard_tasks', task.estado, 'ofertada', STATE.user?.id);
    if (!validation.valid) { notify('âŒ ' + validation.reason, 'error'); return; }

    const { data } = await sb.from('yard_tasks')
      .update({
        estado: 'ofertada',
        operador_id: null,
      })
      .eq('id', task.id)
      .eq('estado', task.estado)
      .select().single();

    if (!data) {
      notify('⚠ ï¸  Tarea fue modificada por otro usuario. Recargando...', 'warn');
      await loadTasks();
      return;
    }
  } else {
    const t = (STATE.tasks || []).find(x => x.id === task.id);
    if (t) { t.estado = 'ofertada'; t.operador_id = null; t.operador_nombre = null; }
  }

  notify('Tarea rechazada â€” disponible para otro operador', 'warn');

  // Re-ofertar a otro operador patio disponible (modo seed: mostrar al usuario actual si no hay otro)
  if (STATE.usingSeed) {
    const pendingTask = (STATE.tasks || []).find(x => x.id === task.id);
    if (pendingTask) setTimeout(() => mostrarUberTaskPatio(pendingTask), 5000);
  }

  renderTareas();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  DEVOLUCIONES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderDevoluciones() {
  initDevolucionesEventDelegation();
  var roles_autorizados=['administrador','jefe_ops','administrativo_ops'];
  var puedeAutorizar=roles_autorizados.includes(STATE.profile?.rol);
  var pending=document.getElementById('devol-pending-tbl');
  var history=document.getElementById('devol-history-tbl');
  if(!pending||!history)return;
  var bannerEl=document.getElementById('devol-flujo-banner');
  if(bannerEl)bannerEl.innerHTML='<div style="background:var(--bg-alt);border-left:3px solid var(--c-warn);padding:8px 14px;font-size: 8px;margin-bottom:10px;"><strong style="color:var(--c-warn);">⚠  REQUISITO DE FLUJO YMS</strong><br>Solo devoluciones de camiones que completaron: Playa â†’ Andén â†’ Carros cargados (con sello)</div>';

  const pend = (STATE.returns || []).filter(r => r.estado === 'pendiente');
  const hist = (STATE.returns || []).filter(r => r.estado !== 'pendiente');

  pending.innerHTML = pend.length
    ? pend.map(r => `<tr>
        <td class="c-bright">${Utils.esc(r.numero_ruta || 'â€”')}</td>
        <td class="c-bright">${Utils.esc(r.patente || 'â€”')}</td>
        <td class="c-dim">${Utils.esc(r.carrier_nombre || 'â€”')}</td>
        <td>${Utils.esc(r.motivo?.replace(/_/g,' ') || 'â€”')}</td>
        <td class="c-dim">${fmtTime(r.hora_solicitud)}</td>
        <td>${Utils.esc(r.pallets_devolucion)} plt</td>
        <td><span class="badge badge b-warn">PENDIENTE</span></td>
        <td>
          ${puedeAutorizar
            ? `<button class="btn btn-ok" style="font-size:9px;padding:2px 5px;" data-action="abrirDevol" data-id="${r.id}" data-arg2="aprobar">APROBAR</button>
               <button class="btn btn-err" style="font-size:9px;padding:2px 5px;" data-action="abrirDevol" data-id="${r.id}" data-arg2="rechazar">RECHAZAR</button>`
            : '<span class="c-dim fz10">Sin permiso</span>'}
        </td>
      </tr>`).join('')
    : '<tr><td colspan="8" class="c-dim tc">Sin devoluciones pendientes</td></tr>';

  history.innerHTML = hist.length
    ? hist.map(r => `<tr>
        <td class="c-bright">${Utils.esc(r.numero_ruta || 'â€”')}</td>
        <td class="c-bright">${Utils.esc(r.patente || 'â€”')}</td>
        <td><span class="badge badge-${r.estado === 'aprobada' ? 'ok' : 'err'}">${Utils.esc(r.estado?.toUpperCase())}</span></td>
        <td class="c-dim">${Utils.esc(r.motivo?.replace(/_/g,' ') || 'â€”')}</td>
        <td class="c-dim">${Utils.esc(r.autorizado_por_nombre || 'â€”')}</td>
        <td class="c-dim">${r.hora_resolucion ? fmtTime(r.hora_resolucion) : 'â€”'}</td>
        <td class="c-dim">${Utils.esc(r.comentario) || 'â€”'}</td>
      </tr>`).join('')
    : '<tr><td colspan="7" class="c-dim tc">Sin historial</td></tr>';
}

let currentDevolId = null, currentDevolAction = null;

function abrirDevol(id, action) {
  currentDevolId = id;
  currentDevolAction = action;
  var r = (STATE.returns || []).find(function(x){ return x.id === id; });
  if (!r) return;
  if (action === 'aprobar') {
    var val = validarElegibleDevolucion(r.patente);
    if (!val.elegible) { Audio.play('error'); notify('â›” ' + val.motivo, 'error', 8000); return; }
  }

  document.getElementById('devol-modal-title').textContent =
    (action === 'aprobar' ? 'APROBAR' : 'RECHAZAR') + ' DEVOLUCIÃ“N';
  document.getElementById('devol-info').innerHTML = `
    <div class="tob-field"><span class="tob-label">Ruta:</span><span class="tob-val">${escHtml(r.numero_ruta)}</span></div>
    <div class="tob-field"><span class="tob-label">Patente:</span><span class="tob-val">${escHtml(r.patente)}</span></div>
    <div class="tob-field"><span class="tob-label">Motivo:</span><span class="tob-val">${escHtml(r.motivo?.replace(/_/g,' '))}</span></div>
    <div class="tob-field"><span class="tob-label">Pallets:</span><span class="tob-val">${escHtml(String(r.pallets_devolucion))}</span></div>
    <div class="tob-field"><span class="tob-label">Comentario:</span><span class="tob-val">${escHtml(r.comentario) || 'â€”'}</span></div>`;
  document.getElementById('devol-comentario').value = '';

  const btns = document.getElementById('devol-accion-btns');
  btns.innerHTML = `
    <button class="btn ${action === 'aprobar' ? 'btn-ok' : 'btn-err'}" onclick="confirmarDevol()">
      ${action === 'aprobar' ? 'âœ“ CONFIRMAR APROBACIÃ“N' : 'âœ• CONFIRMAR RECHAZO'}
    </button>`;

  document.getElementById('modal-devol').style.display = 'flex';
}

async function confirmarDevol() {
  const comentario = document.getElementById('devol-comentario').value.trim();
  if (!comentario) { notify('El comentario es obligatorio', 'error'); return; }

  const r = (STATE.returns || []).find(x => x.id === currentDevolId);
  if (!r) return;

  const nuevoEstado = currentDevolAction === 'aprobar' ? 'aprobada' : 'rechazada';

  if (STATE.usingSeed) {
    r.estado = nuevoEstado;
    r.comentario = comentario;
    r.autorizado_por_nombre = STATE.profile.nombre;
    r.hora_resolucion = new Date().toISOString();
    STATE.auditLog.unshift({
      id: 'a' + Date.now(), categoria: 'devol',
      evento: nuevoEstado === 'aprobada' ? 'DEVOLUCION_APROBADA' : 'DEVOLUCION_RECHAZADA',
      detalle: `Ruta ${r.numero_ruta} / ${r.patente} â€” ${comentario}`,
      user_nombre: STATE.profile.nombre,
      created_at: new Date().toISOString(),
    });
  } else {
    await sb.from('return_authorizations').update({
      estado: nuevoEstado, comentario, autorizado_por: STATE.user?.id,
      hora_resolucion: new Date().toISOString(),
    }).eq('id', currentDevolId);
    await auditLog('devol',
      nuevoEstado === 'aprobada' ? 'DEVOLUCION_APROBADA' : 'DEVOLUCION_RECHAZADA',
      `Ruta ${r.numero_ruta} â€” ${comentario}`);
  }

  closeModal('modal-devol');
  notify(`Devolución ${nuevoEstado}`, nuevoEstado === 'aprobada' ? 'ok' : 'warn');
  Audio.play(nuevoEstado === 'aprobada' ? 'accepted' : 'error');
  renderDevoluciones();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  REPORTES Y KPIs
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function loadReports() {
  const kpis = document.getElementById('rpt-kpis');
  const totalIngresos = (STATE.visits || []).length;
  const totalPrimaria = (STATE.visits || []).filter(v => v.tipo === 'primaria').length;
  const totalSecundaria = (STATE.visits || []).filter(v => v.tipo === 'secundaria').length;
  const completadas = (STATE.tasks || []).filter(t => t.estado === 'completada').length;
  const vencidas = (STATE.tasks || []).filter(t => t.estado === 'vencida').length;
  const aprobadas = (STATE.returns || []).filter(r => r.estado === 'aprobada').length;
  const rechazadas = (STATE.returns || []).filter(r => r.estado === 'rechazada').length;
  const util = (STATE.docks || []).length
    ? Math.round((STATE.docks || []).filter(d => d.estado === 'busy').length / (STATE.docks || []).length * 100) : 0;

  kpis.innerHTML = `
    <div class="kpi info"><div class="kpi-lbl">Total Ingresos</div><div class="kpi-val">${totalIngresos}</div><div class="kpi-sub">en período</div></div>
    <div class="kpi info"><div class="kpi-lbl">Primaria</div><div class="kpi-val">${totalPrimaria}</div><div class="kpi-sub">ramplas</div></div>
    <div class="kpi warn"><div class="kpi-lbl">Secundaria</div><div class="kpi-val">${totalSecundaria}</div><div class="kpi-sub">retornos</div></div>
    <div class="kpi ok"><div class="kpi-lbl">Tareas OK</div><div class="kpi-val">${completadas}</div><div class="kpi-sub">completadas</div></div>
    <div class="kpi err"><div class="kpi-lbl">Tareas Vencidas</div><div class="kpi-val">${vencidas}</div></div>
    <div class="kpi ok"><div class="kpi-lbl">Devol. Aprobadas</div><div class="kpi-val">${aprobadas}</div></div>
    <div class="kpi err"><div class="kpi-lbl">Devol. Rechazadas</div><div class="kpi-val">${rechazadas}</div></div>
    <div class="kpi info ${util > 80 ? 'err' : 'ok'}"><div class="kpi-lbl">Util. Andenes</div><div class="kpi-val">${util}%</div></div>`;

  // Dwell por empresa
  const dwellTbl = document.getElementById('rpt-dwell-tbl');
  if (dwellTbl) {
    const byCarrier = {};
    (STATE.visits || []).forEach(v => {
      const k = v.carrier_nombre || 'Desconocido';
      if (!byCarrier[k]) byCarrier[k] = { visits: 0, totalDwell: 0, maxDwell: 0 };
      const dwell = Number.isFinite(v.dwell_minutes) ? v.dwell_minutes :
        (v.hora_salida && v.hora_ingreso ? Math.round((new Date(v.hora_salida) - new Date(v.hora_ingreso)) / 60000) : 0);
      byCarrier[k].visits++;
      byCarrier[k].totalDwell += dwell;
      byCarrier[k].maxDwell = Math.max(byCarrier[k].maxDwell, dwell);
    });
    dwellTbl.innerHTML = Object.entries(byCarrier).map(([k, v]) => `<tr>
      <td>${k}</td><td>${v.visits}</td>
      <td>${v.visits > 0 ? Math.round(v.totalDwell / v.visits) || 'â€”' : 'â€”'} min</td>
      <td>${v.maxDwell || 'â€”'} min</td>
    </tr>`).join('') || '<tr><td colspan="4" class="c-dim tc">Sin datos</td></tr>';
  }

  // Desempeño operadores
  const opsTbl = document.getElementById('rpt-ops-tbl');
  if (opsTbl) {
    const byOp = {};
    (STATE.tasks || []).forEach(t => {
      if (!t.operador_nombre) return;
      if (!byOp[t.operador_nombre]) byOp[t.operador_nombre] = { total: 0, ok: 0, vencidas: 0 };
      byOp[t.operador_nombre].total++;
      if (t.estado === 'completada') byOp[t.operador_nombre].ok++;
      if (t.estado === 'vencida') byOp[t.operador_nombre].vencidas++;
    });
    opsTbl.innerHTML = Object.entries(byOp).length
      ? Object.entries(byOp).map(([k, v]) => `<tr>
          <td>${k}</td><td>${v.total}</td><td class="c-ok">${v.ok}</td>
          <td class="c-err">${v.vencidas}</td><td>â€”</td>
        </tr>`).join('')
      : '<tr><td colspan="5" class="c-dim tc">Sin datos de operadores</td></tr>';
  }

  // Por hora â€” derivado de STATE.visits
  const hourTbl = document.getElementById('rpt-hour-tbl');
  if (hourTbl) {
    const hours = Array.from({length:18}, (_,i) => i + 6); // 06:00 - 23:00
    const countByHour = (type) => (h) => (STATE.visits || []).filter(v => {
      const d = new Date(type === 'in' ? v.hora_ingreso : v.hora_salida);
      return !isNaN(d) && d.getHours() === h;
    }).length;
    const inByHour  = countByHour('in');
    const outByHour = countByHour('out');
    hourTbl.innerHTML = hours.map(h => {
      const inCount  = inByHour(h);
      const outCount = outByHour(h);
      const total    = inCount + outCount;
      const pct      = (STATE.visits || []).length > 0 ? Math.round(total / Math.max((STATE.visits || []).length, 1) * 100) : 0;
      return `<tr>
        <td>${String(h).padStart(2,'0')}:00 - ${String(h+1).padStart(2,'0')}:00</td>
        <td class="c-ok">${inCount}</td><td class="c-warn">${outCount}</td>
        <td><span class="badge badge-${pct > 75 ? 'err' : pct > 50 ? 'warn' : 'ok'}">${pct}%</span></td>
      </tr>`;
    }).join('');
  }

  // Resumen devoluciones
  const devolTbl = document.getElementById('rpt-devol-tbl');
  if (devolTbl) {
    const apr = (STATE.returns || []).filter(r => r.estado === 'aprobada').length;
    const rec = (STATE.returns || []).filter(r => r.estado === 'rechazada').length;
    const pend = (STATE.returns || []).filter(r => r.estado === 'pendiente').length;
    devolTbl.innerHTML = `<tr>
      <td>${new Date().toLocaleDateString('es-CL', { month:'long', year:'numeric' })}</td>
      <td>${(STATE.returns || []).length}</td>
      <td class="c-ok">${apr}</td>
      <td class="c-err">${rec}</td>
    </tr>`;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CHAT EN VIVO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderChat() {
  renderChatUsers();
  document.getElementById('chat-badge').style.display = 'none';
}

function getInitials(nombre) {
  if (!nombre) return '?';
  const parts = nombre.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : nombre[0].toUpperCase();
}

function renderChatUsers() {
  const list = document.getElementById('chat-users-list');
  if (!list) return;
  list.innerHTML = '';
  const myId = STATE.profile?.id;
  const others = (STATE.presence || []).filter(p => p.id !== myId);
  if (!others.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--tx-dim);font-size:10px;">Sin usuarios disponibles</div>';
    return;
  }
  // Set de mensajes ocultados localmente por el usuario actual (soft-delete)
  const hidden = ChatHide.load(myId);
  others.forEach(p => {
    const unread = (STATE.chatMessages || []).filter(m =>
      m.from_id === p.id && m.to_id === myId && !m.leido && !hidden.has(m.id)).length;
    const lastMsg = (STATE.chatMessages || []).filter(m =>
      !hidden.has(m.id) &&
      ((m.from_id === p.id && m.to_id === myId) ||
       (m.from_id === myId && m.to_id === p.id))
    ).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const item = document.createElement('div');
    item.className = 'chat-user-item ' + (p.online ? 'online' : '') + (STATE.chatTarget?.id === p.id ? ' selected' : '');
    item.innerHTML = '<div class="cui-avatar">' + escHtml(getInitials(p.nombre)) +
      (p.online ? '<div class="cui-dot"></div>' : '') + '</div>' +
      '<div class="cui-info">' +
        '<div class="cui-name">' + escHtml(p.nombre || 'â€”') + '</div>' +
        '<div class="cui-rol">' + escHtml(p.rol?.replace(/_/g,' ') || '') + ' · ' + (p.online ? '<span style="color:var(--c-ok)">â— online</span>' : '<span style="color:var(--tx-dim)">â—‹ offline</span>') + '</div>' +
        (lastMsg ? '<div style="font-size:9px;color:var(--tx-dim);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;">' + escHtml(lastMsg.mensaje || '') + '</div>' : '') +
      '</div>' +
      (unread ? '<div class="cui-badge">' + unread + '</div>' : '');
    item.onclick = () => selectChatUser(p);
    list.appendChild(item);
  });
}

function selectChatUser(user) {
  STATE.chatTarget = user;
  // Actualizar header WSP
  const avatar = document.getElementById('chat-target-avatar');
  const name   = document.getElementById('chat-target-name');
  const status = document.getElementById('chat-target-status');
  if (avatar) avatar.textContent = getInitials(user.nombre);
  if (name)   name.textContent   = user.nombre || 'â€”';
  if (status) status.innerHTML   = user.online
    ? '<span style="color:var(--c-ok)">â— en línea</span>'
    : '<span style="color:var(--tx-dim)">â—‹ desconectado</span>';
  const input = document.getElementById('chat-input');
  const btn   = document.getElementById('btn-chat-send');
  if (input) input.disabled = false; // permitir escribir aunque esté offline
  if (btn)   btn.disabled   = false;
  const clearBtn = document.getElementById('btn-chat-clear');
  if (clearBtn) clearBtn.style.display = '';
  renderChatUsers();
  loadChatMessages();
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ChatHide â€” Soft-delete por usuario via localStorage
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Mantiene un Set de IDs de mensajes ocultos POR USUARIO (no globalmente).
   Se usa cuando la RLS de Supabase no permite borrar mensajes recibidos:
   el mensaje sigue existiendo en BD para el otro usuario, pero quien limpió
   ya no lo ve.
   Key: yms_chat_hidden_<myUserId>  Valor: JSON array de message IDs.
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ChatHide = {
  _key: function(userId) { return 'yms_chat_hidden_' + userId; },
  load: function(userId) {
    if (!userId) return new Set();
    try {
      const raw = localStorage.getItem(this._key(userId));
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch(_) { return new Set(); }
  },
  save: function(userId, set) {
    if (!userId) return;
    try { localStorage.setItem(this._key(userId), JSON.stringify(Array.from(set))); }
    catch(_) {}
  },
  hideMany: function(userId, msgIds) {
    const set = this.load(userId);
    msgIds.forEach(function(id){ if (id) set.add(id); });
    this.save(userId, set);
  },
  isHidden: function(userId, msgId) {
    return this.load(userId).has(msgId);
  },
};

async function limpiarChatUsuario() {
  if (!STATE.chatTarget) return;
  const myId = STATE.profile?.id;
  const otherId = STATE.chatTarget.id;
  const otherName = STATE.chatTarget.nombre || 'este usuario';
  if (!confirm('Â¿Borrar TODA la conversación con ' + otherName + '?\n\nEsta acción no se puede deshacer.')) return;

  // 1) Identificar todos los mensajes de la conversación (local + remoto)
  let convMsgs = [];
  if (STATE.usingSeed) {
    convMsgs = SEED.chatMessages.filter(function(m){
      return (m.from_id === myId && m.to_id === otherId) || (m.from_id === otherId && m.to_id === myId);
    });
  } else if (sb) {
    try {
      const { data } = await sb.from('chat_messages')
        .select('id, from_id, to_id')
        .or('and(from_id.eq.' + myId + ',to_id.eq.' + otherId + '),and(from_id.eq.' + otherId + ',to_id.eq.' + myId + ')');
      convMsgs = data || [];
    } catch(_) {
      // Si falla la lectura, usamos lo que tenemos en STATE
      convMsgs = (STATE.chatMessages || []).filter(function(m){
        return (m.from_id === myId && m.to_id === otherId) || (m.from_id === otherId && m.to_id === myId);
      });
    }
  }

  // 2) Intentar borrar de Supabase los que yo envié (los demás los protege la RLS)
  let deletedCount = 0;
  if (!STATE.usingSeed && sb) {
    try {
      const mine = convMsgs.filter(function(m){ return m.from_id === myId; }).map(function(m){ return m.id; });
      if (mine.length) {
        const { error } = await sb.from('chat_messages').delete().in('id', mine);
        if (!error) deletedCount = mine.length;
      }
    } catch(e) { /* RLS u otro â€” no bloquea; caemos al soft-delete local */ }
  } else if (STATE.usingSeed) {
    SEED.chatMessages = SEED.chatMessages.filter(function(m){
      return !((m.from_id === myId && m.to_id === otherId) || (m.from_id === otherId && m.to_id === myId));
    });
  }

  // 3) Soft-delete local: marcar TODOS los IDs de la conversación como ocultos para mí
  const allIds = convMsgs.map(function(m){ return m.id; }).filter(Boolean);
  ChatHide.hideMany(myId, allIds);

  // 4) Limpiar STATE
  STATE.chatMessages = (STATE.chatMessages || []).filter(function(m){
    return !((m.from_id === myId && m.to_id === otherId) || (m.from_id === otherId && m.to_id === myId));
  });

  auditLog('chat', 'CHAT_LIMPIADO',
    'Conversación con ' + otherName + ' ocultada para ' + (STATE.profile?.nombre||'â€”') +
    ' (borrados BD: ' + deletedCount + ' / ocultados local: ' + allIds.length + ')');
  notify('âœ“ Conversación con ' + otherName + ' eliminada', 'ok');
  loadChatMessages();
  renderChatUsers();
}

async function loadChatMessages() {
  initChatEventDelegation();
  if (!STATE.chatTarget) return;
  const myId = STATE.profile?.id;
  const otherId = STATE.chatTarget.id;

  let msgs;
  if (STATE.usingSeed) {
    msgs = SEED.chatMessages.filter(m =>
      (m.from_id === myId && m.to_id === otherId) ||
      (m.from_id === otherId && m.to_id === myId)
    );
  } else {
    const { data } = await sb.from('chat_messages')
      .select('*, from:profiles!chat_messages_from_id_fkey(nombre)')
      .or(`and(from_id.eq.${myId},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${myId})`)
      .order('created_at');
    msgs = (data || []).map(m => ({ ...m, from_nombre: m.from?.nombre }));
    await sb.from('chat_messages').update({ leido: true })
      .eq('from_id', otherId).eq('to_id', myId);
  }
  // Filtrar mensajes que el usuario actual ha ocultado vía "Limpiar chat" (soft-delete)
  const hidden = ChatHide.load(myId);
  if (hidden.size) msgs = msgs.filter(function(m){ return !hidden.has(m.id); });

  // Guardar en STATE para preview en lista
  STATE.chatMessages = [...(STATE.chatMessages || []).filter(m =>
    !((m.from_id===myId&&m.to_id===otherId)||(m.from_id===otherId&&m.to_id===myId))
  ), ...msgs];

  const container = document.getElementById('chat-msgs');
  container.innerHTML = '';
  
  let lastDate = '';
  msgs.forEach(m => {
    const mine = m.from_id === myId;
    const msgDate = m.created_at ? new Date(m.created_at).toLocaleDateString('es-CL') : '';
    
    // Separador de fecha
    if (msgDate && msgDate !== lastDate) {
      lastDate = msgDate;
      const sep = document.createElement('div');
      sep.className = 'chat-date-sep';
      sep.textContent = msgDate === new Date().toLocaleDateString('es-CL') ? 'HOY' : msgDate;
      container.appendChild(sep);
    }
    
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (mine ? 'mine' : 'other');
    const hora = m.created_at ? new Date(m.created_at).toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'}) : '';
    div.innerHTML = (!mine ? '<div class="cm-meta">' + escHtml(m.from_nombre || '?') + '</div>' : '') +
      '<div class="cm-bubble">' + escHtml(m.mensaje) + '</div>' +
      (mine
        ? '<div class="cm-time-row"><span class="cm-time">' + hora + ' <span class="cm-tick">âœ“âœ“</span></span><button class="cm-delete-btn" data-action="deleteChatMsg" data-id="' + m.id + '" title="Borrar mensaje">ðŸ—‘</button></div>'
        : '<div class="cm-time">' + hora + '</div>');
    container.appendChild(div);
  });
  
  if (!msgs.length) {
    container.innerHTML = '<div style="display:flex;flex:1;align-items:center;justify-content:center;flex-direction:column;gap:8px;padding:40px;color:var(--tx-dim);text-align:center;"><div style="font-size: 8px;opacity:0.3;">ðŸ’¬</div><div style="font-size: 8px;">Sin mensajes aÃºn</div></div>';
  }
  container.scrollTop = container.scrollHeight;
  renderChatUsers(); // actualizar preview
}

async function sendChatMsg() {
  if (!STATE.chatTarget) return;
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  const myId = STATE.profile?.id;
  const newMsg = {
    id: 'cm' + Date.now(), from_id: myId, to_id: STATE.chatTarget.id,
    from_nombre: STATE.profile.nombre, mensaje: msg,
    created_at: new Date().toISOString(), leido: false,
  };

  if (STATE.usingSeed) {
    SEED.chatMessages.push(newMsg);
  } else {
    await sb.from('chat_messages').insert({
      from_id: myId, to_id: STATE.chatTarget.id, mensaje: msg,
    });
  }
  input.value = '';
  Audio.play('message');
  loadChatMessages();
}

async function deleteChatMsg(msgId) {
  const myId = STATE.profile?.id;
  const msg = (STATE.chatMessages || []).find(m => m.id === msgId);
  if (!msg || msg.from_id !== myId) { notify('Solo puedes borrar tus propios mensajes', 'warn'); return; }

  if (STATE.usingSeed) {
    SEED.chatMessages = SEED.chatMessages.filter(m => m.id !== msgId);
  } else {
    try {
      await sb.from('chat_messages').delete().eq('id', msgId).eq('from_id', myId);
    } catch(e) { notify('Error al borrar mensaje', 'error'); return; }
  }
  STATE.chatMessages = (STATE.chatMessages || []).filter(m => m.id !== msgId);
  loadChatMessages();
}

// Enter to send
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.id === 'chat-input') sendChatMsg();
  if (e.key === 'Enter' && document.activeElement.id === 'inp-pass') login();
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PRESENCIA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderPresence() {
  const list = document.getElementById('presence-list');
  if (!list) return;
  list.innerHTML = '';
  (STATE.presence || []).forEach(p => {
    const div = document.createElement('div');
    div.className = `presence-user ${p.online ? 'online' : ''}`;
    div.innerHTML = `<div class="dot ${p.online ? 'online' : ''}"></div>${Utils.esc(p.nombre || '?')}`;
    list.appendChild(div);
  });
  set('kpi-online', (STATE.presence || []).filter(p => p.online).length);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  AUDITORÃA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function loadAudit() {
  const filter = document.getElementById('aud-filter')?.value || 'all';
  const container = document.getElementById('audit-list');

  if (!container) {
    console.warn('[YMS] Container #audit-list not found');
    return;
  }

  try {
    container.innerHTML = '<div class=”c-dim tc” style=”padding:16px;”>Cargando auditoría...</div>';

    let logs;
    if (STATE.usingSeed) {
      logs = STATE.auditLog || [];
    } else {
      // Usar repositorio Firestore
      const { getAuditLogs } = await import('./repositories/auditRepository.js');
      logs = await getAuditLogs({ categoria: filter, max: 100 });
    }

    // Filtrar en cliente si es necesario
    const filtered = filter !== 'all' && !STATE.usingSeed ? logs.filter(l => l.categoria === filter) : logs;

    container.innerHTML = filtered.length
      ? filtered.map(l => `
        <div class=”audit-item”>
          <span class=”ai-ts”>${fmtDateTime(l.created_at || l.createdAt)}</span>
          <span class=”ai-event”>${escHtml(l.evento || l.action || 'â€”')}</span>
          <span class=”ai-detail”>${escHtml(l.detalle || l.description || 'â€”')}</span>
          <span class=”ai-user”>${escHtml(l.user_nombre || l.userEmail || 'â€”')}</span>
        </div>`).join('')
      : '<div class=”c-dim tc” style=”padding:16px;”>Sin registros de auditoría</div>';
  } catch (error) {
    console.error('[YMS] Error cargando auditoría:', error);
    container.innerHTML = '<div class=”c-dim tc” style=”padding:16px; color: var(--c-err);”>Error cargando auditoría. Revisa permisos Firestore.</div>';
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CONFIG
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderConfig() {
  // Render tab activo por defecto (andenes)
  renderConfigDocks();
  renderConfigCarriers();
  renderConfigPlantas();
  renderConfigUsuarios();
  renderConfigMotivos();
  renderConfigSistema();
  // Parámetros SLA
  const pm = STATE.params;
  ['cfg-sla-min','cfg-sla-max','cfg-dwell-max','cfg-task-sla'].forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) el.value = [pm.sla_min, pm.sla_max, pm.dwell_max, pm.task_sla][i];
  });
}


async function addCarrier() {
  const codigoEl = document.getElementById('inp-carrier-code');
  const nombreEl = document.getElementById('inp-carrier-nombre');
  const tipoEl   = document.getElementById('inp-carrier-tipo');
  const rutaEl   = document.getElementById('inp-carrier-ruta');
  const estadoEl = document.getElementById('inp-carrier-estado');
  const cdEl     = document.getElementById('inp-carrier-cd');
  const editIdEl = document.getElementById('edit-carrier-id');
  const msgEl    = document.getElementById('carrier-form-msg');

  const codigo  = (codigoEl?.value || '').trim().toUpperCase();
  const nombre  = (nombreEl?.value || '').trim();
  const tipo    = tipoEl?.value || 'Camión';
  const ruta    = (rutaEl?.value || '').trim().toUpperCase();
  const zona    = 'Miraflores';
  const estado  = estadoEl?.value || '';
  const cd      = cdEl?.value || 'CD_SAN_BERNARDO';
  const editId  = editIdEl?.value || '';

  const setCarrierMsg = (txt, color) => {
    if (!msgEl) return;
    msgEl.style.color = color === 'ok' ? 'var(--c-ok)' : color === 'warn' ? 'var(--c-warn)' : 'var(--c-err)';
    msgEl.innerHTML = txt;
  };
  if (msgEl) msgEl.textContent = '';

  // Validaciones con highlight visual, mensaje en formulario y sonido
  if (!codigo) {
    if (codigoEl) { codigoEl.style.borderColor = 'var(--c-err)'; setTimeout(() => codigoEl.style.borderColor = '', 2000); }
    Audio.play('error');
    setCarrierMsg('â›” La patente es obligatoria', 'err');
    notify('â›” La patente es obligatoria', 'error');
    return;
  }
  if (!nombre) {
    if (nombreEl) { nombreEl.style.borderColor = 'var(--c-err)'; setTimeout(() => nombreEl.style.borderColor = '', 2000); }
    Audio.play('error');
    setCarrierMsg('â›” El nombre del conductor es obligatorio', 'err');
    notify('â›” El nombre del conductor es obligatorio', 'error');
    return;
  }
  if (!editId && (STATE.carriers || []).find(x => x.codigo === codigo)) {
    if (codigoEl) { codigoEl.style.borderColor = 'var(--c-warn)'; setTimeout(() => codigoEl.style.borderColor = '', 2000); }
    Audio.play('error');
    setCarrierMsg('â›” La patente ' + codigo + ' ya está registrada', 'err');
    notify('â›” La patente ' + codigo + ' ya está registrada', 'error');
    return;
  }

  setCarrierMsg('âŒ› Guardando...', 'warn');

  try {
    if (editId) {
      const existing = (STATE.carriers || []).find(x => x.id === editId);
      if (existing) Object.assign(existing, { codigo, nombre, tipo, numero_ruta: ruta, zona, estado, cd });
      if (!STATE.usingSeed && sb) {
        const { error } = await sb.from('carriers').update({ codigo, nombre, tipo, numero_ruta: ruta }).eq('id', editId);
        if (error) throw error;
      }
      await auditLog('config', 'TRANSPORTE_ACTUALIZADO', codigo + ' â€” ' + nombre);
      Audio.play('ok');
      setCarrierMsg('âœ… Transporte actualizado: ' + nombre + ' (' + codigo + ')', 'ok');
      notify('âœ“ Transporte actualizado: ' + nombre + ' (' + codigo + ')', 'ok');
    } else {
      const newC = { id: 'c' + Date.now(), codigo, nombre, tipo, numero_ruta: ruta, zona, estado, cd, activo: true };
      if (STATE.usingSeed) {
        STATE.carriers.push(newC);
      } else {
        const { data, error } = await sb.from('carriers').insert({ codigo, nombre, tipo, numero_ruta: ruta, activo: true }).select().single();
        if (error) throw error;
        if (data) STATE.carriers.push({ ...data, cd });
        else STATE.carriers.push({ ...newC, cd });
      }
      await auditLog('config', 'TRANSPORTE_CREADO', codigo + ' â€” ' + nombre + ' / ' + tipo + (cd ? ' / ' + cd : ''));
      Audio.play('ok');
      setCarrierMsg('âœ… Transporte agregado: ' + nombre + ' (' + codigo + ')' + (cd ? ' · ' + cd : ' · Todos los CDs') + ' · Ruta ' + (ruta||'â€”'), 'ok');
      notify('âœ“ Transporte agregado: ' + nombre + ' (' + codigo + ')' + (cd ? ' â€” ' + cd : ''), 'ok');
    }
    setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
    clearCarrierForm();
    renderConfigCarriers();
    populateCarrierSelects();
  } catch(err) {
    Audio.play('error');
    setCarrierMsg('â›” Error al guardar: ' + (err?.message || 'Error desconocido'), 'err');
    notify('â›” Error al guardar transporte: ' + (err?.message || 'Error desconocido'), 'error');
  }
}

function populateCarrierSelects() {
  const opts = (STATE.carriers || []).map(c => `<option value="${c.codigo}" data-nombre="${c.nombre}" data-ruta="${c.numero_ruta}">${c.codigo} â€” ${c.numero_ruta} â€” ${c.nombre}</option>`).join('');
  ['wave-patente','carro-patente'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = '<option value="">-- Seleccionar --</option>' + opts; }
  });
  // trazabilidad empresa filter
  const trz = document.getElementById('trz-empresa');
  if (trz) {
    const unique = [...new Set((STATE.carriers || []).map(c => c.nombre))];
    trz.innerHTML = '<option value="">Todas</option>' + unique.map(n => `<option value="${n}">${n}</option>`).join('');
  }
}

// LEGACY: function saveConfig() {
// LEGACY:   const p = STATE.params;
// LEGACY:   p.sla_min   = parseInt(document.getElementById('cfg-sla-min')?.value)       || 5;
// LEGACY:   p.sla_max   = parseInt(document.getElementById('cfg-sla-max')?.value)       || 60;
// LEGACY:   p.dwell_max = parseInt(document.getElementById('cfg-dwell-max')?.value)     || 180;
// LEGACY:   p.dwell_prox= parseInt(document.getElementById('cfg-dwell-prox')?.value)    || 30;
// LEGACY:   p.task_sla  = parseInt(document.getElementById('cfg-task-sla')?.value)      || 20;
// LEGACY:   const sound = document.getElementById('cfg-sound')?.value;
// LEGACY:   if (sound !== null) STATE.soundEnabled = sound !== '0';
// LEGACY:   localStorage.setItem('yms_params', JSON.stringify(p));
// LEGACY:   Audio.play('ok');
// LEGACY:   notify('âœ“ Configuración guardada · SLA andén: ' + p.sla_max + 'min · Dwell máx: ' + p.dwell_max + 'min · SLA tarea: ' + p.task_sla + 'min', 'ok');
// LEGACY:   auditLog('config', 'PARAMS_GUARDADOS', 'SLA max=' + p.sla_max + 'min, Dwell max=' + p.dwell_max + 'min');
// LEGACY: }
// LEGACY: 
// LEGACY: function openNewUser() {
// LEGACY:   notify('Crear usuarios directamente en Supabase Auth â†’ Users â†’ Invite', 'info', 5000);
// LEGACY: }


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CARROS CARGADOS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderCarros() {
  initPatioEventDelegation();
  populateCarrierSelects();
  // Populate slot selector
  const slotSel = document.getElementById('carro-slot');
  if (slotSel) {
    slotSel.innerHTML = '<option value="">Sin slot</option>' +
      (STATE.playaSlots || []).filter(s => !s.ocupado).map(s =>
        `<option value="${s.id}">F${s.fila}-${String(s.col).padStart(2,'0')}</option>`
      ).join('');
  }
  const list = document.getElementById('carros-list');
  if (!list) return;
  const pColors = { alta:'var(--c-err)', normal:'var(--c-info)', baja:'var(--tx-muted)' };
  const isAdmin = ['administrador','administrativo_ops'].includes(STATE.profile?.rol);
  list.innerHTML = (STATE.carros || []).length ? (STATE.carros || []).map(function(cr,i) {
    const anden = cr.anden_destino ? ((STATE.docks || []).find(d=>d.id===cr.anden_destino)?.codigo||'â€”') : 'â€”';
    const slot  = cr.slot ? (STATE.playaSlots || []).find(s=>s.id===cr.slot) : null;
    const slotLabel = slot ? ('F'+slot.fila+'-'+String(slot.col).padStart(2,'0')) : 'â€”';
    return '<div class="carro-card" style="border-left:3px solid ' + (pColors[cr.prioridad]||'var(--border-md)') + ';">' +
      '<div style="display:flex;flex-direction:column;min-width:80px;">' +
        '<div class="carro-ruta">' + Utils.esc(cr.ruta||cr.patente) + '</div>' +
        '<span class="carro-vuelta ' + (cr.vuelta==='primera'?'carro-1v':'carro-2v') + '">' + (cr.vuelta==='primera'?'1ra':'2da') + ' VUELTA</span>' +
        '<span class="badge" style="margin-top:4px;font-size:9px;border-color:' + (pColors[cr.prioridad]||'var(--border-md)') + ';color:' + (pColors[cr.prioridad]||'var(--tx-muted)') + ';">' + Utils.esc((cr.prioridad||'normal').toUpperCase()) + '</span>' +
      '</div>' +
      '<div class="carro-data" style="flex:1;">' +
        '<div><span class="c-dim">Conductor:</span> ' + Utils.esc(cr.conductor||'â€”') + '</div>' +
        '<div><span class="c-dim">Pallets:</span> <b style="color:var(--tx-head);">' + Utils.esc(cr.pallets) + '</b>' +
          ' &nbsp; <span class="c-dim">Estac.:</span> ' + Utils.esc(slotLabel) +
          ' &nbsp; <span class="c-dim">Andén plan:</span> <span style="color:var(--c-accent);">' + Utils.esc(anden) + '</span></div>' +
        '<div class="c-dim" style="font-size:10px;">' + fmtDateTime(cr.hora) + (cr.obs ? ' · ' + Utils.esc(cr.obs) : '') + '</div>' +
      '</div>' +
      (isAdmin ? '<button class="btn btn-warn" style="padding:2px 8px;font-size:10px;margin-right:4px;" data-action="solicitarMovimientoCarro" data-id="' + i + '">â†’ SOLICITAR</button>' : '') +
      '<button class="btn btn-err" style="padding:2px 8px;font-size:10px;" data-action="removeCarro" data-id="' + i + '">âœ•</button>' +
    '</div>';
  }).join('')
  : '<div class="c-dim" style="padding:16px;text-align:center;">Sin carros registrados â€” use el botón + REGISTRAR CARRO</div>';

  // KPIs
  const t = (STATE.carros || []).length;
  const v1 = (STATE.carros || []).filter(c => c.vuelta === 'primera').length;
  const v2 = (STATE.carros || []).filter(c => c.vuelta === 'segunda').length;
  const pal = STATE.carros.reduce((s,c) => s + (parseInt(c.pallets)||0), 0);
  ['carr-total','carr-1v','carr-2v','carr-pallets'].forEach((id,i) => set(id, [t,v1,v2,pal][i]));
}

function openNuevoCarro() {
  populateCarrierSelects();
  // Slots con camiones (estacionamiento origen)
  const slotSel = document.getElementById('carro-slot');
  if (slotSel) {
    slotSel.innerHTML = '<option value=””>Sin slot asignado</option>' +
      (STATE.playaSlots || []).filter(function(s){ return s.ocupado; }).map(function(s){
        return '<option value=”' + s.id + '”>F' + s.fila + '-' + String(s.col).padStart(2,'0') + ' â€” ' + (s.patente||'libre') + '</option>';
      }).join('');
  }
  // Andenes libres como destino planificado
  const andenSel = document.getElementById('carro-anden-destino');
  if (andenSel) {
    andenSel.innerHTML = '<option value="">Sin asignar</option>' +
      (STATE.docks || []).filter(function(d){ return d.estado === 'free'; }).map(function(d){
        return '<option value="' + d.id + '">' + d.codigo + ' â€” ' + (d.tipo||'').toUpperCase() + '</option>';
      }).join('');
  }
  document.getElementById('carro-conductor').value = '';
  document.getElementById('carro-ruta').value = '';
  document.getElementById('carro-pallets').value = 1;
  document.getElementById('modal-carro').style.display = 'flex';
}
function autoFillCarroConductor() {
  const pat = document.getElementById('carro-patente').value;
  const c = (STATE.carriers || []).find(x => x.codigo === pat);
  if (c) {
    document.getElementById('carro-conductor').value = c.nombre;
    document.getElementById('carro-ruta').value = c.numero_ruta || '';
  }
}

function autoFillWaveConductor() {
  const pat = document.getElementById('wave-patente').value;
  const c = (STATE.carriers || []).find(x => x.codigo === pat);
  if (c) {
    document.getElementById('wave-ruta').value = c.numero_ruta || '';
  }
}

function saveCarro() {
  const pat    = document.getElementById('carro-patente').value;
  const cond   = document.getElementById('carro-conductor').value.trim();
  const ruta   = document.getElementById('carro-ruta').value.trim();
  const pall   = parseInt(document.getElementById('carro-pallets').value) || 0;
  const vuelt  = document.getElementById('carro-vuelta').value;
  const slot   = document.getElementById('carro-slot').value;
  const obs    = document.getElementById('carro-obs').value.trim();
  const prio   = document.getElementById('carro-prioridad')?.value || 'normal';
  const andDest= document.getElementById('carro-anden-destino')?.value || '';
  if (!pat) {
    Audio.play('error');
    notify('â›” Debe seleccionar una patente antes de continuar', 'error'); return;
  }
  if (!pall || pall < 1 || pall > 33) {
    Audio.play('error');
    notify('â›” La cantidad de pallets debe estar entre 1 y 33', 'error'); return;
  }
  
  STATE.carros.push({ patente:pat, conductor:cond, ruta, pallets:pall, vuelta:vuelt, slot, obs, prioridad:prio, anden_destino:andDest, hora: new Date().toISOString(), estado:'esperando_planificacion' });
  // Marcar slot ocupado
  if (slot) {
    const s = (STATE.playaSlots || []).find(x => x.id === slot);
    if (s) { s.ocupado = true; s.patente = pat; s.ruta = ruta; }
  }
  closeModal('modal-carro');
  Audio.play('ok');
  notify('âœ“ Carro registrado: ' + pat + ' · ' + pall + ' pallets · ' + (vuelt==='primera'?'1ra VUELTA':'2da VUELTA') + (slot ? ' · Slot: ' + slot : ''), 'ok');
  auditLog('operacion', 'CARRO_REGISTRADO', `Patente ${pat} / ${pall} pallets / ${vuelt} vuelta`);
  renderCarros();
}

function removeCarro(idx) {
  const c = STATE.carros[idx];
  if (!confirm('Â¿Eliminar registro de ' + c.patente + '?')) return;
  if (c.slot) {
    const s = (STATE.playaSlots || []).find(x => x.id === c.slot);
    if (s) { s.ocupado = false; s.patente = null; s.ruta = null; }
  }
  STATE.carros.splice(idx, 1);
  notify('Registro eliminado', 'ok');
  renderCarros();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  WAVE PLANNING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderWave() {
  initPatioEventDelegation();
  populateCarrierSelects();
  const patSel = document.getElementById('wave-patente');
  if (patSel && !patSel._waveListenerAdded) {
    patSel.addEventListener('change', autoFillWaveConductor);
    patSel._waveListenerAdded = true;
  }
  
  const list = document.getElementById('wave-list');
  if (!list) return;
  set('wave-total', (STATE.wave || []).length);
  
  list.innerHTML = (STATE.wave || []).length ? (STATE.wave || []).map((w,i) => `
    <div class="wave-card">
      <div class="wave-pos">${String(i+1).padStart(2,'0')}</div>
      <div style="flex:1;">
        <div class="wave-ruta">${Utils.esc(w.ruta || 'â€”')} <span class="c-dim" style="font-size:10px;">â€” ${Utils.esc(w.patente)}</span></div>
        <div class="wave-data">${Utils.esc(w.conductor || 'â€”')} | Prioridad: <span style="color:${w.prioridad==='alta'?'var(--c-err)':w.prioridad==='baja'?'var(--tx-muted)':'var(--tx-base)'}">${Utils.esc((w.prioridad||'normal').toUpperCase())}</span> ${w.obs ? '| ' + Utils.esc(w.obs) : ''}</div>
      </div>
      <div class="wave-arrows">
        <button class="wave-arrow" data-action="moveWave" data-id="${i}" data-arg2="-1" ${i===0?'disabled':''}>â–²</button>
        <button class="wave-arrow" data-action="moveWave" data-id="${i}" data-arg2="1" ${i===(STATE.wave || []).length-1?'disabled':''}>â–¼</button>
      </div>
      <button class="btn btn-err" style="padding:2px 8px;font-size:10px;" data-action="removeWave" data-id="${i}">âœ•</button>
    </div>`).join('')
  : '<div class="c-dim" style="padding:24px;text-align:center;">Wave vacío â€” Agregue rutas para planificar</div>';
}

function addToWave() {
  const pat   = document.getElementById('wave-patente').value;
  let ruta  = document.getElementById('wave-ruta').value;
  const prio  = document.getElementById('wave-prioridad').value;
  const obs   = document.getElementById('wave-obs').value.trim();
  if (pat && !ruta) { autoFillWaveConductor(); ruta = document.getElementById('wave-ruta').value; }
  if (!pat) {
    Audio.play('error');
    notify('â›” Debe seleccionar una patente para agregar al wave', 'error'); return;
  }
  if ((STATE.wave || []).find(w => w.patente === pat)) {
    Audio.play('warn');
    notify('⚠  La patente ' + pat + ' ya está en el wave de este turno', 'warn'); return;
  }
  const c = (STATE.carriers || []).find(x => x.codigo === pat);
  STATE.wave.push({ patente: pat, ruta, conductor: c?.nombre || '', prioridad: prio, obs });
  document.getElementById('wave-obs').value = '';
  Audio.play('ok');
  notify('âœ“ Ruta agregada al wave: ' + (ruta || pat) + ' · Conductor: ' + (c?.nombre || 'â€”') + ' · Prioridad: ' + prio.toUpperCase(), 'ok');
  renderWave();
}

function moveWave(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= (STATE.wave || []).length) return;
  [STATE.wave[idx], STATE.wave[newIdx]] = [STATE.wave[newIdx], STATE.wave[idx]];
  renderWave();
}

function removeWave(idx) {
  STATE.wave.splice(idx, 1);
  renderWave();
}

function clearWave() {
  if (!confirm('Â¿Limpiar wave completo?')) return;
  STATE.wave = [];
  localStorage.removeItem('yms_wave_' + (STATE.currentSite || 'default'));
  notify('Wave limpiado', 'ok');
  renderWave();
}

function saveWave() {
  const turno = document.getElementById('wave-turno')?.value || '';
  const key = 'yms_wave_' + (STATE.currentSite || 'default');
  localStorage.setItem(key, JSON.stringify({ turno, wave: STATE.wave, savedAt: new Date().toISOString() }));
  notify(`Wave guardado â€” ${(STATE.wave || []).length} rutas / ${turno}`, 'ok');
  auditLog('planificacion', 'WAVE_GUARDADO', `${(STATE.wave || []).length} rutas planificadas`);
}

function loadWaveFromStorage() {
  const key = 'yms_wave_' + (STATE.currentSite || 'default');
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved?.wave?.length) {
      STATE.wave = saved.wave;
      const turnoEl = document.getElementById('wave-turno');
      if (turnoEl && saved.turno) turnoEl.value = saved.turno;
    }
  } catch(e) {}
}


function clearSLAAlertMarks(refId) {
  if (!refId) return;
  const prefixes = ['yms_alerted_dwell_' + refId, 'yms_alerted_task_' + refId, 'yms_alerted_queue_' + refId];
  Object.keys(sessionStorage).forEach(k => {
    if (prefixes.some(p => k.indexOf(p) === 0)) sessionStorage.removeItem(k);
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ALERTAS POR SLA PARAMETRIZADAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function checkSLAAlerts() {
  const now = Date.now();
  const P = STATE.params;
  const sessionKey = 'yms_alerted_';

  // 1. Dwell vencido (P1)
  (STATE.visits || []).filter(v => v.estado === 'en_patio').forEach(v => {
    const mins = Math.round((now - new Date(v.hora_ingreso)) / 60000);
    const key = sessionKey + 'dwell_' + v.id;
    if (mins >= P.dwell_max && !sessionStorage.getItem(key + '_p1')) {
      addAlert('P1', 'ðŸ”´ DWELL VENCIDO', `Patente ${v.patente} lleva ${mins} min (máx: ${P.dwell_max} min)`, v.id);
      sessionStorage.setItem(key + '_p1', '1');
      Audio.play('alert');
    } else if (mins >= P.dwell_max - P.dwell_prox && !sessionStorage.getItem(key + '_p2')) {
      addAlert('P2', '⚠  DWELL PRÃ“XIMO', `Patente ${v.patente} lleva ${mins} min â€” vence en ${P.dwell_max - mins} min`, v.id);
      sessionStorage.setItem(key + '_p2', '1');
    }
  });

  // 2. Tareas vencidas (P1)
  (STATE.tasks || []).filter(t => ['ofertada','en_ejecucion'].includes(t.estado)).forEach(t => {
    const mins = Math.round((now - new Date(t.hora_creacion)) / 60000);
    const key = sessionKey + 'task_' + t.id;
    if (mins > (t.sla_minutos || P.task_sla) && !sessionStorage.getItem(key)) {
      addAlert('P1', 'ðŸ”´ TAREA VENCIDA', `${t.tipo?.replace(/_/g,' ')} â€” ${t.patente} (${mins}/${t.sla_minutos} min)`, t.id);
      sessionStorage.setItem(key, '1');
      if (t.estado !== 'vencida') t.estado = 'vencida';
      Audio.play('alert');
    }
  });

  // 3. Cola SLA (P2)
  (STATE.queueTickets || []).filter(q => q.estado === 'esperando').forEach(q => {
    const mins = Math.round((now - new Date(q.hora_creacion)) / 60000);
    const key = sessionKey + 'queue_' + q.id;
    if (mins >= P.sla_max && !sessionStorage.getItem(key + '_p1')) {
      addAlert('P1', 'ðŸ”´ COLA SLA VENCIDO', `Ticket ${q.id} esperando ${mins} min (máx: ${P.sla_max} min)`, q.id);
      sessionStorage.setItem(key + '_p1', '1');
    } else if (mins >= P.sla_max - 10 && !sessionStorage.getItem(key + '_p2')) {
      addAlert('P2', '⚠  COLA SLA PRÃ“XIMO', `Ticket esperando ${mins} min â€” vence en ${P.sla_max - mins} min`, q.id);
      sessionStorage.setItem(key + '_p2', '1');
    }
  });

  renderAlertas();
  // Badge en nav
  const active = (STATE.alerts || []).filter(a => !a.resuelta);
  const badge = document.getElementById('alerts-badge');
  if (badge) badge.textContent = active.length > 0 ? '(' + active.length + ')' : '';
}

function addAlert(nivel, titulo, msg, refId) {
  STATE.alerts.unshift({ id: 'al' + Date.now() + Math.random(), nivel, titulo, msg, refId, ts: new Date().toISOString(), resuelta: false });
  if ((STATE.alerts || []).length > 200) STATE.alerts.pop();
  notify(titulo + ': ' + msg, nivel === 'P1' ? 'error' : 'warn');
  // Badge en desktop nav
  const cnt = (STATE.alerts || []).filter(a => !a.resuelta).length;
  const badge = document.getElementById('alerts-badge');
  if (badge) badge.textContent = cnt > 0 ? ' (' + cnt + ')' : '';
  // Badge en mobile nav
  const mb = document.getElementById('mnav-alerts-badge');
  if (mb) { mb.style.display = cnt > 0 ? '' : 'none'; mb.textContent = cnt > 9 ? '9+' : String(cnt); }
}

function renderAlertas() {
  initAlertasEventDelegation();
  const list = document.getElementById('alertas-content') || document.getElementById('alerts-list');
  if (!list) return;
  const active = (STATE.alerts || []).filter(a => !a.resuelta);
  const p1 = active.filter(a => a.nivel==='P1').length;
  const p2 = active.filter(a => a.nivel==='P2').length;
  const p3 = active.filter(a => a.nivel==='P3').length;
  set('al-p1', p1); set('al-p2', p2); set('al-p3', p3);
  set('al-res', (STATE.alerts || []).filter(a => a.resuelta).length);
  
  list.innerHTML = active.length
    ? active.map(a => `
      <div class="alert-item ${a.nivel.toLowerCase()}">
        <div class="ai-icon">${a.nivel==='P1'?'ðŸ”´':a.nivel==='P2'?'⚠ ':'™¹'}</div>
        <div style="flex:1;">
          <div class="c-bright" style="font-size: 9px;font-weight:bold;">${Utils.esc(a.titulo)}</div>
          <div class="ai-msg">${Utils.esc(a.msg)}</div>
        </div>
        <div class="ai-ts">${fmtTime(a.ts)}</div>
        <button class="btn btn-ok" style="padding:2px 8px;font-size:10px;" data-action="resolveAlert" data-id="${a.id}">âœ“ OK</button>
      </div>`).join('')
    : '<div class="c-dim" style="padding:24px;text-align:center;">âœ“ Sin alertas activas</div>';
}

function resolveAlert(id) {
  const a = (STATE.alerts || []).find(x => x.id === id);
  if (a) { a.resuelta = true; STATE.alertsResolved++; }
  renderAlertas();
  const badge = document.getElementById('alerts-badge');
  const cnt = (STATE.alerts || []).filter(x => !x.resuelta).length;
  if (badge) badge.textContent = cnt > 0 ? '(' + cnt + ')' : '';
}

function clearAllAlerts() {
  (STATE.alerts || []).forEach(a => { if (a.resuelta) return; a.resuelta = true; STATE.alertsResolved++; });
  renderAlertas();
  notify('Alertas resueltas', 'ok');
}
// Alias para compatibilidad con onclick inline del HTML
window.resolveAllAlerts = clearAllAlerts;

// â”€â”€ Ofrecer tarea a operador vía overlay (llamada desde realtime) â”€â”€
// ofertarTareaOperador unificada arriba


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  UBER TASK NOTIFICATION (Operador de Patio)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _uberCountdown = 30;
let _uberInterval = null;

function showUberTask(task) {
  if (!task) return;
  // Mostrar a operador_patio; en demo mode también mostrar
  STATE.uberCurrentTask = task;
  // En mobile, asegurar que estamos en la vista correcta
  if (MOBILE_ROLES.includes(STATE.profile?.rol) && STATE.currentView !== 'tareas') {
    showView('tareas');
  }
  document.getElementById('ub-tipo').textContent    = (task.tipo || '').replace(/_/g,' ').toUpperCase();
  document.getElementById('ub-origen').textContent  = 'Origen: ' + (task.zona_origen || 'â€”');
  document.getElementById('ub-destino').textContent = 'Destino: ' + (task.zona_destino || 'â€”');
  document.getElementById('ub-patente').textContent = 'Vehículo: ' + (task.patente || 'â€”');
  document.getElementById('ub-prioridad').textContent = 'Prioridad: ' + (task.prioridad || 'normal').toUpperCase();
  _uberCountdown = 30;
  document.getElementById('ub-countdown').textContent = _uberCountdown;
  document.getElementById('uber-overlay').classList.add('show');
  Audio.play('new_task');
  clearInterval(_uberInterval);
  _uberInterval = setInterval(() => {
    _uberCountdown--;
    document.getElementById('ub-countdown').textContent = _uberCountdown;
    if (_uberCountdown <= 0) { clearInterval(_uberInterval); uberTimeout(); }
  }, 1000);
}

function uberAccept() {
  clearInterval(_uberInterval);
  document.getElementById('uber-overlay').classList.remove('show');
  const task = STATE.uberCurrentTask;
  if (task) {
    task.estado = 'en_ejecucion';
    task.operador_nombre = STATE.profile?.nombre;
    notify('âœ“ Tarea aceptada: ' + (task.tipo || '').replace(/_/g,' '), 'ok');
    Audio.play('accepted');
    auditLog('task', 'TAREA_ACEPTADA', `${task.tipo} â€” ${task.patente} â€” por ${STATE.profile?.nombre}`);
    if (!STATE.usingSeed) {
      const validation = validateStateTransition('yard_tasks', task.estado, 'en_ejecucion', STATE.user?.id);
      if (!validation.valid) { notify('âŒ ' + validation.reason, 'error'); return; }

      sb.from('yard_tasks')
        .update({ estado:'en_ejecucion', operador_id: STATE.user?.id, hora_aceptacion: new Date().toISOString() })
        .eq('id', task.id)
        .eq('estado', task.estado)
        .select().single()
        .then((res) => {
          if (!res.data) {
            notify('⚠ ï¸  Otro operador aceptó esta tarea primero. Recargando...', 'warn');
          }
          return loadTasks();
        });
    }
    if (STATE.currentView === 'tareas') renderTareas();
  }
}

function uberReject() {
  clearInterval(_uberInterval);
  document.getElementById('uber-overlay').classList.remove('show');
  const task = STATE.uberCurrentTask;
  if (task) {
    task.estado = 'rechazada';
    notify('Tarea rechazada â€” se escala a supervisor', 'warn');
    auditLog('task', 'TAREA_RECHAZADA', `${task.tipo} â€” ${task.patente}`);
  }
}

function uberTimeout() {
  document.getElementById('uber-overlay').classList.remove('show');
  const task = STATE.uberCurrentTask;
  if (task) {
    task.estado = 'vencida';
    addAlert('P2', '⚠  TAREA SIN RESPUESTA', 'Tarea ' + (task.tipo||'') + ' no fue aceptada â€” escalada', task.id);
    notify('⚠  Tarea sin respuesta â€” escalada a supervisor', 'warn');
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TRAZABILIDAD / REPORTES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initTrazabilidad() {
  populateCarrierSelects();
  // Fechas por defecto: hoy
  const today = new Date().toISOString().split('T')[0];
  const fromEl = document.getElementById('trz-from');
  const toEl   = document.getElementById('trz-to');
  if (fromEl && !fromEl.value) fromEl.value = today;
  if (toEl   && !toEl.value)   toEl.value   = today;
  loadTrazabilidad();
}

async function loadTrazabilidad() {
  const from  = document.getElementById('trz-from')?.value;
  const to    = document.getElementById('trz-to')?.value;
  const emp   = document.getElementById('trz-empresa')?.value || '';
  const tipo  = document.getElementById('trz-tipo')?.value || '';
  
  let visits = [...STATE.visits];
  
  if (!STATE.usingSeed && sb) {
    let q = sb.from('yard_visits').select('*, carrier:carriers(nombre,tipo,numero_ruta)').order('hora_ingreso', {ascending:false}).limit(500);
    if (from) q = q.gte('hora_ingreso', from + 'T00:00:00');
    if (to)   q = q.lte('hora_ingreso', to   + 'T23:59:59');
    const { data } = await q;
    if (data) visits = data;
  } else {
    // Filtrar seed por fecha
    if (from) visits = visits.filter(v => v.hora_ingreso >= from);
    if (to)   visits = visits.filter(v => v.hora_ingreso <= to + 'T23:59:59');
  }

  if (emp)  visits = visits.filter(v => (v.carrier_nombre || v.carrier?.nombre || '') === emp);
  if (tipo) visits = visits.filter(v => v.tipo === tipo);

  // KPIs
  const total = visits.length;
  const prim  = visits.filter(v => v.tipo === 'primaria').length;
  const sec   = visits.filter(v => v.tipo === 'secundaria').length;
  const dwells = visits.filter(v => v.hora_salida && v.hora_ingreso)
    .map(v => Math.round((new Date(v.hora_salida) - new Date(v.hora_ingreso)) / 60000));
  const dwellProm = dwells.length ? Math.round(dwells.reduce((a,b)=>a+b,0)/dwells.length) : 0;
  const dwellMax  = dwells.length ? Math.max(...dwells) : 0;
  const slaVenc   = (STATE.alerts || []).filter(a => a.nivel === 'P1' && !a.resuelta).length;

  set('trz-k1', total); set('trz-k2', prim); set('trz-k3', sec);
  set('trz-k4', dwellProm + 'm'); set('trz-k5', dwellMax + 'm'); set('trz-k6', slaVenc);

  // Tabla
  const tbody = document.getElementById('trz-tbl');
  if (tbody) {
    tbody.innerHTML = visits.length ? visits.map(v => {
      const dw = v.hora_salida && v.hora_ingreso
        ? Math.round((new Date(v.hora_salida) - new Date(v.hora_ingreso)) / 60000) + 'm'
        : v.hora_ingreso ? Math.round((Date.now() - new Date(v.hora_ingreso)) / 60000) + 'm*' : 'â€”';
      const c = (STATE.carriers || []).find(x => x.codigo === v.patente);
      return `<tr>
        <td class="c-dim">${v.hora_ingreso ? new Date(v.hora_ingreso).toLocaleDateString('es-CL') : 'â€”'}</td>
        <td class="c-bright">${v.patente || 'â€”'}</td>
        <td>${v.carrier?.nombre || v.carrier_nombre || c?.nombre || 'â€”'}</td>
        <td><span class="badge ${v.tipo==='primaria'?'badge b-ok':'badge b-warn'}">${v.tipo||'â€”'}</span></td>
        <td class="c-dim">${fmtTime(v.hora_ingreso)}</td>
        <td class="c-dim">${fmtTime(v.hora_salida)}</td>
        <td style="color:${parseInt(dw)>(STATE.params?.dwell_max || 180)?'var(--c-err)':'var(--tx-base)'}">${dw}</td>
        <td class="c-dim">${v.dock_codigo || v.dock?.codigo || 'â€”'}</td>
        <td><span class="badge ${v.estado==='en_patio'?'badge b-ok':v.estado==='salida'?'badge b-dim':'badge b-info'}">${v.estado||'â€”'}</span></td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="9" class="c-dim" style="text-align:center;padding:12px;">Sin registros para el período seleccionado</td></tr>';
  }

  // Buffer para export
  window._trzData = visits;
}

function exportTrazabilidad() {
  const data = window._trzData || STATE.visits;
  if (!data.length) { notify('Sin datos para exportar', 'warn'); return; }
  const headers = ['Fecha','Patente','Conductor','Ruta','Empresa','Tipo','Ingreso','Salida','Dwell(min)','Andén','Estado'];
  const rows = data.map(v => {
    const c = (STATE.carriers || []).find(x => x.codigo === v.patente);
    const dw = v.hora_salida && v.hora_ingreso ? Math.round((new Date(v.hora_salida)-new Date(v.hora_ingreso))/60000) : '';
    return [
      v.hora_ingreso ? new Date(v.hora_ingreso).toLocaleDateString('es-CL') : '',
      v.patente || '', c?.nombre || v.carrier_nombre || '',
      c?.numero_ruta || v.numero_ruta || '',
      v.carrier_nombre || '', v.tipo || '',
      fmtTime(v.hora_ingreso), fmtTime(v.hora_salida),
      dw, v.dock_codigo || '', v.estado || ''
    ].map(x => '"' + String(x).replace(/"/g,'""') + '"').join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'trazabilidad_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click(); URL.revokeObjectURL(url);
  notify('CSV exportado', 'ok');
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ANDENES â€” CRUD COMPLETO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function saveAnden() {
  const editId  = document.getElementById('edit-dock-id').value;
  const codigo  = document.getElementById('cfg-dock-code').value.trim().toUpperCase();
  const tipo    = document.getElementById('cfg-dock-type').value;
  const op      = document.getElementById('cfg-dock-op').value;
  const plantas = document.getElementById('cfg-dock-plantas').value.trim();
  const maxtime = parseInt(document.getElementById('cfg-dock-maxtime').value) || 120;
  const status  = document.getElementById('cfg-dock-status').value;
  if (!codigo) {
    Audio.play('error');
    notify('â›” El código del andén es obligatorio (ej: A01, B02)', 'error'); return;
  }

  if (editId) {
    // EDITAR
    const dock = (STATE.docks || []).find(d => d.id === editId);
    if (dock) {
      dock.codigo = codigo; dock.tipo = tipo; dock.operacion_permitida = op;
      dock.plantas_compat = plantas; dock.max_tiempo = maxtime;
      if (!dock.truck_id) dock.estado = status;
    }
    if (!STATE.usingSeed) {
      await sb.from('docks').update({ codigo, tipo, operacion_permitida: op, plantas_compat: plantas, max_tiempo: maxtime }).eq('id', editId);
      await loadDocks();
    }
    Audio.play('ok');
    notify('âœ“ Andén ' + codigo + ' actualizado correctamente · Tipo: ' + tipo.toUpperCase(), 'ok');
    auditLog('dock', 'ANDÃ‰N_EDITADO', 'Andén ' + codigo + ' modificado');
  } else {
    // CREAR
    if ((STATE.docks || []).find(d => d.codigo === codigo)) {
      Audio.play('error');
      notify('â›” El código ' + codigo + ' ya existe en los andenes registrados', 'error'); return;
    }
    const newD = { id: 'd' + Date.now(), codigo, tipo, operacion_permitida: op, plantas_compat: plantas, max_tiempo: maxtime, estado: status };
    STATE.docks.push(newD);
    if (!STATE.usingSeed) {
      const { data } = await sb.from('docks').insert({ codigo, tipo, operacion_permitida: op, plantas_compat: plantas, max_tiempo: maxtime, estado: status, site_id: STATE.currentSiteUUID || null }).select().single();
      if (data) { STATE.docks.pop(); STATE.docks.push(data); }
      await auditLog('dock', 'ANDÃ‰N_CREADO', 'Nuevo andén ' + codigo);
    }
    Audio.play('ok');
    notify('âœ“ Andén ' + codigo + ' creado · Tipo: ' + tipo.toUpperCase() + ' · Operación: ' + op.replace(/_/g,' ').toUpperCase(), 'ok');
  }
  ymsPersistYardConfig();
  clearDockForm();
  renderAndenes(); renderDashboard();
  // Actualizar config tab también
  renderConfigDocks();
}

function editAnden(id) {
  const d = (STATE.docks || []).find(x => x.id === id);
  if (!d) return;
  // Si está en vista config, cambiar a tab andenes
  switchCfgTabById('cfg-andenes');
  showView('config');
  document.getElementById('edit-dock-id').value      = d.id;
  document.getElementById('cfg-dock-code').value     = d.codigo;
  document.getElementById('cfg-dock-type').value     = d.tipo || 'frigorifico';
  document.getElementById('cfg-dock-op').value       = d.operacion_permitida || 'descarga';
  document.getElementById('cfg-dock-plantas').value  = d.plantas_compat || '';
  document.getElementById('cfg-dock-maxtime').value  = d.max_tiempo || 120;
  document.getElementById('cfg-dock-status').value   = d.estado === 'blocked' ? 'blocked' : 'free';
  document.getElementById('cfg-dock-form-title').textContent = 'EDITAR ANDÃ‰N â€” ' + d.codigo;
  notify('Editando andén ' + d.codigo, 'info');
}

async function deleteAnden(id) {
  const dock = (STATE.docks || []).find(d => d.id === id);
  if (!dock) return;
  if (dock.estado === 'busy') { notify('â›” No se puede eliminar un andén ocupado', 'error'); return; }
  if (!confirm('Â¿ELIMINAR andén ' + dock.codigo + '? Esta acción no se puede deshacer.')) return;
  STATE.docks = (STATE.docks || []).filter(d => d.id !== id);
  if (!STATE.usingSeed) {
    await sb.from('docks').delete().eq('id', id);
    await auditLog('dock', 'ANDÃ‰N_ELIMINADO', 'Andén ' + dock.codigo + ' eliminado');
  }
  notify('Andén ' + dock.codigo + ' eliminado', 'ok');
  renderAndenes(); renderDashboard(); renderConfigDocks();
}

function clearDockForm() {
  ['edit-dock-id','cfg-dock-code','cfg-dock-plantas'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('cfg-dock-maxtime').value = 120;
  document.getElementById('cfg-dock-form-title').textContent = '+ NUEVO ANDÃ‰N';
}

function renderConfigDocks() {
  set('cfg-dock-count', (STATE.docks || []).length);
  const tbody = document.getElementById('cfg-docks-tbl');
  if (!tbody) return;
  tbody.innerHTML = (STATE.docks || []).map(d => `<tr>
    <td class="c-bright fw">${d.codigo}</td>
    <td>${(d.tipo||'').toUpperCase()}</td>
    <td>${(d.operacion_permitida||'').replace(/_/g,' ').toUpperCase()}</td>
    <td class="c-dim" style="font-size:10px;">${d.plantas_compat || 'TODAS'}</td>
    <td><span class="badge badge-${d.estado==='free'?'ok':d.estado==='busy'?'warn':'err'}">${(d.estado||'').toUpperCase()}</span></td>
    <td>
      <button class="btn" style="font-size:9px;padding:1px 5px;" onclick="editAnden('${d.id}')">EDITAR</button>
      <button class="btn btn-err" style="font-size:9px;padding:1px 5px;" onclick="deleteAnden('${d.id}')">ELIMINAR</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="6" class="c-dim tc">Sin andenes</td></tr>';
  // Poblar select andén devolución en config
  const selDevol = document.getElementById('cfg-devol-anden');
  if (selDevol) {
    selDevol.innerHTML = '<option value="">Sin andén fijo</option>' +
      (STATE.docks || []).map(d => `<option value="${d.id}">${d.codigo} â€” ${d.tipo}</option>`).join('');
  }
  // Poblar tabla devolución
  const devTbl = document.getElementById('cfg-devol-docks-tbl');
  if (devTbl) {
    devTbl.innerHTML = (STATE.docks || []).map(d => `<tr>
      <td class="c-bright">${d.codigo}</td>
      <td class="c-dim">${d.tipo}</td>
      <td><span class="badge ${d.tipo==='devolucion'||d.operacion_permitida==='devolucion'?'b-ok':'b-dim'}">${d.tipo==='devolucion'||d.operacion_permitida==='devolucion'?'SÃ':'NO'}</span></td>
    </tr>`).join('') || '<tr><td colspan="3" class="c-dim tc">Sin andenes</td></tr>';
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CONFIG â€” TABS + RENDER COMPLETO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function switchCfgTab(btn) {
  document.querySelectorAll('.cfg-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cfg-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const target = document.getElementById(btn.getAttribute('data-tab'));
  if (target) target.classList.add('active');
  const tab = btn.getAttribute('data-tab');
  if (tab === 'cfg-andenes')      renderConfigDocks();
  if (tab === 'cfg-transportes')  renderConfigCarriers();
  if (tab === 'cfg-plantas')      renderConfigPlantas();
  if (tab === 'cfg-usuarios')     renderConfigUsuarios();
  if (tab === 'cfg-supabase')     renderConfigSistema();
  if (tab === 'cfg-devolucion')   { renderConfigDocks(); renderConfigMotivos(); }
  if (tab === 'cfg-checklist')    renderChecklistConfig();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CONFIG â€” CHECKLIST DE PATIO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderChecklistConfig() {
  const list = document.getElementById('cfg-checklist-list');
  if (!list) return;
  if (!CL_ITEMS_CONFIG.length) {
    list.innerHTML = '<div style="padding:16px;color:var(--tx-dim);text-align:center;">Sin puntos configurados</div>';
    return;
  }
  const tipoCls = { critico:'var(--c-err)', cadena_frio:'var(--c-cold)', requerido:'var(--tx-muted)' };
  list.innerHTML = CL_ITEMS_CONFIG.map(function(item, idx) {
    const tc  = tipoCls[item.tipo] || 'var(--tx-muted)';
    const ena = item.enabled !== false;
    const isCritico = item.tipo === 'critico';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--bg-alt);opacity:' + (ena ? '1' : '0.55') + ';">' +
      '<label style="position:relative;display:inline-flex;width:38px;height:22px;cursor:' + (isCritico ? 'not-allowed' : 'pointer') + ';flex-shrink:0;" title="' + (isCritico ? 'Los puntos críticos no pueden desactivarse' : (ena ? 'Desactivar' : 'Activar')) + '">' +
        '<input type="checkbox"' + (ena ? ' checked' : '') + (isCritico ? ' disabled' : ' onchange="toggleChecklistItem(\'' + item.id + '\')"') + ' style="opacity:0;width:0;height:0;position:absolute;">' +
        '<span style="position:absolute;inset:0;background:' + (ena ? 'var(--c-ok)' : 'var(--border)') + ';border-radius:20px;transition:background 0.2s;"></span>' +
        '<span style="position:absolute;height:16px;width:16px;left:' + (ena ? '19px' : '3px') + ';bottom:3px;background:white;border-radius:50%;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></span>' +
      '</label>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size: 9px;font-weight:600;color:var(--tx-head);">' + escHtml(item.label) + '</div>' +
        '<div style="font-size:10px;margin-top:1px;">' +
          '<span style="color:' + tc + ';font-weight:600;">' + item.tipo.toUpperCase() + '</span>' +
          '<span style="color:var(--tx-dim);margin-left:6px;">· ' + (item.esNumerico ? 'Valor numérico' : 'Opciones') + '</span>' +
        '</div>' +
      '</div>' +
      (!item.builtin ? '<button class="btn btn-err" style="font-size:10px;padding:2px 8px;flex-shrink:0;" onclick="deleteChecklistItem(\'' + item.id + '\')">âœ•</button>' : '') +
    '</div>';
  }).join('');
}

function toggleAddChecklistItemForm() {
  const wrap = document.getElementById('cfg-checklist-form-wrap');
  if (wrap) wrap.style.display = wrap.style.display === 'none' ? '' : 'none';
}

function toggleChecklistItem(id) {
  const item = CL_ITEMS_CONFIG.find(i => i.id === id);
  if (!item) return;
  item.enabled = !item.enabled;
  saveChecklistConfig();
  renderChecklistConfig();
  notify((item.enabled ? 'Punto activado: ' : 'Punto desactivado: ') + item.label, 'ok', 2000);
}

function addChecklistItem() {
  const label    = document.getElementById('cfg-cl-label')?.value?.trim();
  const tipo     = document.getElementById('cfg-cl-tipo')?.value || 'requerido';
  const esNum    = document.getElementById('cfg-cl-respuesta')?.value === 'numerico';
  if (!label) { notify('Ingrese el nombre del punto de inspección', 'warn'); return; }
  const id = 'custom_' + Date.now();
  const opciones = esNum ? null : [{v:'ok',l:'Correcto'},{v:'falla',l:'Falla / Problema'}];
  CL_ITEMS_CONFIG.push({ id, label, tipo, enabled: true, esNumerico: esNum, builtin: false, opciones, unidad: esNum ? '' : null });
  saveChecklistConfig();
  renderChecklistConfig();
  if (document.getElementById('cfg-cl-label')) document.getElementById('cfg-cl-label').value = '';
  notify('Punto "' + label + '" agregado al checklist', 'ok');
}

function deleteChecklistItem(id) {
  const idx = CL_ITEMS_CONFIG.findIndex(i => i.id === id);
  if (idx < 0) return;
  const label = CL_ITEMS_CONFIG[idx].label;
  CL_ITEMS_CONFIG.splice(idx, 1);
  saveChecklistConfig();
  renderChecklistConfig();
  notify('Punto "' + label + '" eliminado', 'ok', 2000);
}

function saveChecklistConfig() {
  try { localStorage.setItem('yms_checklist_items', JSON.stringify(CL_ITEMS_CONFIG)); } catch(_) {}
}

function switchCfgTabById(id) {
  const btn = document.querySelector('[data-tab="' + id + '"]');
  if (btn) switchCfgTab(btn);
}

function renderConfigCarriers() {
  const search = (document.getElementById('carrier-search')?.value || '').toLowerCase();
  set('cfg-carrier-count', (STATE.carriers || []).length);
  const tbody = document.getElementById('carriers-tbl');
  if (!tbody) return;
  const filtered = (STATE.carriers || []).filter(c =>
    !search ||
    c.codigo?.toLowerCase().includes(search) ||
    c.nombre?.toLowerCase().includes(search) ||
    c.numero_ruta?.toLowerCase().includes(search)
  );
  tbody.innerHTML = filtered.map(c => {
    const stCls = c.estado === 'EN PANNE' ? 'badge b-err' : c.estado ? 'badge b-warn' : 'badge b-ok';
    const stLbl = c.estado || 'ACTIVO';
    const cdOpts = SITES_DISPONIBLES.map(s =>
      '<option value="' + Utils.esc(s.codigo) + '"' + (c.cd === s.codigo ? ' selected' : '') + '>' + Utils.esc(s.nombre) + '</option>'
    ).join('');
    const enPatio = (STATE.visits || []).find(v => v.patente === c.codigo && v.estado !== 'salida');
    const andenActual = enPatio?.dock_id ? ((STATE.docks || []).find(d => d.id === enPatio.dock_id)?.codigo || 'â€”') : 'â€”';
    const isAdmin = STATE.profile?.rol === 'administrador';
    return '<tr>' +
      '<td class="c-bright fw">' + Utils.esc(c.codigo) + '</td>' +
      '<td style="font-size: 8px;">' + Utils.esc(c.nombre) + '</td>' +
      '<td class="c-dim">' + Utils.esc(c.tipo||'â€”') + '</td>' +
      '<td class="c-dim">' + Utils.esc(c.numero_ruta||'â€”') + '</td>' +
      '<td>' + (isAdmin
        ? '<select style="font-size:10px;padding:1px 4px;background:var(--bg-input);border:1px solid var(--border);color:var(--tx-base);font-family:var(--font);" onchange="moverCarrierCD(\'' + c.id + '\',this.value)">' + cdOpts + '</select>'
        : (c.cd ? Utils.esc(SITES_DISPONIBLES.find(s=>s.codigo===c.cd)?.nombre||c.cd) : 'Todos')) + '</td>' +
      '<td class="c-dim fz10">' + Utils.esc(andenActual) + '</td>' +
      '<td><span class="badge ' + stCls + '">' + Utils.esc(stLbl) + '</span></td>' +
      '<td style="white-space:nowrap;">' +
        (isAdmin && enPatio
          ? '<button class="btn btn-ok" style="font-size:9px;padding:1px 5px;" onclick="abrirAsignacionAnden(\'' + c.id + '\',\'' + c.codigo + '\')">ANDÃ‰N</button> ' : '') +
        '<button class="btn" style="font-size:9px;padding:1px 5px;" onclick="editCarrier(\'' + c.id + '\')">EDITAR</button> ' +
        '<button class="btn btn-err" style="font-size:9px;padding:1px 5px;" onclick="deleteCarrier(\'' + c.id + '\')">ELIMINAR</button>' +
      '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="7" class="c-dim tc">Sin resultados</td></tr>';
}

function editCarrier(id) {
  const c = (STATE.carriers || []).find(x => x.id === id);
  if (!c) return;
  document.getElementById('edit-carrier-id').value   = c.id;
  document.getElementById('inp-carrier-code').value  = c.codigo;
  document.getElementById('inp-carrier-nombre').value= c.nombre;
  document.getElementById('inp-carrier-tipo').value  = c.tipo || 'Camión';
  document.getElementById('inp-carrier-ruta').value  = c.numero_ruta || '';
  // zona removida
  document.getElementById('inp-carrier-estado').value= c.estado || '';
  const cdEditEl = document.getElementById('inp-carrier-cd');
  if (cdEditEl) cdEditEl.value = c.cd || '';
  const msgEl = document.getElementById('carrier-form-msg');
  if (msgEl) msgEl.textContent = '';
  document.getElementById('cfg-carrier-form-title').textContent = 'EDITAR: ' + c.codigo;
}

async function deleteCarrier(id) {
  const c = (STATE.carriers || []).find(x => x.id === id);
  if (!c) return;
  if (!confirm('Â¿ELIMINAR transporte ' + c.codigo + ' â€” ' + c.nombre + '?')) return;
  STATE.carriers = (STATE.carriers || []).filter(x => x.id !== id);
  if (!STATE.usingSeed) {
    await sb.from('carriers').delete().eq('id', id);
    await auditLog('config', 'TRANSPORTE_ELIMINADO', c.codigo + ' â€” ' + c.nombre);
  }
  notify('Transporte ' + c.codigo + ' eliminado', 'ok');
  renderConfigCarriers();
  populateCarrierSelects();
}

function clearCarrierForm() {
  ['edit-carrier-id','inp-carrier-code','inp-carrier-nombre','inp-carrier-ruta'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const cdEl = document.getElementById('inp-carrier-cd');
  if (cdEl) cdEl.value = '';
  const msgEl = document.getElementById('carrier-form-msg');
  if (msgEl) msgEl.textContent = '';
  const titleEl = document.getElementById('cfg-carrier-form-title');
  if (titleEl) titleEl.textContent = '+ NUEVO TRANSPORTE';
}

function renderConfigPlantas() {
  const tbody = document.getElementById('plants-tbl');
  if (!tbody) return;
  tbody.innerHTML = (STATE.plants || []).map(p => `<tr>
    <td class="c-bright">${Utils.esc(p.codigo)}</td>
    <td>${Utils.esc(p.nombre)}</td>
    <td class="c-dim">${Utils.esc(p.region || 'â€”')}</td>
    <td class="c-dim">${Utils.esc(p.tipo || 'â€”')}</td>
    <td>
      <button class="btn btn-err" style="font-size:9px;padding:1px 5px;" onclick="deletePlanta('${p.id}')">ELIMINAR</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="5" class="c-dim tc">Sin plantas</td></tr>';
}

async function addPlanta() {
  const cod    = document.getElementById('plt-codigo').value.trim().toUpperCase();
  const nombre = document.getElementById('plt-nombre').value.trim();
  const region = document.getElementById('plt-region').value.trim();
  const tipo   = document.getElementById('plt-tipo').value;
  if (!cod) {
    Audio.play('error');
    notify('â›” El código de la planta es obligatorio (ej: PLT_RANCAGUA)', 'error'); return;
  }
  if (!nombre) {
    Audio.play('error');
    notify('â›” El nombre de la planta es obligatorio', 'error'); return;
  }
  if ((STATE.plants || []).find(p => p.codigo === cod)) {
    Audio.play('warn');
    notify('⚠  Ya existe una planta con el código ' + cod, 'warn'); return;
  }
  const newP = { id: 'p' + Date.now(), codigo: cod, nombre, region, tipo };
  STATE.plants.push(newP);
  if (!STATE.usingSeed) {
    await sb.from('plants').insert({ codigo: cod, nombre, region, tipo }).select().single();
    await auditLog('config', 'PLANTA_CREADA', cod + ' â€” ' + nombre);
  }
  ['plt-codigo','plt-nombre','plt-region'].forEach(id => document.getElementById(id).value = '');
  Audio.play('ok');
  notify('âœ“ Planta agregada: ' + nombre + ' (' + cod + ')' + (region ? ' · ' + region : ''), 'ok');
  renderConfigPlantas();
}

function deletePlanta(id) {
  if (!confirm('Â¿Eliminar planta?')) return;
  STATE.plants = (STATE.plants || []).filter(p => p.id !== id);
  notify('Planta eliminada', 'ok');
  renderConfigPlantas();
}

//[DUPLICATE REMOVED]
//async function toggleUser(id) {
//  const u = (STATE.users || []).find(x => x.id === id);
//  if (!u) return;
//  u.activo = !u.activo;
//  if (!STATE.usingSeed) {
//    await sb.from('profiles').update({ activo: u.activo }).eq('id', id);
//  }
//  Audio.play(u.activo ? 'ok' : 'warn');
//  notify((u.activo ? 'âœ“ Usuario ACTIVADO: ' : '⚠  Usuario DESACTIVADO: ') + u.nombre, u.activo ? 'ok' : 'warn');
//  renderConfigUsuarios();
//}

const MOTIVOS_DEFAULT = [
  { id: 'm1', codigo: 'TEMP', descripcion: 'Temperatura fuera de rango', comentario: true },
  { id: 'm2', codigo: 'DAÃ‘O', descripcion: 'Producto o embalaje dañado', comentario: true },
  { id: 'm3', codigo: 'VENC', descripcion: 'Producto próximo a vencer', comentario: true },
  { id: 'm4', codigo: 'DOC',  descripcion: 'Documentación incompleta',   comentario: false },
  { id: 'm5', codigo: 'OTRO', descripcion: 'Otro motivo',                comentario: true },
];
if (!window._MOTIVOS) window._MOTIVOS = [...MOTIVOS_DEFAULT];

function renderConfigMotivos() {
  const tbody = document.getElementById('motivos-tbl');
  if (!tbody) return;
  tbody.innerHTML = window._MOTIVOS.map(m => `<tr>
    <td class="c-bright">${Utils.esc(m.codigo)}</td>
    <td>${Utils.esc(m.descripcion)}</td>
    <td><span class="badge badge-${m.comentario?'warn':'dim'}">${m.comentario?'SÃ':'NO'}</span></td>
    <td><button class="btn btn-err" style="font-size:9px;padding:1px 5px;" onclick="deleteMotivo('${m.id}')">âœ•</button></td>
  </tr>`).join('');
}

function addMotivo() {
  const cod  = document.getElementById('motivo-cod')?.value.trim().toUpperCase();
  const desc = document.getElementById('motivo-desc')?.value.trim();
  if (!cod || !desc) { notify('â›” Complete código y descripción', 'error'); return; }
  window._MOTIVOS.push({ id: 'm'+Date.now(), codigo: cod, descripcion: desc, comentario: true });
  document.getElementById('motivo-cod').value = '';
  document.getElementById('motivo-desc').value = '';
  renderConfigMotivos();
  notify('Motivo agregado', 'ok');
}

function deleteMotivo(id) {
  window._MOTIVOS = window._MOTIVOS.filter(m => m.id !== id);
  renderConfigMotivos();
}

// â”€â”€ Acepta tarea por ID (desde mobile card buttons) â”€â”€
async function aceptarTareaById(taskId) {
  const t = (STATE.tasks || []).find(function(x){ return x.id === taskId; });
  if (!t) { notify('â›” Tarea no encontrada', 'error'); return; }
  try {
    const oldEstado = t.estado;
    t.estado = 'en_ejecucion';
    t.operador_nombre = STATE.profile?.nombre;
    t.operador_id = STATE.profile?.id;
    t.hora_aceptacion = new Date().toISOString();
    if (!STATE.usingSeed && sb) {
      const validation = validateStateTransition('yard_tasks', oldEstado, 'en_ejecucion', STATE.user?.id);
      if (!validation.valid) {
        notify('âŒ ' + validation.reason, 'error');
        t.estado = oldEstado; t.operador_id = null;
        return;
      }

      const { data } = await sb.from('yard_tasks')
        .update({
          estado: 'en_ejecucion', operador_id: STATE.user?.id,
          hora_aceptacion: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('estado', oldEstado)
        .select().single();

      if (!data) {
        notify('⚠ ï¸  Otro operador aceptó esta tarea primero. Recargando...', 'warn');
        await loadTasks();
        return;
      }
    }
    Audio.play('ok');
    notify('âœ“ Tarea aceptada â€” ' + (t.tipo||'').replace(/_/g,' ').toUpperCase() + (t.patente ? ' · ' + t.patente : ''), 'ok');
    await auditLog('task','TAREA_ACEPTADA', (t.tipo||'') + ' · ' + (t.patente||'â€”') + ' por ' + (STATE.profile?.nombre||'â€”'));
    renderTareas();
    // Abrir modal correcto segÃºn tipo de tarea
    const esRetiro = t.tipo === 'retirar_anden' || t.tipo === 'anden_a_carros_vacios' || t.zona_destino === 'carros_cargados' || t.zona_destino === 'estacionamiento_carros_vacios';
    setTimeout(function() {
      if (esRetiro) {
        abrirCarroCargado(taskId);
      } else {
        abrirChecklistTarea(taskId);
      }
    }, 400);
  } catch(err) {
    Audio.play('error');
    notify('â›” Error: ' + (err?.message||'Error al aceptar tarea'), 'error');
  }
}
function renderCitas() {
  initCitasEventDelegation();
  // Poblar filtro de andenes
  const andenSel = document.getElementById('cita-filter-anden');
  if (andenSel) {
    andenSel.innerHTML = '<option value="">Todos</option>' +
      (STATE.docks || []).map(d => `<option value="${d.id}">${d.codigo}</option>`).join('');
  }
  // Fecha por defecto = hoy
  const fechaEl = document.getElementById('cita-filter-fecha');
  if (fechaEl && !fechaEl.value) fechaEl.value = new Date().toISOString().split('T')[0];

  const fecha   = fechaEl?.value || '';
  const estado  = document.getElementById('cita-filter-estado')?.value || '';
  const andenId = document.getElementById('cita-filter-anden')?.value || '';

  let citas = [...(STATE.citas || [])];
  if (fecha)   citas = citas.filter(c => c.fecha === fecha);
  if (estado)  citas = citas.filter(c => c.estado === estado);
  if (andenId) citas = citas.filter(c => c.dock_id === andenId);

  // KPIs
  const prog = citas.filter(c => c.estado === 'programada').length;
  const conf = citas.filter(c => c.estado === 'confirmada').length;
  const cur  = citas.filter(c => c.estado === 'en_curso').length;
  const ok   = citas.filter(c => c.estado === 'completada').length;
  const np   = citas.filter(c => c.estado === 'no_presentada').length;
  const total = citas.length;
  const adh  = total > 0 ? Math.round((ok / total) * 100) : 0;
  set('cita-k-prog', prog); set('cita-k-conf', conf); set('cita-k-cur', cur);
  set('cita-k-ok', ok); set('cita-k-np', np);
  set('cita-k-adh', adh + '%');
  set('cita-count', citas.length);

  // Tabla
  const tbody = document.getElementById('citas-tbl');
  if (!tbody) return;
  citas.sort((a,b) => a.hora_inicio?.localeCompare(b.hora_inicio));
  tbody.innerHTML = citas.length ? citas.map(c => {
    const stCls = {
      programada:'badge b-info', confirmada:'badge b-ok', en_curso:'badge b-warn',
      completada:'badge b-dim', no_presentada:'badge b-err', cancelada:'badge b-err'
    }[c.estado] || 'badge b-dim';
    const dock = (STATE.docks || []).find(d => d.id === c.dock_id);
    const carrier = (STATE.carriers || []).find(x => x.codigo === c.patente);
    return `<tr>
      <td class="c-bright fw">${Utils.esc(c.hora_inicio || 'â€”')}</td>
      <td class="c-dim">${Utils.esc(c.hora_inicio || 'â€”')}â€“${Utils.esc(c.hora_fin || 'â€”')}</td>
      <td class="c-bright">${Utils.esc(dock?.codigo || 'â€”')}</td>
      <td class="c-bright">${Utils.esc(c.patente || 'â€”')}</td>
      <td class="c-dim">${Utils.esc(carrier?.nombre || c.empresa || 'â€”')}</td>
      <td class="c-dim">${Utils.esc((c.tipo_operacion||'').replace(/_/g,' ').toUpperCase())}</td>
      <td class="c-dim">${Utils.esc((c.tipo_carga||'').toUpperCase() || 'â€”')}</td>
      <td class="c-dim">${Utils.esc(c.pallets_estimados || 'â€”')}</td>
      <td><span class="badge ${stCls}">${Utils.esc(c.estado?.toUpperCase() || 'â€”')}</span></td>
      <td style="white-space:nowrap;">
        ${c.estado === 'programada' ? `
          <button class="btn btn-ok" style="font-size:9px;padding:1px 5px;" data-action="confirmCita" data-id="${c.id}">CONFIRMAR</button>
          <button class="btn btn-err" style="font-size:9px;padding:1px 5px;" data-action="cancelCita" data-id="${c.id}">CANCELAR</button>
        ` : c.estado === 'no_presentada' ? '' : ''}
      </td>
    </tr>`;
  }).join('')
  : '<tr><td colspan="10" class="c-dim tc" style="padding:20px;">Sin citas para esta fecha</td></tr>';
}

function openNuevaCita() {
  const html = `<div id="modal-cita" class="modal-overlay" style="display:flex;">
    <div class="modal-box" style="min-width:500px;">
      <div class="mh"><span class="mh-title">ðŸ“… NUEVA CITA</span><button class="btn btn-err" onclick="closeModal('modal-cita')">âœ•</button></div>
      <div class="mb-inner">
        <div class="fr">
          <div class="fg"><label>Fecha *</label><input type="date" id="nc-fecha" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="fg"><label>Hora inicio *</label><input type="time" id="nc-hora-ini" step="1800"></div>
          <div class="fg"><label>Hora fin</label><input type="time" id="nc-hora-fin" step="1800"></div>
        </div>
        <div class="fr">
          <div class="fg"><label>Andén *</label>
            <select id="nc-anden">${(STATE.docks || []).map(d => `<option value="${d.id}">${d.codigo} â€” ${d.tipo}</option>`).join('')}</select>
          </div>
          <div class="fg"><label>Patente rampla PRIMARIA * <span style="color:var(--tx-muted);font-size:9px;">(NO secundaria)</span></label>
            <input type="text" id="nc-patente" placeholder="Ej: XXYY00" style="text-transform:uppercase;" oninput="this.value=this.value.toUpperCase();buscarDatosCita(this.value)">
            <div id="nc-carrier-info" style="display:none;font-size:10px;color:var(--c-ok);margin-top:2px;padding:4px 6px;background:var(--bg-alt);border:1px solid var(--border);"></div>
          </div>
        </div>
        <div class="fr">
          <div class="fg"><label>Tipo Operación</label>
            <select id="nc-tipo-op">
              <option value="descarga">Descarga</option>
              <option value="carga">Carga</option>
              <option value="descarga_carga">Descarga + Carga</option>
            </select>
          </div>
          <div class="fg"><label>Tipo Carga</label>
            <select id="nc-tipo-carga">
              <option value="congelado">Congelado</option>
              <option value="refrigerado">Refrigerado</option>
              <option value="seco">Seco</option>
            </select>
          </div>
          <div class="fg" style="max-width:110px;"><label>Pallets Estim.</label>
            <input type="number" id="nc-pallets" min="1" max="33" value="12">
          </div>
        </div>
        <div class="fg"><label>Observaciones</label>
          <textarea id="nc-obs" rows="2" placeholder="Opcional..."></textarea>
        </div>
      </div>
      <div class="mf">
        <button class="btn" onclick="closeModal('modal-cita')">CANCELAR</button>
        <button class="btn btn-ok" onclick="saveCita()">GUARDAR CITA</button>
      </div>
    </div>
  </div>`;
  const existing = document.getElementById('modal-cita');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveCita() {
  const fecha   = document.getElementById('nc-fecha').value;
  const horaIni = document.getElementById('nc-hora-ini').value;
  const horaFin = document.getElementById('nc-hora-fin').value;
  const dockId  = document.getElementById('nc-anden').value;
  const patente = document.getElementById('nc-patente').value;
  const tipoOp  = document.getElementById('nc-tipo-op').value;
  const tipoCg  = document.getElementById('nc-tipo-carga').value;
  const pallets = parseInt(document.getElementById('nc-pallets').value) || 0;
  const obs     = document.getElementById('nc-obs').value.trim();

  if (!fecha || !horaIni || !dockId || !patente) {
    Audio.play('error');
    const faltantes = [];
    if (!fecha) faltantes.push('Fecha');
    if (!horaIni) faltantes.push('Hora inicio');
    if (!dockId) faltantes.push('Andén');
    if (!patente) faltantes.push('Patente');
    notify('â›” Campos obligatorios faltantes: ' + faltantes.join(', '), 'error'); return;
  }

  // Verificar conflicto de horario en el mismo andén
  const nuevoIni = horaIni;
  const nuevoFin = horaFin || horaIni;
  const conflicto = (STATE.citas || []).find(c =>
    c.dock_id === dockId && c.fecha === fecha &&
    !['cancelada','no_presentada'].includes(c.estado) &&
    ((c.hora_inicio || '') < nuevoFin && nuevoIni < (c.hora_fin || c.hora_inicio || '23:59'))
  );
  if (conflicto) {
    Audio.play('error');
    notify('â›” Conflicto de horario: ya existe una cita en Andén ' + (dock?.codigo||'?') + ' entre ' + horaIni + ' y ' + (horaFin || horaIni), 'error'); return;
  }

  const carrier = (STATE.carriers || []).find(x => x.codigo === patente);
  const dock    = (STATE.docks || []).find(d => d.id === dockId);
  const newCita = {
    id: 'cit' + Date.now(), fecha, hora_inicio: horaIni, hora_fin: horaFin,
    dock_id: dockId, dock_codigo: dock?.codigo, patente,
    empresa: carrier?.nombre || '', tipo_operacion: tipoOp,
    tipo_carga: tipoCg, pallets_estimados: pallets, obs,
    estado: 'programada', creado_en: new Date().toISOString(),
    creado_por: STATE.profile?.nombre,
  };

  STATE.citas.push(newCita);
  if (!STATE.usingSeed && sb) {
    sb.from('appointments').insert({
      fecha, hora_inicio: horaIni, hora_fin: horaFin, dock_id: dockId,
      patente, tipo_operacion: tipoOp, tipo_carga: tipoCg,
      pallets_estimados: pallets, obs, estado: 'programada',
    }).then(() => auditLog('citas', 'CITA_CREADA', `${patente} / ${dock?.codigo} / ${fecha} ${horaIni}`));
  }

  closeModal('modal-cita');
  Audio.play('ok');
  notify('âœ“ Cita registrada: ' + patente + ' · ' + (dock?.codigo||'?') + ' · ' + fecha + ' ' + horaIni + ' â€” ' + tipoOp.replace(/_/g,' ').toUpperCase() + ' · ' + pallets + ' pallets', 'ok');
  auditLog('citas', 'CITA_CREADA', `${patente} / ${dock?.codigo} / ${fecha} ${horaIni}`);
  renderCitas();
}

function confirmCita(id) {
  const c = (STATE.citas || []).find(x => x.id === id);
  if (!c) return;
  c.estado = 'confirmada';
  notify('Cita confirmada', 'ok');
  renderCitas();
}

function cancelCita(id) {
  const c = (STATE.citas || []).find(x => x.id === id);
  if (!c || !confirm('Â¿Cancelar esta cita?')) return;
  c.estado = 'cancelada';
  notify('Cita cancelada', 'warn');
  renderCitas();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CADENA FRÃO â€” RENDER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderTemperatura() {
  const cont = document.getElementById('view-temperatura');
  if (!cont) return;
  const tempVisits = (STATE.visits || []).filter(v => v.temp_cabina != null);
  const alertas = tempVisits.filter(v => v.temp_alerta);
  const ok_     = tempVisits.filter(v => !v.temp_alerta);

  // Construir tabla de registro de temperaturas
  const tbl = document.getElementById('temp-log-tbl');
  if (tbl) {
    tbl.innerHTML = tempVisits.length ? tempVisits.map(v => {
      const cls = v.temp_alerta ? 'c-err' : 'c-ok';
      return `<tr>
        <td class="c-dim">${fmtDateTime(v.hora_ingreso)}</td>
        <td class="c-bright fw">${v.patente}</td>
        <td>${v.carrier_nombre || 'â€”'}</td>
        <td class="${cls}">${v.temp_cabina != null ? v.temp_cabina + 'Â°C' : 'â€”'} ${v.temp_alerta ? '⚠ ' : 'âœ“'}</td>
        <td class="c-dim">${v.temp_producto != null ? v.temp_producto + 'Â°C' : 'â€”'}</td>
        <td><span class="badge ${v.tipo_carga==='congelado'?'badge b-info':'badge b-warn'}">${(v.tipo_carga||'â€”').toUpperCase()}</span></td>
        <td class="${v.temp_alerta?'c-err':'c-ok'}">${v.temp_alerta ? '⚠  FUERA DE RANGO' : 'âœ“ OK'}</td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="7" class="c-dim tc" style="padding:16px;">Sin registros de temperatura</td></tr>';
  }

  // KPIs temp
  set('temp-k-total', tempVisits.length);
  set('temp-k-ok',    ok_.length);
  set('temp-k-alert', alertas.length);
  const pct = tempVisits.length ? Math.round(ok_.length / tempVisits.length * 100) : 100;
  set('temp-k-adh', pct + '%');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  FUNCIONES FALTANTES â€” closeModal, resolveAllAlerts,
//  openNewPlaya, openNewCarro, aprobarDevolucion,
//  asignarAndén (con tilde)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'none'; el.style.alignItems = ''; el.style.justifyContent = ''; }
}

function resolveAllAlerts() {
  (STATE.alerts || []).forEach(a => { a.resuelta = true; });
  STATE.alertsResolved = (STATE.alertsResolved || 0) + (STATE.alerts || []).filter(a => a.resuelta).length;
  renderAlertas();
  set('kpi-alerts', 0);
  const badge = document.getElementById('alerts-badge');
  if (badge) badge.textContent = '';
  const mb = document.getElementById('mnav-alerts-badge');
  if (mb) mb.style.display = 'none';
  notify('âœ“ Todas las alertas resueltas', 'ok');
}

function openNewPlaya() {
  // Resetear selección previa
  STATE._pendingSlotTipo = null;
  document.getElementById('agregar-slot-seleccion').style.display = 'none';
  ['btn-tipo-cargado','btn-tipo-espera','btn-tipo-libre'].forEach(function(id){
    const el = document.getElementById(id);
    if (el) el.style.outline = 'none';
  });
  document.getElementById('modal-agregar-slot').style.display = 'flex';
}

function openNewCarro() {
  // Poblar selects del modal carro
  const sel = document.getElementById('carro-patente');
  if (sel) {
    sel.innerHTML = '<option value="">-- Seleccionar --</option>' +
      (STATE.carriers || []).map(c => `<option value="${c.codigo}">${c.codigo} â€” ${c.nombre}</option>`).join('');
  }
  const slotSel = document.getElementById('carro-slot');
  if (slotSel) {
    slotSel.innerHTML = '<option value="">Sin slot</option>' +
      (STATE.playaSlots || []).filter(s => !s.ocupado).map(s => `<option value="${s.id}">Slot ${s.num}</option>`).join('');
  }
  const modal = document.getElementById('modal-carro');
  if (modal) modal.style.display = 'flex';
}

// Asignación rápida desde panel "En Espera de Andén"
async function asignarAndenDesdeEspera(visitId, dockId) {
  if (!visitId || !dockId) return;
  const dock  = (STATE.docks || []).find(d => d.id === dockId);
  const visit = (STATE.visits || []).find(v => v.id === visitId);
  if (!dock || !visit) { notify('â›” Datos no encontrados', 'error'); return; }
  if (dock.estado !== 'free') { notify('â›” El andén ya no está libre', 'warn'); return; }
  const ahora = new Date().toISOString();
  dock.estado = 'busy'; dock.truck_id = visitId; dock.inicio_ocupacion = ahora;
  visit.zona_actual = 'anden'; visit.dock_id = dockId; visit.estado = 'en_anden';
  STATE.auditLog.unshift({ id:'a'+Date.now(), categoria:'dock', evento:'ASIGNACION_ESPERA',
    detalle: visit.patente + ' â†’ Andén ' + dock.codigo + ' (desde cola espera)',
    user_nombre: STATE.profile?.nombre, created_at: ahora });
  if (!STATE.usingSeed && sb) {
    try {
      await sb.from('docks').update({ estado:'busy', truck_id: visitId, inicio_ocupacion: ahora }).eq('id', dockId);
      await sb.from('yard_visits').update({ zona_actual:'anden', dock_id: dockId, estado:'en_anden' }).eq('id', visitId);
      await auditLog('dock','ASIGNACION_ESPERA', visit.patente + ' â†’ Andén ' + dock.codigo);
    } catch(e) { console.warn('asignarAndenDesdeEspera:', e.message); }
  }
  Audio.play('dock_free');
  notify('âœ“ ' + visit.patente + ' asignado a Andén ' + dock.codigo, 'ok');
  renderAndenes(); renderDashboard();
}

// Alias con tilde para compatibilidad
function asignarAndén() { asignarManual(); }

async function asignarManual() {
  const dockId  = document.getElementById('asig-anden')?.value;
  const visitId = document.getElementById('asig-visita')?.value;
  if (!dockId || !visitId) { notify('â›” Seleccione andén y camión', 'error'); return; }
  const dock  = (STATE.docks || []).find(d => d.id === dockId);
  const visit = (STATE.visits || []).find(v => v.id === visitId);
  if (!dock || !visit) return;
  if (STATE.usingSeed) {
    dock.estado = 'busy'; dock.truck_id = visitId; dock.inicio_ocupacion = new Date().toISOString();
    visit.zona_actual = 'anden'; visit.dock_id = dockId; visit.estado = 'en_anden';
    STATE.auditLog.unshift({ id:'a'+Date.now(), categoria:'dock', evento:'ASIGNACION_MANUAL',
      detalle:`${visit.patente} â†’ Andén ${dock.codigo}`, user_nombre: STATE.profile?.nombre, created_at: new Date().toISOString() });
  } else {
    await sb.from('docks').update({ estado:'busy', truck_id: visitId, inicio_ocupacion: new Date().toISOString() }).eq('id', dockId);
    await sb.from('yard_visits').update({ zona_actual:'anden', dock_id: dockId, estado:'en_anden' }).eq('id', visitId);
    await auditLog('dock','ASIGNACION_MANUAL', `${visit.patente} â†’ Andén ${dock.codigo}`);
  }
  notify(`Andén ${dock.codigo} asignado a ${visit.patente}`, 'ok');
  Audio.play('dock_free');
  document.getElementById('and-asign-panel').style.display = 'none';
  renderAndenes(); renderDashboard();
}

async function aprobarDevolucion(id, aprobada) {
  const r = (STATE.returns || []).find(x => x.id === id);
  if (!r) return;
  const action = aprobada ? 'aprobada' : 'rechazada';
  if (!confirm(`Â¿${aprobada ? 'APROBAR' : 'RECHAZAR'} esta devolución?`)) return;
  r.estado = action;
  r.autorizado_por = STATE.user?.id || 'admin';
  r.autorizado_por_nombre = STATE.profile?.nombre || 'Admin';
  r.hora_resolucion = new Date().toISOString();
  if (!STATE.usingSeed && sb) {
    await sb.from('return_authorizations').update({
      estado: action, autorizado_por: STATE.user?.id,
      hora_resolucion: new Date().toISOString(),
    }).eq('id', id);
  }
  await auditLog('devol', 'DEVOLUCION_' + action.toUpperCase(), `Devolución ${r.patente || r.numero_ruta || id} ${action}`);
  notify(`Devolución ${action}`, aprobada ? 'ok' : 'warn');
  Audio.play(aprobada ? 'accepted' : 'error');
  renderDevoluciones();
  renderWorkflows();
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const MOBILE_ACCESS_ROLES = ['guardia', 'operador_patio'];

function getAccessLink() {
  return window.location.href.split('?')[0].split('#')[0];
}

function checkRolLink() {
  const rol = document.getElementById('inp-user-rol')?.value;
  const preview = document.getElementById('link-preview');
  const previewUrl = document.getElementById('link-preview-url');
  if (!preview || !previewUrl) return;
  if (MOBILE_ACCESS_ROLES.includes(rol)) {
    const url = getAccessLink();
    previewUrl.textContent = url;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

function copyLinkPreview() {
  const url = document.getElementById('link-preview-url')?.textContent;
  if (url) { navigator.clipboard.writeText(url).then(() => notify('Link copiado al portapapeles', 'ok')); }
}

function copyCreatedLink() {
  const url = document.getElementById('created-link-url')?.textContent;
  if (url) { navigator.clipboard.writeText(url).then(() => notify('âœ“ Link copiado', 'ok')); }
}

function showCreatedLink(nombre, email, rol) {
  const box = document.getElementById('created-link-box');
  const urlEl = document.getElementById('created-link-url');
  const credEl = document.getElementById('created-link-cred');
  if (!box || !urlEl) return;
  const url = getAccessLink();
  urlEl.textContent = url;
  credEl.textContent = `Usuario: ${email} · Rol: ${rol.replace(/_/g,' ').toUpperCase()}`;
  box.style.display = 'block';
  box.scrollIntoView({ behavior: 'smooth' });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CREACIÃ“N USUARIOS â€” SOLO ADMINISTRADOR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function createUser() {
  if (STATE.profile?.rol !== 'administrador') {
    notify('â›” Solo el administrador puede crear usuarios', 'error'); return;
  }
  const nombre = (document.getElementById('inp-user-nombre')?.value || '').trim();
  const email  = (document.getElementById('inp-user-email')?.value  || '').trim();
  const pass   = (document.getElementById('inp-user-pass')?.value   || '');
  const rol    = document.getElementById('inp-user-rol')?.value || 'guardia';
  const sitio  = (document.getElementById('inp-user-sitio')?.value  || 'CD_SAN_BERNARDO').trim();
  const msgEl  = document.getElementById('user-form-msg');
  const setMsg = (txt, cls) => { if (msgEl) msgEl.innerHTML = `<span style="color:var(--${cls})">${txt}</span>`; };

  if (!nombre || !email || !pass) { setMsg('â›” Nombre, email y contraseña son obligatorios', 'c-err'); return; }
  if (pass.length < 8) { setMsg('â›” Contraseña mínimo 8 caracteres', 'c-err'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMsg('â›” Email no válido', 'c-err'); return; }
  if ((STATE.users || []).find(u => u.email === email)) { setMsg('â›” Este email ya existe', 'c-err'); return; }

  setMsg('âŒ› Creando usuario...', 'c-warn');

  // â”€â”€ Modo demo offline â”€â”€
  if (!sb || STATE.usingSeed) {
    const u = { id:'u'+Date.now(), nombre, email, rol, sitio, activo:true, pass, origen:'local', created_at:new Date().toISOString() };
    STATE.users.push(u);
    saveUsersToStorage(); // Guardar en localStorage
    setMsg('âœ“ Usuario creado y guardado âœ“', 'c-ok');
    notify('Usuario ' + nombre + ' creado en ' + sitio, 'ok');
    if (MOBILE_ACCESS_ROLES.includes(rol)) showCreatedLink(nombre, email, rol);
    clearUserForm(); renderConfigUsuarios();
    await auditLog('config', 'USUARIO_CREADO', nombre + ' · ' + rol + ' · ' + sitio);
    return;
  }

  // â”€â”€ Con Supabase: Admin API directo con Service Key â”€â”€
  let userId = null;
  try {
    setMsg('âŒ› Conectando a servidor...', 'c-warn');

    // Test de conexión rápido
    const testRes = await Promise.race([
      fetch(`${SUPABASE_URL}/auth/v1/health`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]).catch(e => ({ ok: false, error: e.message }));

    if (!testRes.ok) {
      throw new Error('Servidor no disponible. Intente más tarde.');
    }

    setMsg('âŒ› Creando usuario en Auth...', 'c-warn');
    const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password: pass,
        email_confirm: true,
        user_metadata: { nombre, rol, sitio },
      }),
    });
    const adminData = await adminRes.json();

    if (!adminRes.ok) {
      const errMsg = adminData?.message || adminData?.msg || adminData?.error_description || adminData?.error || 'Error desconocido';
      throw new Error(`${errMsg}`);
    }

    if (!adminData?.id) throw new Error('El servidor no retornó ID de usuario');
    userId = adminData.id;

    setMsg('âŒ› Guardando perfil...', 'c-warn');
    const { error: profErr } = await sb.from('profiles').upsert({
      id: userId, nombre, email, rol, sitio, activo: true,
      username: email.split('@')[0],
    }, { onConflict: 'id' });

    if (profErr) throw new Error(`Error guardando perfil: ${profErr.message}`);

    setMsg('âŒ› Finalizando...', 'c-warn');
    await sb.from('user_presence').upsert({ id: userId, online: false, updated_at: new Date().toISOString() });

    // Verificar que se guardó correctamente
    const { data: verificar } = await sb.from('profiles').select('id').eq('id', userId).single();
    if (!verificar) throw new Error('No se pudo verificar que el usuario se guardó');

    STATE.users.push({ id: userId, nombre, email, rol, sitio, activo: true, ultimo_acceso: null, origen:'supabase' });
    setMsg('âœ… Usuario <b>' + nombre + '</b> creado correctamente âœ“ Email: <b>' + email + '</b>', 'c-ok');
    notify('âœ“ ' + nombre + ' · ' + rol.replace(/_/g,' ').toUpperCase() + ' creado', 'ok');
    await auditLog('config', 'USUARIO_CREADO', nombre + ' · ' + email + ' · ' + rol);
    if (MOBILE_ACCESS_ROLES.includes(rol)) showCreatedLink(nombre, email, rol);
    clearUserForm(); renderConfigUsuarios();
    set('cfg-user-count', (STATE.users || []).length);
  } catch(err) {
    const msg = err?.message || 'Error desconocido';
    console.error('createUser error:', err);

    // Sugerencias segÃºn el tipo de error
    let suggestion = '';
    if (msg.includes('Servidor no disponible') || msg.includes('timeout') || msg.includes('fetch')) {
      suggestion = '<br><span style="font-size:9px;color:var(--tx-muted);">ðŸ’¡ Verifique su conexión a internet o intente más tarde</span>';
    } else if (msg.includes('User already exists')) {
      suggestion = '<br><span style="font-size:9px;color:var(--tx-muted);">ðŸ’¡ Este email ya está registrado en el sistema</span>';
    }

    setMsg('â›” ' + msg + suggestion, 'c-err');
    notify('Error al crear usuario: ' + msg, 'error');
  }
}

function clearUserForm() {
  ['inp-user-nombre','inp-user-email','inp-user-pass'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const si = document.getElementById('inp-user-sitio'); if(si) si.value = 'CD_SAN_BERNARDO';
  const ro = document.getElementById('inp-user-rol');   if(ro) ro.value = 'guardia';
  const ms = document.getElementById('user-form-msg');  if(ms) ms.innerHTML = '';
  const ti = document.getElementById('cfg-user-form-title'); if(ti) ti.textContent = '+ CREAR USUARIO';
  const lp = document.getElementById('link-preview'); if(lp) lp.style.display = 'none';
}

async function editUserRol(userId, newRol) {
  const u = (STATE.users || []).find(x => x.id === userId);
  if (!u) return;
  u.rol = newRol;
  if (STATE.usingSeed) {
    saveUsersToStorage();
  } else if (sb) {
    const { error } = await sb.from('profiles').update({ rol: newRol }).eq('id', userId);
    if (error) {
      notify('â›” Error: ' + error.message, 'error');
      return;
    }
  }
  await auditLog('config', 'ROL_CAMBIADO', (u.nombre||'â€”') + ' â†’ ' + newRol);
  notify('Rol de ' + u.nombre + ' â†’ ' + newRol.replace(/_/g,' ').toUpperCase(), 'ok');
}

function renderConfigUsuarios() {
  const tbody = document.getElementById('users-tbl');
  if (!tbody) return;

  // Filtrar usuarios: solo mostrar los del CD actual (administrador ve todos)
  const isAdmin = STATE.profile?.rol === 'administrador';
  const currentCD = STATE.currentSite || 'CD_SAN_BERNARDO';
  const filtered = isAdmin ? STATE.users : (STATE.users || []).filter(u => u.sitio === currentCD);

  set('cfg-user-count', filtered.length);
  const roles = ['guardia','operador_patio','supervisor_andenes','administrativo_ops','jefe_ops','visualizador','administrador'];

  tbody.innerHTML = `<tr style="background:var(--bg-alt);">
    <td colspan="8" style="padding:12px;text-align:right;">
      <button class="btn btn-ok" style="font-size:10px;padding:8px 16px;" onclick="openUserModal()">âž• CREAR USUARIO</button>
      //       <button class="btn btn-info" style="font-size:10px;padding:8px 16px;margin-left:8px;" onclick="syncUsersToSupabase()">ðŸ”„ SINCRONIZAR A SUPABASE</button>
    </td>
  </tr>` + (filtered.length > 0 ? filtered.map(u => {
    const rolOpts = roles.map(r => `<option value="${r}" ${u.rol===r?'selected':''}>${Utils.esc(r.replace(/_/g,' ').toUpperCase())}</option>`).join('');
    const sitioOpts = SITES_DISPONIBLES.map(s => `<option value="${Utils.esc(s.codigo)}" ${u.sitio===s.codigo?'selected':''}>${Utils.esc(s.nombre)}</option>`).join('');
    const hasLink = MOBILE_ACCESS_ROLES.includes(u.rol);
    const appUrl = getAccessLink();
    return `<tr>
      <td class="c-bright fw">${Utils.esc(u.nombre||'â€”')}</td>
      <td class="c-dim fz10">${Utils.esc(u.email||u.username||'â€”')}</td>
      <td><select style="font-size:10px;padding:1px 3px;background:var(--bg-input);border:1px solid var(--border);color:var(--tx-base);font-family:var(--font);" onchange="editUserRol('${u.id}',this.value)">${rolOpts}</select></td>
      <td><select style="font-size:10px;padding:1px 3px;background:var(--bg-input);border:1px solid var(--border);color:var(--tx-base);font-family:var(--font);" onchange="editUserCD('${u.id}',this.value)">${sitioOpts}</select></td>
      <td><span class="badge ${u.activo?'b-ok':'b-err'}">${u.activo?'ACTIVO':'INACT.'}</span></td>
      <td class="c-dim fz10">${u.ultimo_acceso?fmtDateTime(u.ultimo_acceso):'â€”'}</td>
      <td>${hasLink ? `<span class="al-url fz10" onclick="navigator.clipboard.writeText('${Utils.esc(appUrl)}').then(()=>notify('Link copiado','ok'))" title="Copiar link de acceso">ðŸ”— COPIAR</span>` : 'â€”'}</td>
      <td style="display:flex;gap:3px;">
        <button class="btn btn-info" style="font-size:9px;padding:1px 5px;" onclick="openUserModal('${u.id}')" title="Editar">âœï¸ EDITAR</button>
        <button class="btn btn-warn" style="font-size:9px;padding:1px 5px;" onclick="toggleUser('${u.id}')">${u.activo?'DESACT.':'ACTIVAR'}</button>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="c-dim tc" style="padding:16px;">Sin usuarios en este centro de distribución</td></tr>');
}

async function editUserCD(userId, newCD) {
  const u = (STATE.users || []).find(x => x.id === userId);
  if (!u) return;
  u.sitio = newCD;
  const site = SITES_DISPONIBLES.find(s => s.codigo === newCD);
  if (STATE.usingSeed) {
    saveUsersToStorage();
  } else if (sb) {
    const { error } = await sb.from('profiles').update({ sitio: newCD }).eq('id', userId);
    if (error) {
      notify('â›” Error actualizando CD: ' + error.message, 'error');
      return;
    }
  }
  await auditLog('config', 'CD_CAMBIADO', (u.nombre||'â€”') + ' â†’ ' + (site?.nombre || newCD));
  Audio.play('ok');
  notify('âœ“ CD de ' + (u.nombre||'?') + ' â†’ ' + (site?.nombre || newCD), 'ok');
}

async function resetUserPassword(userId) {
  const u = (STATE.users || []).find(x => x.id === userId);
  if (!u) return;

  if (!confirm('Â¿Generar nueva contraseña para ' + u.nombre + '? Se enviará un enlace de reset al email.')) return;

  if (!STATE.usingSeed && sb) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}/factors/0/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || 'No se pudo enviar el reset');
      }

      notify('âœ“ Link de reset enviado a ' + u.email, 'ok');
      await auditLog('config', 'PASSWORD_RESET', u.nombre + ' (' + u.email + ')');
    } catch(err) {
      notify('â›” ' + (err?.message || 'Error en reset'), 'error');
    }
  }
}

function toggleUser(userId) {
  const u = (STATE.users || []).find(x => x.id === userId);
  if (!u) return;
  u.activo = !u.activo;
  if (STATE.usingSeed) {
    saveUsersToStorage(); // Guardar cambios en localStorage
  } else if (sb) {
    sb.from('profiles').update({ activo: u.activo }).eq('id', userId);
  }
  auditLog('config', u.activo ? 'USUARIO_ACTIVADO' : 'USUARIO_DESACTIVADO', u.nombre);
  notify((u.activo ? 'âœ“ Activado' : 'âœ— Desactivado') + ': ' + u.nombre, 'ok');
  renderConfigUsuarios();
}

// â”€â”€ MODAL DE USUARIOS â”€â”€
let _userModalEditId = null;

function openUserModal(userId = null) {
  _userModalEditId = userId;
  const overlay = document.getElementById('user-modal-overlay');
  const titulo = document.getElementById('user-modal-title');
  const subtitulo = document.getElementById('user-modal-subtitle');
  const nombre = document.getElementById('umod-nombre');
  const email = document.getElementById('umod-email');
  const pass = document.getElementById('umod-pass');
  const rol = document.getElementById('umod-rol');
  const sitio = document.getElementById('umod-sitio');
  const msg = document.getElementById('umod-msg');

  msg.innerHTML = '';

  if (userId) {
    // Modo edición
    const u = (STATE.users || []).find(x => x.id === userId);
    if (!u) return;
    titulo.textContent = 'âœï¸ EDITAR USUARIO';
    subtitulo.textContent = 'Modifica los datos de ' + u.nombre;
    nombre.value = u.nombre || '';
    email.value = u.email || '';
    pass.value = u.pass || '';
    rol.value = u.rol || 'guardia';
    sitio.value = u.sitio || 'CD_SAN_BERNARDO';
    pass.placeholder = 'Dejar vacío para no cambiar';
  } else {
    // Modo creación
    titulo.textContent = 'âž• CREAR USUARIO';
    subtitulo.textContent = 'Nuevo usuario para el sistema';
    nombre.value = '';
    email.value = '';
    pass.value = '';
    rol.value = 'guardia';
    sitio.value = 'CD_SAN_BERNARDO';
    pass.placeholder = 'Mínimo 8 caracteres';
  }

  overlay.style.display = 'flex';
  nombre.focus();
}

function closeUserModal() {
  const overlay = document.getElementById('user-modal-overlay');
  overlay.style.display = 'none';
  _userModalEditId = null;
}

function saveUserFromModal() {
  const nombre = (document.getElementById('umod-nombre').value || '').trim();
  const email = (document.getElementById('umod-email').value || '').trim();
  const pass = document.getElementById('umod-pass').value;
  const rol = document.getElementById('umod-rol').value;
  const sitio = document.getElementById('umod-sitio').value;
  const msg = document.getElementById('umod-msg');

  msg.innerHTML = '';

  if (!nombre || !email) {
    msg.innerHTML = 'â›” Nombre y email son obligatorios';
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msg.innerHTML = 'â›” Email no válido';
    return;
  }

  if (_userModalEditId) {
    // Edición
    const u = (STATE.users || []).find(x => x.id === _userModalEditId);
    if (!u) return;
    u.nombre = nombre;
    u.email = email;
    u.rol = rol;
    u.sitio = sitio;
    if (pass && pass.length >= 8) {
      u.pass = pass;
      msg.innerHTML = 'âœ“ Usuario actualizado (contraseña cambiada)';
    } else if (pass) {
      msg.innerHTML = 'â›” Contraseña debe tener mínimo 8 caracteres';
      return;
    } else {
      msg.innerHTML = 'âœ“ Usuario actualizado';
    }
    auditLog('config', 'USUARIO_EDITADO', nombre + ' · ' + rol);
  } else {
    // Creación
    if (!pass || pass.length < 8) {
      msg.innerHTML = 'â›” Contraseña mínimo 8 caracteres';
      return;
    }

    if ((STATE.users || []).find(u => u.email === email)) {
      msg.innerHTML = 'â›” Este email ya existe';
      return;
    }

    const u = { id: 'u' + Date.now(), nombre, email, rol, sitio, activo: true, pass, origen: 'local', created_at: new Date().toISOString() };
    STATE.users.push(u);
    msg.innerHTML = 'âœ“ Usuario creado correctamente';
    auditLog('config', 'USUARIO_CREADO', nombre + ' · ' + rol + ' · ' + sitio);
  }

  if (STATE.usingSeed) {
    saveUsersToStorage();
  }

  setTimeout(() => {
    renderConfigUsuarios();
    closeUserModal();
    notify((pass ? 'âœ“ Guardado correctamente' : 'âœ“ ' + nombre + ' actualizado'), 'ok');
  }, 500);
}

// â”€â”€ CAMBIO DE CONTRASEÃ‘A â”€â”€
function openChangePasswordModal() {
  const overlay = document.getElementById('change-pass-overlay');
  const subtitle = document.getElementById('chpass-subtitle');
  const msg = document.getElementById('chpass-msg');

  subtitle.textContent = 'Cambiar contraseña para ' + (STATE.profile?.nombre || 'usuario actual');
  msg.innerHTML = '';

  document.getElementById('chpass-current').value = '';
  document.getElementById('chpass-new').value = '';
  document.getElementById('chpass-confirm').value = '';

  overlay.style.display = 'flex';
  document.getElementById('chpass-current').focus();
}

function closeChangePasswordModal() {
  const overlay = document.getElementById('change-pass-overlay');
  overlay.style.display = 'none';
}

function saveChangePassword() {
  const current = document.getElementById('chpass-current').value;
  const newPass = document.getElementById('chpass-new').value;
  const confirm = document.getElementById('chpass-confirm').value;
  const msg = document.getElementById('chpass-msg');

  msg.innerHTML = '';

  if (!current || !newPass || !confirm) {
    msg.innerHTML = 'â›” Todos los campos son obligatorios';
    return;
  }

  if (newPass.length < 8) {
    msg.innerHTML = 'â›” La nueva contraseña debe tener mínimo 8 caracteres';
    return;
  }

  if (newPass !== confirm) {
    msg.innerHTML = 'â›” Las contraseñas no coinciden';
    return;
  }

  if (current === newPass) {
    msg.innerHTML = 'â›” La nueva contraseña debe ser diferente a la actual';
    return;
  }

  // Validar contraseña actual
  const user = (STATE.users || []).find(u => u.id === STATE.user?.id);
  if (!user) {
    msg.innerHTML = 'â›” Usuario no encontrado';
    return;
  }

  if (user.pass !== current) {
    msg.innerHTML = 'â›” Contraseña actual incorrecta';
    return;
  }

  // Cambiar contraseña
  user.pass = newPass;
  if (STATE.usingSeed) {
    saveUsersToStorage();
  }

  msg.innerHTML = 'âœ“ Contraseña cambiada correctamente';
  auditLog('auth', 'CONTRASEÃ‘A_CAMBIADA', STATE.profile?.nombre);

  setTimeout(() => {
    closeChangePasswordModal();
    notify('âœ“ Contraseña actualizada correctamente', 'ok');
  }, 800);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SINCRONIZAR USUARIOS A SUPABASE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LEGACY: async function syncUsersToSupabase() {
// LEGACY:   if (!sb) { notify('⚠ ï¸ Supabase no configurado', 'warn'); return; }
// LEGACY:   if (STATE.profile?.rol !== 'administrador') { notify('⚠ ï¸ Solo administradores pueden sincronizar', 'error'); return; }
// LEGACY: 
// LEGACY:   notify('â³ Sincronizando usuarios a Supabase...', 'info');
// LEGACY:   const btn = event?.target;
// LEGACY:   if (btn) btn.disabled = true;
// LEGACY: 
// LEGACY:   let profileUpdated = 0;
// LEGACY:   let profileFailed = 0;
// LEGACY: 
// LEGACY:   try {
// LEGACY:     // Sincronizar perfiles en la tabla profiles
// LEGACY:     console.log('[SYNC] Sincronizando perfiles...');
// LEGACY:     for (const seedUser of SEED.users) {
// LEGACY:       try {
// LEGACY:         const { error } = await sb.from('profiles').upsert({
// LEGACY:           id: seedUser.id,
// LEGACY:           email: seedUser.email,
// LEGACY:           nombre: seedUser.nombre,
// LEGACY:           rol: seedUser.rol,
// LEGACY:           activo: seedUser.activo,
// LEGACY:           sitio: seedUser.sitio
// LEGACY:         }, { onConflict: 'id' });
// LEGACY: 
// LEGACY:         if (!error) {
// LEGACY:           profileUpdated++;
// LEGACY:         } else {
// LEGACY:           profileFailed++;
// LEGACY:           console.warn('[SYNC] Error en perfil', seedUser.email, ':', error.message);
// LEGACY:         }
// LEGACY:       } catch(e) {
// LEGACY:         profileFailed++;
// LEGACY:         console.warn('[SYNC] Error actualizando perfil', seedUser.email, ':', e.message);
// LEGACY:       }
// LEGACY:     }
// LEGACY: 
// LEGACY:     const msg = `âœ“ Sincronización completada: ${profileUpdated} perfiles actualizados${profileFailed > 0 ? ', ' + profileFailed + ' errores' : ''}`;
// LEGACY:     notify(msg, profileFailed > 0 ? 'warn' : 'ok', 6000);
// LEGACY:     console.log('[YMS] ' + msg);
// LEGACY: 
// LEGACY:     // Nota sobre usuarios en auth
// LEGACY:     if (profileUpdated > 0) {
// LEGACY:       notify('ðŸ“ Nota: Los usuarios de auth se crean desde el dashboard de Supabase. Ve a Auth â†’ Users â†’ Add user', 'info', 8000);
// LEGACY:     }
// LEGACY: 
// LEGACY:   } catch(e) {
// LEGACY:     console.error('[SYNC] Error general:', e);
// LEGACY:     notify('⚠ ï¸ Error en sincronización: ' + e.message, 'error', 5000);
// LEGACY:   } finally {
// LEGACY:     if (btn) btn.disabled = false;
// LEGACY:   }
// LEGACY: }
// LEGACY: 
// LEGACY: // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LEGACY: //  WORKFLOWS
// LEGACY: // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LEGACY: const WF_DEFAULTS = [
// LEGACY:   { id:'wf1', nombre:'Aprobación Devoluciones', tipo:'devoluciones',
// LEGACY:     paso1:['guardia','operador_patio'], paso2:['administrativo_ops'], paso3:['administrador'],
// LEGACY:     descripcion:'Requiere validación de ops y autorización del administrador', sla_horas:4, activo:true },
// LEGACY:   { id:'wf2', nombre:'Tareas Críticas Patio', tipo:'tareas',
// LEGACY:     paso1:['supervisor_andenes'], paso2:['administrativo_ops'], paso3:[],
// LEGACY:     descripcion:'Tareas CRÃTICA requieren confirmación de supervisor', sla_horas:1, activo:true },
// LEGACY:   { id:'wf3', nombre:'Alerta Temperatura Fuera Rango', tipo:'temperatura',
// LEGACY:     paso1:['guardia'], paso2:['supervisor_andenes'], paso3:['administrador'],
// LEGACY:     descripcion:'Ingreso con temp. fuera de rango activa revisión inmediata', sla_horas:2, activo:true },
// LEGACY: ];
// LEGACY: let STATE_WORKFLOWS = (() => {
// LEGACY:   try {
// LEGACY:     const saved = JSON.parse(localStorage.getItem('yms_workflows') || 'null');
// LEGACY:     return Array.isArray(saved) && saved.length ? saved : WF_DEFAULTS;
// LEGACY:   } catch(e) { return WF_DEFAULTS; }
// LEGACY: })();
// LEGACY: 
// LEGACY: function persistWorkflows() {
// LEGACY:   try { localStorage.setItem('yms_workflows', JSON.stringify(STATE_WORKFLOWS)); } catch(e) {}
// LEGACY: }

const WF_ROLES = ['guardia','operador_patio','supervisor_andenes','administrativo_ops','jefe_ops','administrador'];
const WF_ROLES_HTML = WF_ROLES.map(r => `<option value="${r}">${r.replace(/_/g,' ').toUpperCase()}</option>`).join('');

function initWfSelects() {
  ['wf-paso1','wf-paso2','wf-paso3'].forEach(pasoId => {
    const container = document.getElementById(pasoId + '-checks');
    if (!container || container.innerHTML) return;
    container.innerHTML = WF_ROLES.map(r =>
      `<label style="display:flex;align-items:center;gap:7px;font-size: 8px;cursor:pointer;color:var(--tx-base);white-space:nowrap;">
        <input type="checkbox" name="${pasoId}" value="${r}" style="accent-color:var(--c-accent);width:14px;height:14px;">
        ${r.replace(/_/g,' ').toUpperCase()}
      </label>`
    ).join('');
  });
}

function showWfForm() {
  clearWfForm();
  initWfSelects();
  const p = document.getElementById('wf-form-panel');
  if (p) { p.style.display = 'block'; p.scrollIntoView({behavior:'smooth'}); }
}

function renderWorkflows() {
  const tbody = document.getElementById('workflows-tbl');
  if (!tbody) return;
  set('wf-count', STATE_WORKFLOWS.length);
  const fmt = arr => (arr||[]).filter(Boolean).map(r=>r.replace(/_/g,' ')).join(', ') || 'â€”';
  tbody.innerHTML = STATE_WORKFLOWS.map(w => `<tr>
    <td class="c-bright fw">${w.nombre}</td>
    <td class="c-dim">${w.tipo}</td>
    <td><span class="badge b-warn fz10">${fmt(w.paso1)}</span></td>
    <td><span class="badge b-info fz10">${fmt(w.paso2)}</span></td>
    <td><span class="badge b-ok fz10">${fmt(w.paso3)}</span></td>
    <td class="c-dim">${w.sla_horas}h</td>
    <td><span class="badge ${w.activo?'b-ok':'b-err'}">${w.activo?'ACTIVO':'INACT.'}</span></td>
    <td>
      <button class="btn fz10" style="padding:1px 5px;" onclick="editWorkflow('${w.id}')">EDITAR</button>
      <button class="btn btn-err fz10" style="padding:1px 4px;" onclick="deleteWorkflow('${w.id}')">âœ•</button>
    </td>
  </tr>`).join('') || '<tr><td colspan="8" class="c-dim tc">Sin workflows</td></tr>';

  const tbody2 = document.getElementById('wf-pending-tbl');
  if (tbody2) {
    const pending = (STATE.returns||[]).filter(r=>r.estado==='pendiente');
    set('wf-pending-count', pending.length);
    tbody2.innerHTML = pending.map(r => {
      const wf = STATE_WORKFLOWS.find(w=>w.tipo==='devoluciones'&&w.activo);
      const elapsed = r.hora_solicitud ? Math.round((Date.now()-new Date(r.hora_solicitud))/60000) : 0;
      const p2 = (wf?.paso2||[]).filter(Boolean).map(x=>x.replace(/_/g,' ')).join(', ')||'Administrador';
      return `<tr>
        <td class="c-bright">${wf?.nombre||'Devoluciones'}</td>
        <td class="c-bright fw">${r.patente||'â€”'}</td>
        <td class="c-dim">${(STATE.users || []).find(u=>u.id===r.solicitado_por)?.nombre||'â€”'}</td>
        <td><span class="badge b-warn">PASO 1â†’2</span></td>
        <td><span class="badge b-info fz10">${p2}</span></td>
        <td class="${elapsed>(wf?.sla_horas||4)*60?'c-err':'c-ok'}">${elapsed}min</td>
        <td>
          <button class="btn btn-ok fz10" style="padding:1px 5px;" onclick="aprobarDevolucion('${r.id}',true)">APROBAR</button>
          <button class="btn btn-err fz10" style="padding:1px 5px;" onclick="aprobarDevolucion('${r.id}',false)">RECHAZAR</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="c-dim tc" style="padding:12px;">Sin solicitudes pendientes</td></tr>';
  }
}

function editWorkflow(id) {
  const w = STATE_WORKFLOWS.find(x=>x.id===id);
  if (!w) return;
  initWfSelects();
  document.getElementById('wf-edit-id').value = w.id;
  document.getElementById('wf-nombre').value = w.nombre;
  document.getElementById('wf-tipo').value = w.tipo;
  document.getElementById('wf-descripcion').value = w.descripcion||'';
  document.getElementById('wf-sla').value = w.sla_horas||4;
  document.getElementById('wf-activo').value = w.activo?'1':'0';
  ['paso1','paso2','paso3'].forEach(p => {
    document.querySelectorAll(`input[name="wf-${p}"]`).forEach(cb => {
      cb.checked = (w[p]||[]).includes(cb.value);
    });
  });
  document.getElementById('wf-form-title').textContent = 'EDITAR: ' + w.nombre;
  const p = document.getElementById('wf-form-panel');
  if (p) { p.style.display='block'; p.scrollIntoView({behavior:'smooth'}); }
}

function saveWorkflow() {
  const editId = document.getElementById('wf-edit-id').value;
  const nombre = (document.getElementById('wf-nombre')?.value||'').trim();
  const tipo = document.getElementById('wf-tipo')?.value||'general';
  const desc = (document.getElementById('wf-descripcion')?.value||'').trim();
  const sla = parseInt(document.getElementById('wf-sla')?.value)||4;
  const activo = document.getElementById('wf-activo')?.value==='1';
  const getM = id => Array.from(document.querySelectorAll(`input[name="${id}"]:checked`)).map(cb=>cb.value).filter(Boolean);
  const paso1=getM('wf-paso1'), paso2=getM('wf-paso2'), paso3=getM('wf-paso3');
  if (!nombre||paso1.length===0) { notify('â›” Nombre y al menos un rol en Paso 1 son obligatorios','error'); return; }
  if (editId) {
    const idx=STATE_WORKFLOWS.findIndex(x=>x.id===editId);
    if (idx>=0) STATE_WORKFLOWS[idx]={...STATE_WORKFLOWS[idx],nombre,tipo,paso1,paso2,paso3,descripcion:desc,sla_horas:sla,activo};
    notify('Workflow actualizado: '+nombre,'ok');
  } else {
    STATE_WORKFLOWS.push({id:'wf'+Date.now(),nombre,tipo,paso1,paso2,paso3,descripcion:desc,sla_horas:sla,activo});
    notify('Workflow creado: '+nombre,'ok');
  }
  persistWorkflows();
  auditLog('config','WORKFLOW_GUARDADO',nombre);
  clearWfForm(); renderWorkflows();
}

function deleteWorkflow(id) {
  const w=STATE_WORKFLOWS.find(x=>x.id===id);
  if (!w||!confirm('Â¿Eliminar workflow: '+w.nombre+'?')) return;
  STATE_WORKFLOWS.splice(STATE_WORKFLOWS.indexOf(w),1);
  persistWorkflows();
  notify('Workflow eliminado','warn');
  renderWorkflows();
}

function clearWfForm() {
  ['wf-edit-id','wf-nombre','wf-descripcion'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  if(document.getElementById('wf-sla'))document.getElementById('wf-sla').value='4';
  if(document.getElementById('wf-activo'))document.getElementById('wf-activo').value='1';
  ['wf-paso1','wf-paso2','wf-paso3'].forEach(pasoId=>{
    document.querySelectorAll(`input[name="${pasoId}"]`).forEach(cb=>cb.checked=false);
  });
  if(document.getElementById('wf-form-title'))document.getElementById('wf-form-title').textContent='+ NUEVO WORKFLOW';
  const p=document.getElementById('wf-form-panel');if(p)p.style.display='none';
}

function canActInWorkflow(tipo, paso) {
  const wf=STATE_WORKFLOWS.find(w=>w.tipo===tipo&&w.activo);
  if (!wf) return true;
  return (wf['paso'+paso]||[]).includes(STATE.profile?.rol);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SUPABASE CONFIG desde UI
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LEGACY: function saveSupabaseConfig() {
// LEGACY:   const url = (document.getElementById('sb-url-input')?.value||'').trim();
// LEGACY:   const key = (document.getElementById('sb-key-input')?.value||'').trim();
// LEGACY:   const svc = (document.getElementById('sb-service-key-input')?.value||'').trim();
// LEGACY:   if (!url||!key) { notify('Ingrese URL y Anon Key','error'); return; }
// LEGACY:   localStorage.setItem('sb_url', url);
// LEGACY:   localStorage.setItem('sb_key', key);
// LEGACY:   if (svc) localStorage.setItem('sb_service_key', svc);
// LEGACY:   notify('Configuración guardada. Recargando...','ok');
// LEGACY:   setTimeout(()=>location.reload(), 1200);
// LEGACY: }

// LEGACY: async function testSupabase() {
// LEGACY:   const el = document.getElementById('sb-status');
// LEGACY:   if (!sb) { if(el) el.innerHTML='<span class="c-err">â›” Supabase no configurado</span>'; return; }
// LEGACY:   try {
// LEGACY:     const {data,error} = await sb.from('profiles').select('id').limit(1);
// LEGACY:     if (error) throw error;
// LEGACY:     if(el) el.innerHTML='<span class="c-ok">âœ“ Conexión exitosa con Supabase</span>';
// LEGACY:     notify('âœ“ Supabase conectado','ok');
// LEGACY:   } catch(e) {
// LEGACY:     if(el) el.innerHTML=`<span class="c-err">â›” Error: ${Utils.esc(e.message)}</span>`;
// LEGACY:     notify('Error Supabase: '+e.message,'error');
// LEGACY:   }
// LEGACY: }

// LEGACY: function copySqlSchema() {
// LEGACY:   navigator.clipboard.writeText(SQL_SCHEMA_SUPABASE).then(()=>notify('âœ“ SQL copiado al portapapeles','ok'));
// LEGACY: }
// LEGACY: 
function renderConfigSistema() {
  const urlEl = document.getElementById('sb-url-input');
  const keyEl = document.getElementById('sb-key-input');
  const svcEl = document.getElementById('sb-service-key-input');
  if(urlEl) urlEl.value = SUPABASE_URL.includes('TU_PROYECTO') ? '' : SUPABASE_URL;
  if(keyEl) keyEl.value = SUPABASE_ANON_KEY.includes('TU_ANON_KEY') ? '' : SUPABASE_ANON_KEY;
  if(svcEl) { const sv = localStorage.getItem('sb_service_key')||''; svcEl.value = sv; }
  const el = document.getElementById('sb-status');
  if(el) el.innerHTML = _sbConfigured ? '<span class="c-ok">â— Supabase configurado</span>' : '<span class="c-warn">⚠  Modo demo â€” Supabase no configurado</span>';
}

// Stubs duplicados eliminados: se conservan las versiones funcionales declaradas arriba.

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  EXPORTAR AL SCOPE GLOBAL â€” necesario para onclick inline en HTML
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  IMPORTACIÃ“N MASIVA â€” TRANSPORTES Y PLANTAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _importType = null;
let _importParsed = [];

function showImportModal(type) {
  _importType = type;
  _importParsed = [];
  const title = document.getElementById('import-modal-title');
  const hint  = document.getElementById('import-format-hint');
  const paste = document.getElementById('import-paste-area');
  const prev  = document.getElementById('import-preview');
  const stats = document.getElementById('import-stats');
  if (title) title.textContent = type === 'carriers' ? 'â¬† IMPORTAR TRANSPORTES MASIVO' : 'â¬† IMPORTAR PLANTAS MASIVO';
  if (hint)  hint.textContent  = type === 'carriers'
    ? 'Formato: PATENTE | CONDUCTOR | TIPO | RUTA | ZONA (una fila por línea)'
    : 'Formato: CÃ“DIGO | NOMBRE | REGIÃ“N | TIPO (una fila por línea)';
  if (paste) paste.value = '';
  if (prev)  { prev.innerHTML = ''; prev.style.display = 'none'; }
  if (stats) stats.textContent = '';
  document.getElementById('modal-import').style.display = 'flex';
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('import-paste-area').value = ev.target.result;
    previewImport();
  };
  reader.readAsText(file, 'UTF-8');
}

function parseImportData(raw, type) {
  const rows = raw.split('\n').map(r => r.trim()).filter(r => r.length > 0);
  const results = [];
  rows.forEach((row, idx) => {
    // Soportar TAB, punto y coma, o coma como separador
    const cols = row.split(/\t|;|,/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) return;
    if (type === 'carriers') {
      results.push({
        codigo:      (cols[0] || '').toUpperCase(),
        nombre:      cols[1] || '',
        tipo:        cols[2] || 'Camión',
        numero_ruta: cols[3] || '0',
        zona:        cols[4] || 'Miraflores',
        estado:      cols[5] || '',
        _idx: idx + 1
      });
    } else {
      results.push({
        codigo:  (cols[0] || '').toUpperCase(),
        nombre:  cols[1] || '',
        region:  cols[2] || '',
        tipo:    cols[3] || 'frigorifico',
        _idx: idx + 1
      });
    }
  });
  return results;
}

function previewImport() {
  const raw = document.getElementById('import-paste-area')?.value || '';
  if (!raw.trim()) { notify('â›” Pegue datos primero', 'error'); return; }
  _importParsed = parseImportData(raw, _importType);
  const prev  = document.getElementById('import-preview');
  const stats = document.getElementById('import-stats');
  if (!prev) return;
  prev.style.display = 'block';
  if (_importType === 'carriers') {
    prev.innerHTML = '<div style="font-weight:600;margin-bottom:4px;color:var(--tx-head);">PATENTE | CONDUCTOR | TIPO | RUTA | ZONA</div>' +
      _importParsed.map(r => `<div style="padding:2px 0;border-bottom:1px solid var(--border);">${r.codigo} | ${r.nombre} | ${r.tipo} | ${r.numero_ruta} | ${r.zona}</div>`).join('');
  } else {
    prev.innerHTML = '<div style="font-weight:600;margin-bottom:4px;color:var(--tx-head);">CÃ“DIGO | NOMBRE | REGIÃ“N | TIPO</div>' +
      _importParsed.map(r => `<div style="padding:2px 0;border-bottom:1px solid var(--border);">${r.codigo} | ${r.nombre} | ${r.region} | ${r.tipo}</div>`).join('');
  }
  if (stats) stats.innerHTML = `<span class="c-ok">âœ“ ${_importParsed.length} registros detectados</span> â€” Revise y haga clic en IMPORTAR para confirmar.`;
}

async function confirmImport() {
  if (!_importParsed.length) { notify('â›” Primero previsualice los datos', 'error'); return; }
  let ok = 0, err = 0;
  if (_importType === 'carriers') {
    for (const r of _importParsed) {
      if (!r.codigo || !r.nombre) { err++; continue; }
      const exists = (STATE.carriers || []).find(c => c.codigo === r.codigo);
      if (exists) {
        Object.assign(exists, { nombre: r.nombre, tipo: r.tipo, numero_ruta: r.numero_ruta, zona: r.zona, estado: r.estado });
        if (!STATE.usingSeed) await sb.from('carriers').update({ nombre: r.nombre, tipo: r.tipo, numero_ruta: r.numero_ruta }).eq('codigo', r.codigo);
      } else {
        const newC = { id: 'c'+Date.now()+ok, ...r };
        delete newC._idx;
        STATE.carriers.push(newC);
        if (!STATE.usingSeed) await sb.from('carriers').insert({ codigo: r.codigo, nombre: r.nombre, tipo: r.tipo, numero_ruta: r.numero_ruta, activo: true });
      }
      ok++;
    }
    renderConfigCarriers();
    populateCarrierSelects();
  } else {
    for (const r of _importParsed) {
      if (!r.codigo || !r.nombre) { err++; continue; }
      const exists = (STATE.plants || []).find(p => p.codigo === r.codigo);
      if (!exists) {
        STATE.plants.push({ id: 'p'+Date.now()+ok, ...r });
        if (!STATE.usingSeed) await sb.from('plants').insert({ codigo: r.codigo, nombre: r.nombre, region: r.region, tipo: r.tipo });
      }
      ok++;
    }
    renderConfigPlantas();
  }
  await auditLog('config', 'IMPORTACION_MASIVA', `${_importType}: ${ok} registros importados, ${err} errores`);
  notify(`âœ“ Importación completada: ${ok} registros. Errores: ${err}`, ok > 0 ? 'ok' : 'warn');
  closeModal('modal-import');
}

// Drag & drop en zona de importación
document.addEventListener('DOMContentLoaded', () => {
  const drop = document.getElementById('import-drop-zone');
  if (drop) {
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      drop.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          document.getElementById('import-paste-area').value = ev.target.result;
          previewImport();
        };
        reader.readAsText(file, 'UTF-8');
      }
    });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  INGRESO SECUNDARIO â€” lógica pallets vacíos / devolución
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function toggleDevolucionSecundaria() {
  const tiene = document.getElementById('ing2-tiene-devolucion')?.checked;
  const panel = document.getElementById('devolucion-sec-panel');
  const info  = document.getElementById('devolucion-sec-info');
  if (panel) panel.style.display = tiene ? 'block' : 'none';
  if (info) {
    info.style.color = tiene ? 'var(--c-warn)' : 'var(--c-ok)';
    info.textContent = tiene
      ? '⚠  Se iniciará workflow de autorización de devolución al confirmar ingreso'
      : 'âœ“ Ingreso normal â€” camión retorna con pallets VACÃOS';
  }
}

function autoFillSecPatente() {
  const sel = document.getElementById('ing2-carrier');
  const pat = document.getElementById('ing2-patente');
  const rut = document.getElementById('ing2-ruta');
  if (!sel || !pat) return;
  const codigo = sel.value;
  if (!codigo) return;
  const carrier = (STATE.carriers || []).find(x => x.codigo === codigo);
  if (carrier) {
    pat.value = carrier.codigo;
    if (rut) rut.value = carrier.numero_ruta || '';
    buscarRetorno();
  }
}

function fillSecundariaCarriers() {
  const sel = document.getElementById('ing2-carrier');
  if (!sel) return;
  sel.innerHTML = '<option value="">â€” Seleccionar desde flota â€”</option>' +
    (STATE.carriers || []).map(c => `<option value="${c.codigo}">${c.codigo} â€” ${c.nombre}</option>`).join('');
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  INICIALIZAR PLAYA CON CARRIERS DEL CD â€” carros vacíos
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initPlayaConCarriers() {
  if (STATE._playaIniciada) return;
  const yaOcupados = (STATE.playaSlots || []).filter(s => s.ocupado).length;
  if (yaOcupados > 0) { STATE._playaIniciada = true; return; }
  const cdActual = STATE.currentSite || 'CD_SAN_BERNARDO';
  const carriers = (STATE.carriers || []).filter(ca =>
    !ca.estado?.includes('INACTIVO') && (ca.cd === cdActual || !ca.cd)
  );
  if (!carriers.length) { STATE._playaIniciada = true; return; }
  carriers.forEach((carrier, idx) => {
    if (idx >= (STATE.playaSlots || []).length) return;
    const slot = STATE.playaSlots[idx];
    slot.ocupado = true; slot.patente = carrier.codigo;
    slot.ruta = carrier.numero_ruta || 'â€”'; slot.nombre = carrier.nombre;
    slot.tipo = carrier.tipo; slot.estado = carrier.estado || '';
  });
  STATE._playaIniciada = true;
  const cargados = (STATE.playaSlots || []).filter(s => s.ocupado).length;
  if (cargados > 0) notify('âœ“ Playa: ' + cargados + ' vehículos cargados', 'ok', 3000);
}

function renderTareasMobile() {
  const list = document.getElementById('tasks-mobile-list');
  if (!list) return;
  const myId  = STATE.profile?.id;
  const myRol = STATE.profile?.rol;

  const pend = (STATE.tasks || []).filter(t => ['pendiente','ofertada'].includes(t.estado));
  const cur  = (STATE.tasks || []).filter(t => ['aceptada','en_ejecucion'].includes(t.estado));
  const venc = (STATE.tasks || []).filter(t => t.estado === 'vencida');
  set('m-kpi-pend', pend.length);
  set('m-kpi-cur',  cur.length);
  set('m-kpi-venc', venc.length);
  set('tareas-mobile-resumen', pend.length + ' pendientes · ' + cur.length + ' en curso');

  const tareasMostrar = (STATE.tasks || []).filter(t =>
    !['completada','cancelada'].includes(t.estado)
  ).slice(0, 30);

  list.innerHTML = '';

  if (!tareasMostrar.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:40px;text-align:center;color:var(--tx-dim);font-size: 10px;grid-column:1/-1;';
    empty.textContent = 'Sin tareas activas âœ“';
    list.appendChild(empty);
    return;
  }

  const pBorder = { normal:'var(--c-info)', urgente:'var(--c-warn)', critica:'var(--c-err)' };
  const stIcon  = { pendiente:'â³', ofertada:'ðŸ“¢', aceptada:'â–¶', en_ejecucion:'ðŸ”§', checklist_ok:'ðŸ“‹', completada:'âœ…', rechazada:'âŒ', vencida:'⚠ ', cancelada:'ðŸš«' };
  const stColor = { pendiente:'var(--tx-muted)', ofertada:'var(--c-warn)', aceptada:'var(--c-ok)', en_ejecucion:'var(--c-ok)', checklist_ok:'var(--c-info)', vencida:'var(--c-err)', rechazada:'var(--c-err)' };

  tareasMostrar.forEach(function(t) {
    const elapsed  = Math.round((Date.now() - new Date(t.hora_creacion)) / 60000);
    const pct      = Math.min(100, elapsed / (t.sla_minutos||20) * 100);
    const overSLA  = elapsed > (t.sla_minutos||20);
    const miaTarea = t.operador_id === myId || t.operador_nombre === STATE.profile?.nombre;
    const puedaAceptar      = ['pendiente','ofertada'].includes(t.estado);
    const puedaCompletar    = ['aceptada','en_ejecucion'].includes(t.estado) &&
                              (miaTarea || myRol === 'supervisor_andenes' || myRol === 'administrador');
    const esChecklistOkMob  = t.estado === 'checklist_ok' &&
                              (miaTarea || myRol === 'supervisor_andenes' || myRol === 'administrador');

    var card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-panel);border:1px solid var(--border);border-left:4px solid ' + (pBorder[t.prioridad]||'var(--border-md)') + ';border-radius:2px;overflow:hidden;display:flex;flex-direction:column;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'padding:10px 14px;border-bottom:1px solid var(--border);';
    hdr.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
        '<span style="font-size: 10px;">' + (stIcon[t.estado]||'ðŸ“‹') + '</span>' +
        '<span style="color:var(--tx-head);font-size: 10px;font-weight:700;flex:1;">' + Utils.esc((t.tipo||'').replace(/_/g,' ').toUpperCase()) + '</span>' +
        '<span style="color:' + (stColor[t.estado]||'var(--tx-muted)') + ';font-size:10px;font-weight:600;padding:2px 6px;background:var(--bg-alt);">' + Utils.esc((t.estado||'').toUpperCase()) + '</span>' +
      '</div>' +
      '<div style="font-size: 10px;font-weight:800;color:var(--tx-head);letter-spacing:3px;margin:6px 0 4px;font-family:var(--font);line-height:1;">ðŸš› ' + escHtml(t.patente||'â€”') + '</div>' +
      '<div style="font-size: 9px;font-weight:600;color:var(--c-accent);letter-spacing:0.5px;margin-bottom:4px;">ðŸ“ ' + Utils.esc((t.zona_origen||'').replace(/_/g,' ').toUpperCase()) + ' â†’ ' + Utils.esc((t.zona_destino||'').replace(/_/g,' ').toUpperCase()) + '</div>' +
      (t.notas ? '<div style="font-size: 8px;color:var(--tx-dim);margin-top:3px;">ðŸ“ ' + escHtml(t.notas||'') + '</div>' : '');
    card.appendChild(hdr);

    var slaDiv = document.createElement('div');
    slaDiv.style.cssText = 'padding:6px 14px;display:flex;align-items:center;gap:8px;';
    slaDiv.innerHTML =
      '<div style="flex:1;height:5px;background:var(--bg-alt);border-radius:3px;overflow:hidden;">' +
        '<div style="height:100%;width:' + pct + '%;background:' + (overSLA?'var(--c-err)':pct>75?'var(--c-warn)':'var(--c-ok)') + ';"></div>' +
      '</div>' +
      '<span style="font-size:10px;color:' + (overSLA?'var(--c-err)':'var(--tx-dim)') + ';white-space:nowrap;">' + elapsed + '/' + (t.sla_minutos||20) + ' min</span>';
    card.appendChild(slaDiv);

    var btns = document.createElement('div');
    btns.style.cssText = 'padding:8px 14px 12px;display:flex;gap:8px;';

    if (puedaAceptar) {
      var btnA = document.createElement('button');
      btnA.className = 'btn btn-ok';
      btnA.style.cssText = 'flex:1;padding:12px 4px;font-size: 10px;font-weight:600;';
      btnA.textContent = 'â–¶ ACEPTAR';
      (function(id){ btnA.addEventListener('click', function(){ aceptarTareaById(id); }); })(t.id);
      btns.appendChild(btnA);
    }

    if (esChecklistOkMob) {
      var btnP = document.createElement('button');
      btnP.className = 'btn btn-ok';
      btnP.style.cssText = 'flex:1;padding:12px 4px;font-size: 10px;font-weight:600;background:rgba(14,158,109,0.14);border-color:var(--c-ok);color:var(--c-ok);';
      btnP.textContent = 'ðŸ“ CONFIRMAR POSTURA EN ANDÃ‰N';
      (function(id){ btnP.addEventListener('click', function(){ abrirPosturaAnden(id); }); })(t.id);
      btns.appendChild(btnP);
    }

    if (puedaCompletar) {
      var btnC = document.createElement('button');
      btnC.className = 'btn btn-warn';
      const esRetiroMobile = t.tipo === 'retirar_anden' || t.tipo === 'anden_a_carros_vacios' || t.zona_destino === 'carros_cargados' || t.zona_destino === 'estacionamiento_carros_vacios';
      btnC.style.cssText = 'flex:1;padding:12px 4px;font-size: 10px;font-weight:600;' +
        (esRetiroMobile ? 'background:rgba(248,160,48,0.15);border-color:var(--c-warn);color:var(--c-warn);' : 'background:rgba(48,216,144,0.12);border-color:var(--c-ok);color:var(--c-ok);');
      btnC.textContent = esRetiroMobile ? 'ðŸš› REGISTRAR PALLETS/PRECINTO' : 'âœ“ CHECKLIST';
      (function(id, retiro){ btnC.addEventListener('click', function(){
        if (retiro) registrarRetiroAnden(id);
        else abrirChecklistTarea(id);
      }); })(t.id, esRetiroMobile);
      btns.appendChild(btnC);
    }

    if (!puedaAceptar && !puedaCompletar && !esChecklistOkMob) {
      var info = document.createElement('span');
      info.style.cssText = 'font-size: 8px;color:var(--tx-dim);padding:8px 0;';
      info.textContent = miaTarea ? 'Tarea en progreso' : 'Asignada a otro operador';
      btns.appendChild(info);
    }

    card.appendChild(btns);
    list.appendChild(card);
  });
}



// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CHECKLIST â€” WIZARD PASO A PASO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function abrirChecklistTarea(taskId) {
  _checklistTaskId = taskId;
  const t = (STATE.tasks || []).find(x => x.id === taskId);
  _clStepData    = {};
  _clCurrentStep = 0;
  _clActiveItems = CL_ITEMS_CONFIG.filter(i => i.enabled !== false);
  const patEl = document.getElementById('cl-patente');
  const tipEl = document.getElementById('cl-tipo');
  if (patEl) patEl.textContent = t?.patente || 'â€”';
  if (tipEl) tipEl.textContent = (t?.tipo || 'â€”').replace(/_/g,' ').toUpperCase();
  clShowStep(0);
  const modal = document.getElementById('modal-checklist');
  if (modal) { modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; }
}

function clShowStep(step) {
  _clCurrentStep = step;
  const items = _clActiveItems;
  const total = items.length;
  const item  = items[step];
  if (!item) return;

  const tipoCls = { critico:'var(--c-err)', cadena_frio:'var(--c-cold)', requerido:'var(--tx-muted)' }[item.tipo] || 'var(--tx-muted)';
  const tipoLbl = { critico:'CRÃTICO', cadena_frio:'CADENA FRÃO', requerido:'REQUERIDO' }[item.tipo] || item.tipo.toUpperCase();

  const titleEl = document.getElementById('cl-step-title');
  if (titleEl) titleEl.textContent = 'Inspección Pre-Andén â€” ' + (step + 1) + ' de ' + total;

  const savedVal = _clStepData[item.id] !== undefined ? _clStepData[item.id] : '';
  let inputHtml = '';
  if (item.esNumerico) {
    inputHtml = '<div style="text-align:center;margin-top:20px;">' +
      '<input type="number" id="cl-step-input" value="' + savedVal + '" step="0.5" min="-30" max="60" ' +
      'style="font-size: 8px;font-weight:700;width:140px;text-align:center;font-family:var(--font);padding:8px;border-radius:8px;border:2px solid var(--border);background:var(--bg-input);color:var(--tx-head);" ' +
      'placeholder="â€”" oninput="clSaveCurrentValue()">' +
      '<div style="font-size: 10px;color:var(--tx-muted);margin-top:6px;">' + (item.unidad || '') + '</div>' +
    '</div>';
  } else {
    inputHtml = '<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px;">' +
      (item.opciones || []).map(function(op) {
        const sel = savedVal === op.v;
        return '<label style="display:flex;align-items:center;gap:12px;padding:11px 16px;border:1.5px solid ' + (sel ? 'var(--c-accent)' : 'var(--border)') + ';border-radius:8px;cursor:pointer;background:' + (sel ? 'rgba(99,102,241,0.06)' : 'transparent') + ';transition:all 0.12s;">' +
          '<input type="radio" name="cl-step-radio" value="' + op.v + '"' + (sel ? ' checked' : '') + ' style="accent-color:var(--c-accent);width:16px;height:16px;" onchange="clSaveCurrentValue();clUpdateRadioStyles()">' +
          '<span style="font-size: 10px;color:var(--tx-base);">' + escHtml(op.l) + '</span>' +
        '</label>';
      }).join('') +
    '</div>';
  }

  const content = document.getElementById('cl-step-content');
  if (content) {
    content.innerHTML =
      '<div style="text-align:center;margin-bottom:4px;">' +
        '<span style="font-size:9px;font-weight:700;letter-spacing:1.5px;color:' + tipoCls + ';padding:2px 10px;border-radius:20px;border:1px solid ' + tipoCls + '40;background:' + tipoCls + '12;">' + tipoLbl + '</span>' +
      '</div>' +
      '<div style="text-align:center;margin-top:10px;">' +
        '<div style="font-size: 10px;font-weight:700;color:var(--tx-head);">' + escHtml(item.label) + '</div>' +
      '</div>' +
      inputHtml;
  }

  // Progreso
  const done = Object.keys(_clStepData).length;
  const pct  = total > 0 ? Math.round(done / total * 100) : 0;
  const bar  = document.getElementById('cl-progreso-bar');
  const txt  = document.getElementById('cl-progreso-txt');
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = done + '/' + total;

  // Botones nav
  const prevBtn = document.getElementById('cl-btn-prev');
  const nextBtn = document.getElementById('cl-btn-next');
  if (prevBtn) prevBtn.style.display = step > 0 ? '' : 'none';
  if (nextBtn) {
    if (step === total - 1) {
      nextBtn.textContent = 'âœ“ Completar checklist';
      nextBtn.onclick = confirmarChecklistTarea;
    } else {
      nextBtn.textContent = 'Siguiente â†’';
      nextBtn.onclick = clNextStep;
    }
  }
}

function clUpdateRadioStyles() {
  const labels = document.querySelectorAll('#cl-step-content label');
  labels.forEach(function(lbl) {
    const radio = lbl.querySelector('input[type=radio]');
    if (radio) {
      lbl.style.borderColor = radio.checked ? 'var(--c-accent)' : 'var(--border)';
      lbl.style.background  = radio.checked ? 'rgba(99,102,241,0.06)' : 'transparent';
    }
  });
}

function clSaveCurrentValue() {
  const item = _clActiveItems[_clCurrentStep];
  if (!item) return;
  if (item.esNumerico) {
    const inp = document.getElementById('cl-step-input');
    if (inp && inp.value !== '') _clStepData[item.id] = inp.value;
  } else {
    const radio = document.querySelector('input[name="cl-step-radio"]:checked');
    if (radio) _clStepData[item.id] = radio.value;
  }
  const done = Object.keys(_clStepData).length;
  const total = _clActiveItems.length;
  const bar = document.getElementById('cl-progreso-bar');
  const txt = document.getElementById('cl-progreso-txt');
  if (bar) bar.style.width = (total > 0 ? Math.round(done / total * 100) : 0) + '%';
  if (txt) txt.textContent = done + '/' + total;
}

function clNextStep() {
  clSaveCurrentValue();
  const item = _clActiveItems[_clCurrentStep];
  if (item && _clStepData[item.id] === undefined) {
    notify('Seleccione o ingrese un valor para continuar', 'warn', 2500);
    return;
  }
  if (_clCurrentStep < _clActiveItems.length - 1) clShowStep(_clCurrentStep + 1);
}

function clPrevStep() {
  clSaveCurrentValue();
  if (_clCurrentStep > 0) clShowStep(_clCurrentStep - 1);
}

function updateChecklist() { /* no-op â€” reemplazado por wizard */ }

async function confirmarChecklistTarea() {
  clSaveCurrentValue();
  if (!_checklistTaskId) return;
  const t = (STATE.tasks || []).find(x => x.id === _checklistTaskId);
  if (!t) return;

  // Validar que todos los ítems activos tengan valor
  const faltantes = _clActiveItems.filter(i => _clStepData[i.id] === undefined);
  if (faltantes.length > 0) {
    const idx = _clActiveItems.indexOf(faltantes[0]);
    notify('Complete el punto "' + faltantes[0].label + '" para continuar', 'warn', 3000);
    clShowStep(idx); return;
  }

  // Verificar ítems críticos bloqueantes
  const criticos = [];
  if (_clStepData['estructura'] === 'critico')    criticos.push('Daño estructural crítico');
  if (_clStepData['cajon'] === 'contaminado')      criticos.push('Cajón contaminado');
  if (criticos.length > 0) {
    Audio.play('error');
    notify('â›” No se puede avanzar: ' + criticos.join(' · '), 'error', 6000);
    return;
  }

  const resumenChecklist = _clActiveItems.map(function(item) {
    const val = _clStepData[item.id] || 'â€”';
    return item.label + ': ' + val + (item.esNumerico && item.unidad ? item.unidad : '');
  }).join(' | ');

  const oldEstado = t.estado;
  const newNotas = (t.notas ? t.notas + ' | ' : '') + 'CHECKLIST: ' + resumenChecklist;
  t.notas = newNotas;
  t.estado = 'checklist_ok';
  t.operador_nombre = STATE.profile?.nombre;
  _checklistResumen = resumenChecklist;

  if (!STATE.usingSeed && sb) {
    try {
      const validation = validateStateTransition('yard_tasks', oldEstado, 'checklist_ok', STATE.user?.id);
      if (!validation.valid) {
        notify('âŒ ' + validation.reason, 'error');
        t.estado = oldEstado;
        return;
      }

      const { data } = await sb.from('yard_tasks')
        .update({ estado: 'checklist_ok', notas: newNotas })
        .eq('id', _checklistTaskId)
        .eq('estado', oldEstado)
        .select().single();

      if (!data) {
        notify('⚠ ï¸  Tarea fue modificada por otro usuario. Recargando...', 'warn');
        await loadTasks();
        return;
      }
    } catch(e) { console.warn('update checklist_ok:', e); }
  }

  await auditLog('task', 'CHECKLIST_APROBADO',
    (t.tipo||'').replace(/_/g,' ') + ' · ' + (t.patente||'â€”') + ' | ' + resumenChecklist);

  closeModal('modal-checklist');
  Audio.play('ok');
  notify('Checklist aprobado â€” confirme postura en andén', 'ok', 4000);
  renderTareas();
  setTimeout(function() { abrirPosturaAnden(_checklistTaskId); }, 500);
}

function abrirPosturaAnden(taskId) {
  _posturaAndenTaskId = taskId;
  const t = (STATE.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  const carrier = (STATE.carriers || []).find(x => x.codigo === t.patente);
  const infoEl = document.getElementById('pa-info-camion');
  if (infoEl) {
    infoEl.innerHTML =
      '<strong style="color:var(--tx-head);">' + escHtml(t.patente || 'â€”') + '</strong>' +
      (carrier ? ' â€” ' + escHtml(carrier.nombre) + (carrier.numero_ruta && carrier.numero_ruta !== '0' ? ' · Ruta ' + carrier.numero_ruta : '') : '') +
      '<br><span style="color:var(--tx-muted);font-size:10px;">Tarea: ' + (t.tipo||'').replace(/_/g,' ').toUpperCase() + '</span>';
  }
  // Poblar select: andenes libres + andén pre-asignado en la tarea (aunque ya esté reservado/busy)
  const andenSel = document.getElementById('pa-anden-select');
  if (andenSel) {
    const preAsignado = t?.dock_id ? (STATE.docks || []).find(function(d){ return d.id === t.dock_id; }) : null;
    const andenesSel = (STATE.docks || []).filter(function(d) {
      return d.estado === 'free' || (preAsignado && d.id === preAsignado.id);
    });
    andenSel.innerHTML = '<option value="">â€” Seleccionar andén â€”</option>' +
      andenesSel.map(function(d) {
        const esReservado = preAsignado && d.id === preAsignado.id && d.estado !== 'free';
        return '<option value="' + d.id + '">' + d.codigo +
          ' â€” ' + (d.tipo||'').toUpperCase() +
          ' â€” ' + (d.operacion_permitida||'').replace(/_/g,' ').toUpperCase() +
          (esReservado ? ' [RESERVADO PARA ESTA TAREA]' : '') + '</option>';
      }).join('') +
      (!andenesSel.length ? '<option value="" disabled>⚠  Sin andenes disponibles</option>' : '');
    // Pre-seleccionar el andén asignado en la tarea
    if (preAsignado) andenSel.value = preAsignado.id;
  }
  const obsEl = document.getElementById('pa-obs');
  const msgEl = document.getElementById('pa-msg');
  if (obsEl) obsEl.value = '';
  if (msgEl) msgEl.textContent = '';
  const modal = document.getElementById('modal-postura-anden');
  if (modal) { modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; }
}

async function confirmarPosturaAnden() {
  const taskId = _posturaAndenTaskId;
  if (!taskId) return;
  const andenId = document.getElementById('pa-anden-select').value;
  const obs     = (document.getElementById('pa-obs')?.value || '').trim();
  const msgEl   = document.getElementById('pa-msg');

  if (!andenId) {
    if (msgEl) msgEl.textContent = 'â›” Debe seleccionar un andén de destino';
    Audio.play('error');
    return;
  }

  const t    = (STATE.tasks || []).find(x => x.id === taskId);
  const dock = (STATE.docks || []).find(d => d.id === andenId);
  if (!t || !dock) return;

  // Si el andén seleccionado difiere del pre-reservado en la tarea, liberar el original
  if (t.dock_id && t.dock_id !== andenId) {
    const dockOriginal = (STATE.docks || []).find(function(d){ return d.id === t.dock_id; });
    if (dockOriginal && (dockOriginal.truck_id === t.visit_id || dockOriginal.truck_id === t.patente || !dockOriginal.truck_id)) {
      dockOriginal.estado = 'free';
      dockOriginal.truck_id = null;
      dockOriginal.inicio_ocupacion = null;
      if (!STATE.usingSeed && sb) {
        try { await sb.from('docks').update({ estado:'free', truck_id:null, inicio_ocupacion:null }).eq('id', dockOriginal.id); } catch(e) {}
      }
    }
  }

  // Actualizar visita: mover de playa/espera a andén
  const visit = (STATE.visits || []).find(function(v) { return v.patente === t.patente && v.estado !== 'salida'; });
  if (visit) {
    visit.zona_actual = 'anden';
    visit.estado      = 'en_anden';
    visit.dock_id     = andenId;
    if (!STATE.usingSeed && sb) {
      try {
        await sb.from('yard_visits').update({
          zona_actual: 'anden', estado: 'en_anden', dock_id: andenId,
        }).eq('id', visit.id);
      } catch(e) { console.warn('update visit postura anden:', e); }
    }
  }

  // Marcar andén como ocupado
  dock.estado           = 'busy';
  dock.truck_id         = visit ? visit.id : t.patente;
  dock.inicio_ocupacion = new Date().toISOString();
  if (!STATE.usingSeed && sb) {
    try {
      await sb.from('docks').update({
        estado: 'busy',
        truck_id: dock.truck_id,
        inicio_ocupacion: dock.inicio_ocupacion,
      }).eq('id', andenId);
    } catch(e) { console.warn('update dock busy:', e); }
  }

  // Completar tarea â€” PASO 2 finalizado
  const notaPostura = 'Postura confirmada andén ' + dock.codigo + (obs ? ' · ' + obs : '');
  const oldEstado = t.estado;
  t.estado   = 'completada';
  t.hora_fin = new Date().toISOString();
  const newNotas = (t.notas ? t.notas + ' | ' : '') + notaPostura;
  t.notas    = newNotas;
  if (!STATE.usingSeed && sb) {
    try {
      const validation = validateStateTransition('yard_tasks', oldEstado, 'completada', STATE.user?.id);
      if (!validation.valid) {
        notify('âŒ ' + validation.reason, 'error');
        t.estado = oldEstado;
        return;
      }

      const { data } = await sb.from('yard_tasks')
        .update({
          estado: 'completada', hora_fin: t.hora_fin, notas: newNotas,
        })
        .eq('id', taskId)
        .eq('estado', oldEstado)
        .select().single();

      if (!data) {
        notify('⚠ ï¸  Tarea fue modificada por otro usuario. Recargando...', 'warn');
        await loadTasks();
        return;
      }
    } catch(e) { console.warn('update task postura completada:', e); }
  }

  ymsPersistYardConfig();
  await auditLog('task', 'POSTURA_ANDÃ‰N_CONFIRMADA',
    (t.patente||'â€”') + ' â†’ Andén ' + dock.codigo + (obs ? ' · ' + obs : ''));

  // â”€â”€ CREAR AUTOMÃTICAMENTE la siguiente tarea: mover a carros cargados â”€â”€
  const nuevaTareaCarroCargado = {
    id: 't' + Date.now(),
    tipo: 'anden_a_carros_cargados',
    prioridad: t.prioridad || 'normal',
    zona_origen: 'anden',
    zona_destino: 'carros_cargados',
    patente: t.patente || '',
    sla_minutos: t.sla_minutos || 20,
    estado: 'ofertada',
    notas: 'Tarea generada automáticamente después de postura en andén ' + dock.codigo,
    hora_creacion: new Date().toISOString(),
    operador_nombre: null,
    dock_id: andenId
  };
  STATE.tasks.push(nuevaTareaCarroCargado);
  if (!STATE.usingSeed && sb) {
    try {
      const { data, error } = await sb.from('yard_tasks').insert({
        tipo: nuevaTareaCarroCargado.tipo,
        prioridad: nuevaTareaCarroCargado.prioridad,
        zona_origen: nuevaTareaCarroCargado.zona_origen,
        zona_destino: nuevaTareaCarroCargado.zona_destino,
        visit_id: visit?.id || null,
        patente: nuevaTareaCarroCargado.patente,
        sla_minutos: nuevaTareaCarroCargado.sla_minutos,
        estado: 'ofertada',
        notas: nuevaTareaCarroCargado.notas,
        creado_por: STATE.user?.id
      }).select().single();
      if (!error && data) Object.assign(nuevaTareaCarroCargado, data);
    } catch(e) { console.warn('crear tarea carro cargado:', e); }
  }
  await auditLog('task', 'TAREA_CARRO_CARGADO_CREADA',
    (t.patente||'â€”') + ' â€” Mover de andén ' + dock.codigo + ' a carros cargados');

  Audio.play('ok');
  notify('âœ… Postura confirmada â€” ' + (t.patente||'') + ' en andén ' + dock.codigo + ' â€¢ â­ Siguiente tarea: trasladar a carros cargados', 'ok', 5000);
  closeModal('modal-postura-anden');
  renderTareas(); renderAndenes(); renderDashboard();

  // Ofertar la tarea al operador patio si es el usuario actual
  if (STATE.profile?.rol === 'operador_patio') {
    setTimeout(function() { mostrarUberTaskPatio(nuevaTareaCarroCargado); }, 300);
  }
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  GESTIÃ“N DE TAREAS â€” ADMIN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function abrirEdicionTarea(taskId) {
  const t = (STATE.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  const el = (id) => document.getElementById(id);
  el('edit-task-id').value    = taskId;
  el('edit-task-tipo').value  = t.tipo || 'otro';
  el('edit-task-prio').value  = t.prioridad || 'normal';
  el('edit-task-origen').value = t.zona_origen || 'playa';
  el('edit-task-destino').value = t.zona_destino || 'anden';
  el('edit-task-sla').value   = t.sla_minutos || 20;
  el('edit-task-notas').value = t.notas || '';
  // Poblar operadores
  const selOp = el('edit-task-operador');
  selOp.innerHTML = '<option value="">â€” Sin asignar â€”</option>' +
    (STATE.users || []).filter(u => u.activo && ['operador_patio','supervisor_andenes'].includes(u.rol))
      .map(u => '<option value="' + u.id + '" ' + (t.operador_id === u.id ? 'selected' : '') + '>' +
        u.nombre + ' (' + u.rol.replace(/_/g,' ') + ')</option>').join('');
  el('edit-task-msg').textContent = '';
  document.getElementById('modal-edit-task').style.display = 'flex';
}

async function guardarEdicionTarea() {
  const taskId = document.getElementById('edit-task-id').value;
  const t = (STATE.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  const tipo     = document.getElementById('edit-task-tipo').value;
  const prio     = document.getElementById('edit-task-prio').value;
  const origen   = document.getElementById('edit-task-origen').value;
  const destino  = document.getElementById('edit-task-destino').value;
  const sla      = parseInt(document.getElementById('edit-task-sla').value) || 20;
  const notas    = document.getElementById('edit-task-notas').value.trim();
  const opId     = document.getElementById('edit-task-operador').value;
  const opUser   = (STATE.users || []).find(u => u.id === opId);
  Object.assign(t, { tipo, prioridad: prio, zona_origen: origen, zona_destino: destino,
    sla_minutos: sla, notas, operador_id: opId || null, operador_nombre: opUser?.nombre || null });
  if (!STATE.usingSeed && sb) {
    try {
      const { data } = await sb.from('yard_tasks')
        .update({ tipo, prioridad: prio, zona_origen: origen,
          zona_destino: destino, sla_minutos: sla, notas, operador_id: opId || null })
        .eq('id', taskId)
        .select().single();

      if (!data) {
        notify('⚠ ï¸  Tarea fue modificada por otro usuario. Recargando...', 'warn');
        await loadTasks();
        return;
      }
    } catch(e) { console.warn(e); }
  }
  await auditLog('task', 'TAREA_EDITADA', tipo.replace(/_/g,' ') + ' · ' + prio + (opUser ? ' â†’ ' + opUser.nombre : ''));
  Audio.play('ok');
  notify('âœ“ Tarea actualizada', 'ok');
  closeModal('modal-edit-task');
  renderTareas();
}

async function eliminarTarea(taskId) {
  if (!confirm('Â¿Eliminar esta tarea definitivamente?')) return;
  STATE.tasks = (STATE.tasks || []).filter(t => t.id !== taskId);
  if (!STATE.usingSeed && sb) {
    try { await sb.from('yard_tasks').delete().eq('id', taskId); } catch(e) {}
  }
  Audio.play('warn');
  notify('⚠  Tarea eliminada', 'warn');
  closeModal('modal-edit-task');
  renderTareas();
}

async function desasignarTarea(taskId) {
  const t = (STATE.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  const oldEstado = t.estado;
  t.operador_id = null; t.operador_nombre = null; t.estado = 'pendiente';
  if (!STATE.usingSeed && sb) {
    try {
      const validation = validateStateTransition('yard_tasks', oldEstado, 'pendiente', STATE.user?.id);
      if (!validation.valid) {
        notify('âŒ ' + validation.reason, 'error');
        t.estado = oldEstado;
        return;
      }

      const { data } = await sb.from('yard_tasks')
        .update({ operador_id: null, estado: 'pendiente' })
        .eq('id', taskId)
        .eq('estado', oldEstado)
        .select().single();

      if (!data) {
        notify('⚠ ï¸  Tarea fue modificada por otro usuario. Recargando...', 'warn');
        await loadTasks();
        return;
      }
    } catch(e) { console.warn('desasignarTarea:', e); }
  }
  Audio.play('warn');
  notify('⚠  Operador desasignado â€” tarea vuelve a pendiente', 'warn');
  closeModal('modal-edit-task');
  renderTareas();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  UBER TASK PATIO â€” aparece centrado en pantalla de tareas
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _utpTask = null;
let _utpInterval = null;
let _utpSeconds = 10;

function mostrarUberTaskPatio(task) {
  _utpTask = task;
  _utpSeconds = 10;
  const el = (id) => document.getElementById(id);
  el('utp-tipo').textContent    = (task.tipo || '').replace(/_/g,' ').toUpperCase();
  el('utp-patente').textContent = 'ðŸš› ' + (task.patente || 'Sin patente');
  el('utp-origen').textContent  = 'Origen: ' + (task.zona_origen || '').replace(/_/g,' ').toUpperCase();
  el('utp-destino').textContent = 'Destino: ' + (task.zona_destino || '').replace(/_/g,' ').toUpperCase();
  el('utp-prio').textContent    = 'Prioridad: ' + (task.prioridad || 'normal').toUpperCase();
  el('utp-countdown').textContent = _utpSeconds;
  el('uber-task-patio').style.display = 'block';
  Audio.play('new_task');
  clearInterval(_utpInterval);
  _utpInterval = setInterval(function() {
    _utpSeconds--;
    const cntEl = el('utp-countdown');
    if (cntEl) cntEl.textContent = _utpSeconds;
    if (_utpSeconds <= 0) { clearInterval(_utpInterval); utpCerrar(); }
  }, 1000);
}

function utpAceptar() {
  clearInterval(_utpInterval);
  document.getElementById('uber-task-patio').style.display = 'none';
  if (_utpTask) {
    aceptarTareaById(_utpTask.id);
    _utpTask = null;
  }
}

function utpCerrar() {
  clearInterval(_utpInterval);
  document.getElementById('uber-task-patio').style.display = 'none';
  _utpTask = null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  FLUJO PATIO: Andén â†’ Carros Cargados (sello + pallets)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Punto de entrada unificado para supervisor/admin: acepta la tarea si no está
// en ejecución y luego abre el modal de registro de sello y pallets.
async function registrarRetiroAnden(taskId) {
  const t = (STATE.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  // Auto-aceptar si aÃºn no fue tomada por nadie
  if (['pendiente','ofertada'].includes(t.estado)) {
    t.estado = 'en_ejecucion';
    t.operador_id = STATE.profile?.id || STATE.user?.id;
    t.operador_nombre = STATE.profile?.nombre;
    t.hora_aceptacion = new Date().toISOString();
    if (!STATE.usingSeed && sb) {
      try {
        await sb.from('yard_tasks').update({
          estado: 'en_ejecucion',
          operador_id: STATE.user?.id,
          hora_aceptacion: t.hora_aceptacion,
        }).eq('id', taskId);
      } catch(e) { console.warn('auto-accept task:', e.message); }
    }
    await auditLog('task', 'TAREA_TOMADA_SUPERVISOR',
      (t.tipo||'') + ' · ' + (t.patente||'â€”') + ' por ' + (STATE.profile?.nombre||'â€”'));
  }
  abrirCarroCargado(taskId);
}

function abrirCarroCargado(taskId) {
  const t = (STATE.tasks || []).find(x => x.id === taskId);
  if (!t) return;
  document.getElementById('cc-task-id').value = taskId;
  const carrier = (STATE.carriers || []).find(x => x.codigo === t.patente);
  // Adaptar título y etiqueta segÃºn tipo
  const esCarrosVacios = t.tipo === 'anden_a_carros_vacios';
  const titleEl = document.getElementById('cc-modal-title');
  if (titleEl) titleEl.textContent = esCarrosVacios ? 'ðŸš› ANDÃ‰N â†’ ESTACIONAMIENTO CARROS VACÃOS' : 'ðŸ“¦ SALIDA DE ANDÃ‰N â†’ CARROS CARGADOS';
  const slotLabelEl = document.getElementById('cc-slot-label');
  if (slotLabelEl) slotLabelEl.innerHTML = (esCarrosVacios ? 'Estacionamiento Carros Vacíos *' : 'Estacionamiento Carros Cargados *') + ' <span style="color:var(--c-err);font-size:9px;">(requerido)</span>';
  document.getElementById('cc-info-camion').innerHTML =
    '<strong style="color:var(--tx-head);">' + (t.patente || 'â€”') + '</strong>' +
    (carrier ? ' â€” ' + carrier.nombre + ' | Ruta: ' + (carrier.numero_ruta||'â€”') : '') +
    '<br><span style="color:var(--tx-muted);">Tarea: ' + (t.tipo||'').replace(/_/g,' ').toUpperCase() + '</span>';
  // Poblar slots â€” solo posiciones tipo L (Carros Cargados) disponibles
  const slotSel = document.getElementById('cc-slot-destino');
  const todosSlots = STATE.playaSlots;
  const slotsL     = todosSlots.filter(function(s) {
    return (s.cfg_motivo === 'frigorifico' || s.playa_tipo === 'carros_cargados') && s.cfg_tipo !== 'bloqueado';
  });
  const slotsLLibres  = slotsL.filter(function(s) { return !s.ocupado; });
  const slotsLOcupados = slotsL.filter(function(s) { return !!s.ocupado; });
  const slotsOtrosLibres = todosSlots.filter(function(s) {
    return !s.ocupado && s.cfg_tipo !== 'bloqueado' &&
           s.cfg_motivo !== 'frigorifico' && s.playa_tipo !== 'carros_cargados';
  });
  const mkOpt = function(s, badge, ocupado) {
    const nota = s.cfg_notas ? ' · ' + s.cfg_notas.slice(0, 18) : '';
    const pat  = s.patente ? ' [' + s.patente + ']' : '';
    return '<option value="' + s.id + '"' + (ocupado ? ' disabled' : '') + '>' +
      (badge||'') + 'Pos L-F' + s.fila + '-' + String(s.col).padStart(2,'0') + pat + nota + '</option>';
  };
  const tieneL = slotsLLibres.length > 0 || slotsLOcupados.length > 0;
  slotSel.innerHTML = '<option value="">â€” Seleccionar posición L de destino * â€”</option>' +
    (slotsLLibres.length  ? '<optgroup label="âœ… Posiciones L disponibles (Carros Cargados)">' + slotsLLibres.map(function(s){ return mkOpt(s,'ðŸ“¦ ', false); }).join('') + '</optgroup>' : '') +
    (slotsLOcupados.length ? '<optgroup label="â›” Posiciones L ocupadas (no disponibles)">' + slotsLOcupados.map(function(s){ return mkOpt(s,'ðŸ”´ ', true); }).join('') + '</optgroup>' : '') +
    (!tieneL && slotsOtrosLibres.length ? '<optgroup label="⚠  Sin posiciones L â€” otros slots libres (usar con cuidado)">' + slotsOtrosLibres.map(function(s){
      const nota = s.cfg_notas ? ' · ' + s.cfg_notas.slice(0,18) : '';
      return '<option value="' + s.id + '">â—» Slot F' + s.fila + '-' + String(s.col).padStart(2,'0') + nota + '</option>';
    }).join('') + '</optgroup>' : '') +
    (!tieneL && !slotsOtrosLibres.length ? '<option value="" disabled>⚠  Sin posiciones disponibles en playa</option>' : '');
  document.getElementById('cc-sello').value = '';
  document.getElementById('cc-pallets').value = '1';
  document.getElementById('cc-obs').value = '';
  document.getElementById('cc-msg').textContent = '';
  const modal = document.getElementById('modal-carro-cargado');
  if (modal) { modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; }
}

async function confirmarCarroCargado() {
  const taskId = document.getElementById('cc-task-id').value;
  const sello  = document.getElementById('cc-sello').value.trim().toUpperCase();
  const pallets = parseInt(document.getElementById('cc-pallets').value) || 0;
  const slotId  = document.getElementById('cc-slot-destino').value;
  const obs     = document.getElementById('cc-obs').value.trim();
  const msgEl   = document.getElementById('cc-msg');

  if (!sello) { msgEl.textContent = 'â›” El nÃºmero de sello/precinto es obligatorio'; Audio.play('error'); return; }
  if (pallets < 1 || pallets > 33) { msgEl.textContent = 'â›” Cantidad de pallets debe estar entre 1 y 33'; Audio.play('error'); return; }
  if (!slotId) { msgEl.textContent = 'â›” Debe seleccionar el estacionamiento de carros cargados de destino'; Audio.play('error'); return; }

  const t = (STATE.tasks || []).find(x => x.id === taskId);
  if (!t) return;

  // â”€â”€ VALIDACIÃ“N CRÃTICA: Verificar que el slot sea válido para carros cargados â”€â”€
  const slot = (STATE.playaSlots || []).find(s => s.id === slotId);
  if (!slot) { msgEl.textContent = 'â›” El estacionamiento seleccionado no existe'; Audio.play('error'); return; }
  if (slot.ocupado) { msgEl.textContent = 'â›” El estacionamiento ya está ocupado. Selecciona otro disponible'; Audio.play('error'); return; }
  if (slot.cfg_tipo === 'bloqueado') { msgEl.textContent = 'â›” Este estacionamiento está bloqueado y no puede usarse'; Audio.play('error'); return; }

  // Si es tarea de retiro a carros vacios, debe ser estacionamiento de vacios
  if (t.tipo === 'anden_a_carros_vacios') {
    if (slot.cfg_motivo === 'frigorifico' || slot.playa_tipo === 'carros_cargados') {
      msgEl.textContent = 'â›” FLUJO INCORRECTO: Este carro va a "Carros Vacíos", no a "Carros Cargados". Cancela y crea la tarea correcta.';
      Audio.play('error'); return;
    }
  } else {
    // Para carros cargados, debe ser slot de frigorifico o ya marcado como carros_cargados
    if (slot.cfg_motivo !== 'frigorifico' && slot.playa_tipo !== 'carros_cargados') {
      msgEl.textContent = 'â›” FLUJO INCORRECTO: Debes usar estacionamiento de CARROS CARGADOS, no una zona general.';
      Audio.play('error'); return;
    }
  }

  // Registrar en carros
  const carrier = (STATE.carriers || []).find(x => x.codigo === t.patente);
  const nuevoCarro = {
    patente: t.patente, conductor: carrier?.nombre || 'â€”',
    ruta: carrier?.numero_ruta || 'â€”', pallets: pallets,
    vuelta: 'primera', slot: slotId, sello: sello, obs: obs,
    hora: new Date().toISOString()
  };
  STATE.carros.push(nuevoCarro);

  // Marcar slot si se asignó â€” siempre tipo carros_cargados para trazabilidad
  if (slotId) {
    const slot = (STATE.playaSlots || []).find(s => s.id === slotId);
    if (slot) {
      slot.ocupado = true; slot.patente = t.patente;
      slot.ruta = carrier?.numero_ruta || 'â€”'; slot.nombre = carrier?.nombre || 'â€”';
      slot.playa_tipo = 'carros_cargados';
    }
  }

  // Registrar deuda de pallets para seguimiento retorno
  if (!STATE.palletDeuda[t.patente]) STATE.palletDeuda[t.patente] = { deuda: 0, historial: [] };
  STATE.palletDeuda[t.patente].historial.push({
    tipo: 'carga', pallets: pallets, sello: sello, hora: new Date().toISOString(), obs: obs
  });

  // â”€â”€ Actualizar visita: mover de andén a carros_cargados â”€â”€
  const visit = (STATE.visits || []).find(v => v.patente === t.patente && v.estado !== 'salida');
  const dock  = visit?.dock_id ? (STATE.docks || []).find(d => d.id === visit.dock_id) : null;

  if (visit) {
    const dockAnterior = visit.dock_id;
    const nuevaZona = (t.tipo === 'anden_a_carros_vacios') ? 'estacionamiento_carros_vacios' : 'carros_cargados';
    visit.zona_actual = nuevaZona;
    visit.estado      = 'en_patio';
    visit.dock_id     = null;
    visit.pallets_cargados = pallets;
    visit.sello = sello;
    if (!STATE.usingSeed && sb) {
      try {
        await sb.from('yard_visits').update({
          zona_actual: nuevaZona, estado: 'en_patio',
          dock_id: null, pallets_cargados: pallets, sello: sello,
        }).eq('id', visit.id);
      } catch(e) { console.warn('update visit zona:', e.message); }
    }
    // â”€â”€ Liberar el andén â”€â”€
    if (dock) {
      dock.estado = 'free'; dock.truck_id = null; dock.inicio_ocupacion = null;
      if (!STATE.usingSeed && sb) {
        try {
          await sb.from('docks').update({
            estado: 'free', truck_id: null, inicio_ocupacion: null,
          }).eq('id', dock.id);
        } catch(e) { console.warn('liberar dock:', e.message); }
      }
    }
  }

  // Completar tarea
  const oldEstado = t.estado;
  t.estado = 'completada'; t.hora_fin = new Date().toISOString();
  const newNotas = (t.notas ? t.notas + ' | ' : '') + 'Sello: ' + sello + ' · Pallets: ' + pallets;
  t.notas = newNotas;
  if (!STATE.usingSeed && sb) {
    try {
      const validation = validateStateTransition('yard_tasks', oldEstado, 'completada', STATE.user?.id);
      if (!validation.valid) {
        notify('âŒ ' + validation.reason, 'error');
        t.estado = oldEstado;
        return;
      }

      const { data } = await sb.from('yard_tasks')
        .update({ estado: 'completada', hora_fin: t.hora_fin, notas: newNotas })
        .eq('id', taskId)
        .eq('estado', oldEstado)
        .select().single();

      if (!data) {
        notify('⚠ ï¸  Tarea fue modificada por otro usuario. Recargando...', 'warn');
        await loadTasks();
        return;
      }
    } catch(e) { console.warn('completar carro cargado:', e); }
  }

  await auditLog('task', 'CARRO_CARGADO_REGISTRADO',
    t.patente + ' · Sello: ' + sello + ' · Pallets: ' + pallets +
    (dock ? ' · Andén ' + dock.codigo + ' liberado' : ''));
  ymsPersistYardConfig();
  Audio.play('ok');
  const zonaLabel = (t.tipo === 'anden_a_carros_vacios') ? 'Estac. Carros Vacíos' : 'Carros Cargados';
  notify('âœ… ' + t.patente + ' â†’ ' + zonaLabel + ' â€” Precinto: ' + sello + ' · ' + pallets + ' pallets' + (dock ? ' · Andén ' + dock.codigo + ' libre' : ''), 'ok', 5000);
  closeModal('modal-carro-cargado');
  renderTareas(); renderCarros(); renderAndenes(); renderDashboard();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  VERIFICACIÃ“N PALLETS â€” SUPERVISOR (retorno secundaria)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _pcPatente = null;

function abrirPalletCheck(patente, visitId) {
  _pcPatente = patente;
  const carrier  = (STATE.carriers || []).find(x => x.codigo === patente);
  const deuda    = STATE.palletDeuda[patente] || { deuda: 0, historial: [] };
  const ultimaCarga = deuda.historial.filter(h => h.tipo === 'carga').slice(-1)[0];
  const esperados   = ultimaCarga ? ultimaCarga.pallets : 0;
  document.getElementById('pc-patente').value  = patente;
  document.getElementById('pc-pallets-esperados').value  = esperados;
  document.getElementById('pc-pallets-recibidos').value  = esperados;
  document.getElementById('pc-info-camion').innerHTML =
    '<strong style="color:var(--tx-head);">' + patente + '</strong>' +
    (carrier ? ' â€” ' + carrier.nombre + ' | Ruta: ' + (carrier.numero_ruta||'â€”') : '');
  const deudaEl = document.getElementById('pc-deuda-info');
  deudaEl.textContent = deuda.deuda !== 0
    ? (deuda.deuda > 0 ? '⚠  Deuda acumulada: ' + deuda.deuda + ' pallets' : 'âœ“ Crédito: ' + Math.abs(deuda.deuda) + ' pallets')
    : 'âœ“ Sin deuda de pallets';
  // Inicializar items de pallets
  const listEl = document.getElementById('pc-items-list');
  listEl.innerHTML = '';
  for (let i = 0; i < esperados; i++) agregarItemPallet();
  document.getElementById('pc-diff-panel').style.display = 'none';
  document.getElementById('pc-msg').textContent = '';
  const modal = document.getElementById('modal-pallet-check');
  if (modal) { modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; }
}

function agregarItemPallet() {
  const listEl = document.getElementById('pc-items-list');
  const idx = listEl.children.length + 1;
  const item = document.createElement('div');
  item.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;padding:6px 10px;background:var(--bg-alt);border:1px solid var(--border);';
  item.innerHTML =
    '<span style="color:var(--tx-muted);font-size: 8px;min-width:60px;">Pallet ' + idx + '</span>' +
    '<select style="flex:1;font-size: 8px;" onchange="calcDiffPallets()">' +
      '<option value="ok">âœ“ OK â€” En buen estado</option>' +
      '<option value="dañado">⚠  Dañado</option>' +
      '<option value="faltante">âœ— Faltante</option>' +
    '</select>' +
    '<input type="text" placeholder="Obs." style="width:120px;font-size:10px;" />';
  listEl.appendChild(item);
  calcDiffPallets();
}

function calcDiffPallets() {
  const esperados = parseInt(document.getElementById('pc-pallets-esperados').value) || 0;
  const recibidos = parseInt(document.getElementById('pc-pallets-recibidos').value) || 0;
  const diff = recibidos - esperados;
  const diffEl = document.getElementById('pc-diff-panel');
  const diffMsg = document.getElementById('pc-diff-msg');
  diffEl.style.display = 'block';
  if (diff === 0) {
    diffMsg.style.color = 'var(--c-ok)';
    diffMsg.textContent = 'âœ“ Cantidades correctas â€” sin diferencia';
  } else if (diff < 0) {
    diffMsg.style.color = 'var(--c-err)';
    diffMsg.textContent = '⚠  FALTANTE: ' + Math.abs(diff) + ' pallets â€” se registrará deuda';
  } else {
    diffMsg.style.color = 'var(--c-warn)';
    diffMsg.textContent = 'â†‘ EXCEDENTE: ' + diff + ' pallets â€” se neteará con deuda existente';
  }
}

async function confirmarPalletCheck() {
  const patente  = _pcPatente;
  const esperados = parseInt(document.getElementById('pc-pallets-esperados').value) || 0;
  const recibidos = parseInt(document.getElementById('pc-pallets-recibidos').value) || 0;
  const diff = recibidos - esperados;
  const listEl = document.getElementById('pc-items-list');
  const items = Array.from(listEl.children).map(function(el) {
    const sel = el.querySelector('select');
    const inp = el.querySelector('input[type=text]');
    return { estado: sel ? sel.value : 'ok', obs: inp ? inp.value : '' };
  });
  // Actualizar deuda
  if (!STATE.palletDeuda[patente]) STATE.palletDeuda[patente] = { deuda: 0, historial: [] };
  STATE.palletDeuda[patente].deuda += diff; // negativo = deuda, positivo = crédito
  STATE.palletDeuda[patente].historial.push({
    tipo: 'retorno', esperados: esperados, recibidos: recibidos, diff: diff,
    items: items, hora: new Date().toISOString()
  });
  const resumen = 'Patente: ' + patente + ' · Esperados: ' + esperados + ' · Recibidos: ' + recibidos +
    (diff !== 0 ? ' · Diferencia: ' + diff + ' (deuda acum: ' + STATE.palletDeuda[patente].deuda + ')' : '');
  await auditLog('task', 'PALLET_CHECK_RETORNO', resumen);
  Audio.play('ok');
  const msg = diff === 0 ? 'âœ“ Pallets verificados â€” sin diferencia' :
    diff < 0 ? '⚠  Deuda de ' + Math.abs(diff) + ' pallets registrada · Acumulada: ' + STATE.palletDeuda[patente].deuda :
    'â†‘ Excedente de ' + diff + ' pallets â€” deuda neteada: ' + STATE.palletDeuda[patente].deuda;
  notify(msg, diff === 0 ? 'ok' : 'warn', 6000);
  closeModal('modal-pallet-check');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SLOTS DEDICADOS / DINÃMICOS (Admin)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function configurarSlot(slotId) {
  if (STATE.profile?.rol !== 'administrador') { notify('â›” Solo el administrador puede configurar slots', 'error'); return; }
  const slot = (STATE.playaSlots || []).find(s => s.id === slotId);
  if (!slot) return;
  const tipo = prompt('Tipo de slot:\n1 = DINÃMICO (cualquier camión)\n2 = DEDICADO (patente fija)\nActual: ' + (STATE.slotsDedicados[slotId]?.tipo || 'dinámico'), '1');
  if (!tipo) return;
  if (tipo === '2') {
    const pat = prompt('Ingrese patente o ruta dedicada al slot F' + slot.fila + '-' + String(slot.col).padStart(2,'0') + ':');
    if (!pat) return;
    STATE.slotsDedicados[slotId] = { tipo: 'dedicado', patente: pat.toUpperCase(), slotId };
    notify('âœ“ Slot F' + slot.fila + '-' + String(slot.col).padStart(2,'0') + ' dedicado a ' + pat.toUpperCase(), 'ok');
  } else {
    delete STATE.slotsDedicados[slotId];
    notify('âœ“ Slot F' + slot.fila + '-' + String(slot.col).padStart(2,'0') + ' configurado como dinámico', 'ok');
  }
  renderPatio();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  INTEGRACIÃ“N: renderTareas muestra botones correctos segÃºn tipo de tarea
//  y muestra el uber patio para operador_patio
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function getAccionesTareaDesktop(t, myId, myRol) {
  const miaTarea = t.operador_id === myId || t.operador_nombre === STATE.profile?.nombre;
  const rolesSupervision = ['administrador', 'supervisor_andenes', 'jefe_ops'];
  const esSupervisor = rolesSupervision.includes(myRol);
  const puedeEditar = myRol === 'administrador';
  const puedeAceptar = ['pendiente','ofertada'].includes(t.estado) && myRol === 'operador_patio';
  const estadoActivo = ['pendiente','ofertada','aceptada','en_ejecucion'].includes(t.estado);
  const puedeCompletar = estadoActivo && (miaTarea || esSupervisor);
  const esRetiroAnden = t.tipo === 'retirar_anden' || t.tipo === 'anden_a_carros_vacios' || t.zona_destino === 'carros_cargados' || t.zona_destino === 'estacionamiento_carros_vacios';
  const esCarroCargado = esRetiroAnden && puedeCompletar;
  // Tarea en estado intermedio checklist aprobado â€” requiere confirmar postura en andén
  const esChecklistOk = t.estado === 'checklist_ok' && (miaTarea || esSupervisor);
  let html = '<div class="tc-actions">';
  if (puedeEditar) {
    html += '<button class="btn" style="font-size:9px;padding:2px 6px;" data-action="abrirEdicionTarea" data-id="' + t.id + '">âœ EDITAR</button>';
  }
  if (puedeAceptar) {
    html += '<button class="btn btn-ok" style="font-size:9px;padding:2px 6px;" data-action="aceptarTareaById" data-id="' + t.id + '">â–¶ ACEPTAR</button>';
  }
  if (esChecklistOk) {
    html += '<button class="btn btn-ok" style="font-size:9px;padding:2px 6px;border-color:var(--c-ok);" data-action="abrirPosturaAnden" data-id="' + t.id + '">ðŸ“ CONFIRMAR POSTURA</button>';
  } else if (esCarroCargado) {
    html += '<button class="btn btn-warn" style="font-size:9px;padding:2px 6px;" data-action="registrarRetiroAnden" data-id="' + t.id + '">ðŸ“¦ REGISTRAR SELLO</button>';
  } else if (puedeCompletar) {
    html += '<button class="btn btn-ok" style="font-size:9px;padding:2px 6px;" data-action="abrirChecklistTarea" data-id="' + t.id + '">âœ“ CHECKLIST</button>';
  }
  html += '</div>';
  return html;
}

// Intercept crearTarea para mostrar uber al patio
const _origCrearTarea = crearTarea;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  DATOS DE PRUEBA â€” Visitas primaria y secundaria
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function cargarDatosPrueba() {
  const now = Date.now();
  // Limpiar visits de demo que puedan existir
  STATE.visits = (STATE.visits || []).filter(v => v._prueba);

  // Visitas primarias (ramplas desde plantas)
  const visitasPrimarias = [
    { id:'vp1', patente:'BFWX20', tipo:'primaria', carrier_nombre:'Sandoval Aedo Thiare Bristela',
      planta_nombre:'Planta Rancagua', numero_guia:'G-001001', precinto:'P-88001',
      hora_ingreso: new Date(now - 90*60000).toISOString(), zona_actual:'espera_anden', estado:'en_patio',
      carrier_id:'c1', planta_id:'p1', _prueba:true },
    { id:'vp2', patente:'CXLW85', tipo:'primaria', carrier_nombre:'Maestre Ureta Oscar Patricio',
      planta_nombre:'Planta Los Andes', numero_guia:'G-001002', precinto:'P-88002',
      hora_ingreso: new Date(now - 45*60000).toISOString(), zona_actual:'anden', dock_id:'d1', estado:'en_anden',
      carrier_id:'c2', planta_id:'p2', _prueba:true },
    { id:'vp3', patente:'DDYD57', tipo:'primaria', carrier_nombre:'Abarca Pino Nicolas Rafael',
      planta_nombre:'Planta Quilicura', numero_guia:'G-001003', precinto:'P-88003',
      hora_ingreso: new Date(now - 20*60000).toISOString(), zona_actual:'gate', estado:'en_patio',
      carrier_id:'c3', planta_id:'p3', _prueba:true },
    { id:'vp4', patente:'GKTS44', tipo:'primaria', carrier_nombre:'Ibáñez Soto Roberto Carlos',
      planta_nombre:'Planta Los Ãngeles', numero_guia:'G-001006', precinto:'P-88006',
      hora_ingreso: new Date(now - 75*60000).toISOString(), zona_actual:'anden', dock_id:'d3', estado:'en_anden',
      carrier_id:'c8', planta_id:'p5', _prueba:true },
  ];

  // Visitas secundarias (retornos)
  const visitasSecundarias = [
    { id:'vs1', patente:'DFWT11', tipo:'secundaria', carrier_nombre:'Pena Mass Victor Ignacio A',
      numero_ruta:'V3823', hora_ingreso: new Date(now - 30*60000).toISOString(),
      zona_actual:'playa', estado:'en_patio', carrier_id:'c4', _prueba:true },
    { id:'vs2', patente:'DWHK97', tipo:'secundaria', carrier_nombre:'Plaza Gonzalez Claudio',
      numero_ruta:'V2919', hora_ingreso: new Date(now - 15*60000).toISOString(),
      zona_actual:'gate', estado:'en_patio', carrier_id:'c5', _prueba:true },
    { id:'vs3', patente:'DYSK20', tipo:'secundaria', carrier_nombre:'Pinto Lobos Juan Pablo',
      numero_ruta:'V1779', hora_ingreso: new Date(now - 60*60000).toISOString(),
      zona_actual:'playa', estado:'en_patio', carrier_id:'c6', _prueba:true },
  ];

  STATE.visits = [...visitasPrimarias, ...visitasSecundarias, ...(STATE.visits || []).filter(v => !v._prueba)];

  // Datos de pallets cargados para secundarias (deuda)
  STATE.palletDeuda['DFWT11'] = {
    deuda: 0, historial: [{ tipo:'carga', pallets:20, sello:'S-001823', hora: new Date(now - 8*3600000).toISOString() }]
  };
  STATE.palletDeuda['DWHK97'] = {
    deuda: -3, historial: [
      { tipo:'carga', pallets:18, sello:'S-002919', hora: new Date(now - 24*3600000).toISOString() },
      { tipo:'retorno', esperados:18, recibidos:15, diff:-3, hora: new Date(now - 20*3600000).toISOString() }
    ]
  };
  STATE.palletDeuda['DYSK20'] = {
    deuda: 0, historial: [{ tipo:'carga', pallets:22, sello:'S-003779', hora: new Date(now - 12*3600000).toISOString() }]
  };

  // Tareas de prueba
  const tareasPrueba = [
    { id:'tp1', tipo:'mover_anden', patente:'BFWX20', zona_origen:'espera_anden', zona_destino:'anden',
      prioridad:'urgente', sla_minutos:20, estado:'ofertada', notas:'Prioritario â€” planta Rancagua',
      hora_creacion: new Date(now - 5*60000).toISOString(), operador_nombre:null, _prueba:true },
    { id:'tp2', tipo:'retirar_anden', patente:'CXLW85', zona_origen:'anden', zona_destino:'carros_cargados',
      prioridad:'normal', sla_minutos:20, estado:'pendiente', notas:'Descarga completa',
      hora_creacion: new Date(now - 10*60000).toISOString(), operador_nombre:null, _prueba:true },
    { id:'tp3', tipo:'mover_playa', patente:'DFWT11', zona_origen:'playa', zona_destino:'anden',
      prioridad:'normal', sla_minutos:30, estado:'pendiente', notas:'Secundaria con 20 pallets cargados',
      hora_creacion: new Date(now - 3*60000).toISOString(), operador_nombre:null, _prueba:true },
  ];

  STATE.tasks = [...tareasPrueba, ...(STATE.tasks || []).filter(t => !t._prueba)];

  // Andenes de prueba si no hay
  if ((STATE.docks || []).length === 0) {
    STATE.docks = [
      { id:'d1', codigo:'A01', tipo:'frigorifico', operacion_permitida:'descarga', estado:'busy',
        truck_id:'vp2', inicio_ocupacion: new Date(now - 45*60000).toISOString() },
      { id:'d2', codigo:'A02', tipo:'frigorifico', operacion_permitida:'descarga', estado:'free' },
      { id:'d3', codigo:'A03', tipo:'seco', operacion_permitida:'mixta', estado:'free' },
      { id:'d4', codigo:'B01', tipo:'mixto', operacion_permitida:'mixta', estado:'blocked' },
    ];
  }

  Audio.play('ok');
  notify('âœ“ Datos de prueba cargados: 3 primarias + 3 secundarias + 3 tareas', 'ok', 5000);
  renderAll();
}



function abrirPalletCheckDesdeIngreso() {
  const pat = (document.getElementById('ing2-patente')?.value || '').trim().toUpperCase();
  if (!pat) { notify('â›” Ingrese la patente primero', 'error'); return; }
  closeModal('modal-ingreso');
  abrirPalletCheck(pat, null);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  GESTIÃ“N CARRIERS â€” Mover CD y Asignar Andén desde Config
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function moverCarrierCD(carrierId, newCD) {
  const carrier = (STATE.carriers || []).find(x => x.id === carrierId);
  if (!carrier) return;
  const oldCD = carrier.cd || 'â€”';
  carrier.cd = newCD;
  const site = SITES_DISPONIBLES.find(s => s.codigo === newCD);
  if (!STATE.usingSeed && sb) {
    try { await sb.from('carriers').update({ cd: newCD }).eq('id', carrierId); } catch(e) {}
  }
  Audio.play('ok');
  notify('âœ“ ' + carrier.codigo + ' â€” ' + carrier.nombre.split(' ')[0] + ' movido a ' + (site?.nombre || newCD), 'ok');
  await auditLog('config', 'CARRIER_CD_CAMBIADO', carrier.codigo + ' de ' + oldCD + ' â†’ ' + newCD);
  renderConfigCarriers();
}

function abrirAsignacionAnden(carrierId, patente) {
  const carrier = (STATE.carriers || []).find(x => x.id === carrierId);
  const visit = (STATE.visits || []).find(v => v.patente === patente && v.estado !== 'salida');
  if (!carrier || !visit) {
    notify('⚠  El camión no está actualmente en patio', 'warn'); return;
  }

  // Construir opciones de andenes libres
  const docksLibres = (STATE.docks || []).filter(d => d.estado === 'free');
  if (!docksLibres.length) {
    notify('â›” Sin andenes libres disponibles', 'error'); return;
  }

  const opts = docksLibres.map(d =>
    '<option value="' + d.id + '">' + d.codigo + ' â€” ' + d.tipo.toUpperCase() + ' â€” ' + d.operacion_permitida + '</option>'
  ).join('');

  // Crear modal inline
  const existingModal = document.getElementById('modal-asignar-anden');
  if (existingModal) existingModal.remove();

  const modalHtml = '<div id="modal-asignar-anden" class="modal-overlay" style="display:flex;">' +
    '<div class="modal-box" style="max-width:420px;">' +
      '<div class="mh"><span class="mh-title">â–¦ ASIGNAR ANDÃ‰N â€” ' + patente + '</span>' +
        '<button class="btn btn-err" onclick="closeModal(&quot;modal-asignar-anden&quot;)">âœ•</button></div>' +
      '<div class="mb-inner">' +
        '<div style="margin-bottom:12px;font-size: 8px;color:var(--tx-muted);">' +
          'Conductor: <strong style="color:var(--tx-head);">' + carrier.nombre + '</strong><br>' +
          'Ruta: <strong style="color:var(--tx-head);">' + (carrier.numero_ruta||'â€”') + '</strong> &nbsp;·&nbsp; ' +
          'Zona: <strong style="color:var(--tx-head);">' + (visit.zona_actual||'â€”').replace(/_/g,' ').toUpperCase() + '</strong>' +
        '</div>' +
        '<div class="fg"><label>SELECCIONAR ANDÃ‰N LIBRE</label>' +
          '<select id="sel-anden-asignar" style="font-size: 9px;padding:8px;">' + opts + '</select>' +
        '</div>' +
      '</div>' +
      '<div class="mf">' +
        '<button class="btn" onclick="closeModal(&quot;modal-asignar-anden&quot;)">CANCELAR</button>' +
        '<button class="btn btn-ok" onclick="confirmarAsignacionAnden(\'' + visit.id + '\',\'' + patente + '\')">âœ“ ASIGNAR ANDÃ‰N</button>' +
      '</div>' +
    '</div></div>';

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function confirmarAsignacionAnden(visitId, patente) {
  const dockId = document.getElementById('sel-anden-asignar')?.value;
  if (!dockId) { notify('â›” Seleccione un andén', 'error'); return; }

  const dock  = (STATE.docks || []).find(d => d.id === dockId);
  const visit = (STATE.visits || []).find(v => v.id === visitId);
  if (!dock || !visit) return;

  // Asignar andén
  dock.estado = 'busy';
  dock.truck_id = visitId;
  dock.inicio_ocupacion = new Date().toISOString();
  visit.dock_id = dockId;
  visit.zona_actual = 'anden';
  visit.estado = 'en_anden';

  if (!STATE.usingSeed && sb) {
    try {
      await sb.from('docks').update({ estado:'busy', truck_id:visitId, inicio_ocupacion:new Date().toISOString() }).eq('id', dockId);
      await sb.from('yard_visits').update({ dock_id:dockId, zona_actual:'anden', estado:'en_anden' }).eq('id', visitId);
    } catch(e) { console.warn('asignar anden:', e.message); }
  }

  await auditLog('dock', 'ANDEN_ASIGNADO_ADMIN', 'Patente ' + patente + ' â†’ Andén ' + dock.codigo + ' (asignación manual admin)');
  closeModal('modal-asignar-anden');
  Audio.play('dock_free');
  notify('âœ“ Andén ' + dock.codigo + ' asignado a ' + patente, 'ok');
  renderConfigCarriers();
  renderAndenes();
  renderDashboard();
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CONFIG CENTROS DE DISTRIBUCIÃ“N
//  Solo administrador puede crear/editar/eliminar CDs
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _cdSeleccionado = null;

function renderConfigCD() {
  if (STATE.profile?.rol !== 'administrador') return;
  const tbody = document.getElementById('config-cd-tbl');
  if (!tbody) return;

  const cds = SITES_DISPONIBLES;
  set('cd-total-count', cds.length);

  tbody.innerHTML = cds.map(function(cd) {
    const andenes = (STATE.docks || []).filter(d => d.site_id === cd.codigo || (!d.site_id && cd.codigo === STATE.currentSite));
    const libres  = andenes.filter(d => d.estado === 'free').length;
    const ocupados= andenes.filter(d => d.estado === 'busy').length;
    const slots   = STATE.playaSlots?.length || 72;
    const isActual = cd.codigo === STATE.currentSite;
    return '<tr style="' + (isActual ? 'background:var(--bg-hover);' : '') + '">' +
      '<td class="c-bright fw">' + cd.codigo + '</td>' +
      '<td>' + cd.nombre + '</td>' +
      '<td class="c-dim fz10">' + cd.region + '</td>' +
      '<td class="c-dim"><span class="c-ok">' + libres + '</span> libres / <span class="c-warn">' + ocupados + '</span> ocupados / ' + andenes.length + ' total</td>' +
      '<td class="c-dim">' + slots + ' slots</td>' +
      '<td class="c-dim fz10">Frigorífico · Seco · Lavado</td>' +
      '<td><span class="badge ' + (isActual ? 'b-ok' : 'b-dim') + '">' + (isActual ? 'ACTIVO' : 'INACTIVO') + '</span></td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-ok" style="font-size:9px;padding:1px 5px;" onclick="seleccionarCD(\'' + cd.codigo + '\')" >CONFIGURAR</button> ' +
        '<button class="btn btn-warn" style="font-size:9px;padding:1px 5px;" onclick="activarCD(\'' + cd.codigo + '\')" >ACTIVAR</button> ' +
        (isActual ? '' : '<button class="btn btn-err" style="font-size:9px;padding:1px 5px;" onclick="eliminarCD(\'' + cd.codigo + '\')" >ELIMINAR</button>') +
      '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="8" class="c-dim tc" style="padding:16px;">Sin centros registrados</td></tr>';
}

function seleccionarCD(codigo) {
  _cdSeleccionado = codigo;
  const panel = document.getElementById('cd-detalle-panel');
  if (panel) panel.style.display = 'block';

  // Cargar andenes del CD
  renderAndenesCD(codigo);

  // Actualizar config de slots
  const filas = document.getElementById('cd-filas');
  const cols  = document.getElementById('cd-cols');
  const totalSlots = STATE.playaSlots?.length || 72;
  const numCols = 12;
  const numFilas = Math.ceil(totalSlots / numCols);
  if (filas) filas.value = numFilas;
  if (cols)  cols.value  = numCols;

  Audio.play('ok');
  notify('Configurando: ' + (SITES_DISPONIBLES.find(s=>s.codigo===codigo)?.nombre||codigo), 'info');
  document.getElementById('cd-detalle-panel')?.scrollIntoView({behavior:'smooth'});
}

function renderAndenesCD(codigo) {
  var andenes = (STATE.docks || []).filter(function(d){ return d.site_id === codigo || !d.site_id; });
  set('cd-andenes-count', andenes.length);
  var tbody = document.getElementById('cd-andenes-tbl');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!andenes.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="c-dim tc">Sin andenes</td></tr>';
    return;
  }
  andenes.forEach(function(d) {
    var stCls = d.estado==='free'?'b-ok':d.estado==='busy'?'b-warn':'b-err';
    var tr = document.createElement('tr');
    var cells = [
      '<td class="c-bright fw">' + d.codigo + '</td>',
      '<td class="c-dim">' + (d.tipo||'').toUpperCase() + '</td>',
      '<td class="c-dim">' + (d.operacion_permitida||'').replace(/_/g,' ').toUpperCase() + '</td>',
      '<td class="c-dim">' + (d.max_tiempo||120) + ' min</td>',
      '<td><span class="badge ' + stCls + '">' + (d.estado||'').toUpperCase() + '</span></td>',
      '<td></td>'
    ];
    tr.innerHTML = cells.join('');
    var btn = document.createElement('button');
    btn.className = 'btn btn-err';
    btn.style.cssText = 'font-size:9px;padding:1px 4px;';
    btn.textContent = 'âœ•';
    (function(id){ btn.addEventListener('click', function(){ eliminarAndenCD(id); }); })(d.id);
    tr.lastElementChild.appendChild(btn);
    tbody.appendChild(tr);
  });
}
function abrirModalNuevoCD() {
  const existing = document.getElementById('modal-nuevo-cd');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal-nuevo-cd';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.maxWidth = '460px';
  box.innerHTML =
    '<div class="mh"><span class="mh-title">⚠™ NUEVO CENTRO DE DISTRIBUCIÃ“N</span></div>' +
    '<div class="mb-inner">' +
      '<div class="fr"><div class="fg"><label>Código CD *</label><input type="text" id="ncd-codigo" placeholder="CD_SANTIAGO" style="text-transform:uppercase;"></div></div>' +
      '<div class="fr"><div class="fg"><label>Nombre *</label><input type="text" id="ncd-nombre" placeholder="CD Santiago Centro"></div></div>' +
      '<div class="fr"><div class="fg"><label>Región</label><input type="text" id="ncd-region" placeholder="Metropolitana"></div></div>' +
      '<div class="fr">' +
        '<div class="fg" style="max-width:80px;"><label>Andenes</label><input type="number" id="ncd-andenes" value="8" min="1" max="50"></div>' +
        '<div class="fg" style="max-width:80px;"><label>Slots playa</label><input type="number" id="ncd-slots" value="72" min="12" max="200"></div>' +
        '<div class="fg"><label>Tipo andenes</label><select id="ncd-tipo-anden"><option value="frigorifico">Frigorífico</option><option value="seco">Seco</option><option value="mixto">Mixto</option></select></div>' +
      '</div>' +
      '<div id="ncd-msg" style="font-size: 8px;min-height:16px;margin-top:8px;"></div>' +
    '</div>' +
    '<div class="mf"></div>';

  const mf = box.querySelector('.mf');
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn'; cancelBtn.textContent = 'CANCELAR';
  cancelBtn.addEventListener('click', function(){ overlay.remove(); });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-ok'; saveBtn.textContent = 'âœ“ CREAR CD';
  saveBtn.addEventListener('click', crearNuevoCD);
  mf.appendChild(cancelBtn); mf.appendChild(saveBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function crearNuevoCD() {
  const codigo  = (document.getElementById('ncd-codigo')?.value||'').trim().toUpperCase();
  const nombre  = (document.getElementById('ncd-nombre')?.value||'').trim();
  const region  = (document.getElementById('ncd-region')?.value||'').trim();
  const numAnd  = parseInt(document.getElementById('ncd-andenes')?.value)||8;
  const numSlots= parseInt(document.getElementById('ncd-slots')?.value)||72;
  const tipoAnd = document.getElementById('ncd-tipo-anden')?.value || 'frigorifico';
  const msgEl   = document.getElementById('ncd-msg');

  if (!codigo || !nombre) {
    if (msgEl) { msgEl.style.color='var(--c-err)'; msgEl.textContent='â›” Código y nombre son obligatorios'; }
    Audio.play('error'); return;
  }
  if (SITES_DISPONIBLES.find(s => s.codigo === codigo)) {
    if (msgEl) { msgEl.style.color='var(--c-err)'; msgEl.textContent='â›” Ya existe un CD con ese código'; }
    Audio.play('error'); return;
  }

  // Agregar a SITES_DISPONIBLES
  SITES_DISPONIBLES.push({ codigo, nombre, region: region||'Sin región', icon:'ðŸ­' });

  // Crear andenes para este CD
  const letras = 'ABCDEFGHIJ';
  for (let i = 0; i < numAnd; i++) {
    const letra = letras[Math.floor(i/10)] || 'Z';
    const num   = String((i%10)+1).padStart(2,'0');
    STATE.docks.push({
      id: 'd_' + codigo + '_' + i,
      codigo: letra + num,
      tipo: tipoAnd,
      operacion_permitida: tipoAnd === 'seco' ? 'carga' : 'descarga',
      estado: 'free',
      truck_id: null,
      site_id: codigo,
      plantas_compat: 'TODAS',
      max_tiempo: 120,
    });
  }

  document.getElementById('modal-nuevo-cd')?.remove();
  Audio.play('ok');
  notify('âœ“ CD ' + nombre + ' creado con ' + numAnd + ' andenes y ' + numSlots + ' slots de playa', 'ok');
  auditLog('config', 'CD_CREADO', codigo + ' â€” ' + nombre + ' · ' + numAnd + ' andenes');
  renderConfigCD();
}

function abrirModalNuevoAnden() {
  if (!_cdSeleccionado) { notify('â›” Seleccione un CD primero', 'error'); return; }
  const overlay = document.createElement('div');
  overlay.id = 'modal-nuevo-anden-cd';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.maxWidth = '380px';
  box.innerHTML =
    '<div class="mh"><span class="mh-title">+ NUEVO ANDÃ‰N â€” ' + _cdSeleccionado + '</span></div>' +
    '<div class="mb-inner">' +
      '<div class="fr"><div class="fg"><label>Código *</label><input type="text" id="na-codigo" placeholder="A01" style="text-transform:uppercase;"></div>' +
        '<div class="fg"><label>Tipo</label><select id="na-tipo"><option value="frigorifico">Frigorífico</option><option value="seco">Seco</option><option value="mixto">Mixto</option></select></div>' +
      '</div>' +
      '<div class="fr"><div class="fg"><label>Operación</label><select id="na-op"><option value="descarga">Descarga</option><option value="carga">Carga</option><option value="descarga_carga">Descarga+Carga</option></select></div>' +
        '<div class="fg" style="max-width:100px;"><label>Máx (min)</label><input type="number" id="na-max" value="120" min="10" max="480"></div>' +
      '</div>' +
    '</div>' +
    '<div class="mf"></div>';

  const mf = box.querySelector('.mf');
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn'; cancelBtn.textContent = 'CANCELAR';
  cancelBtn.addEventListener('click', function(){ overlay.remove(); });
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-ok'; saveBtn.textContent = 'âœ“ AGREGAR';
  saveBtn.addEventListener('click', function() {
    const codigo = (document.getElementById('na-codigo')?.value||'').trim().toUpperCase();
    const tipo   = document.getElementById('na-tipo')?.value||'frigorifico';
    const op     = document.getElementById('na-op')?.value||'descarga';
    const max    = parseInt(document.getElementById('na-max')?.value)||120;
    if (!codigo) { Audio.play('error'); notify('â›” Ingrese código de andén', 'error'); return; }
    if ((STATE.docks || []).find(d => d.codigo === codigo && d.site_id === _cdSeleccionado)) {
      Audio.play('error'); notify('â›” Código ya existe en este CD', 'error'); return;
    }
    STATE.docks.push({ id:'d_'+Date.now(), codigo, tipo, operacion_permitida:op, estado:'free', site_id:_cdSeleccionado, max_tiempo:max, plantas_compat:'TODAS' });
    overlay.remove();
    Audio.play('ok');
    notify('âœ“ Andén ' + codigo + ' agregado a ' + _cdSeleccionado, 'ok');
    renderAndenesCD(_cdSeleccionado);
    renderAndenes();
  });
  mf.appendChild(cancelBtn); mf.appendChild(saveBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function eliminarAndenCD(dockId) {
  const dock = (STATE.docks || []).find(d => d.id === dockId);
  if (!dock) return;
  if (dock.estado === 'busy') { Audio.play('error'); notify('â›” No se puede eliminar un andén ocupado', 'error'); return; }
  if (!confirm('Â¿Eliminar andén ' + dock.codigo + '?')) return;
  STATE.docks = (STATE.docks || []).filter(d => d.id !== dockId);
  Audio.play('warn');
  notify('⚠  Andén ' + dock.codigo + ' eliminado', 'warn');
  renderAndenesCD(_cdSeleccionado);
  renderAndenes();
}

function activarCD(codigo) {
  selectCD(codigo);
  notify('âœ“ CD ' + codigo + ' activado', 'ok');
  renderConfigCD();
}

function eliminarCD(codigo) {
  if (codigo === STATE.currentSite) { notify('â›” No puede eliminar el CD activo', 'error'); return; }
  const cd = SITES_DISPONIBLES.find(s => s.codigo === codigo);
  if (!confirm('Â¿ELIMINAR Centro de Distribución ' + (cd?.nombre||codigo) + '? Esta acción no se puede deshacer.')) return;
  const idx = SITES_DISPONIBLES.findIndex(s => s.codigo === codigo);
  if (idx >= 0) SITES_DISPONIBLES.splice(idx, 1);
  STATE.docks = (STATE.docks || []).filter(d => d.site_id !== codigo);
  Audio.play('error');
  notify('CD ' + codigo + ' eliminado', 'warn');
  auditLog('config', 'CD_ELIMINADO', codigo);
  renderConfigCD();
}

function aplicarConfigEstacionamientos() {
  const filas = parseInt(document.getElementById('cd-filas')?.value)||6;
  const cols  = parseInt(document.getElementById('cd-cols')?.value)||12;
  const total = filas * cols;
  if (total > 200) { notify('â›” Máximo 200 slots', 'error'); return; }

  const tienes = ['frigorifico','seco','lavado'].filter(t => document.getElementById('st-'+t)?.checked);

  STATE.playaSlots = Array.from({length:total}, function(_,i) {
    return { id:'slot'+(i+1), num:i+1, fila:Math.floor(i/cols)+1, col:(i%cols)+1, ocupado:false, patente:null, ruta:null, tipo:tienes[i%tienes.length]||'frigorifico', dedicado:false };
  });
  STATE._playaIniciada = false; // permitir reinicialización

  set('cd-slots-count', total);
  Audio.play('ok');
  notify('âœ“ Playa configurada: ' + filas + ' filas Ã— ' + cols + ' cols = ' + total + ' slots · Tipos: ' + tienes.join(', '), 'ok');
  renderPatio();
}

function configurarEstacionamientos() {
  const panel = document.getElementById('cd-slots-panel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}


function solicitarMovimientoCarro(idx) {
  const carro = STATE.carros[idx];
  if (!carro) return;
  const slot = carro.slot ? (STATE.playaSlots || []).find(s => s.id === carro.slot) : null;
  const slotLabel = slot ? ('F'+slot.fila+'-'+String(slot.col).padStart(2,'0')) : 'sin estac.';
  const anden = carro.anden_destino ? ((STATE.docks || []).find(d=>d.id===carro.anden_destino)?.codigo||'sin andén') : 'sin andén';

  // Crear tarea de movimiento
  const newTask = {
    id: 't' + Date.now(),
    tipo: 'mover_anden',
    patente: carro.patente,
    zona_origen: 'playa',
    zona_destino: 'anden',
    prioridad: carro.prioridad || 'normal',
    sla_minutos: 15,
    estado: 'ofertada',
    hora_creacion: new Date().toISOString(),
    operador_nombre: null,
    notas: 'Planificado: ' + slotLabel + ' â†’ Andén ' + anden + ' · ' + carro.pallets + ' pallets · ' + (carro.vuelta==='primera'?'1ra VUELTA':'2da VUELTA'),
  };
  STATE.tasks.unshift(newTask);
  carro.estado = 'en_movimiento';

  if (!STATE.usingSeed && sb) {
    sb.from('yard_tasks').insert({
      tipo:'mover_anden', patente:carro.patente, zona_origen:'playa', zona_destino:'anden',
      prioridad:carro.prioridad||'normal', sla_minutos:15, estado:'ofertada',
      notas:newTask.notas, creado_por:STATE.user?.id,
    }).then(function(){});
  }

  Audio.play('new_task');
  notify('âœ“ Movimiento solicitado: ' + carro.patente + ' â€” ' + slotLabel + ' â†’ Andén ' + anden, 'ok');
  auditLog('task','MOVIMIENTO_SOLICITADO', carro.patente + ' · ' + slotLabel + ' â†’ ' + anden);
  renderCarros();
  loadTasks();
}


// â•â•â• LÃ“GICA YMS â€” REGLAS DE MOVIMIENTO â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const YMS_MOVIMIENTOS = {
  mover_anden: {
    label:'ðŸ— Estacionamiento â†’ Andén',origen:'playa',destino:'anden',sla:15,
    info:'Seleccione una patente secundaria dedicada desde un slot de estacionamiento. Si hay andén libre se genera movimiento a Patio; si no, queda en Turnomático hasta liberación de andén.',
    filtro:function(v){ return (v.zona_actual==='playa'||v.zona_actual==='espera_anden')&&v.estado!=='salida'; },
    validar:function(v){ if(v.zona_actual==='anden') return 'â›” Ya está en andén'; if(v.zona_actual==='carros_cargados') return 'â›” Cargada â€” debe ir a lavado primero'; return null; }
  },
  retirar_anden: {
    label:'ðŸ“¦ Andén â†’ Carros cargados',origen:'anden',destino:'carros_cargados',sla:20,
    info:'Rampla con carga completa sale del andén. Requiere sello y cantidad de pallets.',
    filtro:function(v){ return v.zona_actual==='anden'&&v.estado!=='salida'; },
    validar:function(v){ if(v.zona_actual!=='anden') return 'â›” Solo ramplas en andén'; return null; }
  },
  anden_a_carros_vacios: {
    label:'ðŸš› Andén â†’ Estacionamiento carros vacíos',origen:'anden',destino:'estacionamiento_carros_vacios',sla:20,
    info:'Carro confirmado en andén. El operador Patio registra cantidad de pallets y nÃºmero de precinto al completar el movimiento.',
    filtro:function(v){ return v.zona_actual==='anden'&&v.estado!=='salida'; },
    validar:function(v){ if(v.zona_actual!=='anden') return 'â›” Solo carros confirmados en andén (dock ocupado)'; return null; }
  },
  mover_lavado: {
    label:'ðŸ§¹ â†’ Zona lavado',origen:'carros_cargados',destino:'zona_lavado',sla:25,
    info:'Rampla que salió del andén va a lavado antes de volver a playa vacíos.',
    filtro:function(v){ return (v.zona_actual==='carros_cargados'||v.zona_actual==='anden')&&v.estado!=='salida'; },
    validar:function(v){ if(v.zona_actual==='playa') return 'â›” Rampla vacía no requiere lavado'; return null; }
  },
  retorno_playa: {
    label:'â†© Zona lavado â†’ Playa vacíos',origen:'zona_lavado',destino:'playa',sla:15,
    info:'Rampla limpia vuelve a playa de carros vacíos para siguiente turno.',
    filtro:function(v){ return (v.zona_actual==='zona_lavado'||v.zona_actual==='carros_cargados')&&v.estado!=='salida'; },
    validar:function(v){ if(v.zona_actual==='anden') return 'â›” Debe ir primero a carros cargados'; return null; }
  },
  reposicionar: {
    label:'ðŸ”€ Reposicionar en playa',origen:'playa',destino:'playa',sla:20,
    info:'Cambiar rampla vacía de slot en la playa de estacionamiento.',
    filtro:function(v){ return v.zona_actual==='playa'&&v.estado!=='salida'; },
    validar:function(v){ if(v.zona_actual!=='playa') return 'â›” Solo ramplas en playa'; return null; }
  },
  otro: {
    label:'ðŸ“‹ Otro movimiento',origen:'gate',destino:'anden',sla:20,
    info:'Movimiento especial. Especifique origen y destino.',
    filtro:function(v){ return v.estado!=='salida'; },
    validar:function(){ return null; }
  }
};

function onTaskTipoChange() {
  var tipo=document.getElementById('task-tipo').value;
  var mov=YMS_MOVIMIENTOS[tipo];
  var infoEl=document.getElementById('task-logica-info');
  var truckSel=document.getElementById('task-truck');
  var hintEl=document.getElementById('task-truck-hint');
  var andWrap=document.getElementById('task-anden-dest-wrap');
  var origenSel=document.getElementById('task-origen');
  var destinoSel=document.getElementById('task-destino');
  var slaEl=document.getElementById('task-sla');
  var infoTruck=document.getElementById('task-truck-info');
  if(!tipo||!mov){if(infoEl)infoEl.style.display='none';if(truckSel)truckSel.innerHTML='<option value="">â€” Primero seleccione el tipo â€”</option>';return;}
  // Verificar disponibilidad específica
  var extraInfo = '';
  if(tipo === 'mover_anden') {
    var andLibres = (STATE.docks || []).filter(function(d){ return d.estado==='free'; });
    if(andLibres.length === 0) {
      extraInfo = '<br><span style="color:var(--c-err);font-weight:bold;">â›” SIN ANDENES DISPONIBLES â€” la rampla irá al Turnomático automáticamente.</span>';
    } else {
      extraInfo = '<br><span style="color:var(--c-ok);">âœ“ ' + andLibres.length + ' andén(es) disponible(s): ' + andLibres.map(function(d){return d.codigo;}).join(', ') + '</span>';
    }
  }
  if(tipo === 'retirar_anden' || tipo === 'anden_a_carros_vacios') {
    var enAnden = (STATE.visits || []).filter(function(v){ return v.zona_actual==='anden'&&v.estado!=='salida'; });
    var docksOcupados = (STATE.docks || []).filter(function(d){ return d.estado==='busy'; });
    if(enAnden.length === 0 && docksOcupados.length === 0) {
      extraInfo = '<br><span style="color:var(--c-err);font-weight:bold;">â›” Sin carros confirmados en andén actualmente.</span>';
    } else {
      var total = enAnden.length || docksOcupados.length;
      extraInfo = '<br><span style="color:var(--c-ok);">âœ“ ' + total + ' carro(s) confirmado(s) en andén disponible(s) para movimiento.</span>';
    }
  }
  if(infoEl){infoEl.style.display='block';infoEl.innerHTML='<strong style="color:var(--c-info);">'+mov.label+'</strong><br>'+mov.info+extraInfo;}
  if(origenSel)origenSel.value=mov.origen;
  if(destinoSel)destinoSel.value=mov.destino;
  if(slaEl)slaEl.value=mov.sla;
  if(andWrap){
    andWrap.style.display=tipo==='mover_anden'?'':'none';
    if(tipo==='mover_anden'){
      var andSel=document.getElementById('task-anden-dest');
      andSel.innerHTML='<option value="">â€” Auto (primer libre) â€”</option>'+
        (STATE.docks || []).filter(function(d){return d.estado==='free';}).map(function(d){
          return '<option value="'+d.id+'">'+d.codigo+' â€” '+d.tipo.toUpperCase()+'</option>';
        }).join('');
    }
  }
  if(truckSel){
    var visitsValidas=(STATE.visits || []).filter(mov.filtro);
    var slotConCamion=(STATE.playaSlots || []).filter(function(s){return s.ocupado&&s.patente;});
    var opts=[];
    if(tipo==='mover_anden'){
      slotConCamion.forEach(function(s){
        var carrier=(STATE.carriers || []).find(function(x){return x.codigo===s.patente;});
        opts.push('<option value="slot:'+s.id+':'+s.patente+'">'+s.patente+' â€” '+(carrier?carrier.nombre.split(' ').slice(-2).join(' '):'â€”')+' (F'+s.fila+'-'+String(s.col).padStart(2,'0')+')</option>');
      });
    }
    visitsValidas.forEach(function(v){
      opts.push('<option value="'+v.id+'">'+v.patente+' â€” '+(v.carrier_nombre||'â€”').split(' ').slice(-2).join(' ')+' ['+((v.zona_actual||'').replace(/_/g,' ').toUpperCase())+']</option>');
    });
    truckSel.innerHTML=(opts.length?'<option value="">â€” Seleccionar rampla â€”</option>':'<option value="">⚠  Sin ramplas válidas para este tipo</option>')+opts.join('');
    if(hintEl)hintEl.textContent='('+opts.length+' disponibles)';
  }
  if(infoTruck)infoTruck.style.display='none';
}

function onTaskTruckChange(){
  var tipo=document.getElementById('task-tipo').value;
  var truckVal=document.getElementById('task-truck').value;
  var infoTruck=document.getElementById('task-truck-info');
  var mov=YMS_MOVIMIENTOS[tipo];
  if(!truckVal||!infoTruck)return;
  var html='';
  if(truckVal.startsWith('slot:')){
    var parts=truckVal.split(':');
    var patente=parts[2]||'';
    var slot=(STATE.playaSlots || []).find(function(s){return s.id===parts[1];});
    var carrier=(STATE.carriers || []).find(function(x){return x.codigo===patente;});
    html='<strong style="color:var(--tx-head);">'+patente+'</strong>'+(carrier?' â€” '+carrier.nombre+' · Ruta: '+(carrier.numero_ruta||'â€”'):'')+(slot?'<br>ðŸ“ F'+slot.fila+'-'+String(slot.col).padStart(2,'0'):'');
  } else {
    var visit=(STATE.visits || []).find(function(v){return v.id===truckVal;});
    if(visit){
      var error=mov?mov.validar(visit):null;
      if(error){html='<span style="color:var(--c-err);">'+error+'</span>';}
      else{
        var carrier2=(STATE.carriers || []).find(function(x){return x.codigo===visit.patente;});
        html='<strong style="color:var(--tx-head);">'+visit.patente+'</strong> â€” '+(visit.carrier_nombre||'â€”')+'<br>ðŸ“ Zona: <strong style="color:var(--c-warn);">'+(visit.zona_actual||'').replace(/_/g,' ').toUpperCase()+'</strong>'+(visit.dock_id?' · Andén: '+((STATE.docks || []).find(function(d){return d.id===visit.dock_id;})?.codigo||'â€”'):'')+(carrier2?' · Ruta: '+(carrier2.numero_ruta||'â€”'):'');
      }
    }
  }
  infoTruck.style.display='block';
  infoTruck.innerHTML=html;
}

function buscarDatosCita(patente){
  if(!patente||patente.length<4)return;
  var carrier=(STATE.carriers || []).find(function(x){return x.codigo===patente.toUpperCase();});
  var infoEl=document.getElementById('nc-carrier-info');
  if(!infoEl)return;
  infoEl.style.display='block';
  if(carrier){
    var enPatio=(STATE.visits || []).find(function(v){return v.patente===patente&&v.tipo==='secundaria'&&v.estado!=='salida';});
    infoEl.style.color=enPatio?'var(--c-warn)':'var(--c-ok)';
    infoEl.innerHTML='ðŸš› '+carrier.nombre+' · Ruta: '+(carrier.numero_ruta||'â€”')+(enPatio?'<br>⚠  SECUNDARIA â€” Las citas son solo para ramplas PRIMARIAS (desde plantas)':'');
  } else {
    infoEl.style.color='var(--tx-muted)';
    infoEl.textContent='Patente no en flota â€” puede ingresarla de todos modos';
  }
}

function validarElegibleDevolucion(patente){
  var pd=STATE.palletDeuda[patente];
  var tieneCarga=pd&&pd.historial&&pd.historial.some(function(h){return h.tipo==='carga';});
  if(!tieneCarga){return{elegible:false,motivo:'El camión '+patente+' no tiene registro de carga en andén. El flujo requerido es: Playa â†’ Andén â†’ Carros cargados'};}
  return{elegible:true,motivo:null};
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SINCRONIZAR SLOTS CON VISITAS â€” refresco tiempo real
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function sincronizarSlotsConVisitas() {
  // Solo sincroniza slots ya ocupados: verifica que la visita sigue activa
  (STATE.playaSlots || []).forEach(function(slot) {
    if (!slot.ocupado || !slot.patente) return;
    const visitaActiva = (STATE.visits || []).find(function(v) {
      return v.patente === slot.patente && v.estado !== 'salida';
    });
    // Si la visita salió o se movió a andén, el slot queda libre
    if (!visitaActiva) {
      slot.ocupado = false; slot.patente = null;
      slot.nombre = null; slot.ruta = null; slot.tipo_v = null;
    }
  });

  // Reflejar visitas activas en playa que no tienen slot asignado
  (STATE.visits || []).filter(function(v) {
    return v.zona_actual === 'playa' && v.estado !== 'salida';
  }).forEach(function(v) {
    const yaEnSlot = (STATE.playaSlots || []).find(function(s) { return s.patente === v.patente && s.ocupado; });
    if (!yaEnSlot) {
      // Buscar slot libre compatible
      const slotLibre = (STATE.playaSlots || []).find(function(s) {
        if (s.ocupado || s.cfg_tipo === 'bloqueado') return false;
        if (s.cfg_tipo === 'dedicado' && s.cfg_patente && s.cfg_patente !== v.patente) return false;
        return true;
      });
      if (slotLibre) {
        const carrier = (STATE.carriers || []).find(function(x) { return x.codigo === v.patente; });
        slotLibre.ocupado = true; slotLibre.patente = v.patente;
        slotLibre.nombre = carrier ? carrier.nombre : null;
        slotLibre.ruta = carrier ? carrier.numero_ruta : null;
        slotLibre.tipo_v = carrier ? carrier.tipo : null;
      }
    }
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  FILTER TAREAS â€” columna Ãºnica
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
var _taskFilter = 'todos';

function flashLiveIndicator() {
  const el = document.getElementById('live-tasks-indicator');
  if (!el) return;
  el.style.borderColor = 'var(--c-accent)';
  el.style.color = 'var(--c-accent)';
  setTimeout(() => {
    el.style.borderColor = 'var(--c-ok)';
    el.style.color = 'var(--c-ok)';
  }, 800);
}

function setTaskFilter(filtro) {
  _taskFilter = filtro;
  // Actualizar botones
  ['todos','pendiente','ejecucion','completada','vencida'].forEach(function(f) {
    var btn = document.getElementById('tf-' + f);
    if (btn) btn.className = (f === filtro) ? 'btn btn-info' : 'btn';
  });
  renderTareasLista();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  RENDER TAREAS LISTA ÃšNICA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderTareasLista() {
  initTareasEventDelegation();
  var container = document.getElementById('tasks-list-single');
  if (!container) return;

  var tareas = (STATE.tasks || []).slice();
  // Aplicar filtro
  if (_taskFilter === 'pendiente') tareas = tareas.filter(function(t){ return ['pendiente','ofertada'].includes(t.estado); });
  else if (_taskFilter === 'ejecucion') tareas = tareas.filter(function(t){ return ['aceptada','en_ejecucion'].includes(t.estado); });
  else if (_taskFilter === 'completada') tareas = tareas.filter(function(t){ return ['completada','cancelada','rechazada'].includes(t.estado); });
  else if (_taskFilter === 'vencida') tareas = tareas.filter(function(t){ return t.estado === 'vencida'; });

  // Ordenar: pendientes y en curso primero, luego por creación
  tareas.sort(function(a, b) {
    var orden = { ofertada:0, pendiente:1, en_ejecucion:2, aceptada:3, vencida:4, completada:5, rechazada:6, cancelada:7 };
    return (orden[a.estado]||9) - (orden[b.estado]||9) || new Date(a.hora_creacion) - new Date(b.hora_creacion);
  });

  var lbl = document.getElementById('tasks-count-lbl');
  if (lbl) lbl.textContent = tareas.length + ' tarea(s)';

  if (!tareas.length) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--tx-dim);">Sin tareas para mostrar</div>';
    return;
  }

  var stColors = {
    pendiente:'var(--tx-muted)', ofertada:'var(--c-warn)',
    aceptada:'var(--c-ok)', en_ejecucion:'var(--c-ok)', checklist_ok:'var(--c-info)',
    completada:'var(--tx-dim)', vencida:'var(--c-err)',
    rechazada:'var(--c-err)', cancelada:'var(--tx-dim)'
  };
  var stBadge = {
    pendiente:'b-dim', ofertada:'b-warn', aceptada:'b-ok',
    en_ejecucion:'b-ok', checklist_ok:'b-info', completada:'b-dim', vencida:'b-err',
    rechazada:'b-err', cancelada:'b-dim'
  };
  var stIcon = { pendiente:'â³', ofertada:'ðŸ“¢', aceptada:'â–¶', en_ejecucion:'ðŸ”§', checklist_ok:'ðŸ“‹', completada:'âœ…', vencida:'⚠ ', rechazada:'âŒ', cancelada:'ðŸš«' };
  var pBorder = { normal:'var(--c-info)', urgente:'var(--c-warn)', critica:'var(--c-err)' };

  container.innerHTML = tareas.map(function(t) {
    var elapsed = Math.round((Date.now() - new Date(t.hora_creacion)) / 60000);
    var pct = Math.min(100, elapsed / (t.sla_minutos||20) * 100);
    var overSLA = elapsed > (t.sla_minutos||20);
    var acciones = getAccionesTareaDesktop(t, STATE.profile?.id, STATE.profile?.rol);
    return '<div class="task-card" style="border-left:4px solid ' + (pBorder[t.prioridad]||'var(--border-md)') + ';margin-bottom:6px;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">' +
        '<span style="font-size: 9px;">' + (stIcon[t.estado]||'ðŸ“‹') + '</span>' +
        '<span style="color:var(--tx-head);font-size: 9px;font-weight:700;flex:1;">' + Utils.esc((t.tipo||'').replace(/_/g,' ').toUpperCase()) + '</span>' +
        '<span class="badge ' + (stBadge[t.estado]||'b-dim') + '" style="font-size:10px;">' + Utils.esc((t.estado||'').toUpperCase()) + '</span>' +
        '<span class="badge badge-' + ({'normal':'info','urgente':'warn','critica':'err'}[t.prioridad]||'dim') + '" style="font-size:9px;">' + Utils.esc((t.prioridad||'').toUpperCase()) + '</span>' +
      '</div>' +
      '<div style="display:flex;align-items:baseline;gap:16px;margin-bottom:6px;flex-wrap:wrap;">' +
        '<span style="font-size: 8px;font-weight:800;color:var(--tx-head);letter-spacing:2px;font-family:var(--font);">ðŸš› ' + escHtml(t.patente||'â€”') + '</span>' +
        '<span style="font-size: 8px;font-weight:600;color:var(--c-accent);">ðŸ“ ' + escHtml((t.zona_origen||'').replace(/_/g,' ').toUpperCase()) + ' â†’ ' + escHtml((t.zona_destino||'').replace(/_/g,' ').toUpperCase()) + '</span>' +
      '</div>' +
      '<div style="font-size: 8px;color:var(--tx-muted);margin-bottom:4px;">' +
        'Creada: ' + elapsed + ' min · SLA: ' + (t.sla_minutos||20) + ' min' +
        (t.operador_nombre ? ' · <strong>' + escHtml(t.operador_nombre) + '</strong>' : ' · Sin asignar') +
        (t.notas ? ' · ' + escHtml(t.notas) : '') +
      '</div>' +
      '<div style="height:4px;background:var(--bg-alt);border-radius:2px;overflow:hidden;margin-bottom:6px;">' +
        '<div style="height:100%;width:' + pct + '%;background:' + (overSLA?'var(--c-err)':pct>75?'var(--c-warn)':'var(--c-ok)') + ';transition:width 0.3s;"></div>' +
      '</div>' +
      acciones +
    '</div>';
  }).join('');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CONFIG SLOTS â€” Administrador
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderConfigSlots() {
  var slots = STATE.playaSlots;
  var filterTipo   = document.getElementById('cs-filter-tipo')?.value || '';
  var filterMotivo = document.getElementById('cs-filter-motivo')?.value || '';

  // KPIs
  var total    = slots.length;
  var libres   = slots.filter(function(s){ return !s.ocupado && s.cfg_tipo !== 'bloqueado'; }).length;
  var ocupados = slots.filter(function(s){ return s.ocupado; }).length;
  var dedicados = slots.filter(function(s){ return s.cfg_tipo === 'dedicado'; }).length;
  var dinamicos = slots.filter(function(s){ return s.cfg_tipo === 'dinamico'; }).length;
  set('cs-total', total); set('cs-libres', libres); set('cs-ocupados', ocupados);
  set('cs-dedicados', dedicados); set('cs-dinamicos', dinamicos);

  // Mapa visual
  var mapaEl = document.getElementById('cs-mapa-slots');
  if (mapaEl) {
    var svgW = 860, svgH = 310;
    var slotW = 62, slotH = 38, gap = 4, startX = 10, startY = 30;
    var cols = 12;
    var svgSlots = '';
    slots.forEach(function(slot, idx) {
      var f = Math.floor(idx/cols), c2 = idx % cols;
      var x = startX + c2*(slotW+gap), y = startY + f*(slotH+gap+2);
      var fill = slot.ocupado ? '#0a1e0a' : slot.cfg_tipo==='bloqueado' ? '#1a0505' : slot.cfg_tipo==='dedicado' ? '#05102a' : 'var(--bg-panel)';
      var stroke = slot.ocupado ? 'var(--c-ok)' : slot.cfg_tipo==='bloqueado' ? 'var(--c-err)' : slot.cfg_tipo==='dedicado' ? '#4080ff' : 'var(--border-md)';
      var sw = (slot.cfg_tipo==='dedicado'||slot.cfg_tipo==='bloqueado') ? 2 : 1;
      var lbl = 'F'+(f+1)+'-'+String(c2+1).padStart(2,'0');
      var sub = slot.ocupado ? slot.patente : (slot.cfg_tipo==='bloqueado'?'BLOQ':slot.cfg_tipo==='dedicado'&&slot.cfg_patente?slot.cfg_patente:'');
      svgSlots += '<g onclick="abrirConfigSlot('+idx+')" style="cursor:pointer;" title="'+lbl+'">';
      svgSlots += '<rect x="'+x+'" y="'+y+'" width="'+slotW+'" height="'+slotH+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" rx="2"/>';
      svgSlots += '<text x="'+(x+slotW/2)+'" y="'+(y+12)+'" font-size="7" fill="var(--tx-muted)" font-family="Consolas" text-anchor="middle">'+lbl+'</text>';
      if (sub) svgSlots += '<text x="'+(x+slotW/2)+'" y="'+(y+26)+'" font-size="8" fill="'+(slot.ocupado?'var(--tx-head)':'#5080d0')+'" font-family="Consolas" text-anchor="middle" font-weight="bold">'+sub+'</text>';
      svgSlots += '</g>';
    });
    mapaEl.innerHTML = '<svg width="'+svgW+'" height="'+svgH+'" style="background:var(--bg-bar);border:1px solid var(--border);display:block;max-width:100%;">'+
      '<text x="10" y="18" font-size="10" fill="var(--tx-muted)" font-family="Consolas">CLICK EN SLOT PARA CONFIGURAR &nbsp; â–  LIBRE &nbsp; â–  OCUPADO &nbsp; ðŸ”’ DEDICADO &nbsp; ⚠— BLOQUEADO</text>'+
      svgSlots+'</svg>';
  }

  // Tabla solo slots con config especial + todos con carrier asignado
  var toTable = slots.filter(function(s) {
    if (filterTipo   && s.cfg_tipo !== filterTipo) return false;
    if (filterMotivo && s.cfg_motivo !== filterMotivo) return false;
    return s.cfg_tipo !== 'dinamico' || s.ocupado; // Mostrar dedicados/bloqueados y ocupados
  });
  set('cs-cfg-count', toTable.length);

  var tbody = document.getElementById('cs-slots-tbl');
  if (!tbody) return;
  var tipoCls = { dedicado:'b-info', bloqueado:'b-err', dinamico:'b-dim' };
  tbody.innerHTML = toTable.map(function(s) {
    var fila = Math.floor((s.num-1)/12)+1, col = ((s.num-1)%12)+1;
    return '<tr>' +
      '<td class="c-bright fw">' + s.id + '</td>' +
      '<td class="c-dim">F' + fila + '-' + String(col).padStart(2,'0') + '</td>' +
      '<td><span class="badge ' + (tipoCls[s.cfg_tipo]||'b-dim') + '">' + (s.cfg_tipo||'dinamico').toUpperCase() + '</span></td>' +
      '<td class="c-dim">' + (s.cfg_motivo||'â€”') + '</td>' +
      '<td class="c-bright">' + (s.cfg_tipo==='dedicado'&&s.cfg_patente ? s.cfg_patente : (s.patente||'â€”')) + '</td>' +
      '<td class="c-dim fz10">' + (s.cfg_permitidas||['todas']).join(', ') + '</td>' +
      '<td><span class="badge ' + (s.ocupado?'b-warn':s.cfg_tipo==='bloqueado'?'b-err':'b-ok') + '">' + (s.ocupado?'OCUPADO':s.cfg_tipo==='bloqueado'?'BLOQ':'LIBRE') + '</span></td>' +
      '<td class="c-dim fz10">' + (s.cfg_notas||'â€”') + '</td>' +
      '<td><button class="btn" style="font-size:9px;padding:1px 5px;" onclick="abrirConfigSlot(' + (s.num-1) + ')">EDITAR</button>' +
        (s.ocupado ? '<button class="btn btn-warn" style="font-size:9px;padding:1px 5px;margin-left:2px;" onclick="liberarSlotIdx(' + (s.num-1) + ')">LIBERAR</button>' : '') +
      '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="9" class="c-dim tc" style="padding:12px;">No hay slots con configuración especial</td></tr>';
}

function abrirConfigSlot(idx) {
  var slot = STATE.playaSlots[idx];
  if (!slot) return;
  document.getElementById('cfg-slot-id').value = idx;
  // Info del slot
  var fila = Math.floor(idx/12)+1, col = (idx%12)+1;
  document.getElementById('cfg-slot-info').innerHTML =
    '<strong>Slot ' + slot.id + '</strong> â€” F' + fila + '-' + String(col).padStart(2,'0') +
    (slot.ocupado ? ' · <span style="color:var(--c-warn);">OCUPADO por ' + slot.patente + '</span>' : ' · <span style="color:var(--c-ok);">LIBRE</span>');
  // Poblar valores actuales
  var tipoSel = document.getElementById('cfg-slot-tipo');
  if (tipoSel) tipoSel.value = slot.cfg_tipo || 'dinamico';
  var motivoSel = document.getElementById('cfg-slot-motivo');
  if (motivoSel) motivoSel.value = slot.cfg_motivo || 'frigorifico';
  var notas = document.getElementById('cfg-slot-notas');
  if (notas) notas.value = slot.cfg_notas || '';
  // Poblar select patente
  var patSel = document.getElementById('cfg-slot-patente');
  if (patSel) {
    patSel.innerHTML = '<option value="">â€” Seleccionar â€”</option>' +
      (STATE.carriers || []).map(function(ca) {
        return '<option value="' + ca.codigo + '" ' + (slot.cfg_patente === ca.codigo ? 'selected' : '') + '>' + ca.codigo + ' â€” ' + ca.nombre + '</option>';
      }).join('');
  }
  // Permitidas
  var permSel = document.getElementById('cfg-slot-permitidas');
  if (permSel && slot.cfg_permitidas) {
    Array.from(permSel.options).forEach(function(o) {
      o.selected = slot.cfg_permitidas.includes(o.value);
    });
  }
  // Botón liberar
  var btnLib = document.getElementById('cfg-slot-liberar-btn');
  if (btnLib) btnLib.style.display = slot.ocupado ? '' : 'none';
  document.getElementById('slot-modal-title').textContent = '⚠™ CONFIGURAR SLOT ' + slot.id;
  document.getElementById('cfg-slot-msg').textContent = '';
  onSlotTipoChange();
  document.getElementById('modal-config-slot').style.display = 'flex';
}

function abrirModalNuevoSlot() {
  // Calcular siguiente fila/col disponibles
  var total = (STATE.playaSlots || []).length;
  var nextFila = Math.floor(total / 12) + 1;
  var nextCol  = (total % 12) + 1;
  document.getElementById('ns-codigo').value = '';
  document.getElementById('ns-fila').value   = nextFila;
  document.getElementById('ns-col').value    = nextCol;
  document.getElementById('ns-tipo').value   = 'dinamico';
  document.getElementById('ns-motivo').value = 'frigorifico';
  document.getElementById('ns-notas').value  = '';
  document.getElementById('ns-msg').textContent = '';
  // Poblar patentes
  var patSel = document.getElementById('ns-patente');
  patSel.innerHTML = '<option value="">â€” Seleccionar â€”</option>' +
    (STATE.carriers || []).map(function(ca){
      return '<option value="' + ca.codigo + '">' + ca.codigo + ' â€” ' + ca.nombre + '</option>';
    }).join('');
  // Reset checkboxes
  document.querySelectorAll('input[name="ns-perm"]').forEach(function(cb){ cb.checked = cb.value === 'todas'; });
  onNsTipoChange();
  document.getElementById('modal-crear-slot').style.display = 'flex';
}

function onNsTipoChange() {
  var tipo = document.getElementById('ns-tipo')?.value;
  var dedPanel = document.getElementById('ns-dedicado-panel');
  var dinPanel = document.getElementById('ns-dinamico-panel');
  if (dedPanel) dedPanel.style.display = tipo === 'dedicado' ? 'block' : 'none';
  if (dinPanel) dinPanel.style.display = tipo !== 'bloqueado' ? 'block' : 'none';
}

function guardarNuevoSlot() {
  var codigo  = (document.getElementById('ns-codigo').value || '').trim().toUpperCase();
  var fila    = parseInt(document.getElementById('ns-fila').value) || 0;
  var col     = parseInt(document.getElementById('ns-col').value)  || 0;
  var tipo    = document.getElementById('ns-tipo').value;
  var motivo  = document.getElementById('ns-motivo').value;
  var notas   = document.getElementById('ns-notas').value.trim();
  var patente = document.getElementById('ns-patente')?.value || null;
  var permitidas = Array.from(document.querySelectorAll('input[name="ns-perm"]:checked')).map(function(cb){ return cb.value; });
  var msgEl   = document.getElementById('ns-msg');

  if (!codigo)        { msgEl.textContent = 'â›” Ingrese un código para el slot'; return; }
  if (fila < 1 || fila > 20) { msgEl.textContent = 'â›” Fila debe estar entre 1 y 20'; return; }
  if (col  < 1 || col  > 20) { msgEl.textContent = 'â›” Columna debe estar entre 1 y 20'; return; }
  if ((STATE.playaSlots || []).find(function(s){ return s.id === ('slot-' + codigo); })) {
    msgEl.textContent = 'â›” Ya existe un slot con ese código'; return;
  }
  if (tipo === 'dedicado' && !patente) { msgEl.textContent = 'â›” Seleccione patente para slot dedicado'; return; }
  if (!permitidas.length) permitidas = ['todas'];

  var num  = (STATE.playaSlots || []).length + 1;
  var newSlot = {
    id: 'slot-' + codigo, num: num, fila: fila, col: col,
    ocupado: false, patente: null, ruta: null, nombre: null, tipo_v: null, estado_v: '',
    cfg_tipo: tipo, cfg_motivo: motivo, cfg_patente: tipo === 'dedicado' ? patente : null,
    cfg_permitidas: permitidas, cfg_notas: notas,
  };
  STATE.playaSlots.push(newSlot);
  Audio.play('ok');
  notify('âœ“ Slot ' + codigo + ' creado â€” F' + fila + '-' + String(col).padStart(2,'0') + ' · ' + tipo.toUpperCase(), 'ok');
  auditLog('config', 'SLOT_CREADO', codigo + ' · F' + fila + '-' + String(col).padStart(2,'0') + ' · ' + tipo + ' · ' + motivo);
  ymsPersistYardConfig();
  closeModal('modal-crear-slot');
  renderConfigSlots();
  renderPatio();
}

function onSlotTipoChange() {
  var tipo = document.getElementById('cfg-slot-tipo')?.value;
  var dedPanel = document.getElementById('cfg-slot-dedicado-panel');
  var dinPanel = document.getElementById('cfg-slot-dinamico-panel');
  if (dedPanel) dedPanel.style.display = tipo === 'dedicado' ? 'block' : 'none';
  if (dinPanel) dinPanel.style.display = tipo !== 'bloqueado' ? 'block' : 'none';
}

function guardarConfigSlot() {
  var idx = parseInt(document.getElementById('cfg-slot-id').value);
  var slot = STATE.playaSlots[idx];
  if (!slot) return;
  var tipo = document.getElementById('cfg-slot-tipo').value;
  var motivo = document.getElementById('cfg-slot-motivo').value;
  var notas = document.getElementById('cfg-slot-notas').value.trim();
  var patente = document.getElementById('cfg-slot-patente')?.value || null;
  var permSel = document.getElementById('cfg-slot-permitidas');
  var permitidas = permSel ? Array.from(permSel.selectedOptions).map(function(o){return o.value;}) : ['todas'];
  if (tipo === 'dedicado' && !patente) {
    document.getElementById('cfg-slot-msg').textContent = 'â›” Seleccione la patente para slot dedicado';
    Audio.play('error'); return;
  }
  slot.cfg_tipo = tipo;
  slot.cfg_motivo = motivo;
  slot.cfg_patente = tipo === 'dedicado' ? patente : null;
  slot.cfg_permitidas = permitidas;
  slot.cfg_notas = notas;
  if (tipo === 'bloqueado') { slot.ocupado = false; slot.patente = null; slot.nombre = null; }
  Audio.play('ok');
  var fila = Math.floor(idx/12)+1, col = (idx%12)+1;
  notify('âœ“ Slot F'+fila+'-'+String(col).padStart(2,'0')+' configurado: '+tipo.toUpperCase()+(patente?' â†’ '+patente:''), 'ok');
  auditLog('config','SLOT_CONFIGURADO','F'+fila+'-'+String(col).padStart(2,'0')+' · Tipo: '+tipo+' · Motivo: '+motivo+(patente?' · Patente: '+patente:''));
  closeModal('modal-config-slot');
  ymsPersistYardConfig();
  renderConfigSlots();
  renderPatio();
}

function liberarSlotConfig() {
  var idx = parseInt(document.getElementById('cfg-slot-id').value);
  liberarSlotIdx(idx);
  closeModal('modal-config-slot');
}

function liberarSlotIdx(idx) {
  var slot = STATE.playaSlots[idx];
  if (!slot) return;
  var pat = slot.patente;
  slot.ocupado = false; slot.patente = null; slot.nombre = null; slot.ruta = null; slot.tipo_v = null;
  Audio.play('warn');
  notify('⚠  Slot '+slot.id+' liberado'+(pat?' ('+pat+')':''), 'warn');
  ymsPersistYardConfig();
  renderConfigSlots();
  renderPatio();
}

function clickSlotAdmin(idx) {
  // Admin: click en slot del patio abre modal de config
  if (STATE.profile?.rol === 'administrador') {
    abrirConfigSlot(idx);
  } else {
    toggleSlot(idx);
  }
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CORRECCIÃ“N FLUJO PATIO: estacionamiento dedicado â†’ andén
//  Regla: solo slots dedicados de secundaria con patente asignada;
//  si no hay andén libre, queda en Turnomático y no se oferta a patio.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function ymsSlotLabel(slot) {
  if (!slot) return 'â€”';
  return 'Est. F' + slot.fila + '-' + String(slot.col).padStart(2,'0') + ' / Slot ' + slot.num;
}

function ymsSlotPatente(slot) {
  if (!slot) return '';
  return String(slot.patente || slot.cfg_patente || '').trim().toUpperCase();
}

function ymsGetMovPatioSlots() {
  return (STATE.playaSlots || []).filter(function(s) {
    if (!s) return false;
    if (s.cfg_tipo !== 'dedicado') return false;
    if (!s.cfg_patente) return false;

    const patenteCfg = String(s.cfg_patente || '').trim().toUpperCase();
    const patenteFisica = String(s.patente || '').trim().toUpperCase();
    if (!patenteCfg) return false;

    // Si el slot está ocupado por otra patente, no es válido para este flujo.
    if (patenteFisica && patenteFisica !== patenteCfg) return false;

    // Si existe visita activa para esa patente, debe ser secundaria.
    // Si no existe visita activa, igual se permite porque el origen operacional es el slot dedicado configurado.
    const visita = (STATE.visits || []).find(function(v) {
      return String(v.patente || '').trim().toUpperCase() === patenteCfg && v.estado !== 'salida';
    });
    if (visita && String(visita.tipo || '').toLowerCase() !== 'secundaria') return false;
    if (visita && visita.zona_actual === 'anden') return false;

    return true;
  });
}

function ymsGetFreeDockForPatio(preferDockId) {
  const libres = (STATE.docks || []).filter(function(d) { return d.estado === 'free'; });
  if (preferDockId) return libres.find(function(d) { return d.id === preferDockId; }) || null;
  return libres[0] || null;
}

function ymsBuildTaskNotes(slot, dock, notas) {
  const base = 'Movimiento patio: ' + ymsSlotLabel(slot) + ' â†’ Andén ' + (dock ? dock.codigo : 'por asignar');
  return [base, notas || ''].filter(Boolean).join(' · ');
}

function ymsQueuePatioMove(patente, slot, prio, visitId, notas) {
  const exists = (STATE.queueTickets || []).find(function(q) {
    return q.estado === 'esperando' && q.tipo_operacion === 'mover_anden' && String(q.patente).toUpperCase() === String(patente).toUpperCase();
  });
  if (exists) return exists;
  const ticket = {
    id: 'q' + Date.now(), patente: patente, visit_id: visitId || null, tipo_operacion: 'mover_anden',
    prioridad: prio === 'critica' ? 10 : prio === 'urgente' ? 7 : 5,
    estado: 'esperando', hora_creacion: new Date().toISOString(),
    notas: 'En espera de andén libre · ' + ymsSlotLabel(slot) + (notas ? ' · ' + notas : '')
  };
  STATE.queueTickets.push(ticket);
  return ticket;
}

async function ymsCrearTareaPatioDesdeSlot(slot, dock, prio, sla, notas, visitId, queueTicket) {
  const patente = ymsSlotPatente(slot);
  const newTask = {
    id: 't' + Date.now(), tipo: 'mover_anden', prioridad: prio || 'normal',
    zona_origen: 'playa', zona_destino: 'anden', patente: patente,
    sla_minutos: sla || 15, estado: 'ofertada', notas: ymsBuildTaskNotes(slot, dock, notas),
    hora_creacion: new Date().toISOString(), operador_nombre: null,
    visit_id: visitId || null, dock_id: dock ? dock.id : null, slot_id: slot.id
  };
  STATE.tasks.unshift(newTask);
  if (slot) {
    slot.ocupado = true;
    slot.patente = patente;
    slot.tipo_v = slot.tipo_v || 'secundaria';
    slot.estado_v = slot.estado_v || 'EN_MOVIMIENTO_ANDEN';
  }
  if (dock) {
    dock.estado = 'busy';
    dock.truck_id = visitId || patente;
    dock.inicio_ocupacion = new Date().toISOString();
  }
  if (queueTicket) {
    queueTicket.estado = 'llamado';
    queueTicket.dock_id = dock ? dock.id : null;
    queueTicket.hora_llamado = new Date().toISOString();
  }
  if (!STATE.usingSeed && sb) {
    const ins = await sb.from('yard_tasks').insert({
      tipo: 'mover_anden', prioridad: prio || 'normal', zona_origen: 'playa', zona_destino: 'anden',
      visit_id: visitId || null, patente: patente, sla_minutos: sla || 15, estado: 'ofertada',
      notas: newTask.notas, creado_por: STATE.user?.id,
    }).select().single();
    if (ins.error) throw ins.error;
    if (ins.data) Object.assign(newTask, ins.data, { dock_id: dock ? dock.id : null, slot_id: slot.id });
    if (dock) await sb.from('docks').update({ estado: 'busy', truck_id: visitId || null, inicio_ocupacion: new Date().toISOString() }).eq('id', dock.id);
    if (queueTicket && String(queueTicket.id).length > 8) {
      await sb.from('queue_tickets').update({ estado:'llamado', dock_id: dock ? dock.id : null, hora_llamado: new Date().toISOString() }).eq('id', queueTicket.id);
    }
  }
  ymsPersistYardConfig();
  return newTask;
}

async function ymsDespacharTurnomaticoPatio(dockLiberado) {
  const dock = dockLiberado && dockLiberado.estado === 'free' ? dockLiberado : ymsGetFreeDockForPatio();
  if (!dock) return false;
  const ticket = (STATE.queueTickets || [])
    .filter(function(q) { return q.estado === 'esperando' && q.tipo_operacion === 'mover_anden'; })
    .sort(function(a,b) { return (b.prioridad-a.prioridad) || (new Date(a.hora_creacion)-new Date(b.hora_creacion)); })[0];
  if (!ticket) return false;
  const slot = ymsGetMovPatioSlots().find(function(s) { return ymsSlotPatente(s) === String(ticket.patente || '').toUpperCase(); });
  if (!slot) {
    ticket.estado = 'cancelado';
    notify('Turnomático cancelado: patente sin estacionamiento dedicado asignado (' + (ticket.patente || 'â€”') + ')', 'warn', 7000);
    return false;
  }
  const visit = (STATE.visits || []).find(function(v){ return v.patente === ticket.patente && v.estado !== 'salida'; });
  const task = await ymsCrearTareaPatioDesdeSlot(slot, dock, 'normal', 15, ticket.notas, ticket.visit_id || visit?.id || null, ticket);
  Audio.play('new_task');
  notify('Andén ' + dock.codigo + ' liberado: movimiento enviado a Patio para ' + ticket.patente, 'ok', 7000);
  if (STATE.profile?.rol === 'operador_patio') setTimeout(function(){ mostrarUberTaskPatio(task); }, 400);
  renderTareas(); renderTurno(); renderAndenes();
  return true;
}



async function crearTarea() {
  const tipo    = document.getElementById('task-tipo').value;
  const prio    = document.getElementById('task-prio').value;
  const truck   = document.getElementById('task-truck').value;
  const origen  = document.getElementById('task-origen').value;
  const destino = document.getElementById('task-destino').value;
  const sla     = parseInt(document.getElementById('task-sla').value) || 20;
  const notas   = document.getElementById('task-notes').value.trim();
  const msgEl = document.getElementById('task-form-msg');
  const setTaskMsg = (txt, color) => {
    if (!msgEl) return;
    msgEl.style.display = 'block';
    msgEl.style.borderColor = color === 'ok' ? 'var(--c-ok)' : color === 'warn' ? 'var(--c-warn)' : 'var(--c-err)';
    msgEl.style.background = color === 'ok' ? 'rgba(48,216,144,0.08)' : color === 'warn' ? 'rgba(248,160,48,0.08)' : 'rgba(240,48,80,0.08)';
    msgEl.style.color = color === 'ok' ? 'var(--c-ok)' : color === 'warn' ? 'var(--c-warn)' : 'var(--c-err)';
    msgEl.innerHTML = txt;
  };
  if (msgEl) { msgEl.style.display = 'none'; msgEl.textContent = ''; }
  if (!tipo) { Audio.play('error'); setTaskMsg('â›” Seleccione el tipo de tarea', 'err'); return; }
  if (origen === destino && tipo !== 'reposicionar') { Audio.play('warn'); setTaskMsg('⚠  La zona de origen y destino no pueden ser iguales', 'warn'); return; }
  if (sla < 1 || sla > 480) { Audio.play('error'); setTaskMsg('â›” El SLA debe estar entre 1 y 480 minutos', 'err'); return; }
  // Validar que se seleccionó rampla para todos los tipos que la requieren
  if (tipo !== 'mover_anden' && tipo !== 'otro' && !truck) {
    Audio.play('error'); setTaskMsg('â›” Debe seleccionar una rampla para este tipo de tarea', 'err'); return;
  }

  const btn = document.getElementById('btn-crear-tarea');
  if (btn) btn.disabled = true;

  try {
    if (tipo === 'mover_anden') {
      if (!truck || !truck.startsWith('slot:')) { Audio.play('error'); setTaskMsg('â›” Seleccione una patente desde un estacionamiento dedicado', 'err'); if(btn)btn.disabled=false; return; }
      const parts = truck.split(':');
      const slot = (STATE.playaSlots || []).find(function(s){ return s.id === parts[1]; });
      const patente = parts[2] || '';
      const patenteSlot = ymsSlotPatente(slot);
      if (!slot || slot.cfg_tipo !== 'dedicado' || !slot.cfg_patente || !patenteSlot || String(patenteSlot).toUpperCase() !== String(patente).toUpperCase()) {
        Audio.play('error'); setTaskMsg('â›” El movimiento exige estacionamiento dedicado con patente secundaria asignada', 'err'); if(btn)btn.disabled=false; return;
      }
      if (slot.patente && String(slot.patente).toUpperCase() !== String(slot.cfg_patente).toUpperCase()) {
        Audio.play('error'); setTaskMsg('â›” El slot tiene una patente ocupante distinta a la patente dedicada', 'err'); if(btn)btn.disabled=false; return;
      }
      const visit = (STATE.visits || []).find(function(v){ return String(v.patente).toUpperCase() === String(patente).toUpperCase() && v.estado !== 'salida'; });
      if (visit && visit.tipo && visit.tipo !== 'secundaria') { Audio.play('error'); setTaskMsg('â›” La patente seleccionada no corresponde a secundaria', 'err'); if(btn)btn.disabled=false; return; }
      // Validar patente duplicada en mover_anden
      const tareaActivaMov = (STATE.tasks || []).find(function(t) {
        return String(t.patente || '').toUpperCase() === patente.toUpperCase() &&
               ['ofertada', 'pendiente', 'aceptada', 'en_ejecucion'].includes(t.estado);
      });
      if (tareaActivaMov) {
        Audio.play('error');
        setTaskMsg('â›” La patente <strong>' + patente + '</strong> ya tiene una tarea activa (' +
          tareaActivaMov.estado.toUpperCase() + ') â€” ' + (tareaActivaMov.tipo||'').replace(/_/g,' ').toUpperCase() + '. Completa esa tarea primero.', 'err');
        if (btn) btn.disabled = false; return;
      }
      const dockPreferido = document.getElementById('task-anden-dest')?.value || '';
      const dock = ymsGetFreeDockForPatio(dockPreferido);
      if (!dock) {
        const ticket = ymsQueuePatioMove(patente, slot, prio, visit?.id || null, notas);
        if (!STATE.usingSeed && sb && !String(ticket.id).startsWith('q')) {
          // reservado para tickets reales ya existentes
        } else if (!STATE.usingSeed && sb) {
          const ins = await sb.from('queue_tickets').insert({
            visit_id: visit?.id || null, patente, tipo_operacion:'mover_anden',
            prioridad: ticket.prioridad, estado:'esperando', notas: ticket.notas,
          }).select().single();
          if (ins.error) throw ins.error;
          Object.assign(ticket, ins.data);
        }
        Audio.play('warn');
        setTaskMsg('⚠  Sin andén disponible. '+patente+' queda en Turnomático; se ofertará a Patio cuando se libere un andén.', 'warn');
        notify('⚠  '+patente+' quedó en Turnomático por falta de andén libre', 'warn', 7000);
        ymsPersistYardConfig();
        renderTurno(); renderTareas();
        setTimeout(function(){ closeModal('modal-task'); if(btn)btn.disabled=false; }, 1500);
        return;
      }
      setTaskMsg('âŒ› Creando movimiento Patio hacia andén '+dock.codigo+'...', 'warn');
      const task = await ymsCrearTareaPatioDesdeSlot(slot, dock, prio, sla, notas, visit?.id || null, null);
      await auditLog('task', 'TAREA_CREADA', 'mover anden â€” ' + patente + ' â€” ' + ymsSlotLabel(slot) + ' â†’ ' + dock.codigo);
      Audio.play('new_task');
      setTaskMsg('âœ… Movimiento enviado a Patio: '+patente+' · '+ymsSlotLabel(slot)+' â†’ Andén '+dock.codigo, 'ok');
      notify('âœ“ Movimiento Patio creado: '+patente+' â†’ Andén '+dock.codigo, 'ok', 6000);
      if (STATE.profile?.rol === 'operador_patio') setTimeout(function(){ mostrarUberTaskPatio(task); }, 400);
      renderTareas(); renderTurno(); renderAndenes(); renderPatio();
      setTimeout(function(){ closeModal('modal-task'); if(btn)btn.disabled=false; }, 1500);
      return;
    }

    // Flujo original para otros tipos de tarea.
    let visitId = null, patente = '';
    if (truck) { const visit = (STATE.visits || []).find(function(v){ return v.id === truck; }); visitId = truck; patente = visit ? visit.patente : ''; }

    // â”€â”€ Validar patente duplicada: no crear tarea si ya tiene una activa â”€â”€
    if (patente) {
      const tareaActiva = (STATE.tasks || []).find(function(t) {
        return String(t.patente || '').toUpperCase() === patente.toUpperCase() &&
               ['ofertada', 'pendiente', 'aceptada', 'en_ejecucion'].includes(t.estado);
      });
      if (tareaActiva) {
        Audio.play('error');
        setTaskMsg('â›” La patente <strong>' + patente + '</strong> ya tiene una tarea activa en estado <strong>' +
          tareaActiva.estado.toUpperCase() + '</strong> â€” tipo: ' + (tareaActiva.tipo||'').replace(/_/g,' ').toUpperCase() +
          '. Completa o cancela esa tarea antes de generar una nueva.', 'err');
        if (btn) btn.disabled = false;
        return;
      }
    }

    setTaskMsg('âŒ› Creando y ofertando tarea...', 'warn');
    const newTask = { id:'t'+Date.now(), tipo, prioridad:prio, zona_origen:origen, zona_destino:destino, patente, sla_minutos:sla, estado:'ofertada', notas, hora_creacion:new Date().toISOString(), operador_nombre:null };

    if (STATE.usingSeed) {
      STATE.tasks.unshift(newTask);
      Audio.play('new_task');
      setTaskMsg('âœ… Tarea creada y ofertada · ' + tipo.replace(/_/g,' ').toUpperCase() + (patente ? ' â€” ' + patente : '') + ' · Prioridad: ' + prio.toUpperCase() + ' · SLA: ' + sla + ' min', 'ok');
      notify('âœ“ Tarea ofertada: ' + tipo.replace(/_/g,' ').toUpperCase() + (patente ? ' â€” ' + patente : ''), 'ok');
      if (STATE.profile?.rol === 'operador_patio') setTimeout(function(){ mostrarUberTaskPatio(newTask); }, 400);
      renderTareas();
      setTimeout(function(){ closeModal('modal-task'); if(btn)btn.disabled=false; }, 1500);
    } else {
      // Usar safeWrite para manejar desconexiones sin perder datos
      await safeWrite(
        async () => {
          const { data, error } = await sb.from('yard_tasks').insert({
            tipo, prioridad:prio, zona_origen:origen, zona_destino:destino,
            visit_id:visitId||null, patente, sla_minutos:sla, estado:'ofertada', notas,
            creado_por:STATE.user?.id
          }).select().single();
          if (error) throw error;
          return data;
        },
        // Optimistic: mostrar tarea inmediatamente
        () => STATE.tasks.unshift(newTask),
        // Rollback: remover tarea si falla
        () => { const idx = STATE.tasks.indexOf(newTask); if (idx !== -1) STATE.tasks.splice(idx, 1); }
      );

      await auditLog('task', 'TAREA_CREADA', tipo.replace(/_/g,' ') + ' â€” ' + (patente||'sin patente') + ' â€” Prio: ' + prio);
      Audio.play('new_task');
      setTaskMsg('âœ… Tarea creada y ofertada · ' + tipo.replace(/_/g,' ').toUpperCase() + (patente ? ' â€” ' + patente : '') + ' · Prioridad: ' + prio.toUpperCase() + ' · SLA: ' + sla + ' min', 'ok');
      notify('âœ“ Tarea ofertada: ' + tipo.replace(/_/g,' ').toUpperCase() + (patente ? ' â€” ' + patente : ''), 'ok');
      if (STATE.profile?.rol === 'operador_patio') setTimeout(function(){ mostrarUberTaskPatio(STATE.tasks[0] || newTask); }, 400);
      renderTareas();
      setTimeout(function(){ closeModal('modal-task'); if(btn)btn.disabled=false; }, 1500);
    }
  } catch(err) {
    Audio.play('error');
    setTaskMsg('â›” Error al crear tarea: ' + (err?.message || 'Error desconocido') + '. Los datos se guardarán cuando se recupere la conexión.', 'err');
    if (btn) btn.disabled = false;
  }
}


Object.assign(window, {
  showView, login, logout, setTheme, toggleSound,
  openIngreso, openSalida, confirmarIngreso, confirmarSalida, setTipoIngreso, buscarRetorno,
  toggleDevolucionSecundaria, autoFillSecPatente, fillSecundariaCarriers,
  moverCarrierCD, abrirAsignacionAnden, confirmarAsignacionAnden,
  renderConfigCD, seleccionarCD, abrirModalNuevoCD, crearNuevoCD, eliminarCD, activarCD,
  solicitarMovimientoCarro,
  abrirModalNuevoAnden, eliminarAndenCD, aplicarConfigEstacionamientos, configurarEstacionamientos,
  initPlayaConCarriers,
  openNewDock, crearAnden, saveAnden, editAnden, deleteAnden, clearDockForm, bloquearAnden, liberarAnden,
  abrirTareaDesdeAnden,
  renderAndenes, selectDock, asignarAndén, asignarAndenDesdeEspera,
  renderPatio, openNewPlaya, toggleSlot, seleccionarTipoSlot, verInfoSlot,
  openNewCarro, saveCarro, removeCarro, renderCarros,
  renderWave, addToWave, moveWave, removeWave, clearWave, saveWave, autoFillWaveConductor, autoFillCarroConductor,
  openNewTask, crearTarea, completarTarea,
  setTaskFilter, renderTareasLista, flashLiveIndicator,
  renderConfigSlots, abrirConfigSlot, abrirModalNuevoSlot, guardarConfigSlot,
  guardarNuevoSlot, onNsTipoChange,
  liberarSlotConfig, liberarSlotIdx, onSlotTipoChange, clickSlotAdmin,
  sincronizarSlotsConVisitas,
  onTaskTipoChange, onTaskTruckChange, buscarDatosCita, validarElegibleDevolucion, cancelarTarea, aceptarTarea, rechazarTarea, aceptarTareaById,
  abrirChecklistTarea, confirmarChecklistTarea, updateChecklist,
  abrirPosturaAnden, confirmarPosturaAnden,
  abrirEdicionTarea, guardarEdicionTarea, eliminarTarea, desasignarTarea,
  abrirCarroCargado, confirmarCarroCargado, registrarRetiroAnden, crearRetiroAndenInmediato,
  abrirPalletCheck, confirmarPalletCheck, agregarItemPallet, calcDiffPallets,
  mostrarUberTaskPatio, utpAceptar, utpCerrar,
  configurarSlot, cargarDatosPrueba, getAccionesTareaDesktop,
  loadTasks, renderTareas,
  refreshQueue, llamarTicket, cancelarTicket, saveSLA,
  openNuevaCita, saveCita, confirmCita, cancelCita, renderCitas,
  abrirDevol, confirmarDevol, aprobarDevolucion, renderDevoluciones,
  initTrazabilidad, loadTrazabilidad,
  loadReports,
  renderTemperatura,
  renderAlertas, resolveAlert, resolveAllAlerts,
  sendChatMsg, deleteChatMsg, limpiarChatUsuario,
  loadAudit,
  showWfForm, saveWorkflow, editWorkflow, deleteWorkflow, clearWfForm,
  // [REMOVED legacy Supabase config] saveConfig, saveSupabaseConfig, testSupabase, copySqlSchema,
  renderConfigSistema, switchCfgTab,
  addCarrier, editCarrier, deleteCarrier, clearCarrierForm,
  addPlanta, deletePlanta,
  createUser, clearUserForm, toggleUser, resetUserPassword, checkRolLink, copyLinkPreview, copyCreatedLink,
  editUserCD, openUserModal, closeUserModal, saveUserFromModal,
  openChangePasswordModal, closeChangePasswordModal, saveChangePassword,
  resetUsersToSeed,
  addMotivo, deleteMotivo,
  closeModal,
  showImportModal, previewImport, confirmImport, handleImportFile,
  toggleMobThemeMenu,
  showCDSelector, selectCD,
  uberAccept, uberReject,
  openNewPlaya,
});

document.addEventListener('DOMContentLoaded', () => {
  // Botón login
  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) btnLogin.addEventListener('click', login);

  // URL params â€” soporte para link de acceso directo con rol
  const urlParams = new URLSearchParams(window.location.search);
  const roleParam = urlParams.get('role') || urlParams.get('rol');

  // Aplicar tema guardado
  const _saved = localStorage.getItem('yms_theme');
  setTheme((_saved && _saved !== 'default') ? _saved : 'light');

  // Aplicar parámetros guardados
  const savedParams = localStorage.getItem('yms_params');
  if (savedParams) {
    try { Object.assign(STATE.params, JSON.parse(savedParams)); } catch(e) {}
  }

  // [REMOVED] Authentication now initialized by app.js via startAuthListener
  // initAuth();
});

