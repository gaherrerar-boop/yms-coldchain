# Modelo de saturación de sucursales — cadena de frío

Especificación matemática del algoritmo implementado en `modelo.py`.

---

## 1. Qué se está midiendo

"Saturación" no es una sola cosa. Una sucursal puede estar al límite por espacio,
por dotación, o por el reparto entre cámaras, y esos límites no se promedian: el
que manda es el más apretado. El modelo calcula cada dimensión por separado,
declara cuál es la restricción activa, y recién después construye un índice
compuesto para poder rankear.

La definición base es siempre la misma razón adimensional:

$$\rho = \frac{\text{recurso requerido}}{\text{recurso efectivamente disponible}}$$

con $\rho < 1$ = hay holgura, $\rho = 1$ = límite, $\rho > 1$ = déficit estructural.

---

## 2. Dos hallazgos en los datos que condicionan el modelo

Antes de las fórmulas, dos cosas que salen de los propios datos y que cambian
cómo hay que modelar.

### 2.1 La capacidad en kg no es un dato independiente

Para las 20 sucursales con datos se cumple, con dispersión de 0.93 %:

$$K_i^{\text{total}} = P_i \times 458.9 \ \text{kg}$$

y lo mismo para el desglose por cámara. Es decir, **`Cap. total kg` es una columna
derivada de `Posiciones`** usando una densidad única de 459 kg/posición para toda
la red. Consecuencia práctica: kg y posiciones **son la misma restricción escrita
dos veces**. Tratarlas como dos dimensiones sería doble contabilidad.

El modelo por lo tanto usa **posiciones como unidad física de cuenta**, y trata
los 459 kg/posición como lo que es: un parámetro, separable por régimen
($\gamma^C$, $\gamma^R$), no un hecho medido. Un pallet de congelado y uno de
fresco no pesan lo mismo, y ese es probablemente el segundo dato de mayor valor
que se puede incorporar.

### 2.2 La participación en espacio no es la participación en demanda

Este es el error que hay que evitar. Es tentador estimar el mix de demanda
congelado como $K^C / K^{\text{total}} = 0.276$. Está mal, y se puede mostrar por qué.

El espacio que ocupa un régimen es su volumen **multiplicado por los días que se
guarda**. Si la red se dimensionó para la política DOH:

$$\frac{K^C}{K^R} = \frac{\varphi \cdot \text{DOH}^C}{(1-\varphi)\cdot \text{DOH}^R}$$

Despejando el mix implícito:

$$\boxed{\ \varphi = \left[1 + \frac{K^R}{K^C}\cdot\frac{\text{DOH}^C}{\text{DOH}^R}\right]^{-1}}$$

Con los datos de la red ($K^R/K^C = 2.63$, DOH ponderados $3.70$ y $2.29$):

$$\varphi = 0.191$$

El proxy de capacidad **sobreestima el congelado en un factor 1.45×**, que es
exactamente $\text{DOH}^C/\text{DOH}^R$. Usar 0.276 en vez de 0.191 hace que todas
las sucursales aparezcan con déficit de congelado, que es un artefacto, no un
hallazgo.

---

## 3. Notación

Para la sucursal $i$, régimen $r \in \{C, R\}$ (congelado, refrigerado):

| Símbolo | Significado | Fuente |
|---|---|---|
| $D_i$ | demanda promedio mensual (kg/mes) | hoja Capacidad |
| $\text{DOH}_i^r$ | días de cobertura de política | hoja Política |
| $K_i^r$ | capacidad instalada (kg) | hoja Capacidad |
| $P_i$ | posiciones de pallet | hoja Capacidad |
| $A_i$ | superficie (m²) | hoja Capacidad |
| $N_i$ | dotación (personas) | hoja Capacidad |
| $\pi_i$ | productividad estándar (kg/HH) | hoja Capacidad |
| $\varphi_i$ | mix de demanda congelado | **deducido** (§2.2) |
| $\gamma^r$ | kg por posición | parámetro (459) |
| $u_{\max}$ | ocupación útil máxima | parámetro (0.85) |
| $\lambda^r$ | fracción del DOH que queda en sitio | parámetro (1.0) |
| $h$ | horas-mes por persona | parámetro (180) |

---

## 4. El algoritmo

### Paso 1 — Demanda a flujo diario por régimen

$$d_i = \frac{D_i}{30.44}, \qquad d_i^C = \varphi_i\, d_i, \qquad d_i^R = (1-\varphi_i)\, d_i$$

### Paso 2 — Política DOH a inventario objetivo

$$\bar{S}_i^r = d_i^r \cdot \text{DOH}_i^r \cdot \lambda^r$$

$\lambda^r$ separa el inventario que ocupa cámara del que va en tránsito. Importa
porque el DOH crece con la distancia a planta (Punta Arenas 9.71, Coyhaique 9.08,
contra ~3.1 en la zona central): parte de esa cobertura viaja, no está en el piso.
Por defecto $\lambda = 1$ (todo en sitio), que es el supuesto conservador.

