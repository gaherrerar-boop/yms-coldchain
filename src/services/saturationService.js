// Saturation Service — Modelo de saturación de sucursales de cadena de frío
//
// Puerto JS del modelo de referencia en analytics/saturacion/modelo.py.
// La especificación matemática está en analytics/saturacion/MODELO.md.
//
// Funciones puras, sin dependencias de Firebase ni de estado global: reciben
// datos de sucursal y parámetros, devuelven métricas. Así el mismo cálculo sirve
// para el dashboard, para simulaciones y para tests.

export const PARAMETROS_DEFECTO = {
  diasMes: 30.44,
  mixCongelado: { modo: 'deducido', global: 0.20, custom: {} },
  pallet: { kgPosCongelado: 459.0, kgPosRefrigerado: 459.0, factorLlenado: 1.0 },
  fraccionEnSitio: { congelado: 1.0, refrigerado: 1.0 },
  ocupacionMaximaUtil: 0.85,
  manoObra: { horasMesPorPersona: 180.0 },
  composicion: { pesos: { almacenamiento: 0.6, manoObra: 0.4 }, ordenP: 4 },
  umbrales: [
    { hasta: 0.70, clase: 'holgada' },
    { hasta: 0.85, clase: 'normal' },
    { hasta: 0.95, clase: 'tensionada' },
    { hasta: 1.05, clase: 'critica' },
    { hasta: null, clase: 'desbordada' }
  ]
};

export const ESCENARIOS = {
  P0_politica: { factorEstacional: 1.0, nivelServicio: 0.50, cvInventario: 0.22 },
  P1_operativo: { factorEstacional: 1.15, nivelServicio: 0.85, cvInventario: 0.22 },
  P2_peak: { factorEstacional: 1.30, nivelServicio: 0.95, cvInventario: 0.22 }
};

/**
 * Cuantil de la normal estándar. Aproximación racional de Acklam,
 * error absoluto < 1.15e-9 en (0,1). Evita traer una dependencia solo por esto.
 */
export function cuantilNormal(p) {
  if (p <= 0 || p >= 1) throw new Error(`nivelServicio fuera de (0,1): ${p}`);

  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];

  const pBajo = 0.02425;
  let q, r;

  if (p < pBajo) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pBajo) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Multiplicador que lleva el inventario medio objetivo al percentil de servicio.
 * Con I ~ Lognormal de media S y log-sigma s, el percentil alfa es
 * S * exp(z_alfa * s - s^2 / 2).
 */
export function factorPeak(escenario) {
  const s = Math.sqrt(Math.log(1 + escenario.cvInventario ** 2));
  const z = cuantilNormal(escenario.nivelServicio);
  return escenario.factorEstacional * Math.exp(z * s - (s * s) / 2);
}

const clave = (nombre) =>
  String(nombre).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Deduce el mix de demanda congelado desde la capacidad instalada.
 *
 * El espacio que ocupa un régimen es su volumen por los días que se guarda, así
 * que K_C/K_total NO es el mix: lo sobreestima en el factor DOH_C/DOH_R.
 * Despejando phi de  K_C/K_R = (phi·DOH_C)/((1-phi)·DOH_R).
 */
export function deducirMix(sucursales) {
  const validas = sucursales.filter(esEvaluable);
  if (!validas.length) return null;

  const sum = (f) => validas.reduce((acc, s) => acc + f(s), 0);
  const kC = sum((s) => s.capCongKg);
  const kR = sum((s) => s.capRefrKg);
  const peso = sum((s) => s.demandaMes);
  const dohC = sum((s) => s.dohCongelado * s.demandaMes) / peso;
  const dohR = sum((s) => s.dohRefrigerado * s.demandaMes) / peso;

  const phi = 1 / (1 + (kR / kC) * (dohC / dohR));
  return {
    mixDeducido: phi,
    shareCapacidadCongelado: kC / (kC + kR),
    dohCongeladoPonderado: dohC,
    dohRefrigeradoPonderado: dohR,
    sesgoDelProxyCapacidad: (kC / (kC + kR)) / phi
  };
}

export function esEvaluable(s) {
  return [s.demandaMes, s.dohCongelado, s.dohRefrigerado, s.posiciones,
          s.personas, s.kgHh, s.capTotalKg].every((v) => typeof v === 'number' && v > 0);
}

