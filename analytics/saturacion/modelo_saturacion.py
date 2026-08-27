#!/usr/bin/env python3
"""
Modelo de SATURACION de sucursales — Operaciones Nacionales, red de frio.

El calculo es SUCURSAL POR SUCURSAL. No hay totales de red: las sucursales no
son comparables en magnitudes absolutas (kg, m2, posiciones). Lo unico
comparable es rho, que es adimensional porque cada sucursal se mide contra su
propia capacidad instalada.

DOS ETAPAS SEPARADAS, que nunca se mezclan en un mismo numero:

  ETAPA 1 — SATURACION ESTRUCTURAL
      Mide si el inventario que exige la politica DOH cabe en las camaras.
      Es "LA saturacion":  rho* = max(rho_C, rho_R).

  ETAPA 2 — SATURACION OPERACIONAL   (condicional)
      Solo se evalua cuando la sucursal SI tiene m2 libres, es decir cuando el
      inventario cabe en la superficie total. Mide si esos m2 que sobran
      alcanzan para que opere la gente del turno mas cargado, a razon de
      36 m2 por persona. Responde: "tiene espacio para guardar, pero tiene
      espacio para operar?"

Si no hay m2 libres, la etapa 2 no se calcula: no existe superficie sobre la
cual preguntarse por la operacion.

RED DE ABASTECIMIENTO: una sucursal que abastece a otras mueve tambien el
volumen de sus abastecidas. Antofagasta abastece a Arica, Iquique y Calama, y
ese volumen se suma a su flujo. Las abastecidas conservan su propio volumen
para su propio calculo: el kilo pasa por el hub y ademas se guarda en el spoke.

POLITICA: las politicas DOH entregadas son las que miden la saturacion. Se
pueden escalar para simular, pero el resultado de referencia siempre es el de
la politica vigente.

Todo corre en aritmetica racional exacta. Ver verificar.py.

    python3 modelo_saturacion.py
"""

from __future__ import annotations

import argparse
import csv
import json
import unicodedata
from dataclasses import dataclass, field
from fractions import Fraction as Q
from pathlib import Path

RAIZ = Path(__file__).resolve().parent


# ---------------------------------------------------------------------------
# Red de abastecimiento
# ---------------------------------------------------------------------------

# Sucursal que abastece -> sucursales abastecidas. El volumen de las abastecidas
# se suma al flujo de la que abastece, porque fisicamente pasa por sus camaras.
RED_ABASTECIMIENTO: dict[str, list[str]] = {
    "Antofagasta": ["Arica", "Iquique", "Calama"],
}


# ---------------------------------------------------------------------------
# Parametros
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Parametros:
    dias_mes: Q = Q(3044, 100)          # 30,44 dias por mes
    kg_por_posicion: Q = Q(459)         # gamma
    aprovechamiento: Q = Q(1)           # u
    m2_por_persona: Q = Q(36)           # a0, norma de ocupacion
    turnos: tuple = (
        ("mañana", Q(20, 100)),
        ("tarde",  Q(40, 100)),
        ("noche",  Q(40, 100)),
    )
    mix_congelado: Q | None = None      # phi; None = deducir
    factor_doh_c: Q = Q(1)              # escalado de politica, solo simulacion
    factor_doh_r: Q = Q(1)
    fraccion_hub: Q = Q(1)              # porcion del volumen abastecido que pasa por el hub
    # Fórmula unificada: factor de empuje por sobrestocks
    factor_empuje_alpha: Q = Q(0)       # fracción de sobrestocks que llega (0 a 1)
    sobrestocks_ratio: Q = Q(0)         # ratio de sobrestocks en planta / demanda base

    def validar(self) -> None:
        s = sum(w for _, w in self.turnos)
        if s != 1:
            raise ValueError(f"los turnos deben sumar 1, suman {s}")
        if any(w < 0 for _, w in self.turnos):
            raise ValueError("ningun turno puede tener participacion negativa")
        for nombre, v in (("dias_mes", self.dias_mes),
                          ("kg_por_posicion", self.kg_por_posicion),
                          ("m2_por_persona", self.m2_por_persona)):
            if v <= 0:
                raise ValueError(f"{nombre} debe ser positivo, es {v}")
        if not (0 < self.aprovechamiento <= 1):
            raise ValueError(f"aprovechamiento debe estar en (0,1], es {self.aprovechamiento}")
        if self.mix_congelado is not None and not (0 < self.mix_congelado < 1):
            raise ValueError(f"mix_congelado debe estar en (0,1), es {self.mix_congelado}")
        for nombre, v in (("factor_doh_c", self.factor_doh_c),
                          ("factor_doh_r", self.factor_doh_r)):
            if v <= 0:
                raise ValueError(f"{nombre} debe ser positivo, es {v}")
        if not (0 <= self.fraccion_hub <= 1):
            raise ValueError(f"fraccion_hub debe estar en [0,1], es {self.fraccion_hub}")
        if not (0 <= self.factor_empuje_alpha <= 1):
            raise ValueError(f"factor_empuje_alpha debe estar en [0,1], es {self.factor_empuje_alpha}")
        if not (0 <= self.sobrestocks_ratio <= 1):
            raise ValueError(f"sobrestocks_ratio debe estar en [0,1], es {self.sobrestocks_ratio}")

    @property
    def sigma_peak(self) -> Q:
        return max(w for _, w in self.turnos)

    @property
    def turno_peak(self) -> str:
        return max(self.turnos, key=lambda t: t[1])[0]


