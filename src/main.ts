import { startSpriteViewer } from './viewer/spriteViewer';

const canvas = document.querySelector<HTMLCanvasElement>('#screen');
const status = document.querySelector<HTMLElement>('#status');
if (!canvas || !status) throw new Error('missing #screen or #status');
startSpriteViewer(canvas, status);
