import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";

import { Input } from "../../game/core/Input";
import { Game } from "../../game/Game";
import { engine } from "../getEngine";
import { PausePopup } from "../popups/PausePopup";

declare global {
  interface Window {
    /** Debug / QA handle to the running game. */
    __zom?: Game;
  }
}

/** Hosts the zombie arena inside the template's navigation system. */
export class GameScreen extends Container {
  /** Assets bundles required by this screen (UI for the pause popup). */
  public static assetBundles = ["main"];

  private game!: Game;
  private input!: Input;

  constructor() {
    super();
  }

  public prepare() {
    const app = engine();
    if (!this.game) {
      this.input = new Input(app.canvas);
      this.game = new Game(app.renderer, this.input, app.canvas);
      this.addChild(this.game.view);
      window.__zom = this.game;
      window.addEventListener("keydown", this.onKey);
    }
    app.canvas.style.cursor = "none";
  }

  public update(time: Ticker) {
    this.game.frame(time.deltaMS / 1000);
  }

  public resize(width: number, height: number) {
    this.game?.resize(width, height);
  }

  public async pause() {
    this.game.paused = true;
    this.input.reset();
    engine().canvas.style.cursor = "default";
  }

  public async resume() {
    this.game.paused = false;
    engine().canvas.style.cursor = "none";
  }

  public blur() {
    if (!engine().navigation.currentPopup) {
      engine().navigation.presentPopup(PausePopup);
    }
  }

  private onKey = (e: KeyboardEvent) => {
    if (
      (e.code === "Escape" || e.code === "KeyP") &&
      !engine().navigation.currentPopup
    ) {
      engine().navigation.presentPopup(PausePopup);
    }
  };
}
