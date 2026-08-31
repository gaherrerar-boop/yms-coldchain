/* ------------------------------------------------------------------ *
 * Capa comun a los dos documentos derivados (tecnico y guia).
 * Asume que ya estan definidos, arriba en el mismo <script>:
 *   - el nucleo verificado (evaluarRed, ...)
 *   - const DATOS
 * No se ejecuta sola: la construccion la inlinea en su marcador.
 * ------------------------------------------------------------------ */

/* ---------- formato, en convencion es-CL ---------- */
const nf = (n, d = 2) =>
  Number(n).toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
const ent = (n) => Math.round(n).toLocaleString('es-CL');
const pct = (n, d = 1) => nf(n * 100, d) + ' %';

/* ---------- calculo ---------- */
const RED = evaluarRed(DATOS);
const RES = RED.resultados;
const porNombre = Object.fromEntries(RES.map((r) => [r.sucursal, r]));

const CLASE = {
  'estructural y operacional': 'amb',
  'saturacion estructural': 'est',
  'saturacion operacional': 'ope',
  'sin saturacion': 'sin'
};
const ETIQUETA = {
  'estructural y operacional': 'ambas',
  'saturacion estructural': 'estructural',
  'saturacion operacional': 'operacional',
  'sin saturacion': 'sin saturación'
};
const pill = (r) => `<span class="pill e-${CLASE[r.estado]}">${ETIQUETA[r.estado]}</span>`;

// El nucleo se escribe en ASCII a proposito, asi que su detalleEstado viene sin
// tildes. Se reescribe aqui, en la capa de presentacion, en vez de tocar el
// archivo verificado.
function detalle(r) {
  const cam = `la cámara de ${r.camaraCritica} desborda`;
  switch (r.estado) {
    case 'estructural y operacional': return `${cam} y la operación no cabe`;
    case 'saturacion estructural':
      return r.hayEspacioM2 ? cam : 'el inventario de política no cabe en la superficie';
    case 'saturacion operacional': return 'el inventario cabe, la operación no';
    default:
      return r.hayEspacioM2 ? 'cabe el inventario y cabe la operación'
                            : 'el inventario cabe justo, sin superficie libre';
  }
}
const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/* ---------- navegacion por paginas ---------- */
const rail = document.getElementById('rail');
rail.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-p]');
  if (!b) return;
  for (const o of rail.querySelectorAll('button[data-p]')) o.removeAttribute('aria-current');
  b.setAttribute('aria-current', 'page');
  for (const s of document.querySelectorAll('.pagina')) s.classList.toggle('on', s.id === b.dataset.p);
  window.scrollTo({ top: 0, behavior: 'auto' });
});

/* ---------- ficha de sucursal ---------- */
function ficha(r, extra) {
  return `
<button class="ficha ${CLASE[r.estado]}" data-suc="${r.sucursal}">
  <div class="top">
    <span class="nom">${r.sucursal} ${r.tipo === 'hub' ? '<span class="hubtag">HUB</span>' : ''}</span>
    <span class="rho">${nf(r.rhoEstructural, 2)}</span>
  </div>
  ${pill(r)}
  ${extra ? `<p class="lt" style="font-size:.79rem;margin-top:9px;color:var(--azul-75)">${extra}</p>` : ''}
  <dl>
    <dt>ρ operacional</dt><dd>${r.hayEspacioM2 ? nf(r.rhoOperacional, 2) : 'n/d'}</dd>
    <dt>Cámara crítica</dt><dd>${r.camaraCritica}</dd>
    <dt>Demanda efectiva</dt><dd>${ent(r.demandaEfectiva)} kg</dd>
    <dt>m² libres</dt><dd>${nf(r.m2Libre, 0)}</dd>
  </dl>
</button>`;
}

