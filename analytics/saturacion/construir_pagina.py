#!/usr/bin/env python3
"""
Arma la pagina autocontenida inlineando el nucleo de calculo YA VERIFICADO.

El nucleo se extrae de estructural.core.js entre los marcadores <<<CORE y
CORE>>>, que es el mismo archivo que ejecuta paridad_estructural.mjs. Asi lo
que se publica es literalmente lo que se verifico, no una transcripcion.
"""

import base64
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent


def extraer_nucleo(ruta: Path) -> str:
    txt = ruta.read_text(encoding="utf-8")
    m = re.search(r"// <<<CORE\n(.*?)\n// CORE>>>", txt, re.S)
    if not m:
        raise SystemExit("no se encontraron los marcadores <<<CORE / CORE>>>")
    return m.group(1)


def bloque_logo() -> str:
    """
    Inlinea el logo del area como data URI si el archivo esta presente. La pagina
    debe ser autocontenida, y el brandbook prohibe reproducciones no oficiales:
    por eso el logo se toma del archivo entregado o no se dibuja.
    """
    for nombre in ("logo.png", "logo.jpg", "logo.jpeg", "logo.webp", "logo.svg"):
        ruta = RAIZ / nombre
        if not ruta.exists():
            continue
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
                "webp": "image/webp", "svg": "image/svg+xml"}[nombre.rsplit(".", 1)[1]]
        b64 = base64.b64encode(ruta.read_bytes()).decode("ascii")
        return (f'<img class="logo" src="data:{mime};base64,{b64}" '
                f'alt="Operaciones Nacionales">')
    return ('<div class="logoslot">Espacio reservado<br>logo Operaciones Nacionales</div>')


def recortar_formulas(html: str) -> str:
    """
    Los bloques .eq se muestran con white-space:pre para conservar la alineacion
    monoespaciada. Eso convierte la sangria del HTML en lineas en blanco visibles,
    asi que se recorta el borde de cada bloque sin tocar su interior.
    """
    def limpiar(m):
        return f'<div class="{m.group(1)}">{m.group(2).strip(chr(10)).rstrip()}</div>'
    return re.sub(r'<div class="(eq[^"]*)">(.*?)</div>', limpiar, html, flags=re.S)


def main() -> None:
    plantilla = (RAIZ / "plantilla.html").read_text(encoding="utf-8")
    nucleo = extraer_nucleo(RAIZ / "saturacion.core.js")
    datos = json.loads((RAIZ / "salidas" / "entrada.json").read_text(encoding="utf-8"))

    evaluables = [s for s in datos if s.get("demandaMes")]
    if len(evaluables) != 20:
        raise SystemExit(f"se esperaban 20 sucursales evaluables, hay {len(evaluables)}")

    salida = plantilla.replace("<!--__LOGO__-->", bloque_logo())

    for marca in ("/*__CORE__*/", "/*__DATOS__*/"):
        if marca not in plantilla:
            raise SystemExit(f"falta el marcador {marca} en la plantilla")

    salida = salida.replace("/*__CORE__*/", nucleo).replace(
        "/*__DATOS__*/", json.dumps(datos, ensure_ascii=False, separators=(",", ":")))
    salida = recortar_formulas(salida)

    # La pagina debe quedar sin dependencias de red mas alla de Google Fonts.
    for prohibido in ("__CORE__", "__DATOS__", "export {"):
        if prohibido in salida:
            raise SystemExit(f"la pagina quedo con residuo: {prohibido}")

    destino = RAIZ / "informe_saturacion.html"
    destino.write_text(salida, encoding="utf-8")
    print(f"pagina escrita: {destino}  ({len(salida.encode('utf-8')):,} bytes)")


if __name__ == "__main__":
    main()