### Paso 3 — Sobrecarga estacional y estocástica

El inventario no se queda en su objetivo, fluctúa. Modelándolo como lognormal de
media $\bar{S}$ y coeficiente de variación $\text{CV}$:

$$\sigma = \sqrt{\ln(1+\text{CV}^2)}, \qquad f_{\text{pk}}(\alpha) = f_{\text{est}} \cdot \exp\!\left(z_\alpha \sigma - \tfrac{\sigma^2}{2}\right)$$

$$S_i^r(\alpha) = \bar{S}_i^r \cdot f_{\text{pk}}(\alpha)$$

donde $z_\alpha$ es el cuantil normal del nivel de servicio $\alpha$ y
$f_{\text{est}}$ el peak estacional. El término $-\sigma^2/2$ corrige la media
lognormal para que $\alpha = 0.5$ devuelva el objetivo, sin sesgo.

### Paso 4 — Conversión a posiciones

$$n_i^r = \frac{S_i^r(\alpha)}{\gamma^r \cdot u_{\text{pal}}}$$

### Paso 5 — Capacidad efectiva

El split de posiciones es idéntico al split de kg (§2.1), con $\beta_i = K_i^C/K_i^{\text{total}}$:

$$P_i^{C,\text{ef}} = P_i\,\beta_i\, u_{\max}, \qquad P_i^{R,\text{ef}} = P_i(1-\beta_i)\, u_{\max}$$

$u_{\max} < 1$ recoge que un almacén no opera lleno: panal de abeja, selectividad,
posiciones bloqueadas por acceso.

### Paso 6 — Saturaciones

**Por cámara:**
$$\rho_i^r = \frac{n_i^r}{P_i^{r,\text{ef}}}$$

**Almacenamiento rígido** (las cámaras no se convierten — el caso real):
$$\rho_i^{\text{alm}} = \max\left(\rho_i^C,\ \rho_i^R\right)$$

**Almacenamiento flexible** (si el espacio fuera reasignable entre regímenes):
$$\rho_i^{\text{flex}} = \frac{n_i^C + n_i^R}{P_i\, u_{\max}}$$

**Mano de obra:**
$$\rho_i^{\text{HH}} = \frac{D_i / \pi_i}{N_i \cdot h}$$

**Restricción activa:**
$$\rho_i^{\ast} = \max\left(\rho_i^{\text{alm}},\ \rho_i^{\text{HH}}\right)$$

El máximo, no el promedio: una sucursal está tan saturada como su cuello de
botella. El promedio escondería precisamente lo que hay que ver.

**Índice compuesto** (norma-$p$, para rankear sin que el máximo sea discontinuo):
$$\rho_i^{(p)} = \left(w_{\text{alm}}\,(\rho_i^{\text{alm}})^p + w_{\text{HH}}\,(\rho_i^{\text{HH}})^p\right)^{1/p}$$

Con $p = 4$ se aproxima al máximo pero manteniendo sensibilidad a la segunda
restricción, lo que hace el ranking estable ante cambios chicos en los datos.
Cuando $p \to \infty$ recupera exactamente $\max(\cdot)$.

### Paso 7 — Descomposición interpretable

$\rho^{\text{flex}}$ se factoriza en dos términos independientes:

$$\boxed{\ \rho_i^{\text{flex}} = \underbrace{\frac{\text{DOH}_i^{\text{política}}}{\text{DOH}_i^{\text{físico}}}}_{f_{\text{pol}}} \times \underbrace{\frac{f_{\text{pk}}}{u_{\max}}}_{f_{\text{ope}}}}$$

con
$$\text{DOH}_i^{\text{política}} = \varphi_i \text{DOH}_i^C \lambda^C + (1-\varphi_i)\text{DOH}_i^R \lambda^R, \qquad \text{DOH}_i^{\text{físico}} = \frac{K_i^{\text{total}}}{d_i}$$

Esto separa limpiamente las dos preguntas:

- $f_{\text{pol}}$ **es propio de cada sucursal** y compara días que pide la política
  contra días que caben. Casi no depende de supuestos: solo del mix.
- $f_{\text{ope}}$ **es común a toda la red** y recoge peak y ocupación útil.

De ahí que **el ranking entre sucursales sea robusto** (lo fija $f_{\text{pol}}$)
mientras que **el nivel absoluto sea sensible** (lo fija $f_{\text{ope}}$). Al
interpretar resultados, esta distinción es la más importante.

---

## 5. Diagnósticos derivados

**Desbalance de cámara.** Compara el reparto requerido contra el instalado:
$$\beta_i^{\ast} = \frac{n_i^C}{n_i^C + n_i^R}, \qquad \Delta_i = \beta_i^{\ast} - \beta_i$$
$\Delta_i > 0$ = falta cámara de congelado; $\Delta_i < 0$ = hay espacio de congelado
ocioso mientras el fresco aprieta. Es capacidad varada: existe, pero en el
régimen equivocado.

