# Fórmula Unificada de Saturación — Red de Frío Agrosuper

## 1. Concepto Fundamental

La saturación **ρ** mide qué porcentaje de la capacidad instalada está siendo utilizada por la demanda. Una fórmula unificada captura todo: demanda estacional, sobrestocks (factor de empuje), y la diferencia entre operación normal y modelo de distribución pura (cross-dock).

## 2. Componentes de la Fórmula Unificada

### 2.1 Demanda Base con Estacionalidad

Para cada sucursal, la demanda mensual varía por estación. En lugar de un único DOH_policy, usamos un promedio ponderado:

$$\text{DOH}_{\text{policy,ponderado}} = \sum_{m=1}^{12} \text{DOH}_m \cdot w_m$$

Donde:
- $\text{DOH}_m$ = días de oferta en el mes $m$ (enero, febrero, ..., diciembre)
- $w_m$ = peso del mes $m$ en el ciclo anual (suma=1)
- $w_m = \text{Demanda}_m / \sum_{m=1}^{12} \text{Demanda}_m$

**Razón**: Valdivia tiene demanda baja en invierno (mes valle) pero alta en verano (mes estival). Antofagasta es lo opuesto. El promedio ponderado captura esta variabilidad sin perder información.

### 2.2 Factor de Empuje (Push)

La cadena de suministro envía kilos según política DOH, pero ocasionalmente llegan SKUs adicionales producto de sobrestocks en planta. Estos no están asociados a venta de sucursal, pero consumen espacio.

$$\text{Factor}_{\text{empuje}} = 1 + \alpha \cdot s_{\text{exceso}}$$

Donde:
- $\alpha$ = fracción de sobrestocks que llegan a la sucursal (0 a 1; típicamente 0.1 a 0.3)
- $s_{\text{exceso}}$ = ratio de sobrestocks en planta / demanda base
- Si $\alpha = 0$: sin empuje (modelo puro de demanda)
- Si $\alpha = 0.2, s_{\text{exceso}} = 0.15$: agrega un 3% extra de volumen

**Razón**: Este factor representa la realidad de que el almacenamiento incluye producto "empujado" que no se previó inicialmente.

### 2.3 Demanda Efectiva Ajustada

$$\text{Demanda}_{\text{efectiva}} = \text{DOH}_{\text{policy,ponderado}} \cdot \text{Factor}_{\text{empuje}} + \text{Volumen}_{\text{hub}}$$

Donde:
- $\text{Volumen}_{\text{hub}}$ = si es una sucursal HUB, incluye el volumen de sus abastecidas multiplicado por $\theta$ (fracción que transita el hub)

### 2.4 Capacidad Física Efectiva

La capacidad instalada se divide en dos regímenes: congelado (φ porcentaje) y refrigerado (1−φ porcentaje).

$$\text{DOH}_{\text{física}} = \frac{1}{\frac{\phi}{\text{DOH}_{\text{congelado}} \cdot u} + \frac{1-\phi}{\text{DOH}_{\text{refrigerado}} \cdot u}}$$

Donde:
- $\phi$ = mix de congelado (deducido de capacidades instaladas)
- $u$ = aprovechamiento (típicamente 1.0, puede ser <1 si hay restricciones)
- $\text{DOH}_{\text{congelado}}, \text{DOH}_{\text{refrigerado}}$ = capacidad en días, por régimen

**Razón**: Es la media armónica ponderada. No es suma lineal porque cada régimen tiene su propia restricción.

## 3. Fórmula Unificada General

$$\rho = \frac{\text{Demanda}_{\text{efectiva}}}{\text{DOH}_{\text{física}}}$$

### 3.1 Para Sucursales Normales

$$\rho_{\text{normal}} = \frac{\text{DOH}_{\text{policy,ponderado}} \cdot (1 + \alpha \cdot s_{\text{exceso}})}{\text{DOH}_{\text{física}}}$$

**Interpretación**: 
- Si $\rho < 1$: hay espacio estructural (etapa 1 OK)
- Si $\rho > 1$: se necesita más capacidad de lo que hay

### 3.2 Para Sucursales HUB (Cross-Dock)

En cross-dock, el flujo es **diario**, no de almacenaje. La fórmula cambia:

$$\rho_{\text{hub}} = \frac{\text{Flujo}_{\text{diario}} \cdot (1 + \alpha \cdot s_{\text{empuje,diario}})}{\text{Capacidad}_{\text{throughput,diario}}}$$

Donde:
- $\text{Flujo}_{\text{diario}} = \text{Demanda}_{\text{efectiva}} / 30.44$ (días del mes)
- $\text{Capacidad}_{\text{throughput,diario}} = \text{Capacidad}_{\text{total}} / u$ (ajustado por uso)
- $s_{\text{empuje,diario}}$ = sobrestocks diarios

**Razón**: Un HUB no "almacena" como una sucursal normal; distribuye. La saturación es sobre la capacidad de movimiento diario, no de días de oferta.

## 4. Etapa Operacional (condicional)

Una vez calculada la saturación estructural, si $\rho_{\text{estructural}} < 1$ y quedan metros cuadrados libres, se evalúa la operación:

$$\rho_{\text{operacional}} = \frac{m^2_{\text{operación,requerido}}}{m^2_{\text{libres}}}$$

Donde:
- $m^2_{\text{operación,requerido}} = \text{personas}_{\text{turno máximo}} \cdot 36$
- $m^2_{\text{libres}} = m^2_{\text{total}} \cdot (1 - \rho_{\text{estructural}})$

Esta etapa **NO se calcula** si no hay metros libres.

## 5. Factores de Simulación

Para explorar escenarios:

$$\text{Demanda}_{\text{sim}} = \text{Demanda}_{\text{efectiva}} \cdot f_{\text{DOH}} \cdot f_{\text{operación}}$$

Donde:
- $f_{\text{DOH}}$ = factor de cambio en política (1.0 = política actual, 1.2 = 20% más demanda)
- $f_{\text{operación}}$ = factor de cambio en personal (1.0 = personal actual)

**Aplicación**: 
- $f_{\text{DOH}} = 1.2$: "¿qué pasa si aumenta 20% la demanda?"
- Recalcular $\rho$ con la nueva demanda manteniendo todo lo demás igual

## 6. Algoritmo de Cálculo Paso a Paso

### Entrada
- Sucursales (nombre, capacidad, demanda mensual, personas, zona)
- Clasificación: ¿es HUB o Normal?
- Factores: $\alpha$ (empuje), $s_{\text{exceso}}$ (sobrestocks)

### Proceso
1. **Deducir mix $\phi$** a partir de capacidades instaladas (no de flujo de hub)
2. **Para cada sucursal**:
   a. Calcular $\text{DOH}_{\text{policy,ponderado}}$ (promedio de 12 meses ponderado)
   b. Calcular factor de empuje: $1 + \alpha \cdot s_{\text{exceso}}$
   c. **Si es HUB**: aplicar cross-dock (flujo diario)
   d. **Si es Normal**: aplicar almacenaje (DOH)
   e. Calcular $\rho_{\text{estructural}}$
   f. Si $\rho_{\text{estructural}} < 1$: calcular $\rho_{\text{operacional}}$
   g. Asignar verdictvo: 
      - "estructural y operacional" si ambos > 1
      - "estructural solo" si estructural > 1 y operacional ≤ 1
      - "operacional solo" si estructural ≤ 1 y operacional > 1
      - "sin saturación" si ambos ≤ 1

### Salida
- Por cada sucursal: (nombre, ρ_estructural, ρ_operacional, estado, tipo_sucursal)
- KPI: conteos por estado
- Gráficos: distribución de ρ, clasificación de sucursales

## 7. Ejemplo Concreto: Valdivia

**Datos**:
- Capacidad congelado: 6,000 kg → 8 DOH_congelado
- Capacidad refrigerado: 4,000 kg → 6 DOH_refrigerado
- Demanda promedio: 700 kg/día
- Sobrestocks en planta: 15% ($s_{\text{exceso}} = 0.15$)
- Fracción que llega a Valdivia: 20% ($\alpha = 0.20$)
- Tipo: Normal (no HUB)

**Cálculo**:

1. Mix: $\phi = \frac{1}{1 + \frac{4000}{6000} \cdot \frac{8}{6}} = 0.529$ (52.9% congelado)

2. DOH ponderado: suponer promedio anual = 8.2 días (resultado de promediar 12 meses)

3. Factor empuje: $1 + 0.20 \cdot 0.15 = 1.03$ (3% extra)

4. DOH física: 
   $$\text{DOH}_{\text{física}} = \frac{1}{\frac{0.529}{8 \cdot 1} + \frac{0.471}{6 \cdot 1}} = 7.21 \text{ días}$$

5. Saturación estructural:
   $$\rho = \frac{8.2 \cdot 1.03}{7.21} = 1.17$$
   → **Saturada estructuralmente** (necesita más cámara)

## 8. Configuración de Sucursales HUB vs Normal

**Interfaz de usuario**:
- Checkbox por sucursal: "¿Es HUB?"
- Valores por defecto: todos Normal, excepto Antofagasta, Valparaíso, etc. (si aplica)
- Al cambiar: recalcular inmediatamente

**Diferencia en cálculo**:
- **Normal**: flujo = demanda mensual / 30.44 días; capacidad = DOH × demanda diaria
- **HUB**: flujo = demanda diaria directa; capacidad = máximo que puede pasar por día

---

## Resumen: Una Fórmula, Dos Contextos

| Aspecto | Normal | HUB |
|---------|--------|-----|
| Métrica | Días de oferta (DOH) | Flujo diario (kg/día) |
| $\rho$ = | Demanda_eff / DOH_física | Flujo_diario / Capacidad_throughput |
| Almacena | Sí (DOH días) | No (cross-dock) |
| Saturación | Falta de espacio de almacén | Falta de velocidad de movimiento |

La fórmula unificada captura esto todo. El factor de empuje hace visible lo que antes se escondía en el promedio. Y la estacionalidad ponderada representa la realidad de que no todos los meses son iguales.
