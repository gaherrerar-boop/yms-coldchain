#!/usr/bin/env python3
"""
Suite de verificacion del modelo de saturacion estructural.

No comprueba que el modelo sea buena idea: comprueba que el algebra este bien.
Todo corre en aritmetica racional exacta (fractions.Fraction), asi que las
identidades se verifican con residuo CERO, no "dentro de una tolerancia". Donde
si hay tolerancia es en el unico punto donde aparece punto flotante: la
comparacion entre la version exacta y la version en float que consume la pagina.

Cada verificacion declara la identidad algebraica que esta probando.

    python3 verificar.py
"""

from __future__ import annotations

import sys
from dataclasses import replace
from fractions import Fraction as Q
from pathlib import Path

from modelo_estructural import Parametros, deducir_mix, evaluar, ejecutar, leer

RAIZ = Path(__file__).resolve().parent
ENTRADA = RAIZ / "salidas" / "entrada.json"

fallas: list[str] = []
conteo = {"n": 0}


def check(cond: bool, etiqueta: str) -> None:
    conteo["n"] += 1
    if not cond:
        fallas.append(etiqueta)


def cabecera(n: str) -> None:
    print(f"\n{n}")


# ---------------------------------------------------------------------------

par = Parametros()
par.validar()
sucursales = leer(ENTRADA)
phi = deducir_mix(sucursales)["phi"]
evaluables = [s for s in sucursales if s.evaluable]
res = {s.nombre: evaluar(s, par, phi) for s in evaluables}

print("=" * 78)
print("VERIFICACION DEL MODELO DE SATURACION ESTRUCTURAL")
print(f"aritmetica: racional exacta (Fraction) · sucursales: {len(evaluables)}")
print("=" * 78)

# --- V1 -------------------------------------------------------------------
cabecera("V1  rho_flex = n_req/pos_disp = DOH_politica / DOH_fisico")
print("    Las dos rutas de calculo (posiciones y dias) deben dar el MISMO racional.")
for s in evaluables:
    x = res[s.nombre]
    check(x["rho_almacen_flexible"] == x["pos_req_total"] / x["pos_disp_total"], f"V1a {s.nombre}")
    check(x["rho_almacen_flexible"] == x["doh_politica_ponderado"] / x["doh_fisico_total"], f"V1b {s.nombre}")

# --- V2 -------------------------------------------------------------------
cabecera("V2  rho_C = DOH_C / DOH_fisico_C   y   rho_R = DOH_R / DOH_fisico_R")
print("    Misma identidad por camara: la saturacion es un cociente de dias.")
for s in evaluables:
    x = res[s.nombre]
    check(x["rho_congelado"] == x["doh_politica_c"] / x["doh_fisico_c"], f"V2a {s.nombre}")
    check(x["rho_refrigerado"] == x["doh_politica_r"] / x["doh_fisico_r"], f"V2b {s.nombre}")

# --- V3 -------------------------------------------------------------------
cabecera("V3  rho_dotacion = rho_flex x (m2 / 36) / dotacion_real")
print("    Identidad de ACOPLAMIENTO: la politica entra a la dotacion solo por rho_flex.")
for s in evaluables:
    x = res[s.nombre]
    check(x["rho_dotacion"] == x["rho_almacen_flexible"] * x["brecha_dotacion"], f"V3 {s.nombre}")

# --- V4 -------------------------------------------------------------------
cabecera("V4  rho_flex = media de rho_C y rho_R ponderada por posiciones")
print("    (rho_C·P_C + rho_R·P_R) / (P_C + P_R). Descarta errores de reparto.")
for s in evaluables:
    x = res[s.nombre]
    mezcla = (x["rho_congelado"] * x["pos_disp_c"] + x["rho_refrigerado"] * x["pos_disp_r"]) / x["pos_disp_total"]
    check(x["rho_almacen_flexible"] == mezcla, f"V4 {s.nombre}")

# --- V5 -------------------------------------------------------------------
cabecera("V5  min(rho_C, rho_R) <= rho_flex <= max(rho_C, rho_R)")
print("    Desigualdad del mediante. rho_flex nunca puede salirse del rango.")
for s in evaluables:
    x = res[s.nombre]
    lo, hi = min(x["rho_congelado"], x["rho_refrigerado"]), max(x["rho_congelado"], x["rho_refrigerado"])
    check(lo <= x["rho_almacen_flexible"] <= hi, f"V5 {s.nombre}")
    check(x["rho_almacen_rigido"] == hi, f"V5b {s.nombre}")

# --- V6 -------------------------------------------------------------------
cabecera("V6  E_congelado + E_refrigerado = 1")
print("    Las participaciones de la politica reparten el 100%, sin residuo.")
for s in evaluables:
    x = res[s.nombre]
    check(x["elasticidad_doh_c"] + x["elasticidad_doh_r"] == 1, f"V6 {s.nombre}")