**Valor de la flexibilidad.** $V_i = \rho_i^{\text{alm}} - \rho_i^{\text{flex}}$.
Cuánta saturación desaparecería si se pudiera mover el tabique. Un $V_i$ alto
convierte una obra de ampliación en un proyecto de conversión de cámara, que es
un orden de magnitud más barato.

**Mix de equilibrio.** El $\varphi$ que igualaría ambas cámaras:
$$\varphi_i^{\circ} = \left[1 + \frac{\text{DOH}_i^C}{\text{DOH}_i^R}\cdot\frac{\gamma^R}{\gamma^C}\cdot\frac{1-\beta_i}{\beta_i}\right]^{-1}$$

**Mix de quiebre.** El $\varphi$ con el que la sucursal llega justo a saturación:
$$\varphi_i^{\times} = \frac{\dfrac{\gamma\, u_{\text{pal}}\, P_i\, u_{\max}}{d_i\, f_{\text{pk}}} - \text{DOH}_i^R\lambda^R}{\text{DOH}_i^C\lambda^C - \text{DOH}_i^R\lambda^R}$$

Da el margen de error tolerable en el supuesto de mix, por sucursal.

**Holgura de crecimiento.** $g_i = 1/\rho_i^{\ast} - 1$: cuánto puede crecer la
demanda antes de tocar el límite. Negativo = ya está excedido.

**Palanca de densificación.** Los m² **no son una dimensión de saturación**: son
el recurso que determina cuántas posiciones caben. Entran como palanca de
expansión. Con $\delta_i = P_i/A_i$ y $\delta^{\ast}$ el percentil 75 de la red:
$$\text{posiciones recuperables}_i = \max\left(0,\ A_i \delta^{\ast} - P_i\right)$$
La densidad va de 0.21 pos/m² (Calama) a 0.85 (Concepción): un rango de 4×
dentro de la misma red, que es capacidad recuperable sin construir.

---

## 6. Clasificación

| $\rho^{\ast}$ | Clase | Lectura |
|---|---|---|
| < 0.70 | holgada | absorbe crecimiento |
| 0.70 – 0.85 | normal | operación sana |
| 0.85 – 0.95 | tensionada | sin margen para peaks |
| 0.95 – 1.05 | crítica | quiebres o sobrestock recurrentes |
| > 1.05 | desbordada | déficit estructural |

---

## 7. Supuestos, ordenados por cuánto mueven el resultado

Están todos en `parametros.json`. Ninguno vive en el código.

1. **Mix congelado $\varphi = 0.191$** — deducido, no medido. Es el input de mayor
   valor que se puede reemplazar por dato real, y debería ser **por sucursal**:
   Punta Arenas y Arica no tienen el mismo mix que Rancagua.
2. **$f_{\text{est}}$ y $\alpha$** — fijan el nivel absoluto de todos los $\rho$.
   No son estimables con promedios anuales; requieren la serie mensual.
3. **$u_{\max} = 0.85$** — validable con ocupación real del WMS.
4. **$\gamma^C = \gamma^R = 459$** — heredado de la planilla. Separarlo por régimen
   es directo si existe el peso real de pallet.
5. **$\lambda^r = 1$** — supuesto conservador. Si el DOH incluye tránsito, las
   sucursales remotas están sobreestimadas.
6. **$h = 180$ h/mes** — consistente: la mediana de $D_i/(N_i \pi_i)$ da 178.9 h,
   lo que confirma que `Kg/HH` es un estándar por hombre-hora.

## 8. Datos faltantes

- **San Bernardo** — tiene 3252 m² y 2860 posiciones (la mayor densidad de la red,
  0.88 pos/m²), pero sin demanda ni DOH no es evaluable. Se imputa su capacidad
  por la identidad de §2.1 y queda marcada, nunca se inventa demanda.
- **Castro, Coyhaique, Curicó, Lo Espejo, San Felipe, Talca** — tienen política DOH
  pero no aparecen en la hoja de capacidad. O se abastecen desde otra sucursal, o
  falta su ficha.

---

## 9. Uso

```bash
python3 modelo.py --datos datos/satura_nuevo_modelo.xlsx --salida salidas/
```

Salidas en `salidas/`: `saturacion_<escenario>.csv` (una fila por sucursal con
todas las métricas), `densificacion.csv`, `sensibilidad_mix.csv`,
`mix_diagnostico.csv` y `resumen.json`.

Los tres escenarios (`P0_politica`, `P1_operativo`, `P2_peak`) se calculan siempre;
`escenario_base` solo elige cuál se imprime. La versión JavaScript equivalente,
para integrar al YMS, está en `src/services/saturationService.js`.
