// Compara el nucleo JS contra la salida exacta de modelo_estructural.py.
// El nucleo se extrae del MISMO archivo que se inlinea en la pagina, asi que
// lo verificado es literalmente lo que se publica.
import { readFileSync } from 'node:fs';
import { evaluarRed } from './estructural.core.js';

const py = JSON.parse(readFileSync(new URL('./salidas/estructural.json', import.meta.url), 'utf-8'));
const entrada = JSON.parse(readFileSync(new URL('./salidas/entrada.json', import.meta.url), 'utf-8'));

const js = evaluarRed(entrada);
const TOL = 1e-12;
const fallas = [];
let n = 0;

const mapa = {
  rhoCongelado: 'rho_congelado', rhoRefrigerado: 'rho_refrigerado',
  rhoAlmacenRigido: 'rho_almacen_rigido', rhoAlmacenFlexible: 'rho_almacen_flexible',
  rhoDotacion: 'rho_dotacion', rhoEstructural: 'rho_estructural',
  elasticidadDohC: 'elasticidad_doh_c', elasticidadDohR: 'elasticidad_doh_r',
  derivadaRhoDohC: 'derivada_rho_doh_c', derivadaRhoDohR: 'derivada_rho_doh_r',
  derivadaDotacionDohC: 'derivada_dotacion_doh_c',
  dohPoliticaPonderado: 'doh_politica_ponderado', dohFisicoTotal: 'doh_fisico_total',
  dohFisicoC: 'doh_fisico_c', dohFisicoR: 'doh_fisico_r',
  posReqTotal: 'pos_req_total', posDispTotal: 'pos_disp_total',
  m2EnUso: 'm2_en_uso', dotacionRequerida: 'dotacion_requerida',
  dotacionNormaCamara: 'dotacion_norma_camara', brechaDotacion: 'brecha_dotacion',
  kappaEstructural: 'kappa_estructural', dohCQuiebre: 'doh_c_quiebre',
  dohRQuiebre: 'doh_r_quiebre', dohPolQuiebreDotacion: 'doh_pol_quiebre_dotacion',
  desbalanceCamara: 'desbalance_camara', densidadPosM2: 'densidad_pos_m2',
  valorFlexibilidad: 'valor_flexibilidad'
};

const esperado = new Map(py.resultados.map((r) => [r.sucursal, r]));
if (Math.abs(js.phi - py.mix_congelado) > TOL) fallas.push(`phi: JS=${js.phi} PY=${py.mix_congelado}`);
n++;

for (const r of js.resultados) {
  const e = esperado.get(r.sucursal);
  if (!e) { fallas.push(`${r.sucursal}: ausente en Python`); continue; }
  for (const [kj, kp] of Object.entries(mapa)) {
    const err = Math.abs(r[kj] - e[kp]) / Math.max(1, Math.abs(e[kp]));
    n++;
    if (!(err < TOL)) fallas.push(`${r.sucursal}/${kj}: JS=${r[kj]} PY=${e[kp]} err=${err}`);
  }
  n++;
  if (r.cuelloBotella !== e.cuello_botella) {
    fallas.push(`${r.sucursal}/cuello: JS=${r.cuelloBotella} PY=${e.cuello_botella}`);
  }
  for (let i = 0; i < r.turnos.length; i++) {
    n++;
    const err = Math.abs(r.turnos[i].personasRequeridas - e.turnos[i].personas_requeridas);
    if (!(err < TOL)) fallas.push(`${r.sucursal}/turno ${r.turnos[i].turno}`);
  }
}

// Los guardas deben rechazar configuraciones invalidas tambien en JS.
for (const [etiqueta, cfg] of [
  ['turnos que no suman 1', { turnos: [{ nombre: 'a', sigma: 0.5 }, { nombre: 'b', sigma: 0.2 }] }],
  ['m2 por persona nulo', { m2PorPersona: 0 }],
  ['aprovechamiento > 1', { aprovechamiento: 1.5 }],
  ['mix fuera de rango', { mixCongelado: 2 }]
]) {
  n++;
  let lanzo = false;
  try { evaluarRed(entrada, cfg); } catch { lanzo = true; }
  if (!lanzo) fallas.push(`guarda no rechazo: ${etiqueta}`);
}

if (fallas.length) {
  console.error(`FALLA — ${fallas.length} discrepancias de ${n} comparaciones`);
  fallas.slice(0, 20).forEach((f) => console.error('  ' + f));
  process.exit(1);
}
console.log(`OK — ${n} comparaciones JS vs Python exacto, tolerancia ${TOL}.`);
