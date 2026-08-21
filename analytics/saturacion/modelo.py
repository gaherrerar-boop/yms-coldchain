#!/usr/bin/env python3
"""
Modelo de saturacion de sucursales de cadena de frio.

Calcula, para cada sucursal, cuan cerca esta de su limite fisico y de su limite
de mano de obra, partiendo de:
  - demanda promedio mensual (kg/mes)
  - politica de cobertura DOH por regimen termico (congelado / refrigerado)
  - capacidad instalada (posiciones, m2, kg por camara)
  - dotacion y productividad estandar (kg/HH)

La especificacion matematica completa esta en MODELO.md.
Uso:
    python3 modelo.py --datos datos/satura_nuevo_modelo.xlsx --salida salidas/
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from statistics import NormalDist

import openpyxl

RAIZ = Path(__file__).resolve().parent


# --------------------------------------------------------------------------
# Parametros
# --------------------------------------------------------------------------

@dataclass
class Escenario:
    nombre: str
    factor_estacional: float
    nivel_servicio: float
    cv_inventario: float

    @property
    def sigma_log(self) -> float:
        """Desviacion en logaritmo equivalente a un CV dado, bajo lognormal."""
        return math.sqrt(math.log(1.0 + self.cv_inventario ** 2))

    @property
    def factor_peak(self) -> float:
        """
        Multiplicador que lleva el inventario medio objetivo al percentil de
        servicio pedido. Con I ~ Lognormal de media S y log-sigma s, el
        percentil alfa es S * exp(z_alfa * s - s^2 / 2).
        """
        s = self.sigma_log
        z = NormalDist().inv_cdf(self.nivel_servicio)
        return self.factor_estacional * math.exp(z * s - s * s / 2.0)


@dataclass
class Parametros:
    dias_mes: float
    mix_modo: str
    mix_global: float
    mix_custom: dict[str, float]
    mix_deducido: float | None
    kg_pos_congelado: float
    kg_pos_refrigerado: float
    factor_llenado: float
    fraccion_en_sitio_cong: float
    fraccion_en_sitio_refr: float
    ocupacion_maxima_util: float
    horas_mes_por_persona: float
    percentil_benchmark: int
    pesos: dict[str, float]
    orden_p: float
    umbrales: list[tuple[float | None, str]]
    escenarios: dict[str, Escenario]
    escenario_base: str
    crudo: dict = field(default_factory=dict)

    @staticmethod
    def desde_json(ruta: Path) -> "Parametros":
        d = json.loads(ruta.read_text(encoding="utf-8"))
        return Parametros(
            dias_mes=d["dias_mes"],
            mix_modo=d["mix_congelado"]["modo"],
            mix_global=d["mix_congelado"]["global"],
            mix_custom={_clave(k): v for k, v in d["mix_congelado"].get("custom", {}).items()},
            mix_deducido=None,
            kg_pos_congelado=d["pallet"]["kg_por_posicion_congelado"],
            kg_pos_refrigerado=d["pallet"]["kg_por_posicion_refrigerado"],
            factor_llenado=d["pallet"]["factor_llenado"],
            fraccion_en_sitio_cong=d["fraccion_en_sitio"]["congelado"],
            fraccion_en_sitio_refr=d["fraccion_en_sitio"]["refrigerado"],
            ocupacion_maxima_util=d["ocupacion_maxima_util"],
            horas_mes_por_persona=d["mano_obra"]["horas_mes_por_persona"],
            percentil_benchmark=d["densificacion"]["percentil_benchmark"],
            pesos=d["composicion"]["pesos"],
            orden_p=d["composicion"]["orden_p"],
            umbrales=[(u["hasta"], u["clase"]) for u in d["umbrales"]],
            escenarios={
                k: Escenario(k, v["factor_estacional"], v["nivel_servicio"], v["cv_inventario"])
                for k, v in d["escenarios"].items()
            },
            escenario_base=d["escenario_base"],
            crudo=d,
        )


# --------------------------------------------------------------------------
# Lectura y normalizacion de datos
# --------------------------------------------------------------------------

def _clave(nombre: str) -> str:
    """Clave de join insensible a tildes, mayusculas y espacios."""
    s = unicodedata.normalize("NFKD", str(nombre))
    s = s.encode("ascii", "ignore").decode("ascii")
    return " ".join(s.lower().split())


def _num(v):
    """Convierte a float, tratando 'S/D' y vacios como dato ausente."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    t = str(v).strip()
    if t == "" or t.upper() in {"S/D", "SD", "N/A", "NA", "-"}:
        return None
    try:
        return float(t.replace(".", "").replace(",", ".")) if "," in t else float(t)
    except ValueError:
        return None


