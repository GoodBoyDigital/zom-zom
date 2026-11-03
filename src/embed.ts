/**
 * Stand-alone entry: one self-contained HTML file with no network, no workers and no eval.
 * Used to share a playable build as a single file (e.g. inside chat). The full app
 * (src/main.ts) uses the template's engine, screens and asset pipeline instead.
 */
import "pixi.js/unsafe-eval";

import { Application } from "pixi.js";

import { Input } from "./game/core/Input";
import { Game } from "./game/Game";

(async () => {
  const host = document.getElementById("game")!;
  const overlay = document.getElementById("overlay")!;
  const overlayText = document.getElementById("overlay-text")!;

  const app = new Application();
  await app.init({
    background: "#0b0b0c",
    resizeTo: host,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    preference: "webgl",
  });
  host.appendChild(app.canvas);
  app.canvas.style.cursor = "none";
  app.canvas.tabIndex = 0;

  const input = new Input(app.canvas);
  const game = new Game(app.renderer, input, app.canvas);
  app.stage.addChild(game.view);
  (window as unknown as { __zom: Game }).__zom = game;

  const onResize = () => game.resize(app.screen.width, app.screen.height);
  app.renderer.on("resize", onResize);
  onResize();

  // Start paused behind a "click to play" card; pause again whenever focus leaves.
  game.paused = true;
  const start = () => {
    overlay.style.display = "none";
    game.paused = false;
    window.focus();
    app.canvas.focus();
  };
  overlay.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    game.sfx.unlock();
    start();
  });
  window.addEventListener("blur", () => {
    game.paused = true;
    input.reset();
    overlayText.textContent = "Paused · click to resume";
    overlay.style.display = "flex";
  });

  app.ticker.add((t) => game.frame(t.deltaMS / 1000));
})();
