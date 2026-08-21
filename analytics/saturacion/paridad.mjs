// Verifica que el puerto JS (src/services/saturationService.js) reproduce los
// numeros del modelo de referencia en Python. Lee salidas/resumen.json, evalua
// las mismas sucursales en JS y compara metrica por metrica.
//
//   node analytics/saturacion/paridad.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  PARAMETROS_DEFECTO, ESCENARIOS, evaluarRed, palancaDensificacion
} from '../../src/services/saturationService.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const resumen = JSON.parse(readFileSync(join(AQUI, 'salidas', 'resumen.json'), 'utf-8'));
const libro = JSON.parse(readFileSync(join(AQUI, 'salidas', 'entrada.json'), 'utf-8'));

const TOLERANCIA = 1e-9;
const METRICAS = [
  'mixCongelado', 'rhoCongelado', 'rhoRefrigerado', 'rhoAlmacenRigido',
  'rhoAlmacenFlexible', 'rhoManoObra', 'rhoBinding', 'rhoCompuesto',
  'factorPolitica', 'factorOperacion', 'desbalanceCamara', 'holguraCrecimiento',
  'dohPoliticaPonderado', 'dohFisicoDisponible', 'valorFlexibilidad'
];
// resumen.json usa snake_case; el servicio JS camelCase.
const aSnake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

let comparaciones = 0;
const fallas = [];

for (const [nombreEsc, escenario] of Object.entries(ESCENARIOS)) {
  const red = evaluarRed(libro, PARAMETROS_DEFECTO, escenario);
  const esperados = new Map(resumen.resultados[nombreEsc].map((r) => [r.sucursal, r]));

  if (red.resultados.length !== esperados.size) {
    fallas.push(`${nombreEsc}: JS evaluo ${red.resultados.length}, Python ${esperados.size}`);
  }

  for (const obtenido of red.resultados) {
    const esperado = esperados.get(obtenido.sucursal);
    if (!esperado) {
      fallas.push(`${nombreEsc}/${obtenido.sucursal}: no esta en la salida de Python`);
      continue;
    }
    for (const m of METRICAS) {
      const a = obtenido[m];
      const b = esperado[aSnake(m)];
      const err = Math.abs(a - b) / Math.max(1, Math.abs(b));
      comparaciones++;
      if (!(err < TOLERANCIA)) {
        fallas.push(`${nombreEsc}/${obtenido.sucursal}/${m}: JS=${a} Python=${b} err=${err}`);
      }
    }
    if (obtenido.cuelloBotella !== esperado.cuello_botella) {
      fallas.push(`${nombreEsc}/${obtenido.sucursal}/cuello: ` +
                  `JS=${obtenido.cuelloBotella} Python=${esperado.cuello_botella}`);
    }
    if (obtenido.clase !== esperado.clase) {
      fallas.push(`${nombreEsc}/${obtenido.sucursal}/clase: ` +
                  `JS=${obtenido.clase} Python=${esperado.clase}`);
    }
    comparaciones += 2;
  }
}

// El mix deducido es el supuesto que mas mueve el resultado: se verifica aparte.
const { mixDeducido } = evaluarRed(libro, PARAMETROS_DEFECTO, ESCENARIOS.P1_operativo).calibracion;
const errMix = Math.abs(mixDeducido - resumen.calibracion.mix_deducido);
if (!(errMix < TOLERANCIA)) fallas.push(`mix deducido: JS=${mixDeducido} Python=${resumen.calibracion.mix_deducido}`);

// Palanca de densificacion
const densJs = palancaDensificacion(libro, 75);
for (const fila of densJs) {
  const esperado = resumen.densificacion.find((d) => d.sucursal === fila.sucursal);
  if (!esperado) continue;
  const err = Math.abs(fila.posicionesRecuperables - esperado.posiciones_recuperables);
  comparaciones++;
  if (!(err < 1e-6)) {
    fallas.push(`densificacion/${fila.sucursal}: JS=${fila.posicionesRecuperables} ` +
                `Python=${esperado.posiciones_recuperables}`);
  }
}

if (fallas.length) {
  console.error(`FALLA — ${fallas.length} discrepancias de ${comparaciones} comparaciones:`);
  for (const f of fallas.slice(0, 25)) console.error('  ' + f);
  process.exit(1);
}
console.log(`OK — ${comparaciones} comparaciones sin discrepancias (tolerancia ${TOLERANCIA}).`);
console.log(`     ${Object.keys(ESCENARIOS).length} escenarios x ` +
            `${resumen.sucursales_evaluadas} sucursales, mas mix deducido y densificacion.`);