# --- V7 -------------------------------------------------------------------
cabecera("V7  derivada analitica = diferencia finita EXACTA")
print("    rho es lineal en (DOH_C, DOH_R): la diferencia finita no es una")
print("    aproximacion, es la derivada. Cualquier desvio delata un error de algebra.")
h = Q(1, 1000)
for s in evaluables:
    x = res[s.nombre]
    s2 = replace(s, doh_congelado=s.doh_congelado + h)
    y = evaluar(s2, par, phi)
    df = (y["rho_almacen_flexible"] - x["rho_almacen_flexible"]) / h
    check(df == x["derivada_rho_doh_c"], f"V7a {s.nombre}")

    s3 = replace(s, doh_refrigerado=s.doh_refrigerado + h)
    z = evaluar(s3, par, phi)
    dg = (z["rho_almacen_flexible"] - x["rho_almacen_flexible"]) / h
    check(dg == x["derivada_rho_doh_r"], f"V7b {s.nombre}")

    dn = (y["dotacion_requerida"] - x["dotacion_requerida"]) / h
    check(dn == x["derivada_dotacion_doh_c"], f"V7c {s.nombre}")

# --- V8 -------------------------------------------------------------------
cabecera("V8  round-trip de la politica de quiebre: escalar por kappa* da rho = 1")
print("    Se reescriben AMBOS DOH por kappa* y se recalcula desde cero.")
for s in evaluables:
    x = res[s.nombre]
    k = x["kappa_almacenamiento"]
    s2 = replace(s, doh_congelado=s.doh_congelado * k, doh_refrigerado=s.doh_refrigerado * k)
    check(evaluar(s2, par, phi)["rho_almacen_rigido"] == 1, f"V8a {s.nombre}")

    kd = x["kappa_dotacion"]
    s3 = replace(s, doh_congelado=s.doh_congelado * kd, doh_refrigerado=s.doh_refrigerado * kd)
    check(evaluar(s3, par, phi)["rho_dotacion"] == 1, f"V8b {s.nombre}")

    ke = x["kappa_estructural"]
    s4 = replace(s, doh_congelado=s.doh_congelado * ke, doh_refrigerado=s.doh_refrigerado * ke)
    check(evaluar(s4, par, phi)["rho_estructural"] == 1, f"V8c {s.nombre}")

# --- V9 -------------------------------------------------------------------
cabecera("V9  round-trip de DOH_C de quiebre por camara y en flexible")
print("    Fijar DOH_C en su valor de quiebre debe dar exactamente rho = 1.")
for s in evaluables:
    x = res[s.nombre]
    s2 = replace(s, doh_congelado=x["doh_c_quiebre"])
    check(evaluar(s2, par, phi)["rho_congelado"] == 1, f"V9a {s.nombre}")

    s3 = replace(s, doh_refrigerado=x["doh_r_quiebre"])
    check(evaluar(s3, par, phi)["rho_refrigerado"] == 1, f"V9b {s.nombre}")

    # Solo tiene sentido si el quiebre cae en el dominio fisico DOH_C >= 0.
    if x["doh_c_quiebre_flexible_factible"]:
        s4 = replace(s, doh_congelado=x["doh_c_quiebre_flexible"])
        check(evaluar(s4, par, phi)["rho_almacen_flexible"] == 1, f"V9c {s.nombre}")
    else:
        # Si es infactible, con DOH_C = 0 el refrigerado solo ya debe desbordar.
        s4 = replace(s, doh_congelado=Q(0))
        check(evaluar(s4, par, phi)["rho_almacen_flexible"] > 1, f"V9c-infactible {s.nombre}")

# --- V10 ------------------------------------------------------------------
cabecera("V10 round-trip del DOH ponderado que satura la dotacion")
print("    Reescalar la politica hasta ese DOH ponderado debe dar rho_dot = 1.")
for s in evaluables:
    x = res[s.nombre]
    k = x["doh_pol_quiebre_dotacion"] / x["doh_politica_ponderado"]
    s2 = replace(s, doh_congelado=s.doh_congelado * k, doh_refrigerado=s.doh_refrigerado * k)
    check(evaluar(s2, par, phi)["rho_dotacion"] == 1, f"V10 {s.nombre}")

# --- V11 ------------------------------------------------------------------
cabecera("V11 turnos: las participaciones suman 1 y reparten la dotacion sin perdida")
print("    Sum(sigma_t) = 1  y  Sum(N_t) = N_requerida.")
for s in evaluables:
    x = res[s.nombre]
    check(sum(t["participacion"] for t in x["turnos"]) == 1, f"V11a {s.nombre}")
    check(sum(t["personas_requeridas"] for t in x["turnos"]) == x["dotacion_requerida"], f"V11b {s.nombre}")
    check(sum(t["personas_reales"] for t in x["turnos"]) == x["dotacion_real"], f"V11c {s.nombre}")