@dataclass
class Sucursal:
    nombre: str
    m2: float | None = None
    posiciones: float | None = None
    cap_cong_kg: float | None = None
    cap_refr_kg: float | None = None
    cap_total_kg: float | None = None
    personas: float | None = None
    kg_hh: float | None = None
    demanda_2024: float | None = None
    demanda_2025: float | None = None
    demanda_mes: float | None = None
    doh_congelado: float | None = None
    doh_refrigerado: float | None = None
    faltantes: list[str] = field(default_factory=list)
    imputados: list[str] = field(default_factory=list)

    @property
    def evaluable(self) -> bool:
        return not self.faltantes


def leer_datos(ruta: Path) -> list[Sucursal]:
    wb = openpyxl.load_workbook(ruta, data_only=True)

    politica: dict[str, tuple[float | None, float | None]] = {}
    for fila in list(wb["Politica"].iter_rows(values_only=True))[1:]:
        if not fila or not fila[0]:
            continue
        politica[_clave(fila[0])] = (_num(fila[1]), _num(fila[2]))

    sucursales: list[Sucursal] = []
    vistos: set[str] = set()
    for fila in list(wb["Capacidad sucursales"].iter_rows(values_only=True))[1:]:
        if not fila or not fila[0]:
            continue
        k = _clave(fila[0])
        vistos.add(k)
        doh_c, doh_r = politica.get(k, (None, None))
        sucursales.append(
            Sucursal(
                nombre=str(fila[0]).strip(),
                m2=_num(fila[1]),
                posiciones=_num(fila[2]),
                cap_cong_kg=_num(fila[3]),
                cap_refr_kg=_num(fila[4]),
                cap_total_kg=_num(fila[5]),
                personas=_num(fila[6]),
                kg_hh=_num(fila[7]),
                demanda_2024=_num(fila[8]),
                demanda_2025=_num(fila[9]),
                demanda_mes=_num(fila[10]),
                doh_congelado=doh_c,
                doh_refrigerado=doh_r,
            )
        )

    huerfanas = sorted(set(politica) - vistos)
    return sucursales, huerfanas


# --------------------------------------------------------------------------
# Imputacion
# --------------------------------------------------------------------------

def imputar(sucursales: list[Sucursal], par: Parametros) -> dict:
    """
    Rellena huecos con relaciones estimadas de la propia red y deja registro de
    que se imputo. Solo se imputa capacidad: la demanda ausente no se inventa,
    porque es el numerador de todo el modelo.
    """
    completas = [s for s in sucursales if s.cap_total_kg and s.posiciones]

    # La hoja construye kg como posiciones x una densidad unica. Se recupera esa
    # constante en vez de fijarla a mano, para que el modelo siga la fuente.
    densidades = [s.cap_total_kg / s.posiciones for s in completas]
    kg_por_posicion = statistics.median(densidades)
    dispersion = (max(densidades) - min(densidades)) / kg_por_posicion

    cong = sum(s.cap_cong_kg for s in completas if s.cap_cong_kg is not None)
    tot = sum(s.cap_total_kg for s in completas)
    share_cong_red = cong / tot

    for s in sucursales:
        if s.cap_total_kg is None and s.posiciones:
            s.cap_total_kg = s.posiciones * kg_por_posicion
            s.imputados.append("cap_total_kg = posiciones x densidad_red")
        if s.cap_cong_kg is None and s.cap_total_kg:
            s.cap_cong_kg = s.cap_total_kg * share_cong_red
            s.cap_refr_kg = s.cap_total_kg - s.cap_cong_kg
            s.imputados.append("split camaras = share congelado de la red")

        for campo, etiqueta in (
            ("demanda_mes", "demanda promedio mensual"),
            ("doh_congelado", "DOH congelado"),
            ("doh_refrigerado", "DOH refrigerado"),
            ("posiciones", "posiciones"),
            ("personas", "dotacion"),
            ("kg_hh", "productividad kg/HH"),
        ):
            if getattr(s, campo) in (None, 0):
                s.faltantes.append(etiqueta)

    return {
        "kg_por_posicion_observado": kg_por_posicion,
        "dispersion_relativa": dispersion,
        "share_congelado_red": share_cong_red,
        "identidad_kg_posiciones": dispersion < 0.02,
    }


