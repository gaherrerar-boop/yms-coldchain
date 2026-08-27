// <<<CORE
// Nucleo del modelo de saturacion — Operaciones Nacionales, red de frio.
// Espejo exacto de analytics/saturacion/modelo_saturacion.py.
// paridad_saturacion.mjs compara este archivo contra la salida de Python.
//
// El calculo es POR SUCURSAL. No se agregan magnitudes entre sucursales: solo
// rho es comparable, porque cada una se mide contra su propia capacidad.
//
// Dos etapas que nunca se mezclan en un mismo numero:
//   ETAPA 1  estructural   — el inventario de politica, ¿cabe en las camaras?
//   ETAPA 2  operacional   — condicional: solo si quedan m2 libres, ¿alcanzan
//                            esos m2 para que opere el turno mas cargado?

const RED_ABASTECIMIENTO = { 'Antofagasta': ['Arica', 'Iquique', 'Calama'] };

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
  factorDohC: 1,        // escalado de politica: SOLO simulacion
  factorDohR: 1,
  fraccionHub: 1,       // porcion del volumen abastecido que pasa por el hub
  // Fórmula unificada: factor de empuje por sobrestocks
  factorEmpujeAlpha: 0, // fracción de sobrestocks que llega (0 a 1)
  sobrestocksRatio: 0   // ratio de sobrestocks en planta / demanda base (0 a 1)
};

function validarParametros(p) {
  const suma = p.turnos.reduce((a, t) => a + t.sigma, 0);
  if (Math.abs(suma - 1) > 1e-9) throw new Error(`los turnos deben sumar 1, suman ${suma}`);
  if (p.turnos.some((t) => t.sigma < 0)) throw new Error('ningun turno puede ser negativo');
  for (const k of ['diasMes', 'kgPorPosicion', 'm2PorPersona', 'factorDohC', 'factorDohR']) {
    if (!(p[k] > 0)) throw new Error(`${k} debe ser positivo, es ${p[k]}`);
  }
  if (!(p.aprovechamiento > 0 && p.aprovechamiento <= 1)) {
    throw new Error(`aprovechamiento debe estar en (0,1], es ${p.aprovechamiento}`);
  }
  if (p.mixCongelado !== null && !(p.mixCongelado > 0 && p.mixCongelado < 1)) {
    throw new Error(`mixCongelado debe estar en (0,1), es ${p.mixCongelado}`);
  }
  if (!(p.fraccionHub >= 0 && p.fraccionHub <= 1)) {
    throw new Error(`fraccionHub debe estar en [0,1], es ${p.fraccionHub}`);
  }
  if (!(p.factorEmpujeAlpha >= 0 && p.factorEmpujeAlpha <= 1)) {
    throw new Error(`factorEmpujeAlpha debe estar en [0,1], es ${p.factorEmpujeAlpha}`);
  }
  if (!(p.sobrestocksRatio >= 0 && p.sobrestocksRatio <= 1)) {
    throw new Error(`sobrestocksRatio debe estar en [0,1], es ${p.sobrestocksRatio}`);
  }
}

const clave = (n) =>
  String(n).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function esEvaluable(s) {
  return ['m2', 'posiciones', 'capCongKg', 'capRefrKg', 'capTotalKg',
          'personas', 'demandaMes', 'dohCongelado', 'dohRefrigerado']
    .every((k) => typeof s[k] === 'number' && s[k] > 0);
}

// El espacio que ocupa un regimen es su volumen por los dias que se guarda.
// De  K_C/K_R = (phi·DOH_C)/((1-phi)·DOH_R)  se despeja phi. Se pondera con la
// demanda PROPIA: el mix es del producto, no del flujo que cruza un hub.
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