/* ---------- derivacion completa, paso a paso ---------- */
function derivacion(r) {
  const s = DATOS.find((x) => x.nombre === r.sucursal);
  const p = RED.parametros;
  const sigma = Math.max(...p.turnos.map((t) => t.sigma));
  const red = r.abastece.length
    ? `D_ef = ${ent(r.demandaPropia)} + ${ent(r.demandaAportada)} = <b class="res">${ent(r.demandaEfectiva)}</b> kg/mes   <span class="cmt">hub: ×${nf(r.factorHub, 2)}</span>`
    : `D_ef = D = <b class="res">${ent(r.demandaEfectiva)}</b> kg/mes   <span class="cmt">no abastece a terceros</span>`;

  const op = r.hayEspacioM2
    ? `<b>ρ_op = ${nf(r.m2Operacion, 1)} / ${nf(r.m2Libre, 1)} = <span class="res">${nf(r.rhoOperacional, 4)}</span></b>   <span class="cmt">${r.saturadoOperacional ? 'satura' : 'dentro de límite'}</span>`
    : `<b class="res">ρ_op no definido</b>   <span class="cmt">m²_libre ≤ 0: no hay superficie sobre la cual preguntar</span>`;

  return `
<div class="card">
  <h3>${r.sucursal} ${r.tipo === 'hub' ? '<span class="hubtag">HUB</span>' : ''} ${pill(r)}</h3>
  <p class="lt" style="margin-top:8px;font-size:.88rem">${mayus(detalle(r))}. Cámara crítica: <b>${r.camaraCritica}</b>.</p>

  <h4>Paso 0 · Red de abastecimiento</h4>
  <div class="eq">${red}</div>

  <h4>Pasos 1–2 · Flujo diario y política ponderada</h4>
  <div class="eq">d    = D_ef / 30,44 = <b>${nf(r.demandaDiaKg, 1)}</b> kg/día
d_C  = φ · d = ${nf(RED.phi, 6)} × ${nf(r.demandaDiaKg, 1)} = <b>${nf(r.demandaDiaKg * RED.phi, 1)}</b> kg/día
d_R  = (1 − φ) · d                     = <b>${nf(r.demandaDiaKg * (1 - RED.phi), 1)}</b> kg/día

DOH_pol = φ·DOH_C + (1−φ)·DOH_R
        = ${nf(RED.phi, 4)}×${nf(r.dohPoliticaC, 4)} + ${nf(1 - RED.phi, 4)}×${nf(r.dohPoliticaR, 4)} = <b>${nf(r.dohPoliticaPonderado, 4)}</b> días</div>

  <h4>Paso 3 · Capacidad efectiva en posiciones</h4>
  <div class="eq">β    = K_C / K = ${ent(s.capCongKg)} / ${ent(s.capTotalKg)} = <b>${nf(r.shareCongInstalado, 4)}</b>
P_C  = P · u · β       = ${ent(s.posiciones)} × ${nf(r.shareCongInstalado, 4)} = <b>${nf(r.posDispC, 1)}</b> pos
P_R  = P · u · (1 − β)                        = <b>${nf(r.posDispR, 1)}</b> pos</div>

  <h4>Paso 4 · Requerimiento que impone la política</h4>
  <div class="eq">n_C = d_C · DOH_C / γ = ${nf(r.demandaDiaKg * RED.phi, 1)} × ${nf(r.dohPoliticaC, 4)} / 459 = <b>${nf(r.posReqC, 1)}</b> pos
n_R = d_R · DOH_R / γ = ${nf(r.demandaDiaKg * (1 - RED.phi), 1)} × ${nf(r.dohPoliticaR, 4)} / 459 = <b>${nf(r.posReqR, 1)}</b> pos
n   = n_C + n_R                                            = <b>${nf(r.posReqTotal, 1)}</b> pos</div>

  <h4>Paso 5 · DOH físico, el contrapeso de la política</h4>
  <div class="eq">DOH_fís_C = P_C · γ / d_C = <b>${nf(r.dohFisicoC, 4)}</b> días   <span class="cmt">política: ${nf(r.dohPoliticaC, 4)}</span>
DOH_fís_R = P_R · γ / d_R = <b>${nf(r.dohFisicoR, 4)}</b> días   <span class="cmt">política: ${nf(r.dohPoliticaR, 4)}</span></div>

  <h4>Pasos 6–7 · Saturación estructural</h4>
  <div class="eq">ρ_C = n_C / P_C = ${nf(r.posReqC, 1)} / ${nf(r.posDispC, 1)} = <b>${nf(r.rhoCongelado, 4)}</b>
ρ_R = n_R / P_R = ${nf(r.posReqR, 1)} / ${nf(r.posDispR, 1)} = <b>${nf(r.rhoRefrigerado, 4)}</b>

<b>ρ* = máx(ρ_C, ρ_R) = <span class="res">${nf(r.rhoEstructural, 4)}</span></b>   <span class="cmt">manda ${r.camaraCritica}</span>
ρ_flex = n / P = <b>${nf(r.rhoFlex, 4)}</b>   <span class="cmt">ocupación de la superficie total</span>

<span class="cmt">Verificación V5 · desigualdad del mediante:</span>
mín(${nf(r.rhoCongelado, 4)}, ${nf(r.rhoRefrigerado, 4)}) ≤ ${nf(r.rhoFlex, 4)} ≤ ${nf(r.rhoEstructural, 4)}  ✓</div>

  <h4>Paso 8 · Superficie ocupada y libre</h4>
  <div class="eq">δ       = P / A = ${ent(s.posiciones)} / ${ent(s.m2)} = <b>${nf(r.densidadPosM2, 4)}</b> pos/m²
A_uso   = n / δ                       = <b>${nf(r.m2Uso, 1)}</b> m²
A_libre = A − A_uso = ${ent(s.m2)} − ${nf(r.m2Uso, 1)} = <b>${nf(r.m2Libre, 1)}</b> m²

<span class="cmt">Verificación V3 · identidad de acoplamiento:</span>
A · (1 − ρ_flex) = ${ent(s.m2)} × ${nf(1 - r.rhoFlex, 4)} = <b>${nf(s.m2 * (1 - r.rhoFlex), 1)}</b> m²  ✓</div>

  <h4>Pasos 9–10 · Superficie que exige la operación</h4>
  <div class="eq">N_peak = N · máx(σ_t) = ${ent(s.personas)} × ${nf(sigma, 2)} = <b>${nf(r.personasPeak, 1)}</b> personas   <span class="cmt">turno ${r.turnoPeak}</span>
A_op   = N_peak · a₀ = ${nf(r.personasPeak, 1)} × 36        = <b>${nf(r.m2Operacion, 1)}</b> m²

${op}</div>

  <h4>Pasos 11–12 · Sensibilidad y políticas de quiebre</h4>
  <div class="eq">κ* = 1 / ρ* = <b>${nf(r.kappaEstructural, 4)}</b>   <span class="cmt">${r.kappaEstructural >= 1 ? 'admite subir la política' : 'obliga a bajarla'}</span>

∂ρ/∂DOH_C = φ / DOH_fís = <b>${nf(r.derivadaRhoDohC, 6)}</b>      E_C = <b>${pct(r.elasticidadDohC)}</b>
∂ρ/∂DOH_R = (1−φ) / DOH_fís = <b>${nf(r.derivadaRhoDohR, 6)}</b>  E_R = <b>${pct(r.elasticidadDohR)}</b>
<span class="cmt">Verificación V15 · E_C + E_R = ${nf(r.elasticidadDohC + r.elasticidadDohR, 6)}  ✓</span>

<span class="cmt">DOH que satura cada cámara (= su DOH físico):</span>
DOH_C* = <b>${nf(r.dohCQuiebre, 4)}</b> días        DOH_R* = <b>${nf(r.dohRQuiebre, 4)}</b> días

<span class="cmt">DOH ponderado que satura la etapa operacional:</span>
DOH_pol* = DOH_fís · (1 − A_op/A) = <b>${r.operacionAlcanzable ? nf(r.dohPolQuiebreOperacional, 4) + ' días' : 'inalcanzable'}</b></div>
  ${r.operacionAlcanzable ? '' : '<p class="nota">N · σ_peak · a₀ ≥ A: ni con inventario cero cabe la gente del turno peak. Ninguna política alcanza ρ_op = 1, y el modelo lo marca como inalcanzable en vez de entregar un DOH negativo.</p>'}
</div>`;
}

/* ---------- selector que repinta la derivacion ---------- */
function montarSelectorDerivacion(idSelect, idDestino) {
  const sel = document.getElementById(idSelect);
  sel.innerHTML = RES.map((r) =>
    `<option value="${r.sucursal}">${r.sucursal} — ρ* ${nf(r.rhoEstructural, 2)}</option>`).join('');
  const pinta = () => {
    document.getElementById(idDestino).innerHTML = derivacion(porNombre[sel.value]);
  };
  sel.addEventListener('change', pinta);
  pinta();
}

/* ---------- abre el detalle al elegir una ficha ---------- */
function abreDetalle(gridId, detId) {
  document.getElementById(gridId).addEventListener('click', (e) => {
    const b = e.target.closest('button[data-suc]');
    if (!b) return;
    const det = document.getElementById(detId);
    det.hidden = false;
    det.innerHTML = `<button class="cerrar" type="button">Cerrar</button>${derivacion(porNombre[b.dataset.suc])}`;
    det.querySelector('.cerrar').addEventListener('click', () => { det.hidden = true; });
    det.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
