/* ══════════════════════════════════════════════════════════════════════════
   MODELO CORPORATIVO DE SATURACIÓN DE SUCURSALES — MOTOR MATEMÁTICO
   ──────────────────────────────────────────────────────────────────────────
   Versión matemática: 1.0
   Alcance temporal   : 2026 – 2032
   Ambientes          : Fresco / Congelado
   Días operativos     : Lunes – Sábado (Domingo sólo si la sucursal lo declara)

   PRINCIPIO: UNA SOLA METODOLOGÍA CORPORATIVA.
   La matemática NO cambia entre sucursales. Sólo cambian los PARÁMETROS.

   Este motor MIDE, PROYECTA, EXPLICA y DOCUMENTA la saturación.
   NO recomienda acciones, inversiones, ampliaciones ni cierres.

   Este archivo es JavaScript puro (ESM), sin dependencias ni DOM.
   Corre idéntico en Node (auditoría / tests) y en el navegador (dashboard).
   ══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ── Identidad y versión del modelo (§32 Versionamiento) ─────────────────── */
export const MODELO = Object.freeze({
  nombre: 'MODELO SATURACIÓN CORPORATIVO',
  version: '1.0',
  version_matematica: '1.0',
  ambientes: ['Fresco', 'Congelado'],
  anios: [2026, 2027, 2028, 2029, 2030, 2031, 2032],
});

export const AMBIENTES = MODELO.ambientes;
export const ANIOS = MODELO.anios;

/* Tolerancia matemática para controles de conservación de masa (§40). */
export const TOLERANCIA_REL = 1e-9;

/* Umbrales de exposición por defecto (editables desde parámetros, §22). */
export const UMBRALES_DEFAULT = [85, 95, 100];

/* Etiqueta canónica para datos faltantes (§29). */
export const NO_CALCULABLE = 'NO CALCULABLE — FALTA INFORMACIÓN';

/* Mapeo de día de semana. Se usa getUTCDay(): 0=Domingo … 6=Sábado. */
export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_OPERATIVOS_DEFAULT = [1, 2, 3, 4, 5, 6]; // Lunes … Sábado

/* ══════════════════════════════════════════════════════════════════════════
   1. CALENDARIO REAL
   ══════════════════════════════════════════════════════════════════════════ */

/** Días de un mes concreto (m: 1–12). Maneja años bisiestos vía Date UTC. */
export function diasDelMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Clave de fecha estable YYYY-MM-DD (sin efectos de zona horaria). */
export function claveFecha(anio, mes, dia) {
  const mm = String(mes).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return `${anio}-${mm}-${dd}`;
}

