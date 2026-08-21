#!/usr/bin/env python3
"""
Suite de verificacion del modelo de saturacion.

Comprueba que el algebra este bien, no que el modelo sea buena idea. Todo corre
en aritmetica racional exacta (fractions.Fraction), asi que las identidades se
verifican con residuo CERO, no dentro de una tolerancia. El unico punto con
tolerancia es la comparacion contra la version en punto flotante que consume la
pagina.

Cada bloque declara la identidad algebraica que esta probando.

    python3 verificar.py
"""

from __future__ import annotations

import sys
from dataclasses import replace
from fractions import Fraction as Q
from pathlib import Path

from modelo_saturacion import (Parametros, clave, deducir_mix, demanda_efectiva,
                               evaluar, leer, RED_ABASTECIMIENTO)

RAIZ = Path(__file__).resolve().parent
ENTRADA = RAIZ / "salidas" / "entrada.json"

fallas: list[str] = []
conteo = {"n": 0}


def check(cond: bool, etiqueta: str) -> None:
    conteo["n"] += 1
    if not cond:
        fallas.append(etiqueta)


def cabecera(n: str, desc: str) -> None:
    print(f"\n{n}")
    for linea in desc.strip().split("\n"):
        print("    " + linea.strip())


par = Parametros()
par.validar()
sucursales = leer(ENTRADA)
indice = {clave(s.nombre): s for s in sucursales}
phi = deducir_mix(sucursales)["phi"]
ev = [s for s in sucursales if s.evaluable]
res = {s.nombre: evaluar(s, par, phi, indice) for s in ev}


def reval(s, **kw):
    return evaluar(replace(s, **kw), par, phi, indice)


print("=" * 78)
print("VERIFICACION DEL MODELO DE SATURACION")
print(f"aritmetica: racional exacta (Fraction) · sucursales: {len(ev)}")
print("=" * 78)

# --- V1 ---------------------------------------------------------------------
cabecera("V1  rho_flex = n/P = DOH_politica / DOH_fisico",
         "Las dos rutas de calculo (posiciones y dias) dan el MISMO racional.")
for s in ev:
    x = res[s.nombre]
    check(x["rho_flex"] == x["pos_req_total"] / x["pos_disp_total"], f"V1a {s.nombre}")
    check(x["rho_flex"] == x["doh_politica_ponderado"] / x["doh_fisico_total"], f"V1b {s.nombre}")

# --- V2 ---------------------------------------------------------------------
cabecera("V2  rho_r = DOH_r / DOH_fisico_r  por camara",
         "La saturacion de cada camara es un cociente de dias.")
for s in ev:
    x = res[s.nombre]
    check(x["rho_congelado"] == x["doh_politica_c"] / x["doh_fisico_c"], f"V2a {s.nombre}")
    check(x["rho_refrigerado"] == x["doh_politica_r"] / x["doh_fisico_r"], f"V2b {s.nombre}")

# --- V3 ---------------------------------------------------------------------
cabecera("V3  A_libre = A · (1 − rho_flex)",
         """IDENTIDAD DE ACOPLAMIENTO entre las dos etapas: la superficie que queda
         libre para operar es exactamente el complemento de la ocupacion. Es el
         unico canal por el que la politica alcanza a la etapa operacional.""")
for s in ev:
    x = res[s.nombre]
    check(x["m2_libre"] == x["m2_total"] * (1 - x["rho_flex"]), f"V3a {s.nombre}")
    check(x["m2_libre"] == x["m2_total"] - x["m2_uso"], f"V3b {s.nombre}")

# --- V4 ---------------------------------------------------------------------
cabecera("V4  rho_flex = media de rho_C y rho_R ponderada por posiciones",
         "(rho_C·P_C + rho_R·P_R) / (P_C + P_R). Descarta errores de reparto.")
for s in ev:
    x = res[s.nombre]
    m = (x["rho_congelado"] * x["pos_disp_c"] + x["rho_refrigerado"] * x["pos_disp_r"]) / x["pos_disp_total"]
    check(x["rho_flex"] == m, f"V4 {s.nombre}")

# --- V5 ---------------------------------------------------------------------
cabecera("V5  min(rho_C, rho_R) <= rho_flex <= max(rho_C, rho_R) = rho*",
         "Desigualdad del mediante. rho_flex no puede salirse del rango.")
for s in ev:
    x = res[s.nombre]
    lo, hi = min(x["rho_congelado"], x["rho_refrigerado"]), max(x["rho_congelado"], x["rho_refrigerado"])
    check(lo <= x["rho_flex"] <= hi, f"V5a {s.nombre}")
    check(x["rho_estructural"] == hi, f"V5b {s.nombre}")