# ---------------------------------------------------------------------------
# Datos
# ---------------------------------------------------------------------------

def clave(nombre: str) -> str:
    s = unicodedata.normalize("NFKD", str(nombre)).encode("ascii", "ignore").decode()
    return " ".join(s.lower().split())


def q(v) -> Q | None:
    """A racional exacto. Fraction(float) toma el valor binario exacto de Excel."""
    if v is None:
        return None
    if isinstance(v, str):
        t = v.strip()
        if t == "" or t.upper() in {"S/D", "SD", "N/A", "NA", "-"}:
            return None
        v = float(t)
    return Q(v)


@dataclass
class Sucursal:
    nombre: str
    m2: Q | None
    posiciones: Q | None
    cap_cong_kg: Q | None
    cap_refr_kg: Q | None
    cap_total_kg: Q | None
    personas: Q | None
    demanda_mes: Q | None
    doh_congelado: Q | None
    doh_refrigerado: Q | None
    abastece: list = field(default_factory=list)
    faltantes: list = field(default_factory=list)

    def revisar(self) -> None:
        campos = {
            "m2": self.m2, "posiciones": self.posiciones,
            "capacidad congelado": self.cap_cong_kg,
            "capacidad refrigerado": self.cap_refr_kg,
            "capacidad total": self.cap_total_kg,
            "dotacion": self.personas, "demanda mensual": self.demanda_mes,
            "DOH congelado": self.doh_congelado,
            "DOH refrigerado": self.doh_refrigerado,
        }
        self.faltantes = [k for k, v in campos.items() if v is None or v <= 0]

    @property
    def evaluable(self) -> bool:
        return not self.faltantes


def ingerir_xlsx(ruta_xlsx: Path, destino: Path) -> list[dict]:
    """
    Lee la planilla original y deja la entrada normalizada en JSON. Es el unico
    punto donde el modelo toca el archivo Excel; de ahi en adelante trabaja sobre
    un contrato estable que ademas consume el nucleo JS.

    Une la hoja de capacidades con la de politicas por nombre insensible a
    tildes: la planilla escribe "Chillán" en una hoja y "Chillan" en la otra.
    """
    import openpyxl

    wb = openpyxl.load_workbook(ruta_xlsx, data_only=True)
    politica = {}
    for fila in list(wb["Politica"].iter_rows(values_only=True))[1:]:
        if fila and fila[0]:
            politica[clave(fila[0])] = (fila[1], fila[2])

    def num(v):
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        t = str(v).strip()
        if t == "" or t.upper() in {"S/D", "SD", "N/A", "NA", "-"}:
            return None
        try:
            return float(t)
        except ValueError:
            return None

    filas = []
    for f in list(wb["Capacidad sucursales"].iter_rows(values_only=True))[1:]:
        if not f or not f[0]:
            continue
        doh_c, doh_r = politica.get(clave(f[0]), (None, None))
        filas.append({
            "nombre": str(f[0]).strip(), "m2": num(f[1]), "posiciones": num(f[2]),
            "capCongKg": num(f[3]), "capRefrKg": num(f[4]), "capTotalKg": num(f[5]),
            "personas": num(f[6]), "demandaMes": num(f[10]),
            "dohCongelado": num(doh_c), "dohRefrigerado": num(doh_r),
        })

    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(filas, indent=1, ensure_ascii=False), encoding="utf-8")
    return filas


