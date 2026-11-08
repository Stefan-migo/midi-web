# MIDI — sistema de diseño

Sincronizado desde el código, no desde una intención. Sólo se registran valores
que existen en las fuentes citadas.

Fuentes leídas: `src/styles/style.css`, `src/lib/tokens.ts`, `web/style.css`
(referencia congelada, byte-idéntica a la de producción), `MIDI/web/style.css`
(copia local de la referencia).

## Color

| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--paper` | `#f4f4f4` | Geometría de la obra, texto sobre tinta, fondo del panel | `src/styles/style.css` `:root` |
| `--ink` | `#111111` | Fondo del mundo, texto del panel | `src/styles/style.css` `:root` |
| — | `#777` | Borde del botón de movimiento | `src/styles/style.css` |
| — | `#888` | Foco punteado de las zonas de click | `src/styles/style.css` |
| — | `#000` / `#fff` | Máscaras internas del arte | `src/motion/transition.mjs` |

`#f4f4f4` y `#111111` están duplicados como literales en `src/motion/motion.mjs`
y `src/motion/transition.mjs`. `src/lib/tokens.ts` los expone para código nuevo.
La unificación se difiere a propósito: esos módulos son byte-idénticos a la
referencia y son la prueba de paridad visual.

Contraste: `#f4f4f4` sobre `#111111` es 17.9:1; `#111111` sobre `#f4f4f4`, lo
mismo. Pasa AA y AAA en ambos sentidos.

## Tipografía

| Rol | Familia | Tamaño actual | Fuente |
| --- | --- | --- | --- |
| Interfaz y cuerpo | DM Mono 400/500 | — | `index.html` (Google Fonts) |
| Firma y títulos del panel | Roboto Mono 400/500 | — | `index.html` (Google Fonts) |
| Título de escena | hereda | `clamp(12px, 1vw, 15px)`, uppercase, tracking `.16em` | `.scene-copy h1` |
| Subtítulo de escena | hereda | `10px` | `.scene-copy p` |
| HUD | hereda | `9px` (coordenadas, hint) | `.coordinates`, `#whisper` |
| Contador | hereda | `10px`, flecha `22px` | `#advance` |
| Título de panel | Roboto Mono | `clamp(24px, 4vw, 55px)`, tracking `-.07em` | `#reveal h2` |
| Cuerpo de panel | hereda | `13px / 1.8`, máximo `48ch` | `#reveal p` |
| Links de panel | hereda | `clamp(12px, 2vw, 23px)` | `#reveal a` |

Diagnóstico registrado: la escala de escena está subdimensionada — el `h1` vive
entre 12 y 15 px, el cuerpo en 10 px. La jerarquía tipográfica casi no existe.
Es una de las dos razones del brief de `design/midi-escena-fluida/`.

## Espaciado y layout

No hay escala de espaciado declarada; los valores son sueltos: `26px`/`30px`
para el HUD, `5%`/`14%` para el bloque de escena, `15% 18%` para el panel,
`12px` de separación en la navegación.

- Lienzo de composición: fijo **1200×900**, `preserveAspectRatio="xMidYMid meet"`
  → letterbox en cualquier proporción distinta de 4:3.
- Alto del mundo: `100svh`, mínimo `450px`.
- Un solo breakpoint: **650px**.
- El panel abre con `inset: 15% 18%`.

## Radios, sombras, bordes

- Radios: **ninguno** en todo el sitio.
- Sombra: una sola, `drop-shadow(0 0 5px var(--paper))`, en el foco de la escena 0.
- Panel: borde `10px` tinta + `outline: 2px` papel (6px en mobile).
- Foco: `outline: 2px dashed currentColor`, `outline-offset: 6px`.

## Componentes

| Componente | Reglas |
| --- | --- |
| Firma | Imagen de 160px (140px bajo 650px), anclada arriba a la izquierda, posicionada por el solver de colisiones |
| Coordenadas | Lectura de puntero, `9px`, arriba a la derecha |
| Navegación de escenas | Cinco cuadrados de 12px con `aria-current` relleno y rotado `90deg` |
| Hint | `#whisper`, `9px`, abajo a la izquierda |
| Contador | `00 / 04`, botón sin fondo, flecha grande |
| Botón de movimiento | `27px`, borde `1px #777`, alterna `Ⅱ` / `▷` |
| Panel | Papel sobre tinta, animación `unfold` de 650ms, cierre con foco devuelto |

## Regla para los artboards

Cuando este archivo existe, todo artboard usa únicamente estos tokens. Los
artboards usan stacks de sistema (`ui-monospace`) porque la regla de la skill
prohíbe fuentes remotas; en producción son DM Mono y Roboto Mono.

## Autoridad: el manual de identidad

`Docs/Identidad MIDI.pdf` es la fuente de verdad del sistema, por encima de
cualquier interpretación de este archivo. Tiene 11 páginas de 1080×1080 pt,
todas gráficas: el texto está vectorizado, así que se lee mirándolo, no
extrayéndolo. Lo que el manual establece y este proyecto ya respeta:

| Regla de identidad | Estado en el código |
| --- | --- |
| Exactamente dos colores: `#f4f4f4` y `#111111` | Correcto. No hay un tercer color en el sitio |
| Dos fuentes, Roboto Mono y DM Mono, en Regular y Medium | Correcto, servidas desde Google Fonts |
| El isotipo es una construcción modular de rectángulos, sin curvas ni radios | Correcto: el arte se genera con esos mismos trazados |
| Tratamientos sólido y de contorno, sobre claro y sobre oscuro | Correcto: la obra y el HUD alternan ambos |
| El isotipo se descompone en sus rectángulos y se recompone a distintas escalas, sangrando fuera del marco | Es exactamente lo que hace la obra del sitio |
| Voz de etiqueta con barra inicial: `/colores`, `/fuente/…`, `/contacto/…` | Parcial: el sitio usa `M /` y `/ Colectivo Artístico` |
| Variante horizontal para encabezados y firmas web | Correcto: la firma usa `midi-horizontal-blanco.svg` |

Lo que el manual deja claro y el sitio hoy **no** cumple: las composiciones del
manual sangran hasta el borde y se recortan fuera del marco. El sitio las
encierra en un lienzo de 1200×900 con letterbox. Cualquier dirección que
devuelva la obra al borde —y acepte el recorte— es más fiel al manual que la
que la mantiene encajonada.

Falta además el juego completo de favicons que el manual y la guía de logos
definen: `favicon.ico` (16/32/48), `favicon.svg`, `apple-touch-icon.png` e
iconos de 192 y 512 px. Hoy el sitio enlaza sólo el SVG.