function evaluarSucursal(s, par, phi, indice) {
  if (!esEvaluable(s)) return { sucursal: s.nombre, evaluable: false };

  const a0 = par.m2PorPersona, gamma = par.kgPorPosicion, u = par.aprovechamiento;
  const dohC = s.dohCongelado * par.factorDohC;
  const dohR = s.dohRefrigerado * par.factorDohR;
  const sigmaPeak = Math.max(...par.turnos.map((t) => t.sigma));
  const turnoPeak = par.turnos.reduce((a, b) => (b.sigma > a.sigma ? b : a)).nombre;

  // (0) Red de abastecimiento: el flujo incluye lo que se despacha a terceros.
  const abastece = RED_ABASTECIMIENTO[s.nombre] || [];
  let aporte = 0;
  for (const n of abastece) {
    const otra = indice[clave(n)];
    if (otra && otra.demandaMes) aporte += par.fraccionHub * otra.demandaMes;
  }
  const dEf = s.demandaMes + aporte;

  // Factor de empuje (sobrestocks): amplía la demanda por kilos no demandados
  // que llegan a la sucursal. Fórmula unificada: ρ = Demanda_eff / Capacidad
  const factorEmpuje = 1 + par.factorEmpujeAlpha * par.sobrestocksRatio;
  const dEfAjustado = dEf * factorEmpuje;

  // Detectar si es sucursal HUB (modelo cross-dock) o Normal (almacenaje)
  const esHub = abastece.length > 0; // Es HUB si abastece a otras

  // ============== ETAPA 1 — SATURACION ESTRUCTURAL ==============

  const d = dEfAjustado / par.diasMes;                       // (1) flujo diario (con empuje)
  const dC = phi * d, dR = (1 - phi) * d;
  const dohPol = phi * dohC + (1 - phi) * dohR;      // (2) politica ponderada

  const beta = s.capCongKg / s.capTotalKg;           // (3) capacidad en posiciones
  const posTot = s.posiciones * u;
  const posC = posTot * beta, posR = posTot * (1 - beta);

  const nC = dC * dohC / gamma;                      // (4) requerimiento
  const nR = dR * dohR / gamma;
  const nTot = nC + nR;

  const dohFisC = posC * gamma / dC;                 // (5) DOH fisico
  const dohFisR = posR * gamma / dR;
  const dohFisTot = posTot * gamma / d;

  const rhoC = nC / posC;                            // (6) saturacion estructural
  const rhoR = nR / posR;
  const rhoEstructural = Math.max(rhoC, rhoR);
  const rhoFlex = nTot / posTot;

  const eC = phi * dohC / dohPol;                    // (7) participacion politica
  const eR = (1 - phi) * dohR / dohPol;

  // ======= ETAPA 2 — SATURACION OPERACIONAL (condicional) =======

  const densidad = s.posiciones / s.m2;              // (8) superficie
  const m2Uso = nTot / densidad;
  const m2Libre = s.m2 - m2Uso;                      // = A · (1 − rhoFlex)

  const personasPeak = s.personas * sigmaPeak;       // (9) concurrencia del peak
  const m2Operacion = personasPeak * a0;

  const hayEspacioM2 = m2Libre > 0;                  // (10) compuerta
  const rhoOperacional = hayEspacioM2 ? m2Operacion / m2Libre : null;
  const personasQueCaben = hayEspacioM2 ? m2Libre / a0 : 0;

  // (11) Diagnostico. Los dos veredictos son INDEPENDIENTES: fundirlos en una
  //      sola etiqueta esconderia una camara desbordada detras de un diagnostico
  //      operacional, o al reves.
  const camaraCritica = rhoC >= rhoR ? 'congelado' : 'refrigerado';
  const saturadoEstructural = rhoEstructural > 1;
  const saturadoOperacional = hayEspacioM2 ? rhoOperacional > 1 : null;

  let estado, detalleEstado;
  if (saturadoEstructural && saturadoOperacional) {
    estado = 'estructural y operacional';
    detalleEstado = `la camara de ${camaraCritica} desborda y la operacion no cabe`;
  } else if (saturadoEstructural) {
    estado = 'saturacion estructural';
    detalleEstado = hayEspacioM2
      ? `la camara de ${camaraCritica} desborda`
      : 'el inventario de politica no cabe en la superficie';
  } else if (saturadoOperacional) {
    estado = 'saturacion operacional';
    detalleEstado = 'el inventario cabe, la operacion no';
  } else {
    estado = 'sin saturacion';
    detalleEstado = hayEspacioM2
      ? 'cabe el inventario y cabe la operacion'
      : 'el inventario cabe justo, sin superficie libre';
  }

  // (12) Politicas de quiebre, en forma cerrada
  const dohCQuiebreFlex = (dohFisTot - (1 - phi) * dohR) / phi;
  const rhoFlexQuiebreOp = 1 - m2Operacion / s.m2;
  const dohPolQuiebreOp = dohFisTot * rhoFlexQuiebreOp;

  const turnos = par.turnos.map((t) => ({
    turno: t.nombre,
    sigma: t.sigma,
    personas: s.personas * t.sigma,
    m2Requeridos: s.personas * t.sigma * a0,
    holguraM2: m2Libre - s.personas * t.sigma * a0,
    esPeak: t.sigma === sigmaPeak
  }));

  return {
    sucursal: s.nombre, evaluable: true, abastece,
    tipo: esHub ? 'hub' : 'normal',
    demandaPropia: s.demandaMes, demandaAportada: aporte, demandaEfectiva: dEf,
    demandaEfectivaAjustada: dEfAjustado,
    factorEmpuje: factorEmpuje,
    factorHub: dEf / s.demandaMes,
    demandaDiaKg: d, mixCongelado: phi,
    dohPoliticaC: dohC, dohPoliticaR: dohR, dohPoliticaPonderado: dohPol,
    dohFisicoC: dohFisC, dohFisicoR: dohFisR, dohFisicoTotal: dohFisTot,
    posReqC: nC, posReqR: nR, posReqTotal: nTot,
    posDispC: posC, posDispR: posR, posDispTotal: posTot,
    rhoCongelado: rhoC, rhoRefrigerado: rhoR,
    rhoEstructural, rhoFlex,
    camaraCritica,
    shareCongInstalado: beta, shareCongRequerido: nC / nTot,
    desbalanceCamara: nC / nTot - beta,
    elasticidadDohC: eC, elasticidadDohR: eR,
    derivadaRhoDohC: phi / dohFisTot, derivadaRhoDohR: (1 - phi) / dohFisTot,
    densidadPosM2: densidad,
    m2Total: s.m2, m2Uso, m2Libre, m2Operacion,
    personasTotal: s.personas, personasPeak, personasQueCaben,
    turnoPeak, turnos,
    hayEspacioM2, rhoOperacional, saturadoEstructural, saturadoOperacional,
    estado, detalleEstado,
    kappaEstructural: 1 / rhoEstructural,
    dohCQuiebre: dohFisC, dohRQuiebre: dohFisR,
    dohCQuiebreFlexible: dohCQuiebreFlex,
    dohCQuiebreFlexibleFactible: dohCQuiebreFlex >= 0,
    dohPolQuiebreOperacional: dohPolQuiebreOp,
    operacionAlcanzable: rhoFlexQuiebreOp > 0
  };
}

