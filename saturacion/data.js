/* ══════════════════════════════════════════════════════════════════════════
   DATOS MAESTROS DE EJEMPLO — 21 SUCURSALES  (§28 Información mínima de entrada)
   ──────────────────────────────────────────────────────────────────────────
   ⚠ ADVERTENCIA IMPORTANTE (§29 Regla de datos faltantes):
     TODOS los valores de este archivo son SINTÉTICOS / DE EJEMPLO, generados
     de forma DETERMINÍSTICA para demostrar y auditar la herramienta.
     NO representan mediciones reales. La calidad de dato está marcada como
     'EJEMPLO'. Para uso corporativo oficial, REEMPLAZAR íntegramente por la
     fuente oficial (demanda, geometría, DOH, densidades, productividad, etc.).

   El motor (engine.js) NUNCA inventa valores: si falta un parámetro crítico
   retorna "NO CALCULABLE — FALTA INFORMACIÓN". Aquí sólo se proveen PARÁMETROS.

   Esquema de tablas (§28):
     - maestro de sucursales  (geometría + operación por ambiente)
     - demanda anual          (kg por sucursal / ambiente / año)
     - estacionalidad         (12 factores por sucursal / ambiente)
     - comportamiento semanal (pesos por día de semana)
     - kg/caja                (por sucursal / ambiente)
     - push                   (kg extraordinarios por fecha)  [opcional]
     - on hand                (inventario real por fecha)      [opcional]
   ══════════════════════════════════════════════════════════════════════════ */

import { claveFecha } from './engine.js';

/* PRNG determinístico (mulberry32) — reproducibilidad total del ejemplo. */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Perfiles de estacionalidad por zona (12 factores relativos, se normalizan). */
const ESTACIONALIDAD_ZONA = {
  // Sur: fuerte verano (Dic–Feb)
  Sur: [1.35, 1.28, 1.10, 0.92, 0.82, 0.78, 0.80, 0.85, 0.95, 1.05, 1.18, 1.42],
  // Centro: baja en verano, sube en invierno
  Centro: [0.85, 0.82, 0.95, 1.05, 1.12, 1.18, 1.20, 1.12, 1.05, 0.98, 0.90, 0.82],
  // Norte: relativamente estable
  Norte: [1.02, 1.00, 1.01, 0.99, 1.00, 0.98, 1.00, 1.01, 0.99, 1.00, 1.01, 0.99],
};

/* Pesos semanales relativos Lun–Sáb (no requieren sumar 100%). §7 */
const SEMANAL_BASE = { 1: 0.9, 2: 1.0, 3: 1.05, 4: 1.15, 5: 1.25, 6: 0.7 };

/* Nombres de ejemplo para 21 sucursales. */
const NOMBRES = [
  ['Arica', 'Norte'], ['Iquique', 'Norte'], ['Antofagasta', 'Norte'],
  ['Calama', 'Norte'], ['Copiapó', 'Norte'], ['La Serena', 'Norte'], ['Ovalle', 'Norte'],
  ['Valparaíso', 'Centro'], ['Viña del Mar', 'Centro'], ['Santiago Norte', 'Centro'],
  ['Santiago Sur', 'Centro'], ['Rancagua', 'Centro'], ['Curicó', 'Centro'], ['Talca', 'Centro'],
  ['Chillán', 'Sur'], ['Concepción', 'Sur'], ['Los Ángeles', 'Sur'],
  ['Temuco', 'Sur'], ['Valdivia', 'Sur'], ['Puerto Montt', 'Sur'], ['Coyhaique', 'Sur'],
];

const REGION_ZONA = {
  Norte: 'Zona Norte', Centro: 'Zona Central', Sur: 'Zona Sur',
};

const ANIOS = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

/**
 * Construye el dataset completo de ejemplo.
 * @returns { sucursales:[...], datos:{ demanda, estacionalidad, semanal, kpc, push, onhand } }
 */
