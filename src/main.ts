import { startGame } from './scenes/game';
import { startSpriteViewer } from './viewer/spriteViewer';

const canvas = document.querySelector<HTMLCanvasElement>('#screen');
if (!canvas) throw new Error('missing #screen');

if (new URLSearchParams(location.search).has('viewer')) startSpriteViewer(canvas, viewerHud());
else startGame(canvas);

/** The sprite viewer's help panel; returns its status line. */
function viewerHud(): HTMLElement {
  const hud = document.createElement('div');
  hud.id = 'hud';
  const status = document.createElement('div');
  const keys = document.createElement('div');
  keys.textContent = 'Keys: 1–5 animation · K kit · G power form · F facing · E expression';
  const pad = document.createElement('div');
  pad.textContent = 'Gamepad: A animation · X kit · B power form · Y expression · D-pad facing';
  hud.append(status, keys, pad);
  document.body.append(hud);
  return status;
}
