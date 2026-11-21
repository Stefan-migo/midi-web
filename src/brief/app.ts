import {
  MAX_ANSWER,
  MAX_NAME,
  briefAnswerKeys,
  briefIntro,
  briefSections,
  type BriefAnswerKey,
} from './questions';
import '../styles/brief.css';

/**
 * The individual brief form.
 *
 * Answers are long paragraphs typed once, so the page protects the writer more
 * than it protects itself: every keystroke is kept in `localStorage`, the form
 * can be reopened and updated until the meeting, and a submission carries the
 * id it was stored with so an edit never creates a second row.
 *
 * User text never goes through `innerHTML`: only the constant question copy is
 * templated, and every value travels through `value`.
 */
const ENDPOINT = '/api/brief';
const DRAFT_KEY = 'midi:brief:draft';
const RESPONSE_KEY = 'midi:brief:response';
const CODE_KEY = 'midi:brief:code';
const AUTOSAVE_DELAY = 400;

type Answers = Record<BriefAnswerKey, string>;

interface Draft {
  nombre: string;
  fecha: string;
  answers: Answers;
}

interface BriefReply {
  id?: string;
  submittedAt?: string;
  error?: { code?: string; message?: string; fields?: Record<string, string> };
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => HTML_ESCAPES[character] ?? character);
}

function must<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`brief: missing ${selector}`);
  return element;
}

function readStored<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A browser refusing storage must not stop someone from writing: the form
    // still submits, it just cannot recall the draft.
  }
}

function forgetStored(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Same as above: nothing to recover here.
  }
}

/** Today in the writer's own timezone, as the `YYYY-MM-DD` a date input wants. */
function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function sectionsMarkup(): string {
  let index = 0;
  return briefSections
    .map((section) => {
      const items = section.questions
        .map((question) => {
          index += 1;
          return `<li class="brief-question"><label for="${question.key}"><span class="brief-number" aria-hidden="true">${index}.</span> ${escapeHtml(question.prompt)}</label><textarea id="${question.key}" name="${question.key}" rows="4" maxlength="${MAX_ANSWER}" spellcheck="true"></textarea></li>`;
        })
        .join('');
      return `<h2>${escapeHtml(section.title)}</h2><ol class="brief-questions" role="list">${items}</ol>`;
    })
    .join('');
}

function pageMarkup(): string {
  return `
<a class="signature" href="/" aria-label="MIDI inicio"><img src="/assets/midi-horizontal-blanco.svg" alt="MIDI Colectivo Artístico" width="534" height="179"></a>
<p class="slash">/brief · individual</p>
<h1>Brief individual</h1>
<p class="brief-intro">${escapeHtml(briefIntro.question)}</p>
<p class="brief-guidance">${escapeHtml(briefIntro.guidance)}</p>
<form id="brief-form" novalidate>
  <div class="brief-identity">
    <p><label for="nombre">Nombre</label><input id="nombre" name="nombre" autocomplete="name" maxlength="${MAX_NAME}" required></p>
    <p><label for="fecha">Fecha</label><input id="fecha" name="fecha" type="date" required></p>
  </div>
  ${sectionsMarkup()}
  <div class="brief-access">
    <label for="code">Código de acceso</label>
    <input id="code" name="code" type="password" autocomplete="off" required>
    <p class="brief-note">Lo comparte el colectivo. Se recuerda en este dispositivo.</p>
  </div>
  <p class="brief-store">Tus respuestas se guardan en la base privada del colectivo para trabajarlas en la reunión. No se publican en la web.</p>
  <button id="brief-save" type="submit">Enviar respuestas</button>
  <p id="brief-saved" class="brief-saved"></p>
  <p id="brief-status" class="brief-status" role="status" aria-live="polite"></p>
</form>
<p class="slash brief-back"><a href="/">← MIDI</a></p>
`;
}

