# MIDI — sitio web

Sitio del colectivo artístico MIDI. HTML, CSS, TypeScript y SVG. La obra es una
composición generativa: el arte se dibuja en cada frame, no es una imagen.

## Abrir la web

```sh
npm install
npm run dev
```

Abre http://localhost:5173.

## Compilar

```sh
npm run build      # genera dist/
npm run preview    # sirve dist/ para revisarlo
npm run typecheck  # tsc --noEmit
```

Para publicar en un subdirectorio (por ejemplo GitHub Pages en `/midi-web/`)
definí `VITE_BASE` antes del build. En la raíz de un dominio no hace falta.

## Dónde vive cada cosa

| Ruta | Qué es |
| --- | --- |
| `src/motion/` | Única fuente de la geometría y el ritmo de la obra. |
| `src/content/` | Todo el texto, los links y la galería, como datos tipados. |
| `src/styles/` | Hoja de estilos. |
| `src/main.ts` | Motor de escenas: pinta el arte y maneja la interacción. |
| `public/assets/` | Logos y piezas del archivo. |
| `remotion/` | Proyecto de autoría de las animaciones, para verlas cuadro a cuadro. |
| `web/` | Referencia visual congelada. Ver abajo. |
| `odd/tasks/` | Documento de tareas y decisiones del proyecto. |

## Editar las animaciones

`src/motion/` es la única fuente. La web y Remotion importan de ahí, así que no
hay copias que mantener sincronizadas a mano.

```sh
cd remotion
npm ci
npm run studio   # http://localhost:3030
```

La demo en navegador queda en `remotion/public/demo.html`
(`npm run demo` desde `remotion/`).

## Referencia visual

`web/` guarda el sitio original tal como estaba antes de la reconstrucción, y
está también congelado en el commit `8d04655`. Sirve para comparar píxeles
mientras se valida la paridad visual. Se retira cuando esa validación cierre.
