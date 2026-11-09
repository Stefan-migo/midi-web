import type { Site } from './types';

export const site: Site = {
  name: 'MIDI', // web/index.html:2
  // TODO(T2): A sourced tagline is needed; web/index.html's description is metadata, not a tagline.
  hint: 'tocá una forma', // web/index.html:12 (#whisper)
  scenes: [
    {
      id: 'inicio',
      order: 0,
      navLabel: 'Inicio', // web/index.html:13
      title: 'MIDI', // web/app.js:10
      subtitle: 'mamá insiste en que deje las interfaces', // web/app.js:61, tagline changed at the owner's request
    },
    {
      id: 'portafolio',
      order: 1,
      navLabel: 'Portafolio', // web/index.html:13
      title: 'Archivo de formas', // web/app.js:10
      subtitle: 'exploraciones / identidad MIDI', // web/app.js:61
      gallery: [
        { src: 'assets/estudio-7.png', alt: 'Formas blancas amplias sobre fondo negro, con franjas horizontales y módulos rectangulares' },
        { src: 'assets/estudio-8.png', alt: 'Cuatro bloques negros sobre fondo blanco junto a un contorno rectangular' },
        { src: 'assets/estudio-9.png', alt: 'Composición bicolor con grandes áreas negras y marcos rectangulares blancos' },
        { src: 'assets/estudio-10.png', alt: 'Marcos blancos de distintos tamaños dispersos sobre fondo negro' },
      ],
    },
    {
      id: 'nosotros',
      order: 2,
      navLabel: 'Nosotros', // web/index.html:13
      title: 'Entre una mirada y otra', // web/app.js:10
      subtitle: 'MIDI / colectivo artístico', // web/app.js:61
      body: {
        heading: 'MIDI. En colectivo.', // web/app.js:89
        paragraphs: [
          'Un punto de encuentro para imaginar, experimentar y dar forma a nuevas ideas.',
          'Entre una mirada y otra aparecen otras posibilidades. Nos interesa ese espacio compartido.',
          '/ Colectivo Artístico',
        ],
      },
    },
    {
      id: 'contacto',
      order: 3,
      navLabel: 'Contacto', // web/index.html:13
      title: 'Una señal, un encuentro', // web/app.js:10
      subtitle: 'holamidi.info@gmail.com', // web/app.js:61
      body: {
        heading: 'Abrir un diálogo.', // web/app.js:91
        paragraphs: [],
        links: [
          { label: 'holamidi.info@gmail.com', href: 'mailto:holamidi.info@gmail.com', kind: 'mailto' },
          { label: 'Instagram / midi4all', href: 'https://www.instagram.com/midi4all/', kind: 'social' },
          { label: 'TikTok / midi4all', href: 'https://www.tiktok.com/@midi4all', kind: 'social' },
        ],
      },
    },
    {
      id: 'exploraciones',
      order: 4,
      navLabel: 'Exploraciones', // web/index.html:13
      title: 'Exploraciones', // web/app.js:10
      subtitle: 'archivo / identidad en proceso', // web/app.js:61
      gallery: [
        { src: 'assets/estudio-7.png', alt: 'Formas blancas amplias sobre fondo negro, con franjas horizontales y módulos rectangulares' },
        { src: 'assets/estudio-8.png', alt: 'Cuatro bloques negros sobre fondo blanco junto a un contorno rectangular' },
        { src: 'assets/estudio-9.png', alt: 'Composición bicolor con grandes áreas negras y marcos rectangulares blancos' },
        { src: 'assets/estudio-10.png', alt: 'Marcos blancos de distintos tamaños dispersos sobre fondo negro' },
      ],
    },
  ],
};
