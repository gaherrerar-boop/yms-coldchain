#!/usr/bin/env python3
"""
Modelo de SATURACION ESTRUCTURAL de sucursales de cadena de frio.

Estructural significa: solo capacidad instalada contra lo que exige la politica
DOH. Sin factor estacional, sin nivel de servicio, sin variabilidad. Todo lo que
entra es medible en la planilla o es un parametro declarado. El resultado es
exacto y auditable: cada rho se puede reconstruir a mano con una division.

Dos dimensiones estructurales:

  ALMACENAMIENTO  posiciones que pide la politica / posiciones instaladas
  DOTACION        personas que pide el area en uso / dotacion real,
                  con la norma de ocupacion de 36 m2 por persona y el
                  reparto de turnos 20 / 40 / 40

Las dos estan acopladas por la politica: subir el DOH sube las posiciones, que
suben los m2 en uso, que suben las personas necesarias. El acoplamiento es una
identidad exacta, no una correlacion (ver verificar.py, identidad V3).

Todo el modelo es LINEAL en la politica, asi que las elasticidades y las
politicas de quiebre tienen forma cerrada: no hay busqueda numerica en ninguna
parte y por lo tanto no hay convergencia que pueda fallar.

Uso:
    python3 modelo_estructural.py
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
# Parametros. Racionales exactos: nada de floats hasta la impresion final.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Parametros:
    dias_mes: Q = Q(3044, 100)          # 30.44 dias por mes
    kg_por_posicion: Q = Q(459)         # gamma, kg por posicion de pallet
    aprovechamiento: Q = Q(1)           # u, fraccion util de las posiciones
    m2_por_persona: Q = Q(36)           # a0, norma de ocupacion en camara
    turnos: tuple = (                   # sigma, reparto de la jornada
        ("mañana", Q(20, 100)),
        ("tarde",  Q(40, 100)),
        ("noche",  Q(40, 100)),
    )
    mix_congelado: Q | None = None      # phi, None = deducir de los datos

    def validar(self) -> None:
        """Un parametro fuera de rango produce un modelo sin sentido, no un
        numero raro. Se detiene aca antes de calcular nada."""
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

    @property
    def turno_peak(self) -> tuple:
        return max(self.turnos, key=lambda t: t[1])


# ---------------------------------------------------------------------------
# Datos
# ---------------------------------------------------------------------------

def clave(nombre: str) -> str:
    s = unicodedata.normalize("NFKD", str(nombre)).encode("ascii", "ignore").decode()
    return " ".join(s.lower().split())


def q(v) -> Q | None:
    """A racional exacto. Un float de la planilla se convierte sin perdida:
    Fraction(float) toma el valor binario exacto que guardo Excel."""
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


def leer(ruta_entrada: Path) -> list[Sucursal]:
    filas = json.loads(ruta_entrada.read_text(encoding="utf-8"))
    out = []
    for f in filas:
        s = Sucursal(
            nombre=f["nombre"], m2=q(f["m2"]), posiciones=q(f["posiciones"]),
            cap_cong_kg=q(f["capCongKg"]), cap_refr_kg=q(f["capRefrKg"]),
            cap_total_kg=q(f["capTotalKg"]), personas=q(f["personas"]),
            demanda_mes=q(f["demandaMes"]), doh_congelado=q(f["dohCongelado"]),
            doh_refrigerado=q(f["dohRefrigerado"]),
        )
        s.revisar()
        out.append(s)
    return out


# ---------------------------------------------------------------------------
# Mix de demanda congelado
# ---------------------------------------------------------------------------

def deducir_mix(sucursales: list[Sucursal]) -> dict:
    """
    El espacio que ocupa un regimen es su volumen por los dias que se guarda.
    Si la red se dimensiono para la politica DOH entonces

        K_C / K_R = (phi * DOH_C) / ((1 - phi) * DOH_R)

    y phi queda determinado. Usar K_C/K_total como mix lo sobreestima
    exactamente en el factor DOH_C/DOH_R.
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
# Nucleo
# ---------------------------------------------------------------------------