const root = document.querySelector<HTMLElement>('#brief');
if (root) {
  root.innerHTML = pageMarkup();

  const form = must<HTMLFormElement>('#brief-form');
  const nombre = must<HTMLInputElement>('#nombre');
  const fecha = must<HTMLInputElement>('#fecha');
  const code = must<HTMLInputElement>('#code');
  const button = must<HTMLButtonElement>('#brief-save');
  const savedStatus = must<HTMLElement>('#brief-saved');
  const status = must<HTMLElement>('#brief-status');

  let autosave: number | undefined;
  let sending = false;

  function readAnswers(): Answers {
    const answers = {} as Answers;
    for (const key of briefAnswerKeys) {
      answers[key] = document.querySelector<HTMLTextAreaElement>(`#${key}`)?.value ?? '';
    }
    return answers;
  }

  function writeAnswers(answers: Partial<Answers>): void {
    for (const key of briefAnswerKeys) {
      const field = document.querySelector<HTMLTextAreaElement>(`#${key}`);
      const value = answers[key];
      if (field && typeof value === 'string') field.value = value;
    }
  }

  function say(message: string, tone: 'error' | 'done' | 'plain' = 'plain'): void {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function setSavedAt(): void {
    const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    savedStatus.textContent = `Borrador guardado en este dispositivo · ${time}`;
  }

  function saveDraft(): void {
    const draft: Draft = { nombre: nombre.value.trim(), fecha: fecha.value, answers: readAnswers() };
    writeStored(DRAFT_KEY, draft);
    setSavedAt();
  }

  function scheduleSave(): void {
    window.clearTimeout(autosave);
    autosave = window.setTimeout(saveDraft, AUTOSAVE_DELAY);
  }

  function storedResponseId(): string {
    const stored = readStored<{ id?: string }>(RESPONSE_KEY);
    return stored && typeof stored.id === 'string' ? stored.id : '';
  }

  function setButtonLabel(mode: 'send' | 'update'): void {
    button.textContent = mode === 'update' ? 'Actualizar respuesta' : 'Enviar respuestas';
  }

  function restore(): void {
    const draft = readStored<Partial<Draft>>(DRAFT_KEY);
    if (draft) {
      if (typeof draft.nombre === 'string') nombre.value = draft.nombre;
      if (typeof draft.fecha === 'string' && draft.fecha) fecha.value = draft.fecha;
      if (draft.answers && typeof draft.answers === 'object') writeAnswers(draft.answers);
    }
    if (!fecha.value) fecha.value = today();

    const storedCode = readStored<string>(CODE_KEY);
    if (typeof storedCode === 'string') code.value = storedCode;

    if (storedResponseId()) setButtonLabel('update');
  }

  /** Field errors come back as codes; the writer needs a sentence, not a code. */
  function describeFields(fields: Record<string, string> | undefined): string {
    if (!fields) return 'Revisá las respuestas antes de enviar.';
    if (fields['nombre']) return 'Revisá el nombre: es obligatorio y no puede pasar de 120 caracteres.';
    if (fields['fecha']) return 'Revisá la fecha.';
    if (fields['answers']) return 'Escribí al menos una respuesta antes de enviar.';
    const tooLong = briefAnswerKeys.some((key) => fields[key] === 'too_long');
    if (tooLong) return `Una respuesta supera los ${MAX_ANSWER} caracteres. Acortala para poder enviarla.`;
    return 'Revisá las respuestas antes de enviar.';
  }

  async function send(): Promise<void> {
    if (sending) return;

    const answers = readAnswers();
    if (!nombre.value.trim()) {
      say('Escribí tu nombre para enviar.', 'error');
      nombre.focus();
      return;
    }
    if (!fecha.value) {
      say('Elegí la fecha.', 'error');
      fecha.focus();
      return;
    }
    if (!code.value.trim()) {
      say('Necesitás el código de acceso que comparte el colectivo.', 'error');
      code.focus();
      return;
    }
    if (briefAnswerKeys.every((key) => answers[key].trim().length === 0)) {
      say('Escribí al menos una respuesta antes de enviar.', 'error');
      return;
    }

    const id = storedResponseId();
    const method = id ? 'PATCH' : 'POST';
    const body = id
      ? { id, code: code.value.trim(), nombre: nombre.value, fecha: fecha.value, answers }
      : { code: code.value.trim(), nombre: nombre.value, fecha: fecha.value, answers };

    sending = true;
    button.disabled = true;
    say('Enviando…', 'plain');

    let reply: BriefReply | undefined;
    let httpStatus = 0;
    try {
      const response = await fetch(ENDPOINT, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      httpStatus = response.status;
      reply = (await response.json().catch(() => undefined)) as BriefReply | undefined;
    } catch {
      sending = false;
      button.disabled = false;
      say(
        'No pudimos conectar. Tus respuestas siguen guardadas en este dispositivo: probá de nuevo en un momento.',
        'error',
      );
      return;
    }

    sending = false;
    button.disabled = false;

    const codeOf = reply?.error?.code;

    if (reply && typeof reply.id === 'string' && httpStatus < 300) {
      writeStored(RESPONSE_KEY, { id: reply.id });
      writeStored(CODE_KEY, code.value.trim());
      setButtonLabel('update');
      setSavedAt();
      say(
        method === 'POST'
          ? 'Listo. Tus respuestas quedaron guardadas. Podés volver a esta página y actualizarlas hasta la reunión.'
          : 'Actualizado. Tus respuestas quedaron guardadas.',
        'done',
      );
      return;
    }

    if (codeOf === 'invalid_access_code') {
      forgetStored(CODE_KEY);
      code.value = '';
      say('El código de acceso no es correcto. Pedíselo a quien coordine el colectivo.', 'error');
      code.focus();
      return;
    }
    if (codeOf === 'response_not_found') {
      forgetStored(RESPONSE_KEY);
      setButtonLabel('send');
      say('Esa respuesta ya no está guardada. Volvé a enviarla.', 'error');
      return;
    }
    if (codeOf === 'validation_failed') {
      say(describeFields(reply?.error?.fields), 'error');
      return;
    }
    if (codeOf === 'payload_too_large') {
      say('Las respuestas son demasiado largas para enviarse juntas. Acortá alguna.', 'error');
      return;
    }
    if (codeOf === 'storage_unauthorized') {
      say('La configuración del servidor no permite guardar respuestas. Avisale a quien administre el sitio.', 'error');
      return;
    }
    if (codeOf === 'storage_busy') {
      say('La base está ocupada en este momento. Esperá unos segundos y volvé a intentar.', 'error');
      return;
    }
    if (codeOf === 'not_configured' || (httpStatus === 503 && !codeOf)) {
      say('El formulario todavía no está conectado a la base del colectivo. Avisale a quien administre el sitio.', 'error');
      return;
    }
    say('No pudimos guardar las respuestas. Probá de nuevo en un momento.', 'error');
  }

  form.addEventListener('input', scheduleSave);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void send();
  });
  form.addEventListener('focusout', saveDraft, true);

  restore();
}
