import { midiHub } from '../content/midi-links';
import { renderMidiHub } from './hub';
import '../styles/hub.css';
import '../styles/links.css';

/**
 * The hidden link page is the same component the contact panel mounts, on the
 * ink surface: one content module, one renderer, no second design to maintain.
 */
const mount = document.querySelector<HTMLElement>('#hub');
if (mount) {
  mount.append(
    renderMidiHub({
      surface: 'ink',
      kicker: midiHub.kicker,
      headingLevel: 1,
      placement: 'page',
    }),
  );
}