def leer(ruta: Path) -> list[Sucursal]:
    filas = json.loads(ruta.read_text(encoding="utf-8"))
    out = []
    for f in filas:
        s = Sucursal(
            nombre=f["nombre"], m2=q(f["m2"]), posiciones=q(f["posiciones"]),
            cap_cong_kg=q(f["capCongKg"]), cap_refr_kg=q(f["capRefrKg"]),
            cap_total_kg=q(f["capTotalKg"]), personas=q(f["personas"]),
            demanda_mes=q(f["demandaMes"]), doh_congelado=q(f["dohCongelado"]),
            doh_refrigerado=q(f["dohRefrigerado"]),
            abastece=list(RED_ABASTECIMIENTO.get(f["nombre"], [])),
        )
        s.revisar()
        out.append(s)
    return out


def demanda_efectiva(s: Sucursal, indice: dict[str, Sucursal], par: Parametros) -> tuple[Q, Q]:
    """
    Flujo que realmente mueve la sucursal: el propio mas el de las sucursales que
    abastece. Devuelve (efectiva, aportada_por_terceros).
    """
    aporte = Q(0)
    for nombre in s.abastece:
        otra = indice.get(clave(nombre))
        if otra is not None and otra.demanda_mes:
            aporte += par.fraccion_hub * otra.demanda_mes
    return s.demanda_mes + aporte, aporte


# ---------------------------------------------------------------------------
# Mix de demanda
# ---------------------------------------------------------------------------

def deducir_mix(sucursales: list[Sucursal]) -> dict:
    """
    El espacio que ocupa un regimen es su volumen por los dias que se guarda.
    De  K_C/K_R = (phi·DOH_C)/((1-phi)·DOH_R)  se despeja phi.

    Se pondera con la demanda PROPIA de cada sucursal: el mix es una propiedad
    del producto que se vende, y el volumen que pasa por un hub no debe contarse
    dos veces al estimarlo.
    """
    v = [s for s in sucursales if s.evaluable]
    k_c = sum(s.cap_cong_kg for s in v)
    k_r = sum(s.cap_refr_kg for s in v)
    peso = sum(s.demanda_mes for s in v)
    doh_c = sum(s.doh_congelado * s.demanda_mes for s in v) / peso
    doh_r = sum(s.doh_refrigerado * s.demanda_mes for s in v) / peso
    phi = 1 / (1 + (k_r / k_c) * (doh_c / doh_r))
    return {
        "phi": phi,
        "share_capacidad_congelado": k_c / (k_c + k_r),
        "doh_c_ponderado": doh_c,
        "doh_r_ponderado": doh_r,
        "sesgo_proxy_capacidad": (k_c / (k_c + k_r)) / phi,
    }


# ---------------------------------------------------------------------------
# Nucleo — dos etapas
# ---------------------------------------------------------------------------

