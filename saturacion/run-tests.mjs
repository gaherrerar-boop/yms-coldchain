/* Runner de tests en Node — auditoría de la matemática del modelo.
   Uso: node saturacion/run-tests.mjs                                        */
import { correrTests } from './tests.js';

const { pasaron, total, resultados, version } = correrTests();
console.log(`\nMODELO SATURACIÓN CORPORATIVO — Tests de aceptación (v${version})\n`);
for (const r of resultados) {
  const marca = r.pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  [${marca}] ${r.nombre}`);
  console.log(`         → ${r.detalle}`);
}
console.log(`\nResultado: ${pasaron}/${total} tests OK\n`);
process.exit(pasaron === total ? 0 : 1);