def evaluar(s: Sucursal, par: Parametros, phi: Q) -> dict:
    """
    Todas las magnitudes en racionales exactos. Cada bloque nombra la identidad
    que lo sostiene para que el resultado se pueda rehacer a mano.
    """
    if not s.evaluable:
        return {"sucursal": s.nombre, "evaluable": False, "faltantes": s.faltantes}

    a0, gamma, u = par.m2_por_persona, par.kg_por_posicion, par.aprovechamiento

    # (1) Flujo. d = demanda diaria en kg/dia; se reparte por regimen segun phi.
    d = s.demanda_mes / par.dias_mes
    d_c, d_r = phi * d, (1 - phi) * d

    # (2) Politica. DOH ponderado por el mix: los dias que la politica exige
    #     guardar, en promedio sobre el total del flujo.
    doh_pol = phi * s.doh_congelado + (1 - phi) * s.doh_refrigerado

    # (3) Capacidad. Las posiciones son la unica fuente de verdad: en la
    #     planilla los kg son la columna derivada (kg = posiciones x 458.9).
    #     El reparto entre camaras se toma del split de kg, que es un cociente
    #     y por lo tanto inmune al redondeo de esa constante.
    beta = s.cap_cong_kg / s.cap_total_kg
    pos_tot = s.posiciones * u
    pos_c, pos_r = pos_tot * beta, pos_tot * (1 - beta)

    # (4) Requerimiento en posiciones.  n = d * DOH / gamma
    n_c = d_c * s.doh_congelado / gamma
    n_r = d_r * s.doh_refrigerado / gamma
    n_tot = n_c + n_r

    # (5) DOH fisico: los dias que la camara alcanza a cubrir de su propio flujo.
    doh_fis_c = pos_c * gamma / d_c
    doh_fis_r = pos_r * gamma / d_r
    doh_fis_tot = pos_tot * gamma / d

    # (6) Saturacion de almacenamiento.
    #     Identidad: rho = n/pos = DOH_politica / DOH_fisico  (las dos formas
    #     coinciden exactamente; verificar.py lo comprueba en racionales).
    rho_c = n_c / pos_c
    rho_r = n_r / pos_r
    rho_rigido = max(rho_c, rho_r)          # camaras fijas: manda la peor
    rho_flex = n_tot / pos_tot              # si el tabique fuera movible

    # (7) Participacion de la politica. rho es LINEAL en (DOH_C, DOH_R), asi que
    #     la derivada es exacta y la elasticidad es simplemente la fraccion del
    #     DOH ponderado que aporta cada regimen. E_C + E_R = 1 por construccion.
    e_c = phi * s.doh_congelado / doh_pol
    e_r = (1 - phi) * s.doh_refrigerado / doh_pol
    d_rho_d_dohc = phi / doh_fis_tot        # d(rho_flex)/d(DOH_C)
    d_rho_d_dohr = (1 - phi) / doh_fis_tot

    # (8) Dotacion. La politica fija las posiciones, las posiciones fijan los m2
    #     en uso a la densidad instalada, y los m2 fijan las personas a razon de
    #     una cada a0 = 36 m2.
    densidad = s.posiciones / s.m2          # posiciones por m2 instalados
    m2_uso = n_tot / densidad               # m2 que la politica pone en uso
    n_req = m2_uso / a0                     # dotacion que exige esa area
    n_norma = s.m2 / a0                     # dotacion de la camara completa
    rho_dot = n_req / s.personas

    # Identidad de acoplamiento (V3): rho_dot = rho_flex x (m2/a0) / dotacion.
    # Separa la presion de la politica de la brecha de dotacion estructural.
    brecha_dotacion = n_norma / s.personas

    # (9) Turnos. El reparto no cambia el total, cambia la concurrencia.
    turnos = []
    for nombre, w in par.turnos:
        n_t = n_req * w
        turnos.append({
            "turno": nombre,
            "participacion": w,
            "personas_requeridas": n_t,
            "personas_reales": s.personas * w,
            "rho_turno": rho_dot,                  # mismo reparto arriba y abajo
            "ocupacion_camara": n_t / n_norma,     # concurrencia contra la norma
        })
    peak = max(turnos, key=lambda t: t["participacion"])

    # (10) Restriccion activa.
    rho_estructural = max(rho_rigido, rho_dot)
    if rho_rigido >= rho_dot:
        cuello = "almacenamiento congelado" if rho_c >= rho_r else "almacenamiento refrigerado"
    else:
        cuello = "dotacion"

    # (11) Politicas de quiebre: el DOH con el que cada rho vale exactamente 1.
    #      Forma cerrada, sin busqueda numerica.
    kappa_alm = 1 / rho_rigido              # escalar sobre ambos DOH
    kappa_dot = 1 / rho_dot
    kappa_estructural = 1 / rho_estructural
    doh_c_quiebre = doh_fis_c               # rho_C = 1  <=>  DOH_C = DOH_fis_C
    doh_r_quiebre = doh_fis_r
    # DOH_C que satura el total dejando DOH_R fijo. Puede salir negativo: eso
    # significa que el refrigerado por si solo ya desborda la camara completa y
    # ningun DOH_C >= 0 alcanza rho = 1. Se marca en vez de mostrar dias negativos.
    doh_c_quiebre_flex = (doh_fis_tot - (1 - phi) * s.doh_refrigerado) / phi
    doh_c_quiebre_flex_factible = doh_c_quiebre_flex >= 0
    # DOH ponderado que satura la dotacion:
    doh_pol_quiebre_dot = doh_fis_tot * s.personas * a0 / s.m2

    return {
        "sucursal": s.nombre, "evaluable": True,
        "demanda_dia_kg": d, "mix_congelado": phi,
        "doh_politica_c": s.doh_congelado, "doh_politica_r": s.doh_refrigerado,
        "doh_politica_ponderado": doh_pol,
        "doh_fisico_c": doh_fis_c, "doh_fisico_r": doh_fis_r,
        "doh_fisico_total": doh_fis_tot,
        "pos_req_c": n_c, "pos_req_r": n_r, "pos_req_total": n_tot,
        "pos_disp_c": pos_c, "pos_disp_r": pos_r, "pos_disp_total": pos_tot,
        "rho_congelado": rho_c, "rho_refrigerado": rho_r,
        "rho_almacen_rigido": rho_rigido, "rho_almacen_flexible": rho_flex,
        "valor_flexibilidad": rho_rigido - rho_flex,
        "share_cong_instalado": beta,
        "share_cong_requerido": n_c / n_tot,
        "desbalance_camara": n_c / n_tot - beta,
        "elasticidad_doh_c": e_c, "elasticidad_doh_r": e_r,
        "derivada_rho_doh_c": d_rho_d_dohc, "derivada_rho_doh_r": d_rho_d_dohr,
        "densidad_pos_m2": densidad, "m2_en_uso": m2_uso,
        "dotacion_requerida": n_req, "dotacion_norma_camara": n_norma,
        "dotacion_real": s.personas, "rho_dotacion": rho_dot,
        "brecha_dotacion": brecha_dotacion,
        "derivada_dotacion_doh_c": phi * d * s.m2 / (gamma * s.posiciones * a0),
        "derivada_dotacion_doh_r": (1 - phi) * d * s.m2 / (gamma * s.posiciones * a0),
        "turnos": turnos, "turno_peak": peak["turno"],
        "personas_peak": peak["personas_requeridas"],
        "rho_estructural": rho_estructural, "cuello_botella": cuello,
        "holgura_politica": kappa_estructural - 1,
        "kappa_almacenamiento": kappa_alm, "kappa_dotacion": kappa_dot,
        "kappa_estructural": kappa_estructural,
        "doh_c_quiebre": doh_c_quiebre, "doh_r_quiebre": doh_r_quiebre,
        "doh_c_quiebre_flexible": doh_c_quiebre_flex,
        "doh_c_quiebre_flexible_factible": doh_c_quiebre_flex_factible,
        "doh_pol_quiebre_dotacion": doh_pol_quiebre_dot,
    }


