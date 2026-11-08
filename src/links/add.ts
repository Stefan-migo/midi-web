import type { MidiLink } from '../content/midi-links';
import '../styles/links.css';

const form = document.querySelector<HTMLFormElement>('#link-form');
const labelField = document.querySelector<HTMLInputElement>('#label');
const hrefField = document.querySelector<HTMLInputElement>('#href');
const preview = document.querySelector<HTMLDivElement>('#preview');
const snippet = document.querySelector<HTMLElement>('#snippet');
const copyButton = document.querySelector<HTMLButtonElement>('#copy');
const message = document.querySelector<HTMLElement>('#message');

function parsedHref(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function update(): void {
  if (!labelField || !hrefField || !preview || !snippet || !copyButton) return;
  const label = labelField.value.trim();
  const href = hrefField.value.trim();
  const parsed = parsedHref(href);
  const valid = label.length > 0 && Boolean(parsed);
  const link: MidiLink | undefined = valid ? { label, href } : undefined;
  preview.replaceChildren();
  if (link && parsed) {
    const anchor = document.createElement('a');
    anchor.textContent = link.label;
    anchor.href = link.href;
    if (parsed.protocol !== 'mailto:') {
      anchor.target = '_blank';
      anchor.rel = 'noopener';
    }
    preview.append(anchor);
    snippet.textContent = `${JSON.stringify(link, null, 2)},`;
  } else {
    preview.textContent = 'La vista previa aparecerá cuando los datos sean válidos.';
    snippet.textContent = '';
  }
  copyButton.disabled = !valid;
  if (message) message.textContent = '';
}

form?.addEventListener('input', update);
form?.addEventListener('submit', (event) => event.preventDefault());
copyButton?.addEventListener('click', async () => {
  if (!snippet?.textContent || !message) return;
  try {
    await navigator.clipboard.writeText(snippet.textContent);
    message.textContent = 'Fragmento copiado.';
  } catch {
    message.textContent = 'No se pudo copiar. Seleccioná y copiá el fragmento manualmente.';
  }
});
update();