def evaluar(s: Sucursal, par: Parametros, phi: Q, indice: dict[str, Sucursal]) -> dict:
    if not s.evaluable:
        return {"sucursal": s.nombre, "evaluable": False, "faltantes": s.faltantes}

    a0, gamma, u = par.m2_por_persona, par.kg_por_posicion, par.aprovechamiento
    doh_c = s.doh_congelado * par.factor_doh_c
    doh_r = s.doh_refrigerado * par.factor_doh_r

    # (0) Red de abastecimiento: el flujo incluye lo que se despacha a terceros.
    d_ef, aporte = demanda_efectiva(s, indice, par)

    # Factor de empuje (sobrestocks): amplía la demanda por kilos no demandados
    # que llegan a la sucursal. Fórmula unificada: ρ = Demanda_eff * (1 + α*s) / Capacidad
    factor_empuje = 1 + par.factor_empuje_alpha * par.sobrestocks_ratio
    d_ef_ajustado = d_ef * factor_empuje

    # ================= ETAPA 1 — SATURACION ESTRUCTURAL =====================

    # (1) Flujo diario por regimen
    d = d_ef_ajustado / par.dias_mes
    d_c, d_r = phi * d, (1 - phi) * d

    # (2) Politica: DOH ponderado por el mix
    doh_pol = phi * doh_c + (1 - phi) * doh_r

    # (3) Capacidad en posiciones. Las posiciones son la unica fuente de verdad:
    #     en la planilla los kg son columna derivada (kg = posiciones x 458,9).
    beta = s.cap_cong_kg / s.cap_total_kg
    pos_tot = s.posiciones * u
    pos_c, pos_r = pos_tot * beta, pos_tot * (1 - beta)

    # (4) Requerimiento en posiciones
    n_c = d_c * doh_c / gamma
    n_r = d_r * doh_r / gamma
    n_tot = n_c + n_r

    # (5) DOH fisico: dias que cada camara alcanza a cubrir de su propio flujo
    doh_fis_c = pos_c * gamma / d_c
    doh_fis_r = pos_r * gamma / d_r
    doh_fis_tot = pos_tot * gamma / d

    # (6) Saturacion estructural. Identidad: rho = n/P = DOH_politica/DOH_fisico
    rho_c = n_c / pos_c
    rho_r = n_r / pos_r
    rho_estructural = max(rho_c, rho_r)     # camaras fijas: manda la peor
    rho_flex = n_tot / pos_tot              # ocupacion de la superficie total

    # (7) Participacion de la politica. rho es lineal en (DOH_C, DOH_R).
    e_c = phi * doh_c / doh_pol
    e_r = (1 - phi) * doh_r / doh_pol

    # ============ ETAPA 2 — SATURACION OPERACIONAL (condicional) ============

    # (8) Superficie que ocupa el inventario y la que queda libre.
    #     Identidad exacta:  A_libre = A · (1 − rho_flex)
    densidad = s.posiciones / s.m2
    m2_uso = n_tot / densidad
    m2_libre = s.m2 - m2_uso

    # (9) Superficie que exige la operacion: la gente del turno mas cargado,
    #     a razon de a0 m2 por persona. El reparto de turnos entra aqui y solo
    #     aqui, porque lo que importa es la CONCURRENCIA.
    personas_peak = s.personas * par.sigma_peak
    m2_operacion = personas_peak * a0

    # (10) La etapa 2 solo existe si hay superficie libre sobre la cual preguntar.
    hay_espacio_m2 = m2_libre > 0
    if hay_espacio_m2:
        rho_operacional = m2_operacion / m2_libre
        personas_que_caben = m2_libre / a0
    else:
        rho_operacional = None
        personas_que_caben = Q(0)

    # (11) Diagnostico. Los dos veredictos se reportan INDEPENDIENTES: fundirlos
    #      en una sola etiqueta esconderia una camara desbordada detras de un
    #      diagnostico operacional, o al reves.
    camara_critica = "congelado" if rho_c >= rho_r else "refrigerado"
    saturado_estructural = rho_estructural > 1
    saturado_operacional = (rho_operacional > 1) if hay_espacio_m2 else None

    if saturado_estructural and saturado_operacional:
        estado = "estructural y operacional"
        detalle = f"la camara de {camara_critica} desborda y la operacion no cabe"
    elif saturado_estructural:
        estado = "saturacion estructural"
        detalle = (f"la camara de {camara_critica} desborda" if hay_espacio_m2
                   else "el inventario de politica no cabe en la superficie")
    elif saturado_operacional:
        estado = "saturacion operacional"
        detalle = "el inventario cabe, la operacion no"
    else:
        estado = "sin saturacion"
        detalle = ("cabe el inventario y cabe la operacion" if hay_espacio_m2
                   else "el inventario cabe justo, sin superficie libre")


    # (12) Politicas de quiebre, en forma cerrada. Sin busqueda numerica.
    doh_c_quiebre = doh_fis_c                  # rho_C = 1
    doh_r_quiebre = doh_fis_r                  # rho_R = 1
    doh_c_quiebre_flex = (doh_fis_tot - (1 - phi) * doh_r) / phi
    # rho_op = 1  <=>  A·(1 − rho_flex) = m2_operacion  <=>  rho_flex = 1 − m2_op/A
    rho_flex_quiebre_op = 1 - m2_operacion / s.m2
    doh_pol_quiebre_op = doh_fis_tot * rho_flex_quiebre_op
    op_alcanzable = rho_flex_quiebre_op > 0    # si no, ni con inventario cero cabe la gente

    turnos = [{
        "turno": nombre,
        "participacion": w,
        "personas": s.personas * w,
        "m2_requeridos": s.personas * w * a0,
        "holgura_m2": m2_libre - s.personas * w * a0,
        "es_peak": w == par.sigma_peak,
    } for nombre, w in par.turnos]

    return {
        "sucursal": s.nombre, "evaluable": True,
        "abastece": list(s.abastece),
        "demanda_propia": s.demanda_mes,
        "demanda_aportada": aporte,
        "demanda_efectiva": d_ef,
        "demanda_efectiva_ajustada": d_ef_ajustado,
        "factor_empuje": factor_empuje,
        "factor_hub": d_ef / s.demanda_mes,
        "demanda_dia_kg": d, "mix_congelado": phi,
        "doh_politica_c": doh_c, "doh_politica_r": doh_r,
        "doh_politica_ponderado": doh_pol,
        "doh_fisico_c": doh_fis_c, "doh_fisico_r": doh_fis_r,
        "doh_fisico_total": doh_fis_tot,
        "pos_req_c": n_c, "pos_req_r": n_r, "pos_req_total": n_tot,
        "pos_disp_c": pos_c, "pos_disp_r": pos_r, "pos_disp_total": pos_tot,
        "rho_congelado": rho_c, "rho_refrigerado": rho_r,
        "rho_estructural": rho_estructural, "rho_flex": rho_flex,
        "camara_critica": camara_critica,
        "share_cong_instalado": beta, "share_cong_requerido": n_c / n_tot,
        "desbalance_camara": n_c / n_tot - beta,
        "elasticidad_doh_c": e_c, "elasticidad_doh_r": e_r,
        "derivada_rho_doh_c": phi / doh_fis_tot,
        "derivada_rho_doh_r": (1 - phi) / doh_fis_tot,
        "densidad_pos_m2": densidad,
        "m2_total": s.m2, "m2_uso": m2_uso, "m2_libre": m2_libre,
        "m2_operacion": m2_operacion,
        "personas_total": s.personas, "personas_peak": personas_peak,
        "personas_que_caben": personas_que_caben,
        "turno_peak": par.turno_peak, "turnos": turnos,
        "hay_espacio_m2": hay_espacio_m2,
        "rho_operacional": rho_operacional,
        "saturado_estructural": saturado_estructural,
        "saturado_operacional": saturado_operacional,
        "estado": estado, "detalle_estado": detalle,
        "kappa_estructural": 1 / rho_estructural,
        "doh_c_quiebre": doh_c_quiebre, "doh_r_quiebre": doh_r_quiebre,
        "doh_c_quiebre_flexible": doh_c_quiebre_flex,
        "doh_c_quiebre_flexible_factible": doh_c_quiebre_flex >= 0,
        "doh_pol_quiebre_operacional": doh_pol_quiebre_op,
        "operacion_alcanzable": op_alcanzable,
    }


