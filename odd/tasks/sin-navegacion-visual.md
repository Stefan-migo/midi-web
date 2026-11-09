# Sin navegación visual

El sitio pierde su HUD de navegación visible. En su lugar quedan sugerencias que
aparecen y se van: «scroll down» en escritorio, «deslizá» en celular, y «tocá una
forma» para la obra. Nada de cuadrados, coordenadas, contador ni pausa.

## Specs

S1 (dueño, verbatim): «puedes sacar la navegacion de la web [captura de la barra
inferior: «tocá una forma», cinco cuadrados, «00 / 04 ↗»]. vamos a dejar sin
navegacion visual, tambien sacamos el de las cordenadas y tambien el boton de
pausa.»

S2 (dueño, verbatim): «para manejar la navegacion va a ser mucho mas sutil.
sugerencias, que aparecen intermitentemente, scroll down, en la version mobil, se
puede deslizar o scroll down.»

S3 (dueño, verbatim): «tambien el toca una forma. debe ser una sugerencia que
aparece intermitentemente sin ser invasivo.»

S4 (identidad y plataforma, `design/system.md` y `odd/tasks/midi-site-platform.md`):
dos colores `#f4f4f4`/`#111111`, DM Mono y Roboto Mono, cero radios; los cinco
documentos prerenderizados siguen siendo la plataforma SEO/AEO; el movimiento
respeta `prefers-reduced-motion`; todo se alcanza con teclado.

S5 (accesibilidad, derivado de S1 + S4): sacar la navegación *visual* no puede
dejar el sitio sin enlaces internos ni sin ruta de teclado. La `nav` de escenas
permanece en el documento, oculta, y aparece al foco.

## Tasks

T1 · S1, S2, S3 · inline · contenido y modelo: `Site.suggestions` reemplaza a
`Site.hint` (`src/content/types.ts`, `src/content/site.ts`).

T2 · S1, S3, S5 · inline · HUD: `index.html` sin coordenadas, pausa, contador ni
cuadrados; `#whisper` pasa a ser la única línea y la `nav` queda oculta.

T3 · S2, S3, S4 · inline · `src/main.ts`: se van la pausa, las coordenadas y el
contador; entra el ciclo de sugerencias (9 s, fundido de 420 ms, se calla con el
panel abierto o mientras una forma tiene el foco; con `reduced` queda una sola
línea fija).

T4 · S1, S4 · inline · prerender y checks: `route-html` deja de escribir el
contador, `routes.ts` pierde `counterLabel`, `check-routes` pinea el HUD nuevo.

T5 · S4, S5 · inline · CSS, `design/system.md` y verificación (verify + lectura en
Chrome a 390 y 1440, teclado y `prefers-reduced-motion`).

## Log

L1 (dueño, verbatim): «ok puedes sacar la navegacion de la web
C:\Users\El Mismisimo\Pictures\Screenshots\Screenshot 2026-11-09 174010.png. vamos
a dejar sin navegacion visual, tambien sacamos el de las cordenadas y tambien el
boton de pausa. --- para manejar la navegacion va a ser mucho mas sutil.
sugerencias, que aparecen intermitentemente, scroll down, en la version mobil, se
puede deslizar o scroll down. tambien el toca una forma. debe ser una sugerencia
que aparece intermitentemente sin ser invasivo.»

L2 (decisión): la `nav` no se elimina del documento. Es el único enlace interno
de cada página y la única forma de llegar a otra escena con teclado; los checks
exigen un `href` por ruta y un `aria-current`. Queda con `is-visually-hidden` y
se muestra al `:focus-within`. Si el dueño quiere cero enlaces, se borra y se
ajustan los checks.

L3 (decisión): el contador `00 / 04 ↗` se va con la barra: además de leerse como
navegación, era un botón «siguiente composición». Cambian de escena la rueda, el
swipe y los enlaces del mapa oculto (teclado); las flechas siguen cambiando
solo con un panel abierto, como antes.

## Entrega

Rama `feat/sin-navegacion-visual`, un commit: «feat(hud): se va la navegación
visible y quedan sugerencias intermitentes». Sin push; publicar sigue siendo
decisión del dueño.

Evidencia (Chrome headless, build de producción): el HUD quedó sin `#advance`,
`#motion` ni `.coordinates`; el mapa mide 1x1 con `clip-path: inset(50%)` y sus
cinco enlaces siguen ahí; con foco de teclado pasa a 108x12 y se ve. La
sugerencia arranca en «scroll down», a los 10 s dice «tocá una forma» y a los
20 s vuelve; en 390 px dice «deslizá»; con `prefers-reduced-motion` se queda en
una línea. El puntero sobre una forma manda sobre la sugerencia y al salir la
devuelve. Rueda y swipe siguen cambiando de escena (`/portafolio/`).
