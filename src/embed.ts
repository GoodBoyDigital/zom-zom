/**
 * Stand-alone entry: one self-contained HTML file with no network, no workers and no eval.
 * Used to share a playable build as a single file (e.g. inside chat). It runs the same
 * title / pause / game-over flow as the full app (src/main.ts), on a bare Application
 * with its own Navigation instead of the template engine and asset pipeline.
 */
import "pixi.js/unsafe-eval";

import { Application } from "pixi.js";

import { setFlowHost } from "./app/flow";
import { TitleScreen } from "./app/screens/TitleScreen";
import type { CreationEngine } from "./engine/engine";
import { Navigation } from "./engine/navigation/navigation";

(async () => {
  const host = document.getElementById("game")!;

  const app = new Application();
  await app.init({
    background: "#0b0b0c",
    resizeTo: host,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    preference: "webgl",
  });
  host.appendChild(app.canvas);
  app.canvas.tabIndex = 0;

  // Navigation only needs stage + ticker; no screen here declares asset bundles.
  const navigation = new Navigation();
  navigation.init(app as unknown as CreationEngine);
  setFlowHost({ navigation, renderer: app.renderer, canvas: app.canvas });

  const onResize = () => navigation.resize(app.screen.width, app.screen.height);
  app.renderer.on("resize", onResize);
  onResize();

  // The HTML card is only a loading placeholder now; the title screen takes over.
  document.getElementById("overlay")?.remove();
  app.canvas.addEventListener("pointerdown", () => {
    window.focus();
    app.canvas.focus();
  });

  // Switching tabs opens the pause menu (GameScreen also pauses on window blur).
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) navigation.blur();
  });

  await navigation.showScreen(TitleScreen);
})();