def ejecutar(entrada: Path, par: Parametros) -> dict:
    par.validar()
    sucursales = leer(entrada)
    ded = deducir_mix(sucursales)
    phi = par.mix_congelado if par.mix_congelado is not None else ded["phi"]

    filas = [evaluar(s, par, phi) for s in sucursales]
    evaluables = [f for f in filas if f["evaluable"]]
    evaluables.sort(key=lambda r: -r["rho_estructural"])
    return {
        "parametros": par, "phi": phi, "deduccion": ded,
        "resultados": evaluables,
        "no_evaluables": [f for f in filas if not f["evaluable"]],
    }


# ---------------------------------------------------------------------------
# Salida
# ---------------------------------------------------------------------------

def f(x, n=4):
    return round(float(x), n)


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
        "modelo": "saturacion estructural",
        "parametros": {
            "dias_mes": float(par.dias_mes),
            "kg_por_posicion": float(par.kg_por_posicion),
            "aprovechamiento": float(par.aprovechamiento),
            "m2_por_persona": float(par.m2_por_persona),
            "turnos": {n: float(w) for n, w in par.turnos},
        },
        "mix_congelado": float(r["phi"]),
        "deduccion_mix": conv(r["deduccion"]),
        "resultados": conv(r["resultados"]),
        "no_evaluables": conv(r["no_evaluables"]),
    }


