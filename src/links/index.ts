import { midiLinks } from '../content/midi-links';
import '../styles/links.css';

const list = document.querySelector<HTMLDivElement>('#links');
if (list) {
  for (const item of midiLinks) {
    const anchor = document.createElement('a');
    anchor.href = item.href;
    anchor.textContent = item.label;
    if (/^https?:/i.test(item.href)) {
      anchor.target = '_blank';
      anchor.rel = 'noopener';
    }
    list.append(anchor);
  }
}
