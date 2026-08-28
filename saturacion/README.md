# Modelo Corporativo de Saturación de Sucursales · v1.0

Herramienta corporativa para **medir, proyectar, explicar y documentar** la
saturación de una red de 21 sucursales frigoríficas entre **2026 y 2032**.

> El modelo entrega **DIAGNÓSTICO**, no **DECISIÓN**.
> No recomienda ampliaciones, cierres, redistribuciones, CAPEX ni cambios de
> layout. Otro modelo consume estos resultados para decidir.

---

## Principio fundamental

Existe **una sola metodología corporativa**. La matemática no cambia entre
sucursales; sólo cambian los **parámetros** (demanda, estacionalidad,
distribución semanal, kg/caja, DOH, m², altura útil, densidad, capacidad
operacional, dotación, productividad, espacio, push, ambientes). Las
diferencias territoriales (Norte / Centro / Sur) se representan **con
parámetros**, nunca con fórmulas distintas.

## Dimensiones de saturación (siempre separadas)

Nunca se promedian. Cada una se reporta con **índice anual + peak + P95 +
exposición** (§19, §21):

1. Físico estructural  2. Físico observado  3. Fresco  4. Congelado
5. Operacional  6. Dotación  7. Espacio-personas

## Nivel de cálculo

El motor calcula internamente `Sucursal → Ambiente → Año → Mes → Día operativo`
(Lun–Sáb; Domingo sólo si la sucursal lo declara) sobre el **calendario real**
de cada año. El resultado corporativo principal es **anual**, ponderado por la
participación de demanda de cada día.

---

## Arquitectura de archivos

| Archivo | Rol |
|---|---|
| `engine.js` | Motor matemático puro (ESM, sin DOM ni dependencias). Corre en Node y navegador. **Toda la matemática vive aquí.** |
| `data.js` | Datos maestros de **ejemplo / sintéticos** (21 sucursales) + esquema de tablas de entrada (§28). Determinístico y reproducible. |
| `tests.js` | Controles de validación (§40) y tests de aceptación A–G (§41). |
| `run-tests.mjs` | Runner de auditoría en Node. |
| `index.html` | Dashboard ejecutivo (vista nacional, sucursal, tendencia, heatmap, auditoría, JSON, tests, metodología). |

### Correr los tests (auditoría de la matemática)

```bash
node saturacion/run-tests.mjs
```

Debe reportar `13/13 tests OK`, incluidos los siete tests obligatorios A–G.

### Abrir el dashboard

El dashboard usa módulos ES; requiere servirse por HTTP (no `file://`):

```bash
# opción simple
npx serve saturacion        # o cualquier servidor estático
# luego abrir http://localhost:3000/
```

Todo el cálculo ocurre en el navegador; no hay backend ni dependencias externas
(salvo la fuente tipográfica). Cálculo completo de 21 sucursales × 7 años ≈ 1–2 s.

---

## Fórmulas centrales

```
Capacidad física   CAPkg = M² × Altura_útil × Factor_utilización × Densidad_kg/m³   (§12)
Demanda diaria     Dday  = Dann × Ê(mes) × NW(día)                                   (§6, §7)
Inventario         Istruct(d) = Σ_{h=0}^{n-1} Dday(d+h) + r·Dday(d+n)  ; n=⌊DOH⌋     (§10)
Observado          Iobs = Istruct + Push   (o = On Hand real)                        (§11)
Sat. física        S = Inventario / CAPkg × 100                                      (§13)
Sat. sucursal      Σ Inventario / Σ CAPkg × 100   (ponderada por capacidad)          (§14)
Sat. operacional   Sop = Cajas / (Dotación × Horas × Productividad) × 100            (§16)
Sat. dotación      Sstaff = Personas_req / Dotación × 100                            (§17)
Sat. espacio-pers  Sspace = Personas_req / (M²_operable / M²_persona) × 100          (§18)
Índice anual       Sanual = Σ_d S(d) × [D(d) / Σ D]                                  (§20)
```

El **DOH** es un parámetro oficial (por sucursal y ambiente) con `DOH_Base`
explícito: `operativo` o `calendario` (§10). El modelo nunca lo modifica.

---

## Regla de datos faltantes (§29)

**Prohibido inventar valores.** Si falta un parámetro crítico, el motor retorna
`NO CALCULABLE — FALTA INFORMACIÓN` indicando la variable ausente. Los fallback
de granularidad (p. ej. kg/caja a nivel anual vs. mensual) son **explícitos y
trazables**: cada resolución registra el nivel efectivamente usado.

> ⚠ **Los datos de `data.js` son sintéticos/de ejemplo** (calidad `EJEMPLO`),
> generados de forma determinística para demostrar y auditar la herramienta.
> Para uso corporativo oficial deben reemplazarse íntegramente por la fuente
> oficial. La sucursal *Coyhaique* omite deliberadamente la densidad de
> congelado para demostrar en vivo el manejo de datos faltantes.

## Esquema de datos de entrada (§28)

- **Maestro sucursal**: `Sucursal_ID, Sucursal, Zona, Region`, `dias_operativos`,
  `calidad_dato`, y por ambiente `{ M2, Altura_Util, Factor_Utilizacion,
  Densidad_Kg_M3, M2_Operable, M2_Por_Persona, DOH, DOH_Base, Productividad,
  Horas_Productivas, Dotacion }`.
- **Demanda**: `demanda.porAmbiente[suc][ambiente][año] = kg` (o `total` + `share`).
- **Estacionalidad**: `estacionalidad[suc][ambiente][año|'*'][mes] = factor`.
- **Semanal**: `semanal[suc][ambiente][año|'*'][mes|'*'][diaSemana] = peso`.
- **Kg/caja**: `kpc[suc][ambiente][año|'*'][mes]?[diaSemana]? = kg`.
- **Push** (opcional): `push[suc][ambiente]['YYYY-MM-DD'] = kg`.
- **On Hand** (opcional): `onhand[suc][ambiente]['YYYY-MM-DD'] = kg`.

## Salida oficial (§44, §45)

`salidaJSON(resultadoSucursal, año)` produce el contrato limpio para el modelo
de decisión (físico estructural/observado, fresco, congelado, operacional,
dotación, espacio-personas, peak, fecha peak, P95, exposición, holgura, push,
restricción dominante, calidad, versión). **Sin recomendaciones.**

---

## Versionamiento (§32)

`MODELO SATURACIÓN CORPORATIVO — Versión 1.0` (versión matemática 1.0). Los
resultados históricos no se modifican silenciosamente: cambiar una fórmula
implica una nueva versión.