def ejecutar(entrada: Path, par: Parametros) -> dict:
    par.validar()
    sucursales = leer(entrada)
    indice = {clave(s.nombre): s for s in sucursales}
    ded = deducir_mix(sucursales)
    phi = par.mix_congelado if par.mix_congelado is not None else ded["phi"]

    filas = [evaluar(s, par, phi, indice) for s in sucursales]
    ev = [f for f in filas if f["evaluable"]]
    ev.sort(key=lambda r: -r["rho_estructural"])
    return {
        "parametros": par, "phi": phi, "deduccion": ded,
        "resultados": ev,
        "no_evaluables": [f for f in filas if not f["evaluable"]],
    }


# ---------------------------------------------------------------------------
# Salida
# ---------------------------------------------------------------------------

def f(x, n=4):
    return None if x is None else round(float(x), n)


def serializar(r: dict) -> dict:
    def conv(o):
        if isinstance(o, Q):
            return float(o)
        if isinstance(o, dict):
            return {k: conv(v) for k, v in o.items()}
        if isinstance(o, list):
            return [conv(v) for v in o]
        return o
    par = r["parametros"]
    return {
        "modelo": "saturacion — etapa estructural y etapa operacional condicional",
        "sin_totales": "el calculo es por sucursal; no se agregan magnitudes entre sucursales",
        "parametros": {
            "dias_mes": float(par.dias_mes),
            "kg_por_posicion": float(par.kg_por_posicion),
            "aprovechamiento": float(par.aprovechamiento),
            "m2_por_persona": float(par.m2_por_persona),
            "turnos": {n: float(w) for n, w in par.turnos},
            "fraccion_hub": float(par.fraccion_hub),
        },
        "red_abastecimiento": RED_ABASTECIMIENTO,
        "mix_congelado": float(r["phi"]),
        "deduccion_mix": conv(r["deduccion"]),
        "resultados": conv(r["resultados"]),
        "no_evaluables": conv(r["no_evaluables"]),
    }


