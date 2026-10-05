# Calendario Voleibol Madrid

Calendario web para:

- Voleibol Guadarrama Negro — Senior Femenino — 1ª División Aut. Zonal — Fase Regular A.
- CV Majadahonda A — Senior Femenino — 2ª División Aut. Preferente — Fase Regular A.

## Importante: actualización en directo

Esta versión **no guarda un calendario en localStorage ni utiliza un JSON estático como fuente de verdad**.

Cada vez que se abre la página:

1. Se construye una URL a la competición de FMVB.
2. Se añade `_ts=<timestamp>` para evitar caches intermedias.
3. `fetch()` usa `cache: "no-store"`.
4. Se descarga el HTML actual de FMVB.
5. Se extraen los partidos.
6. Las horas vacías/00:00/TBD/etc. se muestran como `PENDIENTE` y el partido se resalta en naranja.

También existe el botón **Actualizar** para repetir la consulta sin recargar la página.

## URLs

- `/?club=guadarrama`
- `/?club=majadahonda`

Ejemplo GitHub Pages:

`https://TU-USUARIO.github.io/TU-REPO/?club=guadarrama`

## Problema de CORS

GitHub Pages es un sitio estático. Si `fmvoley.com` no permite peticiones CORS desde el dominio de GitHub Pages, ningún JavaScript ejecutado directamente en GitHub Pages puede saltarse esa política del navegador.

En ese caso hay dos opciones:

### Opción recomendada si FMVB no permite CORS

Usar el Worker incluido en `worker/` como proxy transparente:

`GitHub Pages -> Cloudflare Worker -> FMVB`

El Worker añade sus propias cabeceras CORS y hace la petición al sitio oficial.

Después se rellena `OPTIONAL_PROXY_URL` en `src/config.js` con la URL del Worker.

**El Worker no cachea** la respuesta: utiliza `cache: "no-store"` y conserva el parámetro `_ts`.

### Opción sin proxy

Si FMVB permite CORS, deja:

`OPTIONAL_PROXY_URL = ""`

y GitHub Pages consulta directamente a FMVB.

## GitHub Pages

1. Crea un repositorio.
2. Sube todos los archivos conservando la estructura.
3. GitHub → Settings → Pages.
4. En "Build and deployment", selecciona "Deploy from a branch".
5. Branch: `main`, carpeta `/ (root)`.
6. Guarda.
7. Abre la URL generada.

No necesita Node, npm ni compilación.

## Parser

El parser está aislado en `src/fmvb.js`. Si FMVB cambia el HTML, se modifica únicamente ese archivo.

## Nota sobre horas

Una hora se considera pendiente si FMVB devuelve:

- ausencia de hora;
- `00:00`;
- `00:00:00`;
- `TBD`;
- `TBC`;
- `pendiente`;
- `por determinar`;
- `sin hora`.

Se puede ampliar fácilmente la lista.
