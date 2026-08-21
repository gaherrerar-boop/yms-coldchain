// Saturation Service — modelo de saturación de sucursales de cadena de frío.
//
// Este archivo NO reimplementa el modelo: reexporta el núcleo verificado, para
// que la app no pueda quedarse con una copia divergente de la matemática.
//
//   modelo de referencia   analytics/saturacion/modelo_saturacion.py
//   verificación exacta    analytics/saturacion/verificar.py
//   paridad JS ↔ Python    analytics/saturacion/paridad_saturacion.mjs
//
// El modelo evalúa dos etapas separadas, que nunca se combinan en un mismo
// número: la estructural (¿cabe el inventario que exige la política DOH?) y la
// operacional, condicional a que queden m² libres (¿cabe la operación en la
// superficie que sobra, a 36 m² por persona en el turno más cargado?).
//
// El cálculo es por sucursal. No se agregan magnitudes entre sucursales: solo
// rho es comparable, por ser adimensional.
export {
  RED_ABASTECIMIENTO,
  PARAMETROS_BASE,
  validarParametros,
  esEvaluable,
  deducirMix,
  evaluarSucursal,
  evaluarRed,
  clave
} from '../../analytics/saturacion/saturacion.core.js';
