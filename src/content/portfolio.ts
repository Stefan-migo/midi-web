/**
 * The archive is published as five cards over ten pieces. Cards combine pieces
 * because ten separate works would be noise, and two pieces stay locked: they
 * answer with a subtle scale under the pointer and never flip.
 *
 * Piece names come from `src/motion/transition.mjs`; the grouping follows the
 * owner's annotations over the running page. Unknown metadata remains TODO.
 */

export interface ArchiveCard {
  id: string;
  /** Piece names this card covers. One entry or several. */
  pieces: string[];
  /** Short label for the archive block and whisper. */
  name: string;
  /** Full work title, used in the dialog heading. */
  title: string;
  year: string;
  venue: string;
  dateLabel: string;
  /** Site-root-relative path, e.g. `assets/portafolio/obra-01-web.jpg`. */
  image?: string;
  /** Media framing for the archive detail page. */
  media: 'photo' | 'graphic';
  /** Required when `image` is set, for assistive technology. */
  imageAlt?: string;
  /** Source-derived body copy; omitted when no curatorial text exists. */
  body?: string[];
  /** Installations or components named by the source material. */
  installations: string[];
  /** Short factual credit or project metadata, distinct from body copy. */
  metadata?: string;
  upcoming?: boolean;
  /** Existing hover card's concise line. */
  subtitle: string;
}

/** Pieces with no card: they only grow slightly under the pointer. */
export const lockedPieces = new Set(['solid-cap', 'solid-dot']);

/** Mobile crop hides MIDI4all's original pieces; use the visible bar as its door. */
const narrowCardOverrides = new Map<string, string>([['solid-dot', 'card-1']]);

export function isLockedPiece(piece: string, narrow: boolean): boolean {
  return lockedPieces.has(piece) && !(narrow && narrowCardOverrides.has(piece));
}

