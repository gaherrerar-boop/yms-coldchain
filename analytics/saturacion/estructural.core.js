// <<<CORE
// Nucleo del modelo de saturacion estructural.
// Espejo exacto de analytics/saturacion/modelo_estructural.py. La suite
// paridad_estructural.mjs compara este archivo contra la salida de Python.
// Sin dependencias: se puede pegar en cualquier pagina.

const PARAMETROS_BASE = {
  diasMes: 30.44,
  kgPorPosicion: 459,
  aprovechamiento: 1,
  m2PorPersona: 36,
  turnos: [
    { nombre: 'mañana', sigma: 0.20 },
    { nombre: 'tarde', sigma: 0.40 },
    { nombre: 'noche', sigma: 0.40 }
  ],
  mixCongelado: null,   // null = deducir de los datos
  factorDohC: 1,        // multiplicador sobre la politica de congelado
  factorDohR: 1         // multiplicador sobre la politica de refrigerado
};

function validarParametros(p) {
  const suma = p.turnos.reduce((a, t) => a + t.sigma, 0);
  if (Math.abs(suma - 1) > 1e-9) throw new Error(`los turnos deben sumar 1, suman ${suma}`);
  if (p.turnos.some((t) => t.sigma < 0)) throw new Error('ningun turno puede ser negativo');
  for (const k of ['diasMes', 'kgPorPosicion', 'm2PorPersona']) {
    if (!(p[k] > 0)) throw new Error(`${k} debe ser positivo, es ${p[k]}`);
  }
  if (!(p.aprovechamiento > 0 && p.aprovechamiento <= 1)) {
    throw new Error(`aprovechamiento debe estar en (0,1], es ${p.aprovechamiento}`);
  }
  if (p.mixCongelado !== null && !(p.mixCongelado > 0 && p.mixCongelado < 1)) {
    throw new Error(`mixCongelado debe estar en (0,1), es ${p.mixCongelado}`);
  }
}

function esEvaluable(s) {
  return ['m2', 'posiciones', 'capCongKg', 'capRefrKg', 'capTotalKg',
          'personas', 'demandaMes', 'dohCongelado', 'dohRefrigerado']
    .every((k) => typeof s[k] === 'number' && s[k] > 0);
}

// El espacio que ocupa un regimen es su volumen por los dias que se guarda.
// De  K_C/K_R = (phi·DOH_C)/((1-phi)·DOH_R)  se despeja phi.
function deducirMix(sucursales) {
  const v = sucursales.filter(esEvaluable);
  const suma = (f) => v.reduce((a, s) => a + f(s), 0);
  const kC = suma((s) => s.capCongKg);
  const kR = suma((s) => s.capRefrKg);
  const peso = suma((s) => s.demandaMes);
  const dohC = suma((s) => s.dohCongelado * s.demandaMes) / peso;
  const dohR = suma((s) => s.dohRefrigerado * s.demandaMes) / peso;
  const phi = 1 / (1 + (kR / kC) * (dohC / dohR));
  return {
    phi,
    shareCapacidadCongelado: kC / (kC + kR),
    dohCPonderado: dohC,
    dohRPonderado: dohR,
    sesgoProxyCapacidad: (kC / (kC + kR)) / phi
  };
}