# --------------------------------------------------------------------------
# Nucleo del modelo
# --------------------------------------------------------------------------

def deducir_mix(sucursales: list[Sucursal], par: Parametros) -> dict:
    """
    Deduce el mix de demanda congelado a partir de la capacidad ya construida.

    El espacio que ocupa un regimen no es su participacion en volumen: es su
    participacion en volumen multiplicada por los dias que se guarda. Si la red
    fue dimensionada para la politica DOH, entonces

        K_C / K_R = (phi * DOH_C) / ((1 - phi) * DOH_R)

    y despejando phi se obtiene el mix implicito. Usar K_C/K_total directamente
    como mix sobreestima el congelado exactamente en el cociente DOH_C/DOH_R.
    """
    validas = [s for s in sucursales if s.evaluable]
    if not validas:
        return {}

    k_c = sum(s.cap_cong_kg for s in validas)
    k_r = sum(s.cap_refr_kg for s in validas)
    peso = sum(s.demanda_mes for s in validas)
    doh_c = sum(s.doh_congelado * s.demanda_mes for s in validas) / peso
    doh_r = sum(s.doh_refrigerado * s.demanda_mes for s in validas) / peso

    razon = (k_r / k_c) * (doh_c / doh_r)
    phi = 1.0 / (1.0 + razon)

    return {
        "mix_deducido": phi,
        "share_capacidad_congelado": k_c / (k_c + k_r),
        "doh_congelado_ponderado": doh_c,
        "doh_refrigerado_ponderado": doh_r,
        "sesgo_del_proxy_capacidad": (k_c / (k_c + k_r)) / phi,
    }


def clasificar(rho: float, umbrales) -> str:
    for hasta, clase in umbrales:
        if hasta is None or rho < hasta:
            return clase
    return umbrales[-1][1]


def mix_congelado(s: Sucursal, par: Parametros) -> float:
    if _clave(s.nombre) in par.mix_custom:
        return par.mix_custom[_clave(s.nombre)]
    if par.mix_modo == "capacidad" and s.cap_total_kg:
        return s.cap_cong_kg / s.cap_total_kg
    if par.mix_modo == "deducido" and par.mix_deducido is not None:
        return par.mix_deducido
    return par.mix_global