function evaluarRed(sucursales, parciales = {}) {
  const par = { ...PARAMETROS_BASE, ...parciales };
  validarParametros(par);
  const indice = Object.fromEntries(sucursales.map((s) => [clave(s.nombre), s]));
  const ded = deducirMix(sucursales);
  const phi = par.mixCongelado === null ? ded.phi : par.mixCongelado;

  const filas = sucursales.map((s) => evaluarSucursal(s, par, phi, indice));
  const ev = filas.filter((r) => r.evaluable).sort((a, b) => b.rhoEstructural - a.rhoEstructural);

  // Conteos de sucursales, nunca sumas de magnitudes: las sucursales no son
  // comparables en kg, m2 ni posiciones.
  return {
    parametros: par, phi, deduccion: ded, resultados: ev,
    noEvaluables: filas.filter((r) => !r.evaluable),
    conteo: {
      evaluadas: ev.length,
      saturadasEstructural: ev.filter((r) => r.saturadoEstructural).length,
      saturadasOperacional: ev.filter((r) => r.saturadoOperacional === true).length,
      sinSaturacion: ev.filter((r) => r.estado === 'sin saturacion').length,
      sinEtapa2: ev.filter((r) => !r.hayEspacioM2).length,
      camaraCongelado: ev.filter((r) => r.camaraCritica === 'congelado').length,
      camaraRefrigerado: ev.filter((r) => r.camaraCritica === 'refrigerado').length
    }
  };
}
// CORE>>>

export { RED_ABASTECIMIENTO, PARAMETROS_BASE, validarParametros, esEvaluable,
         deducirMix, evaluarSucursal, evaluarRed, clave };
