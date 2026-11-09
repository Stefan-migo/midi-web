export interface AboutScene {
  id: 'sobre' | 'integrantes' | 'manifiesto';
  label: string;
  kicker: string;
  title: string;
  paragraphs: readonly string[];
  lines?: readonly string[];
  roster?: readonly { name: string; role: string }[];
  note?: string;
  image?: { src: string; alt: string };
}

/** About-panel copy is sourced from the owner-approved brief; roster stays TODO. */
export const aboutScenes: readonly AboutScene[] = [
  {
    id: 'sobre',
    label: 'Sobre',
    kicker: 'MIDI · colectivo artístico',
    title: 'Entre una mirada y otra',
    paragraphs: [
      'Midi es un colectivo de creación artística interdisciplinaria que desarrolla experiencias audiovisuales inmersivas, donde la música, la imagen, el cuerpo y la tecnología dialogan en tiempo real.',
      'Cada presentación es un entramado de medios y sensibilidades: visuales reactivas, música electrónica o experimental, danza, poesía, y elementos generativos que se entrelazan para construir un paisaje estético único, en constante transformación.',
    ],
    lines: [
      'Performances audiovisuales',
      'Intervenciones multimediales',
      'Instalaciones interactivas',
      'Formación y talleres',
    ],
    image: {
      src: 'assets/nosotros/IMG_0830-web.webp',
      alt: 'Integrantes del colectivo MIDI reunidos frente a las ruinas.',
    },
  },
  {
    id: 'integrantes',
    label: 'Integrantes',
    kicker: 'MIDI · colectivo artístico',
    title: 'Integrantes',
    paragraphs: [],
    roster: Array.from({ length: 5 }, () => ({ name: 'TODO · nombre', role: 'TODO · rol' })),
    note: 'La lista está pendiente.',
  },
  {
    id: 'manifiesto',
    label: 'Manifiesto',
    kicker: 'MIDI · colectivo artístico',
    title: 'Manifiesto',
    paragraphs: [
      'Nuestro enfoque es colaborativo, inclusivo y experimental, generando experiencias que invitan al público a formar parte de la obra, ya sea desde la interacción directa o la inmersión sensorial.',
      'La tecnología no es un fin, sino un medio para activar nuevas formas de sensibilidad y comunicación.',
    ],
  },
];
