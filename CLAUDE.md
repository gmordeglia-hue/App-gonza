# Mis cuentas (App-gonza)

PWA de finanzas personales (cuentas, movimientos, tarjetas, inversiones). Todo se guarda en el celular (localStorage). Sin servidor. Idioma: español rioplatense, tanto en la interfaz como en comentarios y respuestas.

## Estructura
- `index.html`: pantalla + librerías de lectura de PDF (pesa ~1,4 MB; no leerlo entero, buscar con grep).
- `src/*.js`: código fuente, en 10 partes (`06b-extras.js`: informe por dueño, presupuestos y metas, gastos fijos, cierre de mes). **Es lo único que se edita.**
- `app.js`: generado por `python build.py` a partir de `src/`. **No se edita a mano.**
- `rapido.js`: intérprete de la caja «Escribilo en una línea» del formulario de movimientos (frases como «super 15000 bbva»). No guarda: completa el formulario.
- `styles.css`, `lock.js` (bloqueo por huella), `nav.js`, `miles.js`.
- `sw.js`: service worker para uso offline (`VERSION` = `'v36'`, caché `mis-cuentas-<VERSION>`).
- `tests/probar.py`: pruebas con Playwright y datos inventados.
- `LEEME.md`: explicación para humanos del mismo flujo.

## Flujo para cualquier cambio
1. Editar `src/` (o `styles.css`, etc.).
2. `python build.py`
3. `python tests/probar.py` → debe terminar en «TODO OK».
4. Subir `APP_VERSION` en `index.html` (hoy `v29`) **y** `VERSION` en `sw.js` (hoy `v36`). Son contadores distintos: se suben los dos, cada uno en +1.
5. Commit y push.

## Reglas
- Mantener fines de línea **CRLF** en `index.html` y no romper el BOM de `sw.js`.
- Si se agrega un archivo que la app necesita offline, sumarlo a `FILES` en `sw.js`.
- Este repo es **público**: nunca subir datos personales, respaldos ni capturas con datos reales. Las pruebas usan solo datos inventados.
- No publicar ni hacer push sin que el usuario lo pida. Antes de decir que algo funciona, correr las pruebas.
