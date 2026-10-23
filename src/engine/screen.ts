import { BASE_H, BASE_W, computeViewport, type Viewport } from './viewport';

export interface Screen {
  /** The 320×180 game canvas everything draws into. */
  game: CanvasRenderingContext2D;
  /** Scales the game canvas onto the window. */
  present(): void;
}

/**
 * Owns the window canvas and the internal game canvas. Re-fits on window
 * resize and whenever devicePixelRatio changes (browser zoom, moving the
 * window to another monitor), which fires no resize event on its own.
 */
export function createScreen(canvas: HTMLCanvasElement): Screen {
  const ctx = canvas.getContext('2d');
  const gameCanvas = document.createElement('canvas');
  gameCanvas.width = BASE_W;
  gameCanvas.height = BASE_H;
  const game = gameCanvas.getContext('2d');
  if (!ctx || !game) throw new Error('2D canvas unavailable');
  game.imageSmoothingEnabled = false;

  let viewport: Viewport;
  const fit = () => {
    const dpr = window.devicePixelRatio || 1;
    viewport = computeViewport(window.innerWidth, window.innerHeight, dpr);
    canvas.width = viewport.deviceW;
    canvas.height = viewport.deviceH;
    // Exactly backing ÷ dpr so the browser maps canvas pixels 1:1 onto device pixels.
    canvas.style.width = `${viewport.deviceW / dpr}px`;
    canvas.style.height = `${viewport.deviceH / dpr}px`;
  };

  // A resolution query only matches one dpr, so re-arm it after every change.
  let dprQuery: MediaQueryList | null = null;
  const onDprChange = () => {
    fit();
    watchDpr();
  };
  const watchDpr = () => {
    dprQuery?.removeEventListener('change', onDprChange);
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprQuery.addEventListener('change', onDprChange);
  };

  window.addEventListener('resize', fit);
  watchDpr();
  fit();

  return {
    game,
    present() {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(gameCanvas, viewport.x, viewport.y, BASE_W * viewport.scale, BASE_H * viewport.scale);
    },
  };
}
