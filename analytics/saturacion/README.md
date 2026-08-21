# Modelo de saturación — Operaciones Nacionales, red de frío

Calcula, sucursal por sucursal, cuánta política de abastecimiento soporta la
estructura de cada instalación. No hay totales de red: las sucursales no son
comparables en magnitudes absolutas, y lo único comparable es ρ, que es
adimensional porque cada una se mide contra su propia capacidad.

## Dos etapas

| Etapa | Qué pregunta | Cuándo se calcula |
|---|---|---|
| **1 · Estructural** | ¿El inventario que exige la política DOH cabe en las cámaras? | Siempre |
| **2 · Operacional** | ¿Los m² que sobran alcanzan para que opere el turno más cargado, a 36 m² por persona? | Solo si quedan m² libres |

Las dos etapas emiten veredictos independientes y nunca se funden en un mismo
número. El único acoplamiento es la identidad `A_libre = A · (1 − ρ_flex)`.

## Cómo se corre

```bash
npm run saturacion    # lee el xlsx, calcula y arma la página
npm test              # paridad JS ↔ Python y suite de verificación exacta
```

`npm run saturacion` encadena dos pasos:

```bash
python3 analytics/saturacion/modelo_saturacion.py    # xlsx → salidas/
python3 analytics/saturacion/construir_pagina.py     # salidas/ → informe_saturacion.html
```

## Cómo se agrega el logo

La página es autocontenida, así que el logo se inlinea como data URI. El
brandbook prohíbe reproducciones no oficiales, de modo que el logo sale del
archivo entregado o no se dibuja: si no hay archivo, queda un espacio reservado
con la medida correcta.

Basta con dejar el archivo en cualquiera de estas rutas y volver a construir:

```
analytics/saturacion/logo.png     ← la más directa
analytics/logo.png
logo.png                          ← raíz del repositorio
assets/logo.png
src/assets/logo.png
```

También se acepta `logo-operaciones-nacionales.*` y los formatos `.png`, `.jpg`,
`.webp` y `.svg`. O bien, con una ruta explícita:

```bash
python3 analytics/saturacion/construir_pagina.py --logo /ruta/al/logo.png
```

El logo se renderiza a 52 px de alto con ancho automático, así que conviene
exportarlo con fondo transparente y al menos 150 px de alto. Un archivo de más
de 4 MB se rechaza: infla la página sin necesidad.

## Archivos

| Archivo | Rol |
|---|---|
| `modelo_saturacion.py` | Modelo de referencia, en aritmética racional exacta |
| `verificar.py` | 1.247 comprobaciones con residuo cero |
| `saturacion.core.js` | Núcleo que ejecuta la página |
| `paridad_saturacion.mjs` | Compara el núcleo JS contra Python |
| `construir_pagina.py` | Inlinea núcleo, datos y logo en la página final |
| `plantilla.html` | Documento fuente, con marcadores de sustitución |
| `datos/` | Planilla original |
| `salidas/` | `entrada.json` normalizada, `saturacion.json` y `saturacion.csv` |

La página publicada inlinea el **mismo archivo** que verifica la suite de
paridad, así que lo que se publica es literalmente lo que se verificó.

## Red de abastecimiento

Declarada en `RED_ABASTECIMIENTO`, dentro de `modelo_saturacion.py` y replicada
en `saturacion.core.js`. La paridad comprueba que ambas coincidan.

```python
RED_ABASTECIMIENTO = {
    "Antofagasta": ["Arica", "Iquique", "Calama"],
}
```

Agregar un hub cambia su ρ de forma material: incorporar el volumen del norte
llevó a Antofagasta de ρ* = 0,94 a 1,63.