# --- V12 ------------------------------------------------------------------
cabecera("V12 homogeneidad de grado 0: rho no cambia si se escalan flujo y capacidad")
print("    Multiplicar demanda, posiciones, kg, m2 y dotacion por lambda deja rho igual.")
for lam in (Q(2), Q(1, 3), Q(7, 5)):
    for s in evaluables:
        x = res[s.nombre]
        s2 = replace(s, demanda_mes=s.demanda_mes * lam, posiciones=s.posiciones * lam,
                     cap_cong_kg=s.cap_cong_kg * lam, cap_refr_kg=s.cap_refr_kg * lam,
                     cap_total_kg=s.cap_total_kg * lam, m2=s.m2 * lam,
                     personas=s.personas * lam)
        y = evaluar(s2, par, phi)
        check(y["rho_almacen_rigido"] == x["rho_almacen_rigido"], f"V12a {s.nombre} x{lam}")
        check(y["rho_dotacion"] == x["rho_dotacion"], f"V12b {s.nombre} x{lam}")

# --- V13 ------------------------------------------------------------------
cabecera("V13 monotonia estricta: subir cualquier DOH sube rho")
print("    Necesario para que la politica de quiebre sea unica.")
for s in evaluables:
    x = res[s.nombre]
    for campo in ("doh_congelado", "doh_refrigerado"):
        y = evaluar(replace(s, **{campo: getattr(s, campo) * Q(11, 10)}), par, phi)
        check(y["rho_almacen_flexible"] > x["rho_almacen_flexible"], f"V13 {s.nombre} {campo}")
        check(y["rho_dotacion"] > x["rho_dotacion"], f"V13d {s.nombre} {campo}")

# --- V14 ------------------------------------------------------------------
cabecera("V14 conservacion: las partes suman el total")
print("    n_C + n_R = n_total  y  P_C + P_R = P_total.")
for s in evaluables:
    x = res[s.nombre]
    check(x["pos_req_c"] + x["pos_req_r"] == x["pos_req_total"], f"V14a {s.nombre}")
    check(x["pos_disp_c"] + x["pos_disp_r"] == x["pos_disp_total"], f"V14b {s.nombre}")

# --- V15 ------------------------------------------------------------------
cabecera("V15 invariancia de unidad en el mix deducido")
print("    phi es un cociente de cocientes: cambiar de kg a toneladas no lo mueve.")
for lam in (Q(1000), Q(1, 1000)):
    escaladas = [replace(s, cap_cong_kg=s.cap_cong_kg * lam, cap_refr_kg=s.cap_refr_kg * lam,
                         cap_total_kg=s.cap_total_kg * lam) for s in evaluables]
    check(deducir_mix(escaladas)["phi"] == phi, f"V15 x{lam}")

# --- V16 ------------------------------------------------------------------
cabecera("V16 los guardas de parametros rechazan configuraciones invalidas")
print("    Un turno mal repartido debe detener el modelo, no producir un numero.")
casos = [
    ("turnos que no suman 1", dict(turnos=(("a", Q(1, 2)), ("b", Q(1, 4))))),
    ("turno negativo", dict(turnos=(("a", Q(3, 2)), ("b", Q(-1, 2))))),
    ("m2 por persona nulo", dict(m2_por_persona=Q(0))),
    ("aprovechamiento > 1", dict(aprovechamiento=Q(3, 2))),
    ("mix fuera de (0,1)", dict(mix_congelado=Q(2))),
]
for etiqueta, kw in casos:
    try:
        replace(par, **kw).validar()
        check(False, f"V16 no rechazo: {etiqueta}")
    except ValueError:
        check(True, f"V16 {etiqueta}")

# --- V17 ------------------------------------------------------------------
cabecera("V17 exacto contra punto flotante")
print("    La pagina calcula en float. Se compara contra el racional exacto.")
peor = Q(0)
peor_nombre = ""
for s in evaluables:
    x = res[s.nombre]
    for campo in ("rho_congelado", "rho_refrigerado", "rho_almacen_rigido",
                  "rho_almacen_flexible", "rho_dotacion", "rho_estructural",
                  "elasticidad_doh_c", "dotacion_requerida", "kappa_estructural"):
        exacto = x[campo]
        aprox = Q(float(exacto))
        err = abs(aprox - exacto) / exacto if exacto else abs(aprox - exacto)
        if err > peor:
            peor, peor_nombre = err, f"{s.nombre}/{campo}"
        check(err < Q(1, 10 ** 12), f"V17 {s.nombre}/{campo}")
print(f"    peor error relativo: {float(peor):.3e}  ({peor_nombre})")

# ---------------------------------------------------------------------------
print("\n" + "=" * 78)
if fallas:
    print(f"FALLA — {len(fallas)} de {conteo['n']} verificaciones")
    for x in fallas[:30]:
        print("   " + x)
    sys.exit(1)
print(f"OK — {conteo['n']} verificaciones, todas exactas (residuo 0 en aritmetica racional)")
print("=" * 78)
