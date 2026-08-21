#!/usr/bin/env python3
"""
Arma la pagina autocontenida inlineando el nucleo de calculo YA VERIFICADO.

El nucleo se extrae de estructural.core.js entre los marcadores <<<CORE y
CORE>>>, que es el mismo archivo que ejecuta paridad_estructural.mjs. Asi lo
que se publica es literalmente lo que se verifico, no una transcripcion.
"""

import argparse
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


MIME_LOGO = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".svg": "image/svg+xml",
}

# Donde buscar el logo, en orden. La pagina es autocontenida, asi que el archivo
# se inlinea como data URI; nunca se referencia por URL.
DIRECTORIOS_LOGO = (
    RAIZ,                       # analytics/saturacion/
    RAIZ.parent,                # analytics/
    RAIZ.parents[1],            # raiz del repositorio
    RAIZ.parents[1] / "assets",
    RAIZ.parents[1] / "src" / "assets",
)


def buscar_logo(explicito: Path | None) -> Path | None:
    """
    Ubica el archivo del logo. Si se pasa una ruta explicita y no existe, se
    detiene: es un error del operador, no algo que convenga resolver en silencio
    cayendo al espacio reservado.
    """
    if explicito is not None:
        if not explicito.exists():
            raise SystemExit(f"no se encuentra el logo indicado: {explicito}")
        if explicito.suffix.lower() not in MIME_LOGO:
            raise SystemExit(f"formato de logo no soportado: {explicito.suffix} "
                             f"(usar {', '.join(sorted(MIME_LOGO))})")
        return explicito

    for carpeta in DIRECTORIOS_LOGO:
        for ext in MIME_LOGO:
            for base in ("logo-operaciones-nacionales", "logo_operaciones_nacionales", "logo"):
                ruta = carpeta / f"{base}{ext}"
                if ruta.exists():
                    return ruta
    return None


def bloque_logo(explicito: Path | None = None) -> str:
    """
    Inlinea el logo del area como data URI. El brandbook prohibe reproducciones
    no oficiales, asi que el logo sale del archivo entregado o no se dibuja: en
    su lugar queda el espacio reservado, con la medida correcta.
    """
    ruta = buscar_logo(explicito)
    if ruta is None:
        print("logo: no encontrado — se deja el espacio reservado. "
              "Dejar 'logo.png' en analytics/saturacion/ y volver a construir, "
              "o pasar --logo <ruta>.")
        return ('<div class="logoslot" title="Dejar el archivo del logo en '
                'analytics/saturacion/logo.png y ejecutar: npm run saturacion">'
                '<b>Logo Operaciones Nacionales</b>'
                '<span>espacio reservado &middot; 52 px de alto</span></div>')

    datos = ruta.read_bytes()
    if not datos:
        raise SystemExit(f"el archivo de logo esta vacio: {ruta}")
    # Un logo muy pesado infla la pagina sin necesidad; el limite de un Artifact
    # es 16 MB y el data URI crece un tercio al codificar en base64.
    if len(datos) > 4_000_000:
        raise SystemExit(f"el logo pesa {len(datos)/1e6:.1f} MB; exportarlo mas liviano "
                         f"(un PNG de ~200 px de alto basta)")

    b64 = base64.b64encode(datos).decode("ascii")
    print(f"logo: {ruta.name} ({len(datos)/1024:.0f} KB) inlineado como data URI")
    return (f'<img class="logo" src="data:{MIME_LOGO[ruta.suffix.lower()]};base64,{b64}" '
            f'alt="Operaciones Nacionales">')


def recortar_formulas(html: str) -> str:
    """
    Los bloques .eq se muestran con white-space:pre para conservar la alineacion
    monoespaciada. Eso convierte la sangria del HTML en lineas en blanco visibles,
    asi que se recorta el borde de cada bloque sin tocar su interior.
    """
    def limpiar(m):
        return f'<div class="{m.group(1)}">{m.group(2).strip(chr(10)).rstrip()}</div>'
    return re.sub(r'<div class="(eq[^"]*)">(.*?)</div>', limpiar, html, flags=re.S)


def construir(logo: Path | None = None) -> None:
    plantilla = (RAIZ / "plantilla.html").read_text(encoding="utf-8")
    nucleo = extraer_nucleo(RAIZ / "saturacion.core.js")
    datos = json.loads((RAIZ / "salidas" / "entrada.json").read_text(encoding="utf-8"))

    evaluables = [s for s in datos if s.get("demandaMes")]
    if len(evaluables) != 20:
        raise SystemExit(f"se esperaban 20 sucursales evaluables, hay {len(evaluables)}")

    salida = plantilla.replace("<!--__LOGO__-->", bloque_logo(logo))

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


def main() -> None:
    ap = argparse.ArgumentParser(description="Arma la pagina autocontenida")
    ap.add_argument("--logo", type=Path, default=None,
                    help="ruta del logo de Operaciones Nacionales (png, jpg, webp o svg). "
                         "Si se omite, se busca 'logo.*' en la carpeta del modelo, en "
                         "assets/ y en la raiz del repositorio.")
    construir(ap.parse_args().logo)


if __name__ == "__main__":
    main()