def evaluar(s: Sucursal, par: Parametros, esc: Escenario) -> dict:
    """Calcula todas las saturaciones de una sucursal bajo un escenario."""
    if not s.evaluable:
        return {"sucursal": s.nombre, "evaluable": False, "faltantes": s.faltantes}

    f_pk = esc.factor_peak
    phi = mix_congelado(s, par)

    # 1. Demanda diaria por regimen (kg/dia)
    d = s.demanda_mes / par.dias_mes
    d_c, d_r = phi * d, (1.0 - phi) * d

    # 2. Inventario objetivo que impone la politica DOH (kg). Solo la porcion que
    #    queda en sitio ocupa camara; el resto viaja y no consume posiciones.
    inv_c = d_c * s.doh_congelado * par.fraccion_en_sitio_cong
    inv_r = d_r * s.doh_refrigerado * par.fraccion_en_sitio_refr

    # 3. Sobrecarga estacional y estocastica (kg al percentil de servicio)
    req_c, req_r = inv_c * f_pk, inv_r * f_pk

    # 4. Conversion a posiciones de pallet
    pos_c = req_c / (par.kg_pos_congelado * par.factor_llenado)
    pos_r = req_r / (par.kg_pos_refrigerado * par.factor_llenado)

    # 5. Capacidad efectiva: el split en kg y en posiciones es el mismo
    beta = s.cap_cong_kg / s.cap_total_kg
    cap_pos_c = s.posiciones * beta * par.ocupacion_maxima_util
    cap_pos_r = s.posiciones * (1.0 - beta) * par.ocupacion_maxima_util
    cap_pos_total = s.posiciones * par.ocupacion_maxima_util

    # 6. Saturaciones
    rho_c = pos_c / cap_pos_c if cap_pos_c > 0 else float("inf")
    rho_r = pos_r / cap_pos_r if cap_pos_r > 0 else float("inf")
    rho_rigido = max(rho_c, rho_r)
    rho_flex = (pos_c + pos_r) / cap_pos_total

    hh_requeridas = s.demanda_mes / s.kg_hh
    hh_disponibles = s.personas * par.horas_mes_por_persona
    rho_hh = hh_requeridas / hh_disponibles

    rho_binding = max(rho_rigido, rho_hh)
    cuello = "almacenamiento" if rho_rigido >= rho_hh else "mano_obra"
    if cuello == "almacenamiento":
        cuello += " congelado" if rho_c >= rho_r else " refrigerado"

    p = par.orden_p
    w = par.pesos
    rho_comp = (
        w["almacenamiento"] * rho_rigido ** p + w["mano_obra"] * rho_hh ** p
    ) ** (1.0 / p)

    # 7. Diagnostico de balance entre camaras
    beta_requerido = pos_c / (pos_c + pos_r) if (pos_c + pos_r) > 0 else 0.0

    # 8. Descomposicion de rho_flex en dos factores independientes:
    #    rho = (DOH que pide la politica / DOH que cabe fisicamente)
    #          x (factor peak / ocupacion util maxima)
    doh_politica = (phi * s.doh_congelado * par.fraccion_en_sitio_cong
                    + (1.0 - phi) * s.doh_refrigerado * par.fraccion_en_sitio_refr)
    doh_fisico = s.cap_total_kg / d
    factor_politica = doh_politica / doh_fisico
    factor_operacion = f_pk / par.ocupacion_maxima_util

    return {
        "sucursal": s.nombre,
        "evaluable": True,
        "escenario": esc.nombre,
        "mix_congelado": phi,
        "demanda_dia_kg": d,
        "inv_objetivo_cong_kg": inv_c,
        "inv_objetivo_refr_kg": inv_r,
        "req_cong_kg": req_c,
        "req_refr_kg": req_r,
        "pos_req_cong": pos_c,
        "pos_req_refr": pos_r,
        "pos_req_total": pos_c + pos_r,
        "pos_disp_cong": cap_pos_c,
        "pos_disp_refr": cap_pos_r,
        "pos_disp_total": cap_pos_total,
        "rho_congelado": rho_c,
        "rho_refrigerado": rho_r,
        "rho_almacen_rigido": rho_rigido,
        "rho_almacen_flexible": rho_flex,
        "valor_flexibilidad": rho_rigido - rho_flex,
        "hh_requeridas_mes": hh_requeridas,
        "hh_disponibles_mes": hh_disponibles,
        "rho_mano_obra": rho_hh,
        "rho_binding": rho_binding,
        "cuello_botella": cuello,
        "rho_compuesto": rho_comp,
        "clase": clasificar(rho_binding, par.umbrales),
        "holgura_crecimiento": (1.0 / rho_binding - 1.0) if rho_binding > 0 else float("inf"),
        "doh_politica_ponderado": doh_politica,
        "doh_fisico_disponible": doh_fisico,
        "factor_politica": factor_politica,
        "factor_operacion": factor_operacion,
        "rotaciones_mes": s.demanda_mes / s.cap_total_kg,
        "share_cong_instalado": beta,
        "share_cong_requerido": beta_requerido,
        "desbalance_camara": beta_requerido - beta,
        "deficit_pos_cong": max(0.0, pos_c - cap_pos_c),
        "deficit_pos_refr": max(0.0, pos_r - cap_pos_r),
        "deficit_pos_neto": max(0.0, (pos_c + pos_r) - cap_pos_total),
        "imputados": list(s.imputados),
    }


# --------------------------------------------------------------------------
# Diagnosticos de red
# --------------------------------------------------------------------------