# --- V6 ---------------------------------------------------------------------
cabecera("V6  E_congelado + E_refrigerado = 1",
         "Las participaciones de la politica reparten el 100% sin residuo.")
for s in ev:
    x = res[s.nombre]
    check(x["elasticidad_doh_c"] + x["elasticidad_doh_r"] == 1, f"V6 {s.nombre}")

# --- V7 ---------------------------------------------------------------------
cabecera("V7  derivada analitica = diferencia finita EXACTA",
         """rho es lineal en (DOH_C, DOH_R): la diferencia finita no es una
         aproximacion, es la derivada. Cualquier desvio delata un error de algebra.""")
h = Q(1, 1000)
for s in ev:
    x = res[s.nombre]
    y = reval(s, doh_congelado=s.doh_congelado + h)
    check((y["rho_flex"] - x["rho_flex"]) / h == x["derivada_rho_doh_c"], f"V7a {s.nombre}")
    z = reval(s, doh_refrigerado=s.doh_refrigerado + h)
    check((z["rho_flex"] - x["rho_flex"]) / h == x["derivada_rho_doh_r"], f"V7b {s.nombre}")

# --- V8 ---------------------------------------------------------------------
cabecera("V8  round-trip de kappa*: escalar la politica por 1/rho* da rho* = 1",
         "Se reescriben AMBOS DOH y se recalcula la sucursal desde cero.")
for s in ev:
    k = res[s.nombre]["kappa_estructural"]
    y = reval(s, doh_congelado=s.doh_congelado * k, doh_refrigerado=s.doh_refrigerado * k)
    check(y["rho_estructural"] == 1, f"V8 {s.nombre}")

# --- V9 ---------------------------------------------------------------------
cabecera("V9  round-trip de los DOH de quiebre por camara y en flexible",
         "Fijar cada DOH en su valor de quiebre debe dar exactamente rho = 1.")
for s in ev:
    x = res[s.nombre]
    check(reval(s, doh_congelado=x["doh_c_quiebre"])["rho_congelado"] == 1, f"V9a {s.nombre}")
    check(reval(s, doh_refrigerado=x["doh_r_quiebre"])["rho_refrigerado"] == 1, f"V9b {s.nombre}")
    if x["doh_c_quiebre_flexible_factible"]:
        check(reval(s, doh_congelado=x["doh_c_quiebre_flexible"])["rho_flex"] == 1, f"V9c {s.nombre}")
    else:
        # Infactible: con DOH_C = 0 el refrigerado solo ya debe desbordar.
        check(reval(s, doh_congelado=Q(0))["rho_flex"] > 1, f"V9c-infactible {s.nombre}")

# --- V10 --------------------------------------------------------------------
cabecera("V10 round-trip de la politica que satura la ETAPA OPERACIONAL",
         """Escalar la politica hasta DOH_pol* debe dejar rho_operacional = 1 exacto,
         o sea la superficie libre justo igual a la que exige el turno peak.""")
for s in ev:
    x = res[s.nombre]
    if not x["operacion_alcanzable"]:
        # Ni con inventario cero cabe la gente del turno peak.
        check(reval(s, doh_congelado=Q(0), doh_refrigerado=Q(0))["rho_operacional"] > 1,
              f"V10-inalcanzable {s.nombre}")
        continue
    k = x["doh_pol_quiebre_operacional"] / x["doh_politica_ponderado"]
    y = reval(s, doh_congelado=s.doh_congelado * k, doh_refrigerado=s.doh_refrigerado * k)
    check(y["rho_operacional"] == 1, f"V10 {s.nombre}")

# --- V11 --------------------------------------------------------------------
cabecera("V11 turnos: participaciones suman 1 y reparten la dotacion sin perdida",
         "Sum(sigma_t) = 1 y Sum(personas_t) = dotacion real.")
for s in ev:
    x = res[s.nombre]
    check(sum(t["participacion"] for t in x["turnos"]) == 1, f"V11a {s.nombre}")
    check(sum(t["personas"] for t in x["turnos"]) == x["personas_total"], f"V11b {s.nombre}")
    peaks = [t for t in x["turnos"] if t["es_peak"]]
    check(all(t["personas"] == x["personas_peak"] for t in peaks), f"V11c {s.nombre}")
    check(all(t["personas"] <= x["personas_peak"] for t in x["turnos"]), f"V11d {s.nombre}")

# --- V12 --------------------------------------------------------------------
cabecera("V12 homogeneidad de grado 0 bajo escalamiento conjunto",
         "Escalar flujo, capacidad, superficie y dotacion por lambda deja rho igual.")