function clasificar(rho, umbrales) {
  const u = umbrales.find((x) => x.hasta === null || rho < x.hasta);
  return (u || umbrales[umbrales.length - 1]).clase;
}

function mixDe(s, par) {
  const k = clave(s.nombre);
  if (par.mixCongelado.custom && k in par.mixCongelado.custom) return par.mixCongelado.custom[k];
  if (par.mixCongelado.modo === 'capacidad' && s.capTotalKg) return s.capCongKg / s.capTotalKg;
  if (par.mixCongelado.modo === 'deducido' && par.mixCongelado.deducido != null) {
    return par.mixCongelado.deducido;
  }
  return par.mixCongelado.global;
}

/**
 * Evalúa la saturación de una sucursal bajo un escenario.
 * Devuelve { evaluable: false, faltantes } si no hay datos suficientes.
 */
export function evaluarSucursal(s, par = PARAMETROS_DEFECTO, escenario = ESCENARIOS.P1_operativo) {
  if (!esEvaluable(s)) {
    const campos = { demandaMes: 'demanda', dohCongelado: 'DOH congelado',
                     dohRefrigerado: 'DOH refrigerado', posiciones: 'posiciones',
                     personas: 'dotación', kgHh: 'kg/HH', capTotalKg: 'capacidad' };
    return {
      sucursal: s.nombre,
      evaluable: false,
      faltantes: Object.entries(campos)
        .filter(([k]) => !(typeof s[k] === 'number' && s[k] > 0))
        .map(([, v]) => v)
    };
  }

  const fPk = factorPeak(escenario);
  const phi = mixDe(s, par);
  const { pallet: pal, fraccionEnSitio: sitio, ocupacionMaximaUtil: uMax } = par;

  // 1. Demanda diaria por régimen
  const d = s.demandaMes / par.diasMes;
  const dC = phi * d;
  const dR = (1 - phi) * d;

  // 2. Inventario objetivo de política, solo la porción que ocupa cámara
  const invC = dC * s.dohCongelado * sitio.congelado;
  const invR = dR * s.dohRefrigerado * sitio.refrigerado;

  // 3. Sobrecarga estacional y estocástica
  const reqC = invC * fPk;
  const reqR = invR * fPk;

  // 4. Conversión a posiciones
  const posC = reqC / (pal.kgPosCongelado * pal.factorLlenado);
  const posR = reqR / (pal.kgPosRefrigerado * pal.factorLlenado);

  // 5. Capacidad efectiva: el split en kg y en posiciones es el mismo
  const beta = s.capCongKg / s.capTotalKg;
  const capC = s.posiciones * beta * uMax;
  const capR = s.posiciones * (1 - beta) * uMax;
  const capTotal = s.posiciones * uMax;

  // 6. Saturaciones
  const rhoC = capC > 0 ? posC / capC : Infinity;
  const rhoR = capR > 0 ? posR / capR : Infinity;
  const rhoRigido = Math.max(rhoC, rhoR);
  const rhoFlex = (posC + posR) / capTotal;

  const hhReq = s.demandaMes / s.kgHh;
  const hhDisp = s.personas * par.manoObra.horasMesPorPersona;
  const rhoHh = hhReq / hhDisp;

  const rhoBinding = Math.max(rhoRigido, rhoHh);
  let cuello = rhoRigido >= rhoHh
    ? `almacenamiento ${rhoC >= rhoR ? 'congelado' : 'refrigerado'}`
    : 'mano_obra';

  const { ordenP: p, pesos: w } = par.composicion;
  const rhoComp = (w.almacenamiento * rhoRigido ** p + w.manoObra * rhoHh ** p) ** (1 / p);

  // 7. Descomposición: rho_flex = (DOH política / DOH físico) x (peak / ocupación)
  const dohPolitica = phi * s.dohCongelado * sitio.congelado
                    + (1 - phi) * s.dohRefrigerado * sitio.refrigerado;
  const dohFisico = s.capTotalKg / d;

  return {
    sucursal: s.nombre,
    evaluable: true,
    escenario: escenario.nombre || null,
    mixCongelado: phi,
    demandaDiaKg: d,
    posReqCongelado: posC,
    posReqRefrigerado: posR,
    posDispCongelado: capC,
    posDispRefrigerado: capR,
    rhoCongelado: rhoC,
    rhoRefrigerado: rhoR,
    rhoAlmacenRigido: rhoRigido,
    rhoAlmacenFlexible: rhoFlex,
    valorFlexibilidad: rhoRigido - rhoFlex,
    hhRequeridasMes: hhReq,
    hhDisponiblesMes: hhDisp,
    rhoManoObra: rhoHh,
    rhoBinding,
    cuelloBotella: cuello,
    rhoCompuesto: rhoComp,
    clase: clasificar(rhoBinding, par.umbrales),
    holguraCrecimiento: rhoBinding > 0 ? 1 / rhoBinding - 1 : Infinity,
    dohPoliticaPonderado: dohPolitica,
    dohFisicoDisponible: dohFisico,
    factorPolitica: dohPolitica / dohFisico,
    factorOperacion: fPk / uMax,
    rotacionesMes: s.demandaMes / s.capTotalKg,
    shareCongInstalado: beta,
    shareCongRequerido: (posC + posR) > 0 ? posC / (posC + posR) : 0,
    desbalanceCamara: ((posC + posR) > 0 ? posC / (posC + posR) : 0) - beta,
    deficitPosCongelado: Math.max(0, posC - capC),
    deficitPosRefrigerado: Math.max(0, posR - capR),
    deficitPosNeto: Math.max(0, posC + posR - capTotal)
  };
}

