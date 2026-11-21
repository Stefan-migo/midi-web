/**
 * The individual brief every MIDI member answers before the meeting.
 *
 * The questions are the collective's own words, not ours: keep them verbatim
 * when editing. They are the source of truth for the form and for anything that
 * later reads the answers back.
 *
 * `MAX_ANSWER` and `MAX_NAME` are mirrored in `api/_lib/brief.mjs`, which runs
 * on the server and cannot import TypeScript. A mismatch is caught by
 * `scripts/check-brief-api.mjs`.
 */
export type BriefAnswerKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8';

export interface BriefQuestion {
  key: BriefAnswerKey;
  prompt: string;
}

export interface BriefSection {
  id: string;
  title: string;
  questions: BriefQuestion[];
}

export const MAX_NAME = 120;
export const MAX_ANSWER = 5000;

export const briefIntro = {
  question:
    '¿Qué hacemos como colectivo artístico multimedial, por qué lo hacemos y cómo queremos compartirlo?',
  guidance:
    'Cada integrante responde por su cuenta antes de la reunión. Dediquen unos 15–20 minutos y escriban una o dos frases por pregunta. Pueden apoyarse en una obra, una experiencia, una imagen o una referencia. Si algo todavía está abierto, vale decirlo.',
};

export const briefSections: BriefSection[] = [
  {
    id: 'identidad',
    title: '1. Identidad y misión',
    questions: [
      {
        key: 'q1',
        prompt:
          '¿Cómo le contarías qué es MIDI a alguien que nunca escuchó hablar del colectivo? Escribilo en una frase, como si se lo contaras en persona.',
      },
      {
        key: 'q2',
        prompt:
          '¿Qué nos reúne para crear y qué queremos poner en juego con lo que hacemos? Puede ser una pregunta que nos mueve, una experiencia que queremos generar o algo que queremos aportar a nuestra escena.',
      },
      {
        key: 'q3',
        prompt:
          '¿Qué posibilidades aparecen cuando cruzamos medios, lenguajes o disciplinas en MIDI? Pensá en un proyecto que ya hicimos o en uno que te gustaría hacer.',
      },
    ],
  },
  {
    id: 'principios',
    title: '2. Principios y visión',
    questions: [
      {
        key: 'q4',
        prompt:
          '¿Qué principio te importa cuidar en nuestra forma de trabajar? Contá cómo se vería en una decisión concreta, por ejemplo al crear en equipo, repartir tareas o dar crédito.',
      },
      {
        key: 'q5',
        prompt:
          '¿Qué te gustaría que MIDI esté haciendo en dos o tres años? Imaginá una obra, una colaboración, un espacio o una forma de organizarnos que te haría sentir que vamos en la dirección que querés.',
      },
    ],
  },
  {
    id: 'identidad-visual',
    title: '3. Identidad visual y editorial',
    questions: [
      {
        key: 'q6',
        prompt:
          '¿Qué tres palabras describen cómo te gustaría que se vea y se sienta MIDI? Si tenés una referencia visual, sonora o de otro medio, compartila y decí qué te interesa de ella.',
      },
      {
        key: 'q7',
        prompt:
          '¿A quién te gustaría que llegue MIDI y cómo te gustaría que le hablemos? Probá escribir una frase que podría aparecer en la web con esa voz.',
      },
      {
        key: 'q8',
        prompt:
          '¿Qué obra, proceso o historia nuestra debería aparecer en la web para que alguien entienda quiénes somos? Elegí una y contá qué muestra de MIDI.',
      },
    ],
  },
];

export const briefQuestions: BriefQuestion[] = briefSections.flatMap((section) => section.questions);

export const briefAnswerKeys: BriefAnswerKey[] = briefQuestions.map((question) => question.key);