function evaluarSucursal(s, par, phi) {
  if (!esEvaluable(s)) return { sucursal: s.nombre, evaluable: false };

  const a0 = par.m2PorPersona, gamma = par.kgPorPosicion, u = par.aprovechamiento;
  const dohC = s.dohCongelado * par.factorDohC;
  const dohR = s.dohRefrigerado * par.factorDohR;

  // (1) Flujo diario por regimen
  const d = s.demandaMes / par.diasMes;
  const dC = phi * d, dR = (1 - phi) * d;

  // (2) Politica: DOH ponderado por el mix
  const dohPol = phi * dohC + (1 - phi) * dohR;

  // (3) Capacidad en posiciones (unica fuente de verdad; los kg son derivados)
  const beta = s.capCongKg / s.capTotalKg;
  const posTot = s.posiciones * u;
  const posC = posTot * beta, posR = posTot * (1 - beta);

  // (4) Requerimiento en posiciones:  n = d · DOH / gamma
  const nC = dC * dohC / gamma;
  const nR = dR * dohR / gamma;
  const nTot = nC + nR;

  // (5) DOH fisico: dias que la camara alcanza a cubrir de su propio flujo
  const dohFisC = posC * gamma / dC;
  const dohFisR = posR * gamma / dR;
  const dohFisTot = posTot * gamma / d;

  // (6) Saturacion de almacenamiento
  const rhoC = nC / posC, rhoR = nR / posR;
  const rhoRigido = Math.max(rhoC, rhoR);
  const rhoFlex = nTot / posTot;

  // (7) Participacion de la politica (rho es lineal en DOH)
  const eC = phi * dohC / dohPol;
  const eR = (1 - phi) * dohR / dohPol;

  // (8) Dotacion por norma de ocupacion
  const densidad = s.posiciones / s.m2;
  const m2Uso = nTot / densidad;
  const nReq = m2Uso / a0;
  const nNorma = s.m2 / a0;
  const rhoDot = nReq / s.personas;

  // (9) Turnos: reparten la dotacion, no la cambian
  const turnos = par.turnos.map((t) => ({
    turno: t.nombre,
    sigma: t.sigma,
    personasRequeridas: nReq * t.sigma,
    personasReales: s.personas * t.sigma,
    ocupacionCamara: (nReq * t.sigma) / nNorma
  }));
  const peak = turnos.reduce((a, b) => (b.sigma > a.sigma ? b : a));

  // (10) Restriccion activa
  const rhoEstructural = Math.max(rhoRigido, rhoDot);
  const cuello = rhoRigido >= rhoDot
    ? (rhoC >= rhoR ? 'almacenamiento congelado' : 'almacenamiento refrigerado')
    : 'dotacion';

  // (11) Politicas de quiebre, en forma cerrada
  const dohCQuiebreFlex = (dohFisTot - (1 - phi) * dohR) / phi;

  return {
    sucursal: s.nombre, evaluable: true,
    demandaDiaKg: d, mixCongelado: phi,
    dohPoliticaC: dohC, dohPoliticaR: dohR, dohPoliticaPonderado: dohPol,
    dohFisicoC: dohFisC, dohFisicoR: dohFisR, dohFisicoTotal: dohFisTot,
    posReqC: nC, posReqR: nR, posReqTotal: nTot,
    posDispC: posC, posDispR: posR, posDispTotal: posTot,
    rhoCongelado: rhoC, rhoRefrigerado: rhoR,
    rhoAlmacenRigido: rhoRigido, rhoAlmacenFlexible: rhoFlex,
    valorFlexibilidad: rhoRigido - rhoFlex,
    shareCongInstalado: beta, shareCongRequerido: nC / nTot,
    desbalanceCamara: nC / nTot - beta,
    elasticidadDohC: eC, elasticidadDohR: eR,
    derivadaRhoDohC: phi / dohFisTot,
    derivadaRhoDohR: (1 - phi) / dohFisTot,
    densidadPosM2: densidad, m2EnUso: m2Uso,
    dotacionRequerida: nReq, dotacionNormaCamara: nNorma,
    dotacionReal: s.personas, rhoDotacion: rhoDot,
    brechaDotacion: nNorma / s.personas,
    derivadaDotacionDohC: phi * d * s.m2 / (gamma * s.posiciones * a0),
    derivadaDotacionDohR: (1 - phi) * d * s.m2 / (gamma * s.posiciones * a0),
    turnos, turnoPeak: peak.turno, personasPeak: peak.personasRequeridas,
    rhoEstructural, cuelloBotella: cuello,
    holguraPolitica: 1 / rhoEstructural - 1,
    kappaAlmacenamiento: 1 / rhoRigido,
    kappaDotacion: 1 / rhoDot,
    kappaEstructural: 1 / rhoEstructural,
    dohCQuiebre: dohFisC, dohRQuiebre: dohFisR,
    dohCQuiebreFlexible: dohCQuiebreFlex,
    dohCQuiebreFlexibleFactible: dohCQuiebreFlex >= 0,
    dohPolQuiebreDotacion: dohFisTot * s.personas * a0 / s.m2
  };
}

function evaluarRed(sucursales, parciales = {}) {
  const par = { ...PARAMETROS_BASE, ...parciales };
  validarParametros(par);
  const ded = deducirMix(sucursales);
  const phi = par.mixCongelado === null ? ded.phi : par.mixCongelado;

  const filas = sucursales.map((s) => evaluarSucursal(s, par, phi));
  const ev = filas.filter((r) => r.evaluable).sort((a, b) => b.rhoEstructural - a.rhoEstructural);

  return {
    parametros: par, phi, deduccion: ded, resultados: ev,
    noEvaluables: filas.filter((r) => !r.evaluable),
    resumen: {
      total: ev.length,
      sobreUnoAlmacen: ev.filter((r) => r.rhoAlmacenRigido > 1).length,
      sobreUnoDotacion: ev.filter((r) => r.rhoDotacion > 1).length,
      sobreUnoEstructural: ev.filter((r) => r.rhoEstructural > 1).length,
      cuelloAlmacen: ev.filter((r) => r.cuelloBotella.startsWith('almacen')).length,
      cuelloDotacion: ev.filter((r) => r.cuelloBotella === 'dotacion').length,
      medianaRho: mediana(ev.map((r) => r.rhoEstructural)),
      posicionesFaltantes: ev.reduce((a, r) => a + Math.max(0, r.posReqTotal - r.posDispTotal), 0),
      personasFaltantes: ev.reduce((a, r) => a + Math.max(0, r.dotacionRequerida - r.dotacionReal), 0)
    }
  };
}

function mediana(v) {
  if (!v.length) return 0;
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}
// CORE>>>

export { PARAMETROS_BASE, validarParametros, esEvaluable, deducirMix,
         evaluarSucursal, evaluarRed, mediana };