def percentil(valores: list[float], p: int) -> float:
    v = sorted(valores)
    if not v:
        return 0.0
    k = (len(v) - 1) * p / 100.0
    lo, hi = math.floor(k), math.ceil(k)
    return v[lo] if lo == hi else v[lo] + (v[hi] - v[lo]) * (k - lo)


def densificacion(sucursales: list[Sucursal], par: Parametros) -> list[dict]:
    """
    Los m2 no son una restriccion independiente: son el recurso que determina
    cuantas posiciones caben. Por eso se leen como palanca de expansion, no
    como una dimension mas de saturacion.
    """
    validas = [s for s in sucursales if s.m2 and s.posiciones]
    dens = [s.posiciones / s.m2 for s in validas]
    objetivo = percentil(dens, par.percentil_benchmark)

    filas = []
    for s in validas:
        actual = s.posiciones / s.m2
        potencial = s.m2 * objetivo
        filas.append(
            {
                "sucursal": s.nombre,
                "m2": s.m2,
                "posiciones": s.posiciones,
                "densidad_actual": actual,
                "densidad_benchmark": objetivo,
                "posiciones_potenciales": potencial,
                "posiciones_recuperables": max(0.0, potencial - s.posiciones),
                "brecha_relativa": max(0.0, potencial / s.posiciones - 1.0),
            }
        )
    return sorted(filas, key=lambda r: -r["posiciones_recuperables"])


def mix_de_equilibrio(s: Sucursal, par: Parametros) -> float | None:
    """
    Mix de congelado que igualaria la saturacion de ambas camaras. Comparado con
    el mix real dice si el problema es de tamano o de reparto entre camaras.
    """
    if not s.evaluable or not s.cap_total_kg:
        return None
    beta = s.cap_cong_kg / s.cap_total_kg
    if beta <= 0 or beta >= 1:
        return None
    razon = (s.doh_congelado / s.doh_refrigerado) * (par.kg_pos_congelado / par.kg_pos_refrigerado)
    return 1.0 / (1.0 + razon * (1.0 - beta) / beta)


def mix_de_quiebre(s: Sucursal, par: Parametros, esc: Escenario) -> float | None:
    """Mix de congelado con el que la sucursal llega justo a saturacion total."""
    if not s.evaluable:
        return None
    d = s.demanda_mes / par.dias_mes
    cap_kg = s.posiciones * par.ocupacion_maxima_util * par.kg_pos_congelado * par.factor_llenado
    dias_equivalentes = cap_kg / (d * esc.factor_peak)
    denom = (s.doh_congelado * par.fraccion_en_sitio_cong
             - s.doh_refrigerado * par.fraccion_en_sitio_refr)
    if abs(denom) < 1e-9:
        return None
    return (dias_equivalentes - s.doh_refrigerado * par.fraccion_en_sitio_refr) / denom


def sensibilidad_mix(sucursales: list[Sucursal], par: Parametros, esc: Escenario) -> list[dict]:
    """Como se mueve la saturacion de la red al variar el supuesto de mix."""
    filas = []
    for phi in [round(0.10 + 0.05 * i, 2) for i in range(11)]:
        p2 = Parametros(**{**par.__dict__, "mix_modo": "global", "mix_global": phi})
        res = [evaluar(s, p2, esc) for s in sucursales if s.evaluable]
        rigidos = [r["rho_almacen_rigido"] for r in res]
        filas.append(
            {
                "mix_congelado": phi,
                "rho_rigido_promedio": statistics.mean(rigidos),
                "rho_rigido_mediana": statistics.median(rigidos),
                "sucursales_sobre_100": sum(1 for r in res if r["rho_binding"] > 1.0),
                "sucursales_criticas": sum(1 for r in res if r["rho_binding"] > 0.95),
            }
        )
    return filas


# --------------------------------------------------------------------------
# Salidas
# --------------------------------------------------------------------------

def escribir_csv(ruta: Path, filas: list[dict]) -> None:
    if not filas:
        return
    campos = list(filas[0].keys())
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
        w.writeheader()
        for fila in filas:
            w.writerow({k: (round(v, 6) if isinstance(v, float) else v) for k, v in fila.items()})