export function construirDatosEjemplo() {
  const sucursales = [];
  const demanda = { porAmbiente: {} };
  const estacionalidad = {};
  const semanal = {};
  const kpc = {};
  const push = {};
  const onhand = {};

  NOMBRES.forEach(([nombre, zona], i) => {
    const id = `S${String(i + 1).padStart(2, '0')}`;
    const rnd = mulberry32(1000 + i * 7);

    // ── Geometría por ambiente (sintética, escalada por zona/tamaño) ──
    const escala = 0.7 + rnd() * 1.1; // tamaño relativo de la sucursal
    const m2Fresco = Math.round((900 + rnd() * 1400) * escala);
    const m2Cong = Math.round((300 + rnd() * 700) * escala);
    const hu = 5.0 + rnd() * 2.5;                 // altura útil 5.0–7.5 m
    const ufFresco = 0.36 + rnd() * 0.12;         // 0.36–0.48
    const ufCong = 0.34 + rnd() * 0.10;           // congelado algo menor
    const densFresco = 150 + rnd() * 90;          // 150–240 kg/m³
    const densCong = 170 + rnd() * 110;           // 170–280 kg/m³ (más densificado)
    const dohFresco = Number((3.5 + rnd() * 2.5).toFixed(1));  // 3.5–6.0 días
    const dohCong = Number((6 + rnd() * 8).toFixed(1));        // 6–14 días
    const prodFresco = 18 + rnd() * 10;           // cajas/HH
    const prodCong = 14 + rnd() * 8;
    const horas = 7.5;
    // Kg/caja (necesario para dimensionar la dotación al throughput de cajas)
    const kpcFrescoV = Number((10 + rnd() * 8).toFixed(1));    // 10–18 kg/caja
    const kpcCongV = Number((12 + rnd() * 10).toFixed(1));     // 12–22 kg/caja
    // Utilización operacional objetivo (parámetro de ejemplo): la dotación se
    // dimensiona para que la operación quede tensionada de forma realista.
    const utilObjF = 0.72 + rnd() * 0.22;         // 0.72–0.94
    const utilObjC = 0.70 + rnd() * 0.24;

    // La sucursal 21 (Coyhaique) simula un dato faltante: densidad congelado
    // ausente → el motor mostrará NO CALCULABLE para ese ambiente (§29 demo).
    const faltaCongDensidad = (i === 20);

    // ── Dimensionamiento de demanda base para saturación física realista ──
    const capF = m2Fresco * hu * ufFresco * densFresco;
    const capC = m2Cong * hu * ufCong * (faltaCongDensidad ? 220 : densCong);
    const objetivoF = capF * (0.62 + rnd() * 0.4);   // kg de inventario objetivo (año base)
    const objetivoC = capC * (0.60 + rnd() * 0.45);
    // inventario ≈ demanda_diaria × DOH → demanda anual ≈ inv/DOH × díasOp(~300)
    const diasOpAprox = 300;
    const baseFresco = (objetivoF / dohFresco) * diasOpAprox;
    const baseCong = (objetivoC / dohCong) * diasOpAprox;

    // Dotación dimensionada al throughput de cajas (utilización objetivo).
    // avgDailyBoxes = (kg/díasOp)/kpc ; dot = avgBoxes/(horas·prod·utilObjetivo)
    const avgBoxesF = (baseFresco / diasOpAprox) / kpcFrescoV;
    const avgBoxesC = (baseCong / diasOpAprox) / kpcCongV;
    const dotFresco = Math.max(4, Math.round(avgBoxesF / (horas * prodFresco * utilObjF)));
    const dotCong = Math.max(3, Math.round(avgBoxesC / (horas * prodCong * utilObjC)));

    const suc = {
      Sucursal_ID: id, Sucursal: nombre, Zona: zona, Region: REGION_ZONA[zona],
      dias_operativos: [1, 2, 3, 4, 5, 6],
      calidad_dato: faltaCongDensidad ? 'NO DISPONIBLE' : (i % 3 === 0 ? 'MEDIA' : 'EJEMPLO'),
      ambientes: {
        Fresco: {
          M2: m2Fresco, Altura_Util: Number(hu.toFixed(2)), Factor_Utilizacion: Number(ufFresco.toFixed(3)),
          Densidad_Kg_M3: Math.round(densFresco), DOH: dohFresco, DOH_Base: 'operativo',
          Productividad: Number(prodFresco.toFixed(1)), Horas_Productivas: horas, Dotacion: dotFresco,
          M2_Operable: Math.round(m2Fresco * 0.55), M2_Por_Persona: 11,
        },
        Congelado: {
          M2: m2Cong, Altura_Util: Number(hu.toFixed(2)), Factor_Utilizacion: Number(ufCong.toFixed(3)),
          Densidad_Kg_M3: faltaCongDensidad ? undefined : Math.round(densCong),
          DOH: dohCong, DOH_Base: 'operativo',
          Productividad: Number(prodCong.toFixed(1)), Horas_Productivas: horas, Dotacion: dotCong,
          M2_Operable: Math.round(m2Cong * 0.55), M2_Por_Persona: 11,
        },
      },
    };
    sucursales.push(suc);

    // ── Demanda anual por ambiente y año (proyección cargada, NO calculada) ──
    demanda.porAmbiente[id] = { Fresco: {}, Congelado: {} };
    const crecimiento = 0.02 + rnd() * 0.05; // 2%–7% anual (parámetro cargado)
    ANIOS.forEach((y, k) => {
      const factor = Math.pow(1 + crecimiento, k);
      demanda.porAmbiente[id].Fresco[y] = Math.round(baseFresco * factor);
      demanda.porAmbiente[id].Congelado[y] = Math.round(baseCong * factor);
    });

    // ── Estacionalidad (perfil de zona con ligera variación por sucursal) ──
    const perfil = ESTACIONALIDAD_ZONA[zona];
    const estF = {}, estC = {};
    for (let m = 1; m <= 12; m++) {
      const jitter = 0.95 + rnd() * 0.1;
      estF[m] = Number((perfil[m - 1] * jitter).toFixed(4));
      estC[m] = Number((perfil[m - 1] * (0.97 + rnd() * 0.06)).toFixed(4));
    }
    estacionalidad[id] = { Fresco: { '*': estF }, Congelado: { '*': estC } };

    // ── Comportamiento semanal ──
    semanal[id] = {
      Fresco: { '*': { '*': { ...SEMANAL_BASE } } },
      Congelado: { '*': { '*': { ...SEMANAL_BASE } } },
    };

    // ── Kg por caja (mismos valores usados para dimensionar la dotación) ──
    kpc[id] = {
      Fresco: { '*': kpcFrescoV },
      Congelado: { '*': kpcCongV },
    };

    // ── Push / stock extraordinario: eventos esporádicos (kg) ──
    push[id] = { Fresco: {}, Congelado: {} };
    // ~6 pulsos de push al año en meses pico, ambiente congelado principalmente
    ANIOS.forEach((y) => {
      const nPulsos = 3 + Math.floor(rnd() * 5);
      for (let p = 0; p < nPulsos; p++) {
        const mes = 1 + Math.floor(rnd() * 12);
        const dia = 1 + Math.floor(rnd() * 26);
        const key = claveFecha(y, mes, dia);
        const magC = Math.round(capC * (0.05 + rnd() * 0.18));
        push[id].Congelado[key] = magC;
        if (rnd() > 0.5) push[id].Fresco[claveFecha(y, mes, dia)] = Math.round(capF * (0.03 + rnd() * 0.1));
      }
    });
  });

  return {
    sucursales,
    datos: { demanda, estacionalidad, semanal, kpc, push, onhand },
    meta: {
      fuente: 'EJEMPLO SINTÉTICO — reemplazar por fuente oficial',
      generado: 'determinístico (mulberry32)',
      anios: ANIOS,
      calidad: 'EJEMPLO',
    },
  };
}
