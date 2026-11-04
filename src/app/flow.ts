import type { Renderer } from "pixi.js";

import type { Navigation } from "../engine/navigation/navigation";
import type { Game } from "../game/Game";

/**
 * What the screens need from whoever hosts them. The full app (src/main.ts) passes the
 * template engine; the single-file embed (src/embed.ts) passes a bare Application with
 * its own Navigation. Screens only talk to this, never to engine() directly, so the
 * same title / pause / game-over flow runs in both builds.
 */
export interface FlowHost {
  navigation: Navigation;
  renderer: Renderer;
  canvas: HTMLCanvasElement;
}

declare global {
  interface Window {
    /** Debug / QA handle to the screen navigation (current screen and popup). */
    __zomNav?: Navigation;
  }
}

let host: FlowHost | null = null;

export function setFlowHost(h: FlowHost) {
  host = h;
  window.__zomNav = h.navigation;
}

export function flow(): FlowHost {
  return host!;
}

/** Actions the in-game popups can trigger. GameScreen registers itself while it is active. */
export interface RunControls {
  readonly game: Game;
  restart(): void;
  quitToTitle(): void;
}

let run: RunControls | null = null;

export function setRunControls(r: RunControls | null) {
  run = r;
}

export function runControls(): RunControls | null {
  return run;
}
