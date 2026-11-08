# MIDI / Proyecto local

## Abrir la web

Descomprime el ZIP y abre una terminal en la carpeta extraida `MIDI`.
Con Python 3 instalado, ejecuta:

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory web
```

Abre http://127.0.0.1:8000 en el navegador. En Windows puedes usar `py`
si el comando `python` no esta disponible. En macOS puedes usar `python3`.
La web usa HTML, CSS, JavaScript y SVG. No requiere un paso de compilacion.
Usa el servidor local para que el navegador pueda cargar los modulos JavaScript.

## Editar las animaciones en Remotion

La carpeta `remotion` incluye el proyecto de autoria y las cuatro composiciones.
Con Node.js y npm instalados, abre una terminal en esa carpeta y ejecuta:

```sh
npm ci
npm run studio
```

Abre http://localhost:3030. Los archivos de movimiento usados por la web
estan en `web/motion.mjs` y `web/transition.mjs`. Si editas las animaciones
en Remotion, copia sus versiones actualizadas desde `remotion/public` a `web`
para reflejar esos cambios en la web.
