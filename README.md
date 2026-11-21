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

## Publicación y SEO

`VITE_BASE` define la ruta base de los assets, enlaces y URLs generadas (por
ejemplo, `/midi-web/` para un subdirectorio). `SITE_URL` define el origen
público y por defecto es `https://holamidi.com`; al compilar genera canonical,
`og:url`, `sitemap.xml` y la referencia a ese sitemap en `robots.txt`. Para
compilar un preview en otro origen: `SITE_URL=https://otro.dominio npm run build`.

`npm run verify` corre typecheck, build y `check:routes`, que verifica los
documentos generados: título y description propios por ruta, origen de la
canonical, un solo `aria-current`, sitemap completo y ausencia de navegación por
hash. El origen esperado es el default del build, o `SITE_URL` cuando el build
se compiló con esa variable.

## Visualizador en vivo

`/midi-links/noche-museos/` es una página suelta, fuera del sistema de escenas:
un visor a pantalla completa de las fotos que el colectivo sube a una carpeta
pública de Google Drive durante el evento. Se refresca sola cada 15 s, arranca
en la foto más reciente y recorre la lista en orden hasta volver a empezar.
Todo lo que dice y todos los tiempos están en `src/content/noche-museos.ts`:
retitular el evento, cambiar la carpeta o el ritmo no toca el código.

### Conectarlo a una carpeta de Drive

1. Compartí la carpeta como **«cualquiera con el link — lector»**. Si no es
   pública, la API responde vacío.
2. Habilitá la **Google Drive API** en un proyecto de
   [Google Cloud](https://console.cloud.google.com) y creá una **API key**
   (Credenciales → Crear credencial → Clave de API). No tiene costo: la cuota
   gratuita alcanza para un evento.
3. Definí las variables en local (`.env`) y en Vercel → Settings → Environment
   Variables:

| Variable | Dónde | Qué es |
| --- | --- | --- |
| `GOOGLE_DRIVE_API_KEY` | servidor | La API key. Sin prefijo `VITE_`: nunca llega al navegador. |
| `DRIVE_FOLDER_ID` | servidor | Carpeta por defecto; acepta el id o el link de compartir. |
| `VITE_DRIVE_API_KEY` | cliente | Solo para el modo `drive` (ver abajo). Pública y restringida por referrer. |

`.env` está ignorado por git; este README es la referencia de las variables.

Para ver el visualizador con la carpeta real en local hace falta la función:
`npm run dev` sirve solo los archivos estáticos, así que `/api/fotos` devuelve
el documento del sitio y la página muestra su estado «sin conexión». Usá
`vercel dev` (respeta `.env`), o poné `source: 'drive'` en
`src/content/noche-museos.ts` más `VITE_DRIVE_API_KEY` para que el navegador
consulte Drive directo mientras desarrollás.

### Por qué pasa por una función

El navegador no puede listar una carpeta de Drive: la API necesita una key y la
key no puede publicarse. `api/fotos.mjs` la guarda del lado servidor y el CDN de
Vercel cachea la respuesta 10 s, así que la cuota de Drive se gasta por tiempo
de evento y no por cantidad de visitantes. Con 1.000 personas mirando son las
mismas ~360 lecturas por hora que con una.

Si la función no estuviera disponible, `source: 'drive'` en
`src/content/noche-museos.ts` pasa la lectura al navegador con `VITE_DRIVE_API_KEY`
(restringida a `holamidi.com/*` y `localhost:5173/*`). Es un atajo de
emergencia: cuesta una lectura por visitante y no oculta la key.

`npm run check:viewer` fija el contrato de esa fuente: normalización del link,
orden y deduplicado de la lista, y que ningún error —ni la key— se sirva como
éxito cacheado.

## Brief individual

`/brief/` es una página privada (`noindex, nofollow`, fuera del sitemap y del
menú) donde cada integrante responde el brief antes de la reunión. Mientras se
escribe, el borrador queda en el propio dispositivo, y las respuestas se pueden
volver a actualizar desde la misma página hasta la reunión.

### Conectarlo a Supabase

1. Crear un proyecto en Supabase y correr `supabase/brief.sql` en el SQL Editor.
2. Copiar la URL del proyecto (`https://<ref>.supabase.co`, sin `/rest/v1`) y la
   **secret key** (Project Settings → API Keys, formato `sb_secret_...`). Esa es
   la que bypassea row level security; la publishable **no** sirve para escribir
   acá, porque la tabla no tiene ninguna policy. La función manda la key en
   `apikey`, y solo la agrega como `Bearer` cuando es un JWT legacy: PostgREST
   rechaza las keys nuevas como bearer (PGRST301).
3. Definir en Vercel, nunca con prefijo `VITE_`:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` — el nombre que inyecta la integración de Supabase en
     Vercel. Si el deployment es viejo y usa `SUPABASE_SERVICE_ROLE_KEY`, también
     se lee: Supabase depreca ese nombre a fin de 2026, así que el nuevo gana
     cuando están las dos.
   - `BRIEF_ACCESS_CODE` — la clave que comparte el colectivo.
   - `BRIEF_ROUND` (opcional) — etiqueta de la edición; por defecto `fundamentos`.
4. Volver a desplegar.

Sin esas variables el endpoint responde `503 not_configured` y no guarda nada:
mejor que falle a que acepte respuestas hacia el vacío.

### Leer las respuestas

La tabla no es accesible desde el navegador: se lee desde el panel de Supabase
o exportándola a CSV para la síntesis. La consulta queda al final de
`supabase/brief.sql`.

`npm run check:brief` fija el contrato del endpoint sin base de datos: código de
acceso, límites de cada respuesta, validación, actualización por id y que la
`service_role` key nunca vuelva en una respuesta.

## Dónde vive cada cosa

| Ruta | Qué es |
| --- | --- |
| `src/motion/` | Única fuente de la geometría y el ritmo de la obra. |
| `src/content/` | Todo el texto, los links y la galería, como datos tipados. |
| `src/styles/` | Hoja de estilos. |
| `src/main.ts` | Motor de escenas: pinta el arte y maneja la interacción. |
| `api/` | Funciones de Vercel: el proxy del visualizador en vivo y la escritura del brief. |
| `supabase/` | Esquema SQL del brief. Se corre a mano en el panel de Supabase. |
| `brief/` | Página privada del brief individual. Ver arriba. |
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
