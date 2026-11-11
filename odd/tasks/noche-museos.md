# Noche de los museos 2026 — visualizador en vivo desde Google Drive

Feature branch `feat/noche-museos`, sin push. Superficie: `/midi-links/` (una tarjeta nueva) y la página nueva `/midi-links/noche-museos/`.

## Specs

- **S1** (dueño, verbatim): «tenemos que agregar este link justo sobre el bton que dice sitio principal. en el mismo formato un boton, pero que diga `Noche de los museos 2026`».
- **S2** (dueño, verbatim): «tiene que dirigir a una nueva pagina que sera un visualizador de imagenes que vendran desde este link https://drive.google.com/drive/folders/1OgcyP2FTpRxPdW2Ryu_PxJKZGqPrIJPG?usp=drive_link».
- **S3** (dueño, verbatim): «a este visualizador debe ser posible conectarlo con un link en general de google drive».
- **S4** (dueño, verbatim): «en este drive se van a ir subiendo imagenes durante el evento en el momento, de forma que la gente pueda entrar y ver imagenes en tiempo "real" del mismo evento que esta sucediendo».
- **S5** (dueño, verbatim): «para la pagina del visualizador hay que crear un dise;o que mantenga la logica de la pagina principal. este visualizador debe ser una pagina sencilla responsive, donde se vayan reproduciendo las imagenes que se van cargando en el drive».
- **S6** (dueño, verbatim): «la idea es no pagar extra por esto. utilizar solo el free de drive».
- **S7** (dueño, decisión): path público `/midi-links/noche-museos/`.
- **S8** (dueño, decisión): lectura de la carpeta por **proxy serverless** en Vercel con caché CDN, y fuente conmutable `api | drive`.
- **S9** (identidad, `design/system.md`): dos colores `#f4f4f4` / `#111111`, DM Mono y Roboto Mono, rectángulos, cero radios, sin tercer color, `prefers-reduced-motion`, teclado.

## Tasks

| ID | Specs | Ruta | Commit | Estado |
| --- | --- | --- | --- | --- |
| T1 | S1, S9 | inline | `25eb9c0` | ✅ tarjeta del evento sobre «Sitio principal» |
| T2 | S2, S3, S6, S8 | inline | `6365dff` | ✅ fuente Drive: proxy con caché + cliente |
| T3 | S4, S5, S7, S9 | inline | `25ba3aa`, `e003f06` | ✅ página en vivo responsive |
| T4 | S2, S5, S6, S8 | inline | (este commit) | ✅ env, docs, checks y verificación |

### Slices de revisión

El primer corte quedó en 713 líneas (T1 + T2) porque el contrato de la fuente trae su propio check de 300 líneas. Desde ahí se cortó más fino: `25ba3aa` (motor del show, 373) y `e003f06` (documento, hoja y build, 468). Total de la rama: ~1.500 líneas de autor, sin push.

## Log

- **L1** (dueño, verbatim): «he chat. necesito que modifiquemos unas cosas en el /midi-links. tenemos que agregar este link justo sobre el bton que dice sitio principal. en el mismo formato un boton, pero que diga `Noche de los museos 2026` y tiene que dirigir a una nueva pagina que sera un visualizador de imagenes que vendran desde este link https://drive.google.com/drive/folders/1OgcyP2FTpRxPdW2Ryu_PxJKZGqPrIJPG?usp=drive_link o sea. la idea aqui es crear un nuevo path dentro de la pagina midi. esta path sera un visualizador que lo utilizaremos para las presentaciones en vivo. a este visualizador debe ser posible conectarlo con un link en general de google drive. en este drive se van a ir subiendo imagenes durante el evento en el momento, de forma que la gente pueda entrar y ver imagenes en tiempo "real" del mismo evento que esta sucediendo. para la pagina del visualizador hay que crear un dise;o que mantenga la logica de la pagina principal. este visualizador debe ser una pagina sencilla responsive, donde se vayan reproduciendo las imagenes que se van cargando en el drive. puedes crear todo el sistema de visualizador ahora? dame un overview antes de emepezar»
- **L2** (dueño, corrección): «entiendo que la solcion proxy serverless es mas robusta? pero que es eso de enviar cada15 segundos aunque nadie consulte? eso no nos comeria la api de drive? la idea es no pagar extra por esto. utilizar solo el free de drive» → el caché es perezoso: sin visitas no hay llamadas; la Drive API no se cobra y las miniaturas no consumen cuota.
- **L3** (dueño, decisión): path `/midi-links/noche-museos/`; lectura por proxy con caché CDN y `source: 'api' | 'drive'` conmutable.
- **L4** (decisión): la tarjeta del evento se muestra solo en la página oculta `/midi-links/`, no en el panel de `/contacto/`, porque la feature `contacto-hub` excluyó explícitamente los links de eventos del panel. Verificado en el panel abierto: `["Sitio principal"]`.
- **L5** (decisión): el evento se sirve como entrada Vite propia, fuera del prerender de escenas.
- **L6** (decisión, S4): el show abre en la foto **más reciente** y sigue en orden hasta dar la vuelta; un poll solo agrega. Alguien que escanea el QR a mitad del evento quiere ver lo que acaba de pasar.
- **L7** (decisión, S4): las miniaturas salen de `drive.google.com/thumbnail`, no del archivo original: Google redimensiona, convierte HEIC de teléfono y no gasta cuota de Drive.
- **L8** (decisión, S6): `Cache-Control: public, s-maxage=10, stale-while-revalidate=60` en el proxy; los errores van con `no-store` para no cachear una caída de Drive.
- **L9** (límite del harness): `.env.example` no se pudo escribir (política de rutas sensibles). Las variables quedan documentadas en el README y `.env` ya está ignorado por git.

## Verificación

`npm run verify` en verde: typecheck, build, `check:routes`, `check:motion`, `check:links` y `check:viewer` (20 checks del contrato del proxy).

Comportamiento medido sobre el build real con Chrome headless + CDP (proxy simulado con fotos locales):

| Caso | Resultado |
| --- | --- |
| Primera carga | `4 / 4`, estado `live`, «en vivo», reloj «hace 2 s» |
| Autoavance 7 s | `4 / 4` → `1 / 4`: avanza y da la vuelta |
| Pausa | cuadro y contador congelados, `aria-label` «Reanudar», estado «en pausa» |
| Foto subida durante el evento | `/ 4` → `/ 5` sin recargar; el cuadro pausado no se movió |
| Reanudar | avanza a `2 / 5` |
| Tarjeta en `/midi-links/` | «Noche de los museos 2026» → `/midi-links/noche-museos/`, arriba de «Sitio principal» |
| Panel de `/contacto/` | monta el hub, sin la tarjeta del evento |
| Upstream 503 | estado `offline`, «sin conexión con el álbum · reintentando», CTA al álbum, `0 / 0` |
| Mobile 390×844 | visor 390, escena 366×693, contador y fullscreen dentro del viewport |

Pendiente de prueba real: la lectura contra la carpeta de Drive, que necesita `GOOGLE_DRIVE_API_KEY` (ver README). Sin ella el visualizador muestra el estado «sin conexión», que es el comportamiento correcto y ya está verificado.