def imprimir(r: dict) -> None:
    par = r["parametros"]
    print("\nMODELO DE SATURACION — OPERACIONES NACIONALES")
    print(f"  mix congelado phi   : {f(r['phi'],6)}  (deducido)")
    print(f"  norma de ocupacion  : {f(par.m2_por_persona,0)} m2/persona")
    print(f"  turnos              : " + " · ".join(f"{n} {float(w)*100:.0f}%" for n, w in par.turnos)
          + f"   (peak: {par.turno_peak})")
    print(f"  red de abastecimiento: " + "; ".join(
        f"{k} -> {', '.join(v)}" for k, v in RED_ABASTECIMIENTO.items()))

    print("\nETAPA 1 — SATURACION ESTRUCTURAL   (rho* = max(rho_C, rho_R))")
    print(f"{'Sucursal':<14}{'D efectiva':>12}{'hub':>6}{'DOHpol':>8}{'DOHfis':>8}"
          f"{'rho_C':>7}{'rho_R':>7}{'RHO*':>7}{'rho_flex':>9}  camara")
    for x in r["resultados"]:
        print(f"{x['sucursal']:<14}{f(x['demanda_efectiva'],0):>12,.0f}"
              f"{f(x['factor_hub'],2):>6}{f(x['doh_politica_ponderado'],2):>8}"
              f"{f(x['doh_fisico_total'],2):>8}{f(x['rho_congelado'],2):>7}"
              f"{f(x['rho_refrigerado'],2):>7}{f(x['rho_estructural'],2):>7}"
              f"{f(x['rho_flex'],2):>9}  {x['camara_critica']}")

    print(f"\nETAPA 2 — SATURACION OPERACIONAL   (solo si hay m2 libres; turno {par.turno_peak})")
    print(f"{'Sucursal':<14}{'m2 total':>10}{'m2 uso':>10}{'m2 libre':>10}"
          f"{'pers peak':>11}{'m2 oper':>9}{'rho_op':>8}  estado")
    for x in r["resultados"]:
        rop = f(x["rho_operacional"], 2)
        print(f"{x['sucursal']:<14}{f(x['m2_total'],0):>10}{f(x['m2_uso'],0):>10}"
              f"{f(x['m2_libre'],0):>10}{f(x['personas_peak'],1):>11}"
              f"{f(x['m2_operacion'],0):>9}{(f'{rop:8.2f}' if rop is not None else '       —')}"
              f"  {x['estado']}")

    if r["no_evaluables"]:
        print("\nNO EVALUABLES")
        for x in r["no_evaluables"]:
            print(f"  {x['sucursal']}: falta {', '.join(x['faltantes'])}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Saturacion de sucursales — dos etapas")
    ap.add_argument("--xlsx", type=Path, default=RAIZ / "datos" / "satura_nuevo_modelo.xlsx")
    ap.add_argument("--entrada", type=Path, default=RAIZ / "salidas" / "entrada.json")
    ap.add_argument("--sin-ingesta", action="store_true",
                    help="usar salidas/entrada.json tal como esta, sin releer el xlsx")
    ap.add_argument("--salida", type=Path, default=RAIZ / "salidas")
    ap.add_argument("--silencioso", action="store_true")
    a = ap.parse_args()

    if not a.sin_ingesta:
        if not a.xlsx.exists():
            raise SystemExit(f"no se encuentra la planilla {a.xlsx}")
        filas = ingerir_xlsx(a.xlsx, a.entrada)
        print(f"ingesta: {len(filas)} sucursales leidas de {a.xlsx.name}")

    r = ejecutar(a.entrada, Parametros())
    a.salida.mkdir(parents=True, exist_ok=True)
    (a.salida / "saturacion.json").write_text(
        json.dumps(serializar(r), indent=1, ensure_ascii=False), encoding="utf-8")

    campos = ["sucursal", "demanda_propia", "demanda_aportada", "demanda_efectiva",
              "doh_politica_ponderado", "doh_fisico_total", "rho_congelado",
              "rho_refrigerado", "rho_estructural", "rho_flex", "camara_critica",
              "m2_total", "m2_uso", "m2_libre", "personas_total", "personas_peak",
              "m2_operacion", "rho_operacional", "estado", "elasticidad_doh_c",
              "elasticidad_doh_r", "kappa_estructural", "doh_c_quiebre", "doh_r_quiebre",
              "doh_pol_quiebre_operacional", "desbalance_camara"]
    with (a.salida / "saturacion.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(campos)
        for x in r["resultados"]:
            w.writerow([f(x[c], 6) if isinstance(x[c], Q) else x[c] for c in campos])

    if not a.silencioso:
        imprimir(r)
    print(f"\nResultados en {a.salida}/saturacion.json y saturacion.csv")


if __name__ == "__main__":
    main()
