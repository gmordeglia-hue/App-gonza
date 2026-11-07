# Mis cuentas: cómo está armada

La app es una página instalable (PWA) que guarda todo en el celular.

- `index.html`: la pantalla (más las librerías para leer PDF, que ocupan casi todo el archivo).
- `styles.css`: los estilos.
- `src/`: el código, en 9 partes por tema (base, estado y deudas, almacenamiento, cuotas, categorías y lector de resúmenes, vistas, ventanas, guardado y resúmenes, eventos y arranque).
- `app.js`: ARMADO a partir de `src/`. No se edita a mano.
- `lock.js`, `nav.js`, `miles.js`: bloqueo por huella, navegación y números.
- `sw.js`: guarda la app para que abra sin internet.
- `tests/probar.py`: pruebas automáticas con datos inventados.

## Para hacer un cambio
1. Editar el archivo que corresponda en `src/` (o `styles.css`).
2. `python build.py` (arma `app.js`).
3. `python tests/probar.py` (tiene que terminar en «TODO OK»).
4. Subir `APP_VERSION` en `index.html` y `VERSION` en `sw.js`.
5. Publicar. Mantener los fines de línea CRLF.

Nunca subir datos personales ni copias de seguridad a este repositorio.
