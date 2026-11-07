# Arma app.js juntando los archivos de la carpeta src (en orden alfabético).
# Uso:  python build.py        (después de tocar algo en src, antes de subir)
import os, glob
aqui = os.path.dirname(os.path.abspath(__file__))
partes = sorted(glob.glob(os.path.join(aqui, 'src', '*.js')))
salida = "// ARCHIVO ARMADO: no se edita a mano. Editá los archivos de la carpeta src y corré: python build.py\r\n(function(){\r\n'use strict';\r\n"
for p in partes:
    salida += open(p, 'rb').read().decode('utf-8')
salida += "})();\r\n"
open(os.path.join(aqui, 'app.js'), 'wb').write(salida.encode('utf-8'))
print('app.js armado con', len(partes), 'partes')