def ejecutar(ruta_datos: Path, ruta_params: Path, salida: Path) -> dict:
    par = Parametros.desde_json(ruta_params)
    sucursales, huerfanas = leer_datos(ruta_datos)
    calibracion = imputar(sucursales, par)

    deduccion = deducir_mix(sucursales, par)
    par.mix_deducido = deduccion.get("mix_deducido")
    calibracion.update(deduccion)

    salida.mkdir(parents=True, exist_ok=True)

    # Entrada ya normalizada e imputada, en las claves que consume el servicio JS.
    # Es el contrato entre ambas implementaciones y lo que verifica paridad.mjs.
    (salida / "entrada.json").write_text(
        json.dumps(
            [
                {
                    "nombre": s.nombre,
                    "m2": s.m2,
                    "posiciones": s.posiciones,
                    "capCongKg": s.cap_cong_kg,
                    "capRefrKg": s.cap_refr_kg,
                    "capTotalKg": s.cap_total_kg,
                    "personas": s.personas,
                    "kgHh": s.kg_hh,
                    "demandaMes": s.demanda_mes,
                    "dohCongelado": s.doh_congelado,
                    "dohRefrigerado": s.doh_refrigerado,
                }
                for s in sucursales
            ],
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    resultados: dict[str, list[dict]] = {}
    for nombre, esc in par.escenarios.items():
        filas = [evaluar(s, par, esc) for s in sucursales]
        evaluables = [f for f in filas if f["evaluable"]]
        resultados[nombre] = sorted(evaluables, key=lambda r: -r["rho_binding"])
        escribir_csv(salida / f"saturacion_{nombre}.csv", resultados[nombre])

    base = par.escenarios[par.escenario_base]
    dens = densificacion(sucursales, par)
    escribir_csv(salida / "densificacion.csv", dens)

    sens = sensibilidad_mix(sucursales, par, base)
    escribir_csv(salida / "sensibilidad_mix.csv", sens)

    equilibrio = [
        {
            "sucursal": s.nombre,
            "mix_instalado_implicito": mix_de_equilibrio(s, par),
            "mix_de_quiebre": mix_de_quiebre(s, par, base),
            "mix_supuesto": mix_congelado(s, par),
        }
        for s in sucursales
        if s.evaluable
    ]
    escribir_csv(salida / "mix_diagnostico.csv", equilibrio)

    resumen = {
        "escenario_base": par.escenario_base,
        "factor_peak_por_escenario": {k: v.factor_peak for k, v in par.escenarios.items()},
        "calibracion": calibracion,
        "sucursales_evaluadas": len(resultados[par.escenario_base]),
        "sucursales_no_evaluables": [
            {"sucursal": s.nombre, "faltantes": s.faltantes} for s in sucursales if not s.evaluable
        ],
        "sucursales_en_politica_sin_capacidad": huerfanas,
        "resultados": resultados,
        "densificacion": dens,
        "sensibilidad_mix": sens,
        "mix_diagnostico": equilibrio,
    }
    (salida / "resumen.json").write_text(
        json.dumps(resumen, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return resumen


def imprimir(resumen: dict, par_path: Path) -> None:
    par = Parametros.desde_json(par_path)
    base = resumen["escenario_base"]
    filas = resumen["resultados"][base]

    print(f"\nCalibracion desde los datos")
    c = resumen["calibracion"]
    print(f"  kg por posicion observado : {c['kg_por_posicion_observado']:.1f}")
    print(f"  dispersion entre sucursales: {c['dispersion_relativa']*100:.2f}%")
    print(f"  kg es columna derivada de posiciones: {c['identidad_kg_posiciones']}")
    print(f"  share congelado instalado : {c['share_congelado_red']:.3f}")
    print(f"  DOH ponderado C / R       : {c['doh_congelado_ponderado']:.2f} / "
          f"{c['doh_refrigerado_ponderado']:.2f}")
    print(f"  mix congelado deducido    : {c['mix_deducido']:.3f}  "
          f"(el proxy de capacidad lo sobreestima {c['sesgo_del_proxy_capacidad']:.2f}x)")
    print(f"\nFactor peak por escenario: " +
          "  ".join(f"{k}={v:.3f}" for k, v in resumen["factor_peak_por_escenario"].items()))

    print(f"\nSaturacion por sucursal — escenario {base}")
    print(f"{'Sucursal':<15}{'rho_C':>7}{'rho_R':>7}{'rho_alm':>9}{'rho_flex':>9}"
          f"{'rho_HH':>8}{'BIND':>7}  {'clase':<12}{'cuello':<26}{'crec.':>7}")
    for r in filas:
        print(f"{r['sucursal']:<15}{r['rho_congelado']:>7.2f}{r['rho_refrigerado']:>7.2f}"
              f"{r['rho_almacen_rigido']:>9.2f}{r['rho_almacen_flexible']:>9.2f}"
              f"{r['rho_mano_obra']:>8.2f}{r['rho_binding']:>7.2f}  {r['clase']:<12}"
              f"{r['cuello_botella']:<26}{r['holgura_crecimiento']*100:>6.0f}%")

    print(f"\nDescomposicion  rho_flex = (DOH politica / DOH fisico) x (peak / ocupacion util)")
    print(f"{'Sucursal':<15}{'DOH_pol':>9}{'DOH_fis':>9}{'f_pol':>8}{'f_ope':>8}"
          f"{'rho_flex':>10}{'rot/mes':>9}")
    for r in sorted(filas, key=lambda x: -x["factor_politica"]):
        print(f"{r['sucursal']:<15}{r['doh_politica_ponderado']:>9.2f}"
              f"{r['doh_fisico_disponible']:>9.2f}{r['factor_politica']:>8.2f}"
              f"{r['factor_operacion']:>8.2f}{r['rho_almacen_flexible']:>10.2f}"
              f"{r['rotaciones_mes']:>9.1f}")

    print(f"\nDesbalance de camara (requerido - instalado, en share de congelado)")
    for r in sorted(filas, key=lambda x: -abs(x["desbalance_camara"]))[:8]:
        print(f"  {r['sucursal']:<15} instalado={r['share_cong_instalado']:.3f}  "
              f"requerido={r['share_cong_requerido']:.3f}  "
              f"delta={r['desbalance_camara']:+.3f}  "
              f"valor de flexibilidad={r['valor_flexibilidad']:.2f}")

    print(f"\nPalanca de densificacion (re-racking al percentil "
          f"{par.percentil_benchmark} de la red)")
    for r in resumen["densificacion"][:8]:
        print(f"  {r['sucursal']:<15} {r['densidad_actual']:.2f} -> "
              f"{r['densidad_benchmark']:.2f} pos/m2   "
              f"+{r['posiciones_recuperables']:.0f} posiciones "
              f"({r['brecha_relativa']*100:.0f}%)")

    print(f"\nSensibilidad al supuesto de mix congelado")
    print(f"  {'mix':>6}{'rho medio':>11}{'rho mediana':>13}{'>100%':>8}{'>95%':>7}")
    for r in resumen["sensibilidad_mix"]:
        print(f"  {r['mix_congelado']:>6.2f}{r['rho_rigido_promedio']:>11.2f}"
              f"{r['rho_rigido_mediana']:>13.2f}{r['sucursales_sobre_100']:>8}"
              f"{r['sucursales_criticas']:>7}")

    if resumen["sucursales_no_evaluables"]:
        print(f"\nNo evaluables por datos faltantes")
        for s in resumen["sucursales_no_evaluables"]:
            print(f"  {s['sucursal']}: falta {', '.join(s['faltantes'])}")
    if resumen["sucursales_en_politica_sin_capacidad"]:
        print(f"\nCon politica DOH pero sin capacidad declarada")
        print("  " + ", ".join(resumen["sucursales_en_politica_sin_capacidad"]))


def main() -> None:
    ap = argparse.ArgumentParser(description="Modelo de saturacion de sucursales")
    ap.add_argument("--datos", type=Path, default=RAIZ / "datos" / "satura_nuevo_modelo.xlsx")
    ap.add_argument("--parametros", type=Path, default=RAIZ / "parametros.json")
    ap.add_argument("--salida", type=Path, default=RAIZ / "salidas")
    ap.add_argument("--silencioso", action="store_true")
    args = ap.parse_args()

    resumen = ejecutar(args.datos, args.parametros, args.salida)
    if not args.silencioso:
        imprimir(resumen, args.parametros)
    print(f"\nResultados escritos en {args.salida}")


if __name__ == "__main__":
    main()
