import { liveViewer } from '../content/noche-museos';
import { mountViewer } from './viewer';

/**
 * The live viewer is its own document, like `/midi-links/`: the show must load
 * with one script and no motion scene around it, so it stays cheap on a phone
 * at the event and stable on the projector.
 */
document.title = `${liveViewer.title} — MIDI`;

const mount = document.querySelector<HTMLElement>('#viewer');
if (mount) mountViewer(mount);