/** Día de semana (0=Dom … 6=Sáb) de una fecha calendario. */
export function diaSemana(anio, mes, dia) {
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

/**
 * Construye el calendario real de un año.
 * @returns array de { key, anio, mes, dia, wd, wdNombre, operativo }
 */
export function construirCalendario(anio, diasOperativos = DIAS_OPERATIVOS_DEFAULT) {
  const setOp = new Set(diasOperativos);
  const out = [];
  for (let mes = 1; mes <= 12; mes++) {
    const nd = diasDelMes(anio, mes);
    for (let dia = 1; dia <= nd; dia++) {
      const wd = diaSemana(anio, mes, dia);
      out.push({
        key: claveFecha(anio, mes, dia),
        anio, mes, dia, wd,
        wdNombre: DIAS_SEMANA[wd],
        operativo: setOp.has(wd),
      });
    }
  }
  return out;
}

/** Calendario continuo multi-año [anioIni … anioFin]. */
export function construirCalendarioHorizonte(anioIni, anioFin, diasOperativos = DIAS_OPERATIVOS_DEFAULT) {
  const out = [];
  for (let y = anioIni; y <= anioFin; y++) out.push(...construirCalendario(y, diasOperativos));
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   2. UTILIDADES ESTADÍSTICAS Y NUMÉRICAS
   ══════════════════════════════════════════════════════════════════════════ */

export function esFinito(x) { return typeof x === 'number' && Number.isFinite(x); }
export function esPositivo(x) { return esFinito(x) && x > 0; }

/** Suma robusta de un arreglo de números. */
export function suma(arr) { let s = 0; for (const v of arr) s += v; return s; }

/**
 * Percentil por interpolación lineal (método "linear"/R-7, igual a numpy).
 * @param valores arreglo de números (no se muta)
 * @param p percentil 0–100
 */
export function percentil(valores, p) {
  if (!valores.length) return NaN;
  const v = [...valores].sort((a, b) => a - b);
  if (v.length === 1) return v[0];
  const rank = (p / 100) * (v.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return v[lo];
  const frac = rank - lo;
  return v[lo] + (v[hi] - v[lo]) * frac;
}

export function maximo(valores) { return valores.length ? Math.max(...valores) : NaN; }

/* ══════════════════════════════════════════════════════════════════════════
   3. RESOLUCIÓN DE PARÁMETROS CON FALLBACK TRAZABLE (§29)
   ──────────────────────────────────────────────────────────────────────────
   Nunca se imputa silenciosamente. Cada resolución registra la granularidad
   efectivamente usada; si no hay valor, se retorna faltante con el nombre de
   la variable ausente.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Resuelve un valor buscando desde la granularidad más específica a la más
 * general dentro de un mapa anidado. `claves` es una lista de intentos, cada
 * uno con { nivel, path }. Retorna { ok, valor, nivel } o { ok:false, falta }.
 */
export function resolverParametro(store, intentos, nombreVar) {
  for (const { nivel, path } of intentos) {
    let cur = store;
    let hit = true;
    for (const k of path) {
      if (cur == null || !(k in cur)) { hit = false; break; }
      cur = cur[k];
    }
    if (hit && esFinito(cur)) return { ok: true, valor: cur, nivel };
  }
  return { ok: false, falta: nombreVar };
}

/* ══════════════════════════════════════════════════════════════════════════
   4. DEMANDA: ANUAL → MENSUAL → DIARIA (§5, §6, §7)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Demanda anual del ambiente. Consume Dann(s,a,y) directo, o Dann(s,y)×Share.
 * @returns { ok, valor } | { ok:false, falta }
 */
export function demandaAnual(demanda, sucId, ambiente, anio) {
  const directa = demanda?.porAmbiente?.[sucId]?.[ambiente]?.[anio];
  if (esFinito(directa)) return { ok: true, valor: directa, fuente: 'directa' };

  const total = demanda?.total?.[sucId]?.[anio];
  const share = demanda?.share?.[sucId]?.[ambiente]?.[anio];
  if (esFinito(total) && esFinito(share)) {
    return { ok: true, valor: total * share, fuente: 'total×share' };
  }
  return { ok: false, falta: `Demanda anual ${ambiente} (${anio})` };
}

/**
 * Normaliza factores de estacionalidad mensual (12 valores) para que sumen 1.
 * La estacionalidad DISTRIBUYE la demanda; nunca crea ni elimina kilos.
 * @param factores objeto { 1:.., 2:.., … 12:.. } o array de 12
 * @returns { ok, norm:{1..12} } | { ok:false, falta }
 */
export function normalizarEstacionalidad(factores) {
  const vals = [];
  for (let m = 1; m <= 12; m++) {
    const f = Array.isArray(factores) ? factores[m - 1] : factores?.[m];
    if (!esFinito(f) || f < 0) return { ok: false, falta: `Factor estacionalidad mes ${m}` };
    vals.push(f);
  }
  const total = suma(vals);
  if (!(total > 0)) return { ok: false, falta: 'Suma de estacionalidad > 0' };
  const norm = {};
  for (let m = 1; m <= 12; m++) norm[m] = vals[m - 1] / total;
  return { ok: true, norm };
}

/**
 * Distribuye demanda mensual entre los días operativos del mes usando pesos
 * semanales relativos, normalizados sobre los días operativos reales del mes.
 *   NW(d) = W(wd(d)) / Σ_{j∈días operativos} W(wd(j))
 *   Dday(d) = Dmonth × NW(d)
 * @param diasMes  subconjunto operativo del calendario del mes (con .wd)
 * @param pesosPorWd  función wd -> peso (>0)
 * @returns { ok, porDia:Map(key->kg) } | { ok:false, falta }
 */
export function distribuirMes(dmonth, diasMes, pesosPorWd) {
  let denom = 0;
  const pesos = [];
  for (const dd of diasMes) {
    const w = pesosPorWd(dd.wd);
    if (!esPositivo(w)) return { ok: false, falta: `Peso semanal ${DIAS_SEMANA[dd.wd]}` };
    pesos.push(w);
    denom += w;
  }
  if (!(denom > 0)) return { ok: false, falta: 'Suma de pesos semanales > 0' };
  const porDia = new Map();
  diasMes.forEach((dd, i) => { porDia.set(dd.key, dmonth * (pesos[i] / denom)); });
  return { ok: true, porDia };
}

/* ══════════════════════════════════════════════════════════════════════════
   5. CAPACIDAD FÍSICA DESDE GEOMETRÍA (§12)
   ──────────────────────────────────────────────────────────────────────────
   CAPkg = M2 × Altura_Util × Factor_Utilizacion × Densidad_Kg_M3
   NO se usan posiciones pallet como capacidad principal.
   ══════════════════════════════════════════════════════════════════════════ */
export function capacidadFisicaKg(geo) {
  const { M2, Altura_Util, Factor_Utilizacion, Densidad_Kg_M3 } = geo || {};
  if (!esPositivo(M2)) return { ok: false, falta: 'M2' };
  if (!esPositivo(Altura_Util)) return { ok: false, falta: 'Altura_Util' };
  if (!(Factor_Utilizacion > 0 && Factor_Utilizacion <= 1))
    return { ok: false, falta: 'Factor_Utilizacion (0 < UF ≤ 1)' };
  if (!esPositivo(Densidad_Kg_M3)) return { ok: false, falta: 'Densidad_Kg_M3' };
  const VG = M2 * Altura_Util;
  const VU = VG * Factor_Utilizacion;
  const CAP = VU * Densidad_Kg_M3;
  return { ok: true, VG, VU, CAP };
}

/* ══════════════════════════════════════════════════════════════════════════
   6. INVENTARIO ESTRUCTURAL — ROLLING FORWARD (§10)
   ──────────────────────────────────────────────────────────────────────────
   n = floor(DOH), r = DOH − n
   Istruct(d) = Σ_{h=0}^{n-1} Dday(d+h) + r × Dday(d+n)
   El paso (d+h) recorre días CALENDARIO u OPERATIVOS según DOH_Base.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * @param seq   arreglo ordenado { key, kg } sobre el que se hace rolling.
 *              - base 'calendario': todos los días (kg=0 en no operativos)
 *              - base 'operativo' : sólo días operativos
 * @param doh   Days On Hand (>0)
 * @returns Map(key -> { istruct, ventanaTruncada })
 */
export function inventarioEstructural(seq, doh) {
  const n = Math.floor(doh);
  const r = doh - n;
  const out = new Map();
  const L = seq.length;
  for (let i = 0; i < L; i++) {
    let acc = 0;
    let truncada = false;
    for (let h = 0; h < n; h++) {
      const idx = i + h;
      if (idx < L) acc += seq[idx].kg; else { truncada = true; }
    }
    if (r > 0) {
      const idx = i + n;
      if (idx < L) acc += r * seq[idx].kg; else { truncada = true; }
    }
    out.set(seq[i].key, { istruct: acc, ventanaTruncada: truncada });
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   7. SATURACIONES POR DÍA (§13–§18)
   ══════════════════════════════════════════════════════════════════════════ */
export function pct(num, den) {
  if (!esFinito(num) || !esPositivo(den)) return NaN;
  return (num / den) * 100;
}

/* ══════════════════════════════════════════════════════════════════════════
   8. AGREGADOS ANUALES POR DIMENSIÓN (§20–§22)
   ──────────────────────────────────────────────────────────────────────────
   Índice ponderado por participación de demanda:
     α(d) = D(d) / Σ D
     Sannual = Σ_d S(d) × α(d)
   Cada dimensión se agrega POR SEPARADO. Nunca se promedian dimensiones (§19).
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Agrega una serie diaria de saturación de un año.
 * @param dias  arreglo de { S, D } (S=saturación %, D=demanda kg del día)
 * @param umbrales lista de umbrales para exposición (§22)
 */
export function agregarAnual(dias, umbrales = UMBRALES_DEFAULT) {
  const validos = dias.filter((x) => esFinito(x.S));
  if (!validos.length) {
    return {
      calculable: false,
      indice: NaN, peak: NaN, p95: NaN, fechaPeak: null,
      exposicionDias: {}, exposicionKg: {}, nDias: 0,
    };
  }
  const totalD = suma(validos.map((x) => x.D));
  let indice = NaN;
  if (totalD > 0) {
    indice = suma(validos.map((x) => x.S * (x.D / totalD)));
  } else {
    // Sin demanda: índice como promedio simple (degenerado) — documentado.
    indice = suma(validos.map((x) => x.S)) / validos.length;
  }
  const sVals = validos.map((x) => x.S);
  const peak = maximo(sVals);
  const p95 = percentil(sVals, 95);
  const idxPeak = validos.reduce((best, x, i, a) => (x.S > a[best].S ? i : best), 0);
  const fechaPeak = validos[idxPeak]?.fecha ?? null;

  const exposicionDias = {};
  const exposicionKg = {};
  for (const T of umbrales) {
    const sobre = validos.filter((x) => x.S >= T);
    exposicionDias[T] = (sobre.length / validos.length) * 100;
    exposicionKg[T] = totalD > 0 ? (suma(sobre.map((x) => x.D)) / totalD) * 100 : 0;
  }
  return {
    calculable: true,
    indice, peak, p95, fechaPeak,
    exposicionDias, exposicionKg, nDias: validos.length,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   9. MOTOR PRINCIPAL — CÁLCULO DE UNA SUCURSAL / AÑO
   ──────────────────────────────────────────────────────────────────────────
   Flujo (§48): datos → demanda anual → estacionalidad → semana → demanda
   diaria → kg/caja → cajas → DOH → inventario estructural → push/onhand →
   inventario observado → capacidad → saturaciones → agregados anuales.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Prepara la serie diaria continua de demanda (todo el horizonte) para un
 * ambiente de una sucursal. Necesaria para el rolling-forward del inventario,
 * que mira hacia adelante más allá del fin de año.
 * @returns { ok, porDia:Map(key->kg), faltantes:[], porAnio:{y->{annual, meses}} }
 */
export function serieDemandaAmbiente(ctx, sucId, ambiente) {
  const { datos, anioIni, anioFin, diasOperativos } = ctx;
  const porDia = new Map();
  const faltantes = [];
  const porAnio = {};

  for (let y = anioIni; y <= anioFin; y++) {
    const dAnn = demandaAnual(datos.demanda, sucId, ambiente, y);
    if (!dAnn.ok) { faltantes.push(dAnn.falta); porAnio[y] = { calculable: false, falta: dAnn.falta }; continue; }

    const facts = datos.estacionalidad?.[sucId]?.[ambiente]?.[y] ?? datos.estacionalidad?.[sucId]?.[ambiente]?.['*'];
    const est = normalizarEstacionalidad(facts);
    if (!est.ok) { faltantes.push(est.falta); porAnio[y] = { calculable: false, falta: est.falta }; continue; }

    const cal = construirCalendario(y, diasOperativos);
    const meses = {};
    let okAnio = true;
    let faltaAnio = null;
    for (let m = 1; m <= 12; m++) {
      const dmonth = dAnn.valor * est.norm[m];
      const diasMes = cal.filter((c) => c.mes === m && c.operativo);
      const pesosSrc =
        datos.semanal?.[sucId]?.[ambiente]?.[y]?.[m] ??
        datos.semanal?.[sucId]?.[ambiente]?.['*']?.[m] ??
        datos.semanal?.[sucId]?.[ambiente]?.['*']?.['*'];
      const dist = distribuirMes(dmonth, diasMes, (wd) => {
        if (Array.isArray(pesosSrc)) return pesosSrc[wd];
        return pesosSrc?.[wd];
      });
      if (!dist.ok) { okAnio = false; faltaAnio = dist.falta; break; }
      for (const [k, v] of dist.porDia) porDia.set(k, v);
      meses[m] = dmonth;
    }
    if (!okAnio) { faltantes.push(faltaAnio); porAnio[y] = { calculable: false, falta: faltaAnio }; continue; }
    porAnio[y] = { calculable: true, annual: dAnn.valor, meses };
  }
  return { ok: faltantes.length === 0, porDia, faltantes, porAnio };
}

/**
 * Calcula TODAS las dimensiones diarias de un ambiente para un año dado.
 * Requiere las series de demanda continuas (para inventario) ya construidas.
 */
export function calcularAmbienteAnio(ctx, suc, ambiente, anio, serieAmb, capInfo, geo) {
  const { datos, diasOperativos, umbrales } = ctx;
  const cal = construirCalendario(anio, diasOperativos);
  const diasOp = cal.filter((c) => c.operativo);

  const dohBase = geo.DOH_Base === 'operativo' ? 'operativo' : 'calendario';
  const doh = geo.DOH;

  // Secuencia para rolling-forward según base DOH, sobre TODO el horizonte.
  const seq = [];
  const calHoriz = construirCalendarioHorizonte(ctx.anioIni, ctx.anioFin, diasOperativos);
  for (const c of calHoriz) {
    if (dohBase === 'operativo' && !c.operativo) continue;
    seq.push({ key: c.key, kg: serieAmb.porDia.get(c.key) ?? 0 });
  }
  const invMap = esPositivo(doh) ? inventarioEstructural(seq, doh) : null;

  const filas = [];
  for (const c of diasOp) {
    const D = serieAmb.porDia.get(c.key) ?? 0;

    // Inventario estructural
    let istruct = NaN, ventanaTruncada = false;
    if (invMap && invMap.has(c.key)) {
      const r = invMap.get(c.key); istruct = r.istruct; ventanaTruncada = r.ventanaTruncada;
    }

    // Push / On Hand → observado (§11)
    const push = datos.push?.[suc.Sucursal_ID]?.[ambiente]?.[c.key] ?? 0;
    const onhand = datos.onhand?.[suc.Sucursal_ID]?.[ambiente]?.[c.key];
    let iobs;
    let usaOnHand = false;
    if (esFinito(onhand)) { iobs = onhand; usaOnHand = true; }
    else { iobs = esFinito(istruct) ? istruct + push : NaN; }

    // Kg/caja → cajas (§8)
    const kpc = resolverKPC(datos, suc.Sucursal_ID, ambiente, anio, c.mes, c.wd);
    const boxes = kpc.ok && esFinito(D) ? D / kpc.valor : NaN;

    // Saturación física (§13)
    const cap = capInfo.CAP;
    const sPhysStruct = pct(istruct, cap);
    const sPhysObs = pct(iobs, cap);

    // Operacional (§16)
    const P = geo.Productividad, H = geo.Horas_Productivas, Nav = geo.Dotacion;
    const hhAvail = esPositivo(Nav) && esPositivo(H) ? Nav * H : NaN;
    const capBoxes = esFinito(hhAvail) && esPositivo(P) ? hhAvail * P : NaN;
    const sOp = pct(boxes, capBoxes);

    // Dotación (§17)
    const nReq = esPositivo(P) && esPositivo(H) && esFinite(boxes) ? boxes / (P * H) : NaN;
    const sStaff = pct(nReq, Nav);

    // Espacio-personas (§18)
    const nMaxSpace = esPositivo(geo.M2_Operable) && esPositivo(geo.M2_Por_Persona)
      ? geo.M2_Operable / geo.M2_Por_Persona : NaN;
    const sPeopleSpace = pct(nReq, nMaxSpace);

    filas.push({
      fecha: c.key, mes: c.mes, dia: c.dia, wd: c.wd, wdNombre: c.wdNombre,
      D, boxes, kpc: kpc.ok ? kpc.valor : NaN, kpcNivel: kpc.nivel,
      doh, dohBase,
      istruct, push, onhand: usaOnHand ? onhand : null, iobs, ventanaTruncada,
      cap,
      sPhysStruct, sPhysObs,
      hhAvail, hhReq: esFinite(nReq) ? nReq * H : NaN, capBoxes, sOp,
      nReq, nDisp: Nav, sStaff,
      nMaxSpace, sPeopleSpace,
      pushImpactKg: (esFinito(iobs) && esFinito(istruct)) ? iobs - istruct : NaN,
    });
  }
  return { filas, doh, dohBase };
}

/** Guardia adicional para NaN en variables intermedias. */
function esFinite(x) { return Number.isFinite(x); }

/** Resuelve KPC con fallback trazable de granularidad (§8, §29). */
export function resolverKPC(datos, sucId, ambiente, anio, mes, wd) {
  const base = datos.kpc?.[sucId]?.[ambiente];
  if (!base) return { ok: false, falta: `Kg/caja ${ambiente}` };
  const intentos = [
    { nivel: 'año/mes/día', v: base?.[anio]?.[mes]?.[wd] },
    { nivel: 'año/mes', v: base?.[anio]?.[mes]?.['*'] },
    { nivel: 'año', v: base?.[anio]?.['*'] },
    { nivel: 'default', v: base?.['*'] },
  ];
  for (const it of intentos) {
    if (esPositivo(it.v)) return { ok: true, valor: it.v, nivel: it.nivel };
  }
  return { ok: false, falta: `Kg/caja ${ambiente} (${anio}-${mes})` };
}

/* ══════════════════════════════════════════════════════════════════════════
   10. RESTRICCIÓN DOMINANTE POR DÍA (§25)
   ══════════════════════════════════════════════════════════════════════════ */
export function restriccionDominante(dimsDia) {
  // dimsDia: { 'Físico Fresco': v, 'Físico Congelado': v, 'Operacional': v, ... }
  let mejor = null;
  for (const [nombre, val] of Object.entries(dimsDia)) {
    if (!esFinito(val)) continue;
    if (mejor === null || val > mejor.valor) mejor = { nombre, valor: val };
  }
  return mejor;
}

/* ══════════════════════════════════════════════════════════════════════════
   11. ORQUESTADOR — RESULTADO COMPLETO DE UNA SUCURSAL
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Contexto de cálculo.
 * @param datos { demanda, estacionalidad, semanal, kpc, push, onhand }
 * @param opts  { anioIni, anioFin, umbrales }
 */
export function crearContexto(datos, opts = {}) {
  return {
    datos,
    anioIni: opts.anioIni ?? ANIOS[0],
    anioFin: opts.anioFin ?? ANIOS[ANIOS.length - 1],
    umbrales: opts.umbrales ?? UMBRALES_DEFAULT,
    diasOperativos: opts.diasOperativos ?? DIAS_OPERATIVOS_DEFAULT,
  };
}

/**
 * Calcula el resultado completo de una sucursal para todos los años.
 * @param suc  registro maestro de la sucursal (con .ambientes)
 * @returns objeto con resultados diarios, mensuales y anuales por dimensión,
 *          faltantes y trazabilidad. Nunca inventa; marca NO CALCULABLE.
 */
export function calcularSucursal(ctx, suc) {
  const diasOperativos = suc.dias_operativos ?? ctx.diasOperativos;
  const ctxSuc = { ...ctx, diasOperativos };
  const ambientesPresentes = AMBIENTES.filter((a) => suc.ambientes?.[a]);
  const faltantesGlobal = [];

  // Capacidad física y series de demanda por ambiente
  const capPorAmb = {};
  const seriePorAmb = {};
  const geoPorAmb = {};
  for (const a of ambientesPresentes) {
    const geo = suc.ambientes[a];
    geoPorAmb[a] = geo;
    const cap = capacidadFisicaKg(geo);
    capPorAmb[a] = cap;
    if (!cap.ok) faltantesGlobal.push(`Capacidad ${a} — ${suc.Sucursal}: falta ${cap.falta}`);
    const serie = serieDemandaAmbiente(ctxSuc, suc.Sucursal_ID, a);
    seriePorAmb[a] = serie;
    for (const f of serie.faltantes) faltantesGlobal.push(`Demanda ${a} — ${suc.Sucursal}: ${f}`);
  }

  const sumCap = suma(ambientesPresentes.map((a) => (capPorAmb[a].ok ? capPorAmb[a].CAP : 0)));

  const resultadoAnios = {};
  for (let y = ctx.anioIni; y <= ctx.anioFin; y++) {
    // Cálculo diario por ambiente
    const diasAmb = {};
    for (const a of ambientesPresentes) {
      if (!capPorAmb[a].ok) { diasAmb[a] = null; continue; }
      const r = calcularAmbienteAnio(ctxSuc, suc, a, y, seriePorAmb[a], capPorAmb[a], geoPorAmb[a]);
      diasAmb[a] = r.filas;
    }

    // Índice físico de sucursal ponderado por capacidad (§14): equivale a
    // Σ inventario / Σ capacidad. Se calcula por día uniendo ambientes.
    const fechasSet = new Set();
    for (const a of ambientesPresentes) (diasAmb[a] || []).forEach((f) => fechasSet.add(f.fecha));
    const fechas = [...fechasSet].sort();

    const branchDaily = []; // { fecha, sBranchStruct, sBranchObs, D, dims }
    const porFechaAmb = {};
    for (const a of ambientesPresentes) {
      porFechaAmb[a] = new Map();
      (diasAmb[a] || []).forEach((f) => porFechaAmb[a].set(f.fecha, f));
    }

    for (const fecha of fechas) {
      let invStruct = 0, invObs = 0, Dtot = 0;
      const dims = {};
      let alguno = false;
      for (const a of ambientesPresentes) {
        const f = porFechaAmb[a].get(fecha);
        if (!f) continue;
        if (esFinite(f.istruct)) invStruct += f.istruct;
        if (esFinite(f.iobs)) invObs += f.iobs;
        if (esFinite(f.D)) Dtot += f.D;
        if (esFinite(f.sPhysStruct)) dims[`Físico ${a}`] = f.sPhysStruct;
        alguno = true;
      }
      if (!alguno) continue;
      branchDaily.push({
        fecha,
        sBranchStruct: pct(invStruct, sumCap),
        sBranchObs: pct(invObs, sumCap),
        D: Dtot,
        dims,
      });
    }

    resultadoAnios[y] = agregarAnio({
      ctx: ctxSuc, suc, anio: y, ambientesPresentes,
      diasAmb, porFechaAmb, branchDaily, capPorAmb, sumCap, geoPorAmb,
    });
  }

  return {
    sucursal: { id: suc.Sucursal_ID, nombre: suc.Sucursal, zona: suc.Zona, region: suc.Region },
    ambientesPresentes,
    capacidad: Object.fromEntries(ambientesPresentes.map((a) => [a, capPorAmb[a]])),
    calidadDato: suc.calidad_dato ?? 'NO DISPONIBLE',
    faltantes: faltantesGlobal,
    anios: resultadoAnios,
    version: MODELO.version,
  };
}

/**
 * Agrega todas las dimensiones a nivel anual para una sucursal/año.
 */
function agregarAnio({ ctx, suc, anio, ambientesPresentes, diasAmb, porFechaAmb, branchDaily, capPorAmb, sumCap, geoPorAmb }) {
  const U = ctx.umbrales;

  // Series por dimensión con su demanda de ponderación asociada.
  const serieBranchStruct = branchDaily.map((b) => ({ S: b.sBranchStruct, D: b.D, fecha: b.fecha }));
  const serieBranchObs = branchDaily.map((b) => ({ S: b.sBranchObs, D: b.D, fecha: b.fecha }));

  const dimAmb = {}; // por ambiente: fisico, operacional, dotacion, espacio
  for (const a of ambientesPresentes) {
    const filas = diasAmb[a] || [];
    dimAmb[a] = {
      fisicoStruct: agregarAnual(filas.map((f) => ({ S: f.sPhysStruct, D: f.D, fecha: f.fecha })), U),
      fisicoObs: agregarAnual(filas.map((f) => ({ S: f.sPhysObs, D: f.D, fecha: f.fecha })), U),
      operacional: agregarAnual(filas.map((f) => ({ S: f.sOp, D: f.boxes, fecha: f.fecha })), U),
      dotacion: agregarAnual(filas.map((f) => ({ S: f.sStaff, D: f.boxes, fecha: f.fecha })), U),
      espacioPersonas: agregarAnual(filas.map((f) => ({ S: f.sPeopleSpace, D: f.boxes, fecha: f.fecha })), U),
    };
  }

  // Operacional/personas a nivel sucursal: se pondera por cajas; se agrega el
  // MÁXIMO entre ambientes por día (restricción más tensionada) para reflejar
  // que la operación de cada cámara es independiente. Se conservan ambos.
  const fechas = branchDaily.map((b) => b.fecha);
  const serieOp = [], serieStaff = [], serieSpace = [];
  for (const fecha of fechas) {
    let opMax = NaN, staffMax = NaN, spaceMax = NaN, boxesTot = 0;
    for (const a of ambientesPresentes) {
      const f = porFechaAmb[a].get(fecha);
      if (!f) continue;
      if (esFinite(f.boxes)) boxesTot += f.boxes;
      if (esFinite(f.sOp)) opMax = Number.isNaN(opMax) ? f.sOp : Math.max(opMax, f.sOp);
      if (esFinite(f.sStaff)) staffMax = Number.isNaN(staffMax) ? f.sStaff : Math.max(staffMax, f.sStaff);
      if (esFinite(f.sPeopleSpace)) spaceMax = Number.isNaN(spaceMax) ? f.sPeopleSpace : Math.max(spaceMax, f.sPeopleSpace);
    }
    serieOp.push({ S: opMax, D: boxesTot, fecha });
    serieStaff.push({ S: staffMax, D: boxesTot, fecha });
    serieSpace.push({ S: spaceMax, D: boxesTot, fecha });
  }

  // Restricción dominante del año: se evalúa día a día y se reporta el máximo.
  let dom = null;
  for (const b of branchDaily) {
    const f0 = porFechaAmb[ambientesPresentes[0]]?.get(b.fecha);
    const dimsDia = { ...b.dims };
    // añadir operacional / dotación / espacio como máximos del día
    const idx = fechas.indexOf(b.fecha);
    if (idx >= 0) {
      if (esFinite(serieOp[idx].S)) dimsDia['Operacional'] = serieOp[idx].S;
      if (esFinite(serieStaff[idx].S)) dimsDia['Dotación'] = serieStaff[idx].S;
      if (esFinite(serieSpace[idx].S)) dimsDia['Espacio-personas'] = serieSpace[idx].S;
    }
    const rd = restriccionDominante(dimsDia);
    if (rd && (dom === null || rd.valor > dom.valor)) dom = { ...rd, fecha: b.fecha };
  }

  // Demanda anual e inventario/holgura
  let kgAnual = 0, cajasAnual = 0, pushAnual = 0;
  for (const a of ambientesPresentes) {
    for (const f of (diasAmb[a] || [])) {
      if (esFinite(f.D)) kgAnual += f.D;
      if (esFinite(f.boxes)) cajasAnual += f.boxes;
      if (esFinite(f.push)) pushAnual += f.push;
    }
  }

  const fisicoStructBranch = agregarAnual(serieBranchStruct, U);
  const fisicoObsBranch = agregarAnual(serieBranchObs, U);

  // Holgura/déficit al peak físico observado de la sucursal
  let gapKg = NaN, gapPct = NaN;
  if (branchDaily.length) {
    const peakDay = branchDaily.reduce((best, b) => (b.sBranchObs > (best?.sBranchObs ?? -Infinity) ? b : best), null);
    if (peakDay) {
      let inv = 0;
      for (const a of ambientesPresentes) {
        const f = porFechaAmb[a].get(peakDay.fecha);
        if (f && esFinite(f.iobs)) inv += f.iobs;
      }
      gapKg = sumCap - inv;
      gapPct = sumCap > 0 ? (gapKg / sumCap) * 100 : NaN;
    }
  }

  const deltaPush = (esFinite(fisicoObsBranch.indice) && esFinite(fisicoStructBranch.indice))
    ? fisicoObsBranch.indice - fisicoStructBranch.indice : NaN;

  return {
    calculable: branchDaily.length > 0,
    kgAnual, cajasAnual, pushAnual,
    doh: Object.fromEntries(ambientesPresentes.map((a) => [a, geoPorAmb[a].DOH])),
    fisicoEstructural: fisicoStructBranch,
    fisicoObservado: fisicoObsBranch,
    deltaPushPP: deltaPush,
    operacional: agregarAnual(serieOp, U),
    dotacion: agregarAnual(serieStaff, U),
    espacioPersonas: agregarAnual(serieSpace, U),
    ambientes: dimAmb,
    restriccionDominante: dom,
    holguraKg: gapKg, holguraPct: gapPct,
    _branchDaily: branchDaily,
    _diasAmb: diasAmb,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   12. SALIDA OFICIAL / JSON PARA OTRO MODELO (§44, §45)
   ══════════════════════════════════════════════════════════════════════════ */
export function salidaJSON(resultadoSuc, anio) {
  const r = resultadoSuc.anios[anio];
  if (!r || !r.calculable) {
    return {
      sucursal: resultadoSuc.sucursal.nombre, anio,
      estado: NO_CALCULABLE,
      faltantes: resultadoSuc.faltantes,
      version: MODELO.version,
    };
  }
  const round = (x, d = 2) => (esFinito(x) ? Number(x.toFixed(d)) : null);
  const fresco = r.ambientes.Fresco?.fisicoObs;
  const cong = r.ambientes.Congelado?.fisicoObs;
  return {
    sucursal: resultadoSuc.sucursal.nombre,
    anio,
    fisico_estructural: round(r.fisicoEstructural.indice),
    fisico_observado: round(r.fisicoObservado.indice),
    fresco: round(fresco?.indice),
    congelado: round(cong?.indice),
    operacional: round(r.operacional.indice),
    dotacion: round(r.dotacion.indice),
    espacio_personas: round(r.espacioPersonas.indice),
    peak: round(r.fisicoObservado.peak),
    fecha_peak: r.fisicoObservado.fechaPeak,
    p95: round(r.fisicoObservado.p95),
    exposicion_95_dias: round(r.fisicoObservado.exposicionDias[95]),
    exposicion_95_volumen: round(r.fisicoObservado.exposicionKg[95]),
    holgura_kg: round(r.holguraKg, 0),
    push_kg: round(r.pushAnual, 0),
    restriccion_dominante: r.restriccionDominante ? `${r.restriccionDominante.nombre} (${round(r.restriccionDominante.valor)}%)` : '',
    calidad_dato: resultadoSuc.calidadDato,
    version: MODELO.version,
  };
}