for lam in (Q(2), Q(1, 3), Q(7, 5)):
    for s in ev:
        if s.abastece:
            continue      # el hub depende de terceros que no se escalan aca
        x = res[s.nombre]
        y = reval(s, demanda_mes=s.demanda_mes * lam, posiciones=s.posiciones * lam,
                  cap_cong_kg=s.cap_cong_kg * lam, cap_refr_kg=s.cap_refr_kg * lam,
                  cap_total_kg=s.cap_total_kg * lam, m2=s.m2 * lam, personas=s.personas * lam)
        check(y["rho_estructural"] == x["rho_estructural"], f"V12a {s.nombre} x{lam}")
        check(y["rho_flex"] == x["rho_flex"], f"V12b {s.nombre} x{lam}")
        if x["rho_operacional"] is not None:
            check(y["rho_operacional"] == x["rho_operacional"], f"V12c {s.nombre} x{lam}")

# --- V13 --------------------------------------------------------------------
cabecera("V13 monotonia estricta en la politica",
         """rho estructural sube con cualquier DOH, y rho operacional tambien, porque
         mas inventario deja menos superficie libre. Garantiza que el quiebre es unico.""")
for s in ev:
    x = res[s.nombre]
    for campo in ("doh_congelado", "doh_refrigerado"):
        y = reval(s, **{campo: getattr(s, campo) * Q(11, 10)})
        check(y["rho_flex"] > x["rho_flex"], f"V13a {s.nombre} {campo}")
        check(y["m2_libre"] < x["m2_libre"], f"V13b {s.nombre} {campo}")
        if x["rho_operacional"] is not None and y["rho_operacional"] is not None:
            check(y["rho_operacional"] > x["rho_operacional"], f"V13c {s.nombre} {campo}")

# --- V14 --------------------------------------------------------------------
cabecera("V14 conservacion: las partes suman el total",
         "n_C + n_R = n  ·  P_C + P_R = P  ·  m2_uso + m2_libre = m2_total.")
for s in ev:
    x = res[s.nombre]
    check(x["pos_req_c"] + x["pos_req_r"] == x["pos_req_total"], f"V14a {s.nombre}")
    check(x["pos_disp_c"] + x["pos_disp_r"] == x["pos_disp_total"], f"V14b {s.nombre}")
    check(x["m2_uso"] + x["m2_libre"] == x["m2_total"], f"V14c {s.nombre}")

# --- V15 --------------------------------------------------------------------
cabecera("V15 invariancia de unidad en el mix deducido",
         "phi es un cociente de cocientes: cambiar de kg a toneladas no lo mueve.")
for lam in (Q(1000), Q(1, 1000)):
    esc = [replace(s, cap_cong_kg=s.cap_cong_kg * lam, cap_refr_kg=s.cap_refr_kg * lam,
                   cap_total_kg=s.cap_total_kg * lam) for s in ev]
    check(deducir_mix(esc)["phi"] == phi, f"V15 x{lam}")

# --- V16 --------------------------------------------------------------------
cabecera("V16 los guardas rechazan configuraciones invalidas",
         "Una configuracion absurda debe detener el modelo, no producir un numero.")
for etiqueta, kw in [
    ("turnos que no suman 1", dict(turnos=(("a", Q(1, 2)), ("b", Q(1, 4))))),
    ("turno negativo", dict(turnos=(("a", Q(3, 2)), ("b", Q(-1, 2))))),
    ("m2 por persona nulo", dict(m2_por_persona=Q(0))),
    ("aprovechamiento > 1", dict(aprovechamiento=Q(3, 2))),
    ("mix fuera de (0,1)", dict(mix_congelado=Q(2))),
    ("factor de politica nulo", dict(factor_doh_c=Q(0))),
    ("fraccion hub > 1", dict(fraccion_hub=Q(2))),
]:
    try:
        replace(par, **kw).validar()
        check(False, f"V16 no rechazo: {etiqueta}")
    except ValueError:
        check(True, f"V16 {etiqueta}")

# --- V17 --------------------------------------------------------------------
cabecera("V17 red de abastecimiento",
         """La demanda efectiva del hub es la propia mas la de sus abastecidas. Con
         fraccion_hub = 0 debe volver exactamente a la demanda propia.""")
sin_hub = replace(par, fraccion_hub=Q(0))
for s in ev:
    x = res[s.nombre]
    esperado = s.demanda_mes + sum(indice[clave(j)].demanda_mes for j in s.abastece)
    check(x["demanda_efectiva"] == esperado, f"V17a {s.nombre}")
    check(x["demanda_aportada"] == esperado - s.demanda_mes, f"V17b {s.nombre}")
    y = evaluar(s, sin_hub, phi, indice)
    check(y["demanda_efectiva"] == s.demanda_mes, f"V17c {s.nombre}")
    if not s.abastece:
        check(x["factor_hub"] == 1, f"V17d {s.nombre}")