/**
 * Evalúa la red completa. Deduce el mix una sola vez sobre el universo recibido
 * y lo aplica a todas, para que el supuesto sea consistente entre sucursales.
 */
export function evaluarRed(sucursales, par = PARAMETROS_DEFECTO, escenario = ESCENARIOS.P1_operativo) {
  const deduccion = deducirMix(sucursales);
  const efectivos = {
    ...par,
    mixCongelado: { ...par.mixCongelado, deducido: deduccion?.mixDeducido ?? null }
  };

  const resultados = sucursales.map((s) => evaluarSucursal(s, efectivos, escenario));
  const evaluables = resultados.filter((r) => r.evaluable);
  evaluables.sort((a, b) => b.rhoBinding - a.rhoBinding);

  return {
    calibracion: deduccion,
    factorPeak: factorPeak(escenario),
    resultados: evaluables,
    noEvaluables: resultados.filter((r) => !r.evaluable),
    resumen: {
      total: evaluables.length,
      desbordadas: evaluables.filter((r) => r.rhoBinding > 1.05).length,
      criticas: evaluables.filter((r) => r.rhoBinding > 0.95 && r.rhoBinding <= 1.05).length,
      cuelloAlmacenamiento: evaluables.filter((r) => r.cuelloBotella.startsWith('almacen')).length,
      cuelloManoObra: evaluables.filter((r) => r.cuelloBotella === 'mano_obra').length
    }
  };
}

/**
 * Posiciones recuperables re-rackeando hasta la densidad de referencia de la red.
 * Los m2 no son una dimensión de saturación: son la palanca que fija cuántas
 * posiciones caben, así que se reportan como potencial de expansión.
 */
export function palancaDensificacion(sucursales, percentil = 75) {
  const validas = sucursales.filter((s) => s.m2 > 0 && s.posiciones > 0);
  const dens = validas.map((s) => s.posiciones / s.m2).sort((a, b) => a - b);
  if (!dens.length) return [];

  const k = (dens.length - 1) * (percentil / 100);
  const lo = Math.floor(k);
  const hi = Math.ceil(k);
  const objetivo = lo === hi ? dens[lo] : dens[lo] + (dens[hi] - dens[lo]) * (k - lo);

  return validas
    .map((s) => {
      const potencial = s.m2 * objetivo;
      return {
        sucursal: s.nombre,
        densidadActual: s.posiciones / s.m2,
        densidadBenchmark: objetivo,
        posicionesRecuperables: Math.max(0, potencial - s.posiciones),
        brechaRelativa: Math.max(0, potencial / s.posiciones - 1)
      };
    })
    .sort((a, b) => b.posicionesRecuperables - a.posicionesRecuperables);
}
