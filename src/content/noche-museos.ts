/**
 * The live viewer of Noche de los museos 2026: everything the page says and
 * every number it obeys lives here, so the show can be retitled, re-pointed at
 * another Drive folder, or slowed down without touching the renderer.
 *
 * The folder is linked, not copied: the collective pastes the share link of the
 * album it is uploading to during the event, and the viewer keeps reading it.
 */

/**
 * Where the photo list comes from.
 *
 * `api` asks `/api/fotos`, the Vercel function: the Drive key stays on the
 * server and the CDN cache absorbs the crowd. `drive` asks Google directly from
 * the browser with a public, referrer-restricted key; it exists as the escape
 * hatch when the function is not available, at the cost of one request per
 * viewer instead of one per cache window.
 */
export type ViewerSource = 'api' | 'drive';

export interface LiveViewer {
  readonly kicker: string;
  readonly title: string;
  /** The share link the collective pastes into the group. */
  readonly folderUrl: string;
  /** The folder id read from that link; the reader never re-parses the URL. */
  readonly folderId: string;
  readonly source: ViewerSource;
  /** How many photos the source asks for; the show loops over what it gets. */
  readonly limit: number;
  /** How often the directory is asked for news. */
  readonly refreshMs: number;
  /** How long one photo stays on screen. */
  readonly slideMs: number;
  readonly copy: {
    readonly loading: string;
    readonly empty: string;
    readonly offline: string;
    readonly unconfigured: string;
    readonly missing: string;
    readonly live: string;
    readonly paused: string;
    readonly album: string;
    readonly photoAlt: string;
    readonly previous: string;
    readonly next: string;
    readonly play: string;
    readonly pause: string;
    readonly fullscreen: string;
  };
}

export const liveViewer: LiveViewer = {
  kicker: '/noche-de-los-museos',
  title: 'Noche de los museos 2026',
  folderUrl: 'https://drive.google.com/drive/folders/1OgcyP2FTpRxPdW2Ryu_PxJKZGqPrIJPG?usp=drive_link',
  folderId: '1OgcyP2FTpRxPdW2Ryu_PxJKZGqPrIJPG',
  source: 'api',
  limit: 120,
  refreshMs: 15000,
  slideMs: 7000,
  copy: {
    loading: 'conectando con el álbum',
    empty: 'Todavía no hay fotos. Van a aparecer acá a medida que se suban.',
    offline: 'sin conexión con el álbum · reintentando',
    unconfigured: 'El visualizador todavía no está conectado al álbum.',
    missing: 'El álbum no está disponible o dejó de ser público.',
    live: 'en vivo',
    paused: 'en pausa',
    album: 'Abrir el álbum en Drive',
    photoAlt: 'Foto del evento',
    previous: 'Foto anterior',
    next: 'Foto siguiente',
    play: 'Reanudar la reproducción',
    pause: 'Pausar la reproducción',
    fullscreen: 'Pantalla completa',
  },
};
