/* ══════════════════════════════════════════════════════════════════════════
   Compila el dashboard modular en UN archivo HTML autónomo (sin servidor).
   Inlina engine.js + data.js + tests.js + el script del dashboard en un único
   <script> clásico, para que el archivo funcione con doble clic (file://).
   Uso: node saturacion/build-single.mjs
   ══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(DIR, f), 'utf8');

const stripExports = (s) => s.replace(/^export\s+/gm, '');
const stripImports = (s) => s.replace(/import[\s\S]*?from\s*['"][^'"]*['"];?\s*/g, '');

// 1) Núcleo matemático (fuente única de verdad; la matemática no se toca)
let engine = stripExports(read('engine.js'));
let data = stripImports(read('data.js'));
data = stripExports(data)
  // ANIOS ya está declarado por engine (idéntico); evitar redeclaración
  .replace(/const ANIOS = \[2026[^\]]*\];\n/, '');
let tests = stripExports(stripImports(read('tests.js')));

const core = [engine, data, tests].join('\n\n/* ─────────────────────────────────────── */\n\n');

// 2) HTML + script del dashboard
const html = read('index.html');
const openTag = '<script type="module">';
const i = html.indexOf(openTag);
if (i < 0) throw new Error('No se encontró el <script type="module"> del dashboard');
const before = html.slice(0, i);
const rest = html.slice(i + openTag.length);
const close = rest.indexOf('</script>');
const dashboard = stripImports(rest.slice(0, close));
const after = rest.slice(close + '</script>'.length);

// 3) Ensamblar archivo único
const out = `${before}<script>
/* ══ MODELO CORPORATIVO DE SATURACIÓN — build autónomo de un solo archivo ══
   Generado por build-single.mjs a partir de engine.js + data.js + tests.js.
   No editar a mano: modificar los módulos fuente y recompilar.               */
${core}

/* ═══════════════ DASHBOARD ═══════════════ */
${dashboard}</script>${after}`;

writeFileSync(join(DIR, 'saturacion-agrosuper.html'), out, 'utf8');
console.log('OK → saturacion/saturacion-agrosuper.html (' + (out.length / 1024).toFixed(0) + ' KB)');
