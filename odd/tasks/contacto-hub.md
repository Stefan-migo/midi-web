# Contacto — el hub de enlaces como panel

`/contacto/` ya es una escena con sus bloques, pero tocarlos no abre nada: el
`activate()` de `src/main.ts` no tiene rama para esa escena. Y `/midi-links/` es
hoy una lista de texto. Una sola pieza resuelve los dos: un componente `midi-hub`
que se monta como página oculta y como panel dentro del sitio.

## Specs

S1 (dueño, verbatim): «la pagina contacto va a seguir la logica que veniamos
usando con las otras paginas los bloques disponibles van a abriri un modal.»

S2 (dueño, verbatim): «este modal va a ser el modal del "/midi-links" ya que
midi links ya abre muestra todos los links de contacto para la pagina, esi si
tenemos que mejorar el dise;o de midi links.»

S3 (dueño, verbatim): «quiero que sigamos esta logica mas o menos de [imagen de
referencia en el chat] de no consideres los links de gente que no y el de noche
de los museos. por ahora. solo considera el formato logo. iconos de redes
sociales. y el link a la pagina principl de midi. del web.»

La referencia ordena la pieza así: marca arriba, nombre, subtítulo, una fila de
iconos de redes, y abajo el bloque de enlace. Los dos enlaces de eventos no
entran en esta versión.

S4 (identidad, `design/system.md` y S3 de `odd/tasks/nosotros-modal.md`): dos
colores `#f4f4f4` y `#111111`, DM Mono y Roboto Mono, rectángulos, cero radios,
sin tercer color; el movimiento respeta `prefers-reduced-motion`; todo se alcanza
con teclado.

S5 (arquitectura, derivado de S2): la página oculta y el panel son el mismo
componente y leen el mismo contenido. Si divergen, S2 deja de cumplirse.

## Tasks

T1 · S2, S3, S4 · inline · `ecfb697` — Modelo del hub (`src/content/midi-links.ts`),
glifos (`src/lib/icons.ts`), componente (`src/links/hub.ts`) y su hoja
(`src/styles/hub.css`).

T2 · S2, S3, S5 · inline · `ecfb697` — `/midi-links/` pasa a montar el componente: shell
estático mínimo, `src/links/index.ts`, `src/styles/links.css` sin las reglas de la
lista vieja.

T3 · S1, S4 · inline · 2.º commit — Los bloques de `/contacto/` abren el panel: rama de
`activate()`, modo `contact` en `openContent`, `renderContactHub`, y el panel en
`src/styles/style.css` (escritorio y pantalla completa en celular).

T4 · S4, S5 · inline · 2.º commit — Documentación y checks: `check-links` exige el montaje
del hub, `design/system.md` registra el componente, `npm run verify` en verde.

## Entrega

Rama `feat/contacto-hub`, dos cortes de revisión: `ecfb697` (componente y página
oculta, 367 líneas insertadas) y el commit siguiente (panel, docs y check). Cada
corte queda bajo el de ~400; la feature suma ~550 líneas entre los dos. El hash
del segundo no se registra porque cada enmienda lo cambia.
Push, PR y merge son decisión del dueño.

Comprobación de la pieza compartida (`openContent`): en navegador real, con el
build de producción, el panel de Nosotros sigue abriendo su carrusel y cerrando
con Escape devolviendo el foco; el archivo del portafolio sigue abriendo obra
con imagen, navegación y su animación; contacto abre el hub y cierra igual.

## Log

L1 (dueño, verbatim): «hey chat continuamos con el proyecto midiweb. ahora vamos
a trabajar con la pagina contacto. la pagina contacto va a seguir la logica que
veniamos usando con las otras paginas los bloques disponibles van a abriri un
modal. este modal va a ser el modal del "/midi-links" ya que midi links ya abre
muestra todos los links de contacto para la pagina, esi si tenemos que mejorar el
dise;o de midi links. [imagen] quiero que sigamos esta logica mas o menos de no
consideres los links de gente que no y el de noche de los museos. por ahora. solo
considera el formato logo. iconos de redes sociales. y el link a la pagina
principl de midi. del web.»

L2 (decisión, 2026-11-09): la marca no lleva círculo. La referencia usa un badge
circular, pero `design/system.md` fija «radios: ninguno en todo el sitio» y
`Docs/Identidad MIDI.pdf` es autoridad por encima de cualquier interpretación. Se
traduce el formato: un cuadrado sólido con el isotipo dentro, que invierte con la
superficie (papel/tinta). Si el dueño pide el círculo, es un cambio de una regla.