def imprimir(r: dict) -> None:
    par = r["parametros"]
    print(f"\nMODELO DE SATURACION ESTRUCTURAL")
    print(f"  mix congelado phi        : {f(r['phi'],4)}  (deducido de la capacidad instalada)")
    print(f"  sesgo del proxy capacidad: {f(r['deduccion']['sesgo_proxy_capacidad'],3)}x")
    print(f"  norma de ocupacion       : {f(par.m2_por_persona,1)} m2/persona")
    print(f"  turnos                   : " + " · ".join(f"{n} {float(w)*100:.0f}%" for n, w in par.turnos))
    print(f"  kg por posicion          : {f(par.kg_por_posicion,1)}   aprovechamiento: {f(par.aprovechamiento,2)}")

    print(f"\nSATURACION  (rho = DOH que pide la politica / DOH que cabe)")
    print(f"{'Sucursal':<14}{'DOHpol':>8}{'DOHfis':>8}{'rhoC':>7}{'rhoR':>7}{'rho_alm':>9}"
          f"{'rho_dot':>9}{'RHO*':>7}  {'cuello':<26}{'kappa*':>8}")
    for x in r["resultados"]:
        print(f"{x['sucursal']:<14}{f(x['doh_politica_ponderado'],2):>8}{f(x['doh_fisico_total'],2):>8}"
              f"{f(x['rho_congelado'],2):>7}{f(x['rho_refrigerado'],2):>7}"
              f"{f(x['rho_almacen_rigido'],2):>9}{f(x['rho_dotacion'],2):>9}"
              f"{f(x['rho_estructural'],2):>7}  {x['cuello_botella']:<26}"
              f"{f(x['kappa_estructural'],3):>8}")

    print(f"\nPARTICIPACION DE LA POLITICA EN LA SATURACION")
    print(f"{'Sucursal':<14}{'E_congelado':>13}{'E_refrig.':>11}{'drho/dDOH_C':>13}"
          f"{'drho/dDOH_R':>13}{'DOH_C quiebre':>15}")
    for x in r["resultados"]:
        print(f"{x['sucursal']:<14}{f(x['elasticidad_doh_c'],3):>13}{f(x['elasticidad_doh_r'],3):>11}"
              f"{f(x['derivada_rho_doh_c'],4):>13}{f(x['derivada_rho_doh_r'],4):>13}"
              f"{f(x['doh_c_quiebre'],2):>15}")

    print(f"\nDOTACION  (norma {f(par.m2_por_persona,0)} m2/persona · reparto de turnos)")
    cab = "".join(f"{n[:5]:>8}" for n, _ in par.turnos)
    print(f"{'Sucursal':<14}{'m2 uso':>9}{'N_req':>8}{'N_norma':>9}{'N_real':>8}{'rho_dot':>9}{cab}")
    for x in r["resultados"]:
        turnos = "".join(f"{f(t['personas_requeridas'],1):>8}" for t in x["turnos"])
        print(f"{x['sucursal']:<14}{f(x['m2_en_uso'],0):>9}{f(x['dotacion_requerida'],1):>8}"
              f"{f(x['dotacion_norma_camara'],1):>9}{f(x['dotacion_real'],0):>8}"
              f"{f(x['rho_dotacion'],2):>9}{turnos}")

    if r["no_evaluables"]:
        print(f"\nNO EVALUABLES")
        for x in r["no_evaluables"]:
            print(f"  {x['sucursal']}: falta {', '.join(x['faltantes'])}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Saturacion estructural de sucursales")
    ap.add_argument("--entrada", type=Path, default=RAIZ / "salidas" / "entrada.json")
    ap.add_argument("--salida", type=Path, default=RAIZ / "salidas")
    ap.add_argument("--silencioso", action="store_true")
    a = ap.parse_args()

    r = ejecutar(a.entrada, Parametros())
    a.salida.mkdir(parents=True, exist_ok=True)
    (a.salida / "estructural.json").write_text(
        json.dumps(serializar(r), indent=1, ensure_ascii=False), encoding="utf-8")

    campos = ["sucursal", "doh_politica_ponderado", "doh_fisico_total", "rho_congelado",
              "rho_refrigerado", "rho_almacen_rigido", "rho_almacen_flexible",
              "rho_dotacion", "rho_estructural", "cuello_botella", "elasticidad_doh_c",
              "elasticidad_doh_r", "derivada_rho_doh_c", "derivada_rho_doh_r",
              "m2_en_uso", "dotacion_requerida", "dotacion_norma_camara", "dotacion_real",
              "brecha_dotacion", "kappa_estructural", "doh_c_quiebre", "doh_r_quiebre",
              "desbalance_camara", "densidad_pos_m2"]
    with (a.salida / "estructural.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(campos)
        for x in r["resultados"]:
            w.writerow([f(x[c], 6) if isinstance(x[c], Q) else x[c] for c in campos])

    if not a.silencioso:
        imprimir(r)
    print(f"\nResultados en {a.salida}/estructural.json y estructural.csv")


if __name__ == "__main__":
    main()