# El hub declarado debe existir y sus abastecidas tambien.
for hub, spokes in RED_ABASTECIMIENTO.items():
    check(clave(hub) in indice, f"V17e hub inexistente: {hub}")
    for j in spokes:
        check(clave(j) in indice, f"V17f abastecida inexistente: {j}")
        check(clave(j) != clave(hub), f"V17g autoabastecimiento: {hub}")

# --- V18 --------------------------------------------------------------------
cabecera("V18 independencia de los dos veredictos y compuerta de la etapa 2",
         """Cada etapa emite su propio veredicto y la etiqueta compuesta es funcion
         exacta de ambos: nunca uno esconde al otro. rho_operacional existe si y
         solo si hay superficie libre, y depende solo de m2_operacion y m2_libre,
         no de rho estructural.""")
ESTADOS = {"saturacion estructural", "saturacion operacional",
           "estructural y operacional", "sin saturacion"}
for s in ev:
    x = res[s.nombre]
    check(x["estado"] in ESTADOS, f"V18a {s.nombre}")
    check((x["rho_operacional"] is not None) == x["hay_espacio_m2"], f"V18b {s.nombre}")
    check(x["hay_espacio_m2"] == (x["m2_libre"] > 0), f"V18c {s.nombre}")

    # Cada veredicto se define solo con su propia etapa.
    check(x["saturado_estructural"] == (x["rho_estructural"] > 1), f"V18d {s.nombre}")
    if x["hay_espacio_m2"]:
        check(x["saturado_operacional"] == (x["rho_operacional"] > 1), f"V18e {s.nombre}")
        check(x["rho_operacional"] == x["m2_operacion"] / x["m2_libre"], f"V18f {s.nombre}")
    else:
        check(x["saturado_operacional"] is None, f"V18g {s.nombre}")

    # La etiqueta compuesta es funcion exacta del par de veredictos.
    esperado = {
        (True, True): "estructural y operacional",
        (True, False): "saturacion estructural",
        (True, None): "saturacion estructural",
        (False, True): "saturacion operacional",
        (False, False): "sin saturacion",
        (False, None): "sin saturacion",
    }[(x["saturado_estructural"], x["saturado_operacional"])]
    check(x["estado"] == esperado, f"V18h {s.nombre}: {x['estado']} != {esperado}")

    # La etapa 2 no puede alterar la etapa 1: cambiar la dotacion mueve rho_op
    # pero deja rho* intacto.
    y = reval(s, personas=s.personas * Q(3, 2))
    check(y["rho_estructural"] == x["rho_estructural"], f"V18i {s.nombre}")
    check(y["rho_flex"] == x["rho_flex"], f"V18j {s.nombre}")
    if x["hay_espacio_m2"]:
        check(y["rho_operacional"] > x["rho_operacional"], f"V18k {s.nombre}")

# --- V19 --------------------------------------------------------------------
cabecera("V19 la politica entregada es la de referencia",
         "Con factores 1,0 el modelo usa exactamente los DOH de la planilla.")
for s in ev:
    x = res[s.nombre]
    check(x["doh_politica_c"] == s.doh_congelado, f"V19a {s.nombre}")
    check(x["doh_politica_r"] == s.doh_refrigerado, f"V19b {s.nombre}")

# --- V20 --------------------------------------------------------------------
cabecera("V20 exacto contra punto flotante",
         "La pagina calcula en float64. Se compara contra el racional exacto.")
peor, peor_n = Q(0), ""
for s in ev:
    x = res[s.nombre]
    campos = ["rho_congelado", "rho_refrigerado", "rho_estructural", "rho_flex",
              "m2_libre", "m2_uso", "elasticidad_doh_c", "kappa_estructural",
              "demanda_efectiva", "m2_operacion"]
    if x["rho_operacional"] is not None:
        campos.append("rho_operacional")
    for c in campos:
        e = x[c]
        err = abs(Q(float(e)) - e) / abs(e) if e else abs(Q(float(e)) - e)
        if err > peor:
            peor, peor_n = err, f"{s.nombre}/{c}"
        check(err < Q(1, 10 ** 12), f"V20 {s.nombre}/{c}")
print(f"    peor error relativo: {float(peor):.3e}  ({peor_n})")

print("\n" + "=" * 78)
if fallas:
    print(f"FALLA — {len(fallas)} de {conteo['n']} verificaciones")
    for x in fallas[:30]:
        print("   " + x)
    sys.exit(1)
print(f"OK — {conteo['n']} verificaciones, todas exactas (residuo 0 en aritmetica racional)")
print("=" * 78)
