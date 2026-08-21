// Compara el nucleo JS contra la salida exacta de modelo_saturacion.py.
// El nucleo se extrae del MISMO archivo que se inlinea en la pagina, asi que lo
// verificado es literalmente lo que se publica.
import { readFileSync } from 'node:fs';
import { evaluarRed, RED_ABASTECIMIENTO } from './saturacion.core.js';

const py = JSON.parse(readFileSync(new URL('./salidas/saturacion.json', import.meta.url), 'utf-8'));
const entrada = JSON.parse(readFileSync(new URL('./salidas/entrada.json', import.meta.url), 'utf-8'));

const TOL = 1e-12;
const fallas = [];
let n = 0;

const mapa = {
  demandaPropia: 'demanda_propia', demandaAportada: 'demanda_aportada',
  demandaEfectiva: 'demanda_efectiva', factorHub: 'factor_hub',
  demandaDiaKg: 'demanda_dia_kg', dohPoliticaC: 'doh_politica_c',
  dohPoliticaR: 'doh_politica_r', dohPoliticaPonderado: 'doh_politica_ponderado',
  dohFisicoC: 'doh_fisico_c', dohFisicoR: 'doh_fisico_r', dohFisicoTotal: 'doh_fisico_total',
  posReqC: 'pos_req_c', posReqR: 'pos_req_r', posReqTotal: 'pos_req_total',
  posDispC: 'pos_disp_c', posDispR: 'pos_disp_r', posDispTotal: 'pos_disp_total',
  rhoCongelado: 'rho_congelado', rhoRefrigerado: 'rho_refrigerado',
  rhoEstructural: 'rho_estructural', rhoFlex: 'rho_flex',
  shareCongInstalado: 'share_cong_instalado', desbalanceCamara: 'desbalance_camara',
  elasticidadDohC: 'elasticidad_doh_c', elasticidadDohR: 'elasticidad_doh_r',
  derivadaRhoDohC: 'derivada_rho_doh_c', derivadaRhoDohR: 'derivada_rho_doh_r',
  densidadPosM2: 'densidad_pos_m2', m2Total: 'm2_total', m2Uso: 'm2_uso',
  m2Libre: 'm2_libre', m2Operacion: 'm2_operacion',
  personasTotal: 'personas_total', personasPeak: 'personas_peak',
  personasQueCaben: 'personas_que_caben',
  kappaEstructural: 'kappa_estructural', dohCQuiebre: 'doh_c_quiebre',
  dohRQuiebre: 'doh_r_quiebre', dohCQuiebreFlexible: 'doh_c_quiebre_flexible',
  dohPolQuiebreOperacional: 'doh_pol_quiebre_operacional'
};

const cerca = (a, b) => Math.abs(a - b) / Math.max(1, Math.abs(b)) < TOL;

const js = evaluarRed(entrada);
const esperado = new Map(py.resultados.map((r) => [r.sucursal, r]));

n++;
if (!cerca(js.phi, py.mix_congelado)) fallas.push(`phi: JS=${js.phi} PY=${py.mix_congelado}`);
n++;
if (js.resultados.length !== py.resultados.length) {
  fallas.push(`filas: JS=${js.resultados.length} PY=${py.resultados.length}`);
}

for (const r of js.resultados) {
  const e = esperado.get(r.sucursal);
  if (!e) { fallas.push(`${r.sucursal}: ausente en Python`); continue; }

  for (const [kj, kp] of Object.entries(mapa)) {
    n++;
    if (!cerca(r[kj], e[kp])) fallas.push(`${r.sucursal}/${kj}: JS=${r[kj]} PY=${e[kp]}`);
  }
  for (const [kj, kp] of [['estado', 'estado'], ['camaraCritica', 'camara_critica'],
                          ['turnoPeak', 'turno_peak']]) {
    n++;
    if (r[kj] !== e[kp]) fallas.push(`${r.sucursal}/${kj}: JS=${r[kj]} PY=${e[kp]}`);
  }
  for (const [kj, kp] of [['hayEspacioM2', 'hay_espacio_m2'],
                          ['operacionAlcanzable', 'operacion_alcanzable'],
                          ['saturadoEstructural', 'saturado_estructural'],
                          ['saturadoOperacional', 'saturado_operacional'],
                          ['dohCQuiebreFlexibleFactible', 'doh_c_quiebre_flexible_factible']]) {
    n++;
    if (r[kj] !== e[kp]) fallas.push(`${r.sucursal}/${kj}: JS=${r[kj]} PY=${e[kp]}`);
  }
  // rho operacional: debe ser null en ambos, o numericamente igual en ambos.
  n++;
  const a = r.rhoOperacional, b = e.rho_operacional;
  if ((a === null) !== (b === null) || (a !== null && !cerca(a, b))) {
    fallas.push(`${r.sucursal}/rhoOperacional: JS=${a} PY=${b}`);
  }
  for (let i = 0; i < r.turnos.length; i++) {
    n++;
    if (!cerca(r.turnos[i].personas, e.turnos[i].personas) ||
        r.turnos[i].esPeak !== e.turnos[i].es_peak) {
      fallas.push(`${r.sucursal}/turno ${r.turnos[i].turno}`);
    }
  }
}

// La red de abastecimiento declarada debe coincidir entre ambas implementaciones.
n++;
if (JSON.stringify(RED_ABASTECIMIENTO) !== JSON.stringify(py.red_abastecimiento)) {
  fallas.push('red de abastecimiento distinta entre JS y Python');
}

// Con fraccionHub = 0 el hub debe volver a su demanda propia.
const sinHub = evaluarRed(entrada, { fraccionHub: 0 });
for (const r of sinHub.resultados) {
  n++;
  if (!cerca(r.demandaEfectiva, r.demandaPropia)) {
    fallas.push(`${r.sucursal}: fraccionHub=0 no vuelve a la demanda propia`);
  }
}

// Los guardas deben rechazar configuraciones invalidas tambien en JS.
for (const [etiqueta, cfg] of [
  ['turnos que no suman 1', { turnos: [{ nombre: 'a', sigma: 0.5 }, { nombre: 'b', sigma: 0.2 }] }],
  ['m2 por persona nulo', { m2PorPersona: 0 }],
  ['aprovechamiento > 1', { aprovechamiento: 1.5 }],
  ['mix fuera de rango', { mixCongelado: 2 }],
  ['factor de politica nulo', { factorDohC: 0 }],
  ['fraccion hub > 1', { fraccionHub: 2 }]
]) {
  n++;
  let lanzo = false;
  try { evaluarRed(entrada, cfg); } catch { lanzo = true; }
  if (!lanzo) fallas.push(`guarda no rechazo: ${etiqueta}`);
}

if (fallas.length) {
  console.error(`FALLA — ${fallas.length} discrepancias de ${n} comparaciones`);
  fallas.slice(0, 25).forEach((f) => console.error('  ' + f));
  process.exit(1);
}
console.log(`OK — ${n} comparaciones JS vs Python exacto, tolerancia ${TOL}.`);