export const archiveCards: ArchiveCard[] = [
  {
    id: 'card-1',
    pieces: ['solid-left', 'solid-right'],
    name: 'MIDI4all',
    title: 'MIDI4all',
    year: 'TODO',
    venue: '990 Arte Club · Córdoba',
    dateLabel: 'TODO',
    subtitle: '990 Arte Club · Córdoba',
    image: 'assets/portafolio/midi4all/_DSC5779-web.webp',
    media: 'photo',
    imageAlt:
      'Presentación de MIDI4all: dos personas frente a laptops y controladores sobre un escenario iluminado en azul, con una proyección del isotipo MIDI.',
    body: [
      'Proyecto artístico audiovisual concebido como un espacio de experimentación contemporánea y creación multidisciplinaria.',
      'MIDI4all surge como una propuesta de búsqueda colaborativa dentro de nuestro colectivo MIDILab, con el objetivo de habilitar nuevas formas de expresión y encuentro entre diversas disciplinas artísticas.',
      'En cada presentación, los integrantes del proyecto realizamos una selección previa de piezas que sirven como punto de partida para la construcción de un paisaje sonoro en vivo.',
    ],
    installations: ['Sonido en vivo', 'Visuales', 'Pintura y otras expresiones', 'Dispositivos MIDI e instrumentos musicales'],
    metadata: 'Proyecto artístico audiovisual del colectivo MIDILab',
  },
  {
    id: 'card-2',
    pieces: ['solid-stem'],
    name: 'La Reforma en Primera Plana',
    title: 'Gente que no · La Reforma en Primera Plana',
    year: '2026',
    venue: 'Centro Cultural UNC',
    dateLabel: '19 de junio',
    subtitle: 'Centro Cultural UNC · 19 de junio',
    image: 'assets/portafolio/AniversarioReformaUniversitaria/DSC01526-web.webp',
    media: 'photo',
    imageAlt: 'Personas observan una proyección audiovisual con imágenes de archivo sobre un muro iluminado en violeta.',
    body: [
      'El espacio del Refectorio reúne dos instalaciones que marcan el punto de unión del recorrido artístico: un collage audiovisual proyectado sobre el muro posterior y la instalación interactiva “Reafirmá la Reforma”, retroproyectada sobre la puerta del mismo, que invita al público a convertirse en protagonista activo de la conmemoración.',
      'El muro situado detrás del DJ se transforma en pantalla donde el material oficial de archivo cobra una nueva vida visual. Estas proyecciones se combinan en tiempo real con capturas de cámaras en vivo y piezas de videoarte.',
      'Sobre la Torre del Reloj del Colegio Monserrat se proyectan escenas intervenidas que recrean los hitos fundamentales de la Reforma Universitaria de 1918.',
    ],
    installations: ['Reafirmá la Reforma', 'Archivo en movimiento', 'Memoria en lo alto'],
    metadata: 'Gente que no · La Reforma en Primera Plana',
  },
  {
    id: 'card-3',
    pieces: ['outline-dot'],
    name: 'ROBIDU',
    title: 'Gente que no · ROBIDU live set',
    year: '2025',
    venue: 'Patio CCU · Obispo Trejo 314',
    dateLabel: '16 de octubre',
    subtitle: 'Patio CCU · 16 de octubre',
    image: 'assets/portafolio/GenteQueNo/snapgram.io_ytykucmrg8j5-web.webp',
    media: 'graphic',
    imageAlt: 'Flyer de Gente que no: una persona sentada en una sala de cine, con el anuncio ROBIDU live set, MIDI performance visual y los datos del evento.',
    // TODO(contenido): todavía no existe texto curatorial para este evento.
    installations: [],
    metadata: 'ROBIDU live set + MIDI performance visual',
  },
  {
    id: 'card-4',
    pieces: ['outline-stem'],
    name: 'Noche de los Museos 2025',
    title: 'Noche de los Museos 2025',
    year: '2025',
    venue: 'Centro Cultural UNC',
    dateLabel: '7 de noviembre',
    subtitle: 'Centro Cultural UNC · 7 de noviembre',
    image: 'assets/portafolio/NocheDeLosMueseos-2025/IMG_0796-web.webp',
    media: 'photo',
    imageAlt: 'Videomapping de un rostro escultórico sobre una máscara en una sala patrimonial.',
    body: [
      'Visible desde el exterior a través de las ventanas del Refectorio, esta instalación propone un acto de arteología: una práctica que fusiona las herramientas del arte contemporáneo con los métodos de la arqueología del patrimonio.',
      'Situada en la Plaza Arqueológica N.º 2, la obra invita al público a dialogar directamente con el patrimonio. A través de estaciones de escritura interactivas, cualquier palabra o mensaje del visitante es capturado y proyectado en tiempo real sobre las ruinas.',
      'Esta instalación es un espacio de reflexión y un homenaje a la memoria de las personas esclavizadas, principalmente de origen africano, cuyo trabajo forzado fue fundamental para construir y sostener el patrimonio jesuítico.',
    ],
    installations: ['Arteología Digital', 'Dejá tu huella', 'Cadena de Memorias'],
  },
  {
    id: 'card-5',
    pieces: ['outline-cap', 'outline-left', 'outline-right'],
    name: 'Noche de los Museos 2026',
    title: 'Noche de los Museos 2026 · Borges o la coincidencia de los opuestos',
    year: '2026',
    venue: 'Centro Cultural UNC',
    dateLabel: '13 de noviembre · próxima',
    subtitle: 'Centro Cultural UNC · próxima',
    image: 'assets/portafolio/NocheDeLosMueseos-2026/snapgram.io_u4xt2a24tqfk-web.webp',
    media: 'graphic',
    imageAlt: 'Gráfica de la propuesta Noche de los Museos 2026: Borges y la coincidencia de los opuestos, con imágenes de la explanada y el Refectorio.',
    body: [
      'Para esta edición de la Noche de los Museos proponemos dos instalaciones visuales en el Centro Cultural UNC: una intervención en la explanada, que acompañará las actividades de La Botica, y un collage colectivo interactivo en el Refectorio.',
      'Tomamos como punto de partida la posibilidad de que elementos aparentemente opuestos se encuentren, se reflejen y se transformen. A través de imágenes en movimiento y de la participación del público, buscamos dar forma visual a esas relaciones.',
    ],
    installations: ['La explanada', 'El Refectorio'],
    metadata: 'Propuesta de escenografía e instalaciones visuales',
    upcoming: true,
  },
];

/** The card a piece belongs to, if it has one. */
export function cardForPiece(piece: string, narrow = false): ArchiveCard | undefined {
  const overrideId = narrow ? narrowCardOverrides.get(piece) : undefined;
  return (overrideId ? archiveCards.find((card) => card.id === overrideId) : undefined)
    ?? archiveCards.find((card) => card.pieces.includes(piece));
}

/** Label for a piece: its card title when it belongs to one. */
export function pieceLabel(piece: string, narrow = false): string {
  return cardForPiece(piece, narrow)?.name ?? 'Pieza';
}
