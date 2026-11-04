import { animate } from "motion";
import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { Input } from "../../game/core/Input";
import { Game } from "../../game/Game";
import type { RunControls } from "../flow";
import { flow, setRunControls } from "../flow";
import { GameOverPopup } from "../popups/GameOverPopup";
import { PausePopup } from "../popups/PausePopup";

import { TitleScreen } from "./TitleScreen";

declare global {
  interface Window {
    /** Debug / QA handle to the running game. */
    __zom?: Game;
  }
}

/** Seconds between dying and the game-over menu, so the death itself gets a moment. */
const GAME_OVER_DELAY = 1.1;

/**
 * One Game and Input for the whole page. Navigation builds a new screen instance every
 * time it shows GameScreen, so the expensive, listener-owning parts live out here and
 * are reused: Play after Quit starts a fresh run on the same Game.
 */
let shared: { game: Game; input: Input } | null = null;

function sharedGame() {
  if (!shared) {
    const { renderer, canvas } = flow();
    const input = new Input(canvas);
    const game = new Game(renderer, input, canvas);
    // Restart is driven by the menus, not by clicking on the corpse.
    game.autoRestart = false;
    shared = { game, input };
  }
  return shared;
}

/** Hosts the zombie arena: pause and game-over menus, restart and quit to title. */
export class GameScreen extends Container implements RunControls {
  private _game!: Game;
  private input!: Input;
  /** Black cover used for fade-in, restart and quit transitions. */
  private readonly fade = new Graphics();
  private deadFor = 0;
  private leaving = false;
  private openingPopup = false;

  constructor() {
    super();
    this.label = "GameScreen";
  }

  public get game() {
    return this._game;
  }

  public prepare() {
    const s = sharedGame();
    this._game = s.game;
    this.input = s.input;
    // Fresh run every time this screen is shown.
    this._game.reset();
    this._game.paused = false;
    this.input.reset();
    this.addChild(this._game.view, this.fade);
    window.__zom = this._game;
    setRunControls(this);
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("blur", this.onWindowBlur);
    this.deadFor = 0;
    this.leaving = false;
    flow().canvas.style.cursor = "none";
  }

  /** Navigation calls this after the screen was hidden and removed. */
  public reset() {
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("blur", this.onWindowBlur);
    setRunControls(null);
    this._game.paused = true;
    this.input.reset();
    this.removeChildren();
    flow().canvas.style.cursor = "default";
  }

  public update(time: Ticker) {
    const nav = flow().navigation;
    if (nav.currentPopup) {
      // Menus have their own pointer: hide the game's crosshair under them.
      this.input.hasMouse = false;
    }
    this._game.frame(time.deltaMS / 1000);

    if (this._game.state === "dead" && !this.leaving) {
      this.deadFor += time.deltaMS / 1000;
      if (this.deadFor > GAME_OVER_DELAY && !nav.currentPopup) {
        this.openPopup(GameOverPopup);
      }
    } else {
      this.deadFor = 0;
    }
  }

  public resize(width: number, height: number) {
    this._game?.resize(width, height);
    this.fade.clear().rect(0, 0, width, height).fill(0x000000);
  }

  public async show() {
    this.fade.alpha = 1;
    await animate(
      this.fade,
      { alpha: [1, 0] },
      { duration: 0.45, ease: "easeOut" },
    );
  }

  public async hide() {
    await animate(
      this.fade,
      { alpha: [this.fade.alpha, 1] },
      { duration: 0.3, ease: "easeIn" },
    );
  }

  /** A popup opened over the game. */
  public async pause() {
    this.input.reset();
    // After death the horde keeps feeding behind the game-over menu.
    if (this._game.state !== "dead") this._game.paused = true;
    flow().canvas.style.cursor = "default";
  }

  /** The popup closed. */
  public async resume() {
    if (this.leaving) return;
    this._game.paused = false;
    this.input.reset();
    this.input.hasMouse = true;
    flow().canvas.style.cursor = "none";
  }

  /** Window or tab lost focus. */
  public blur() {
    if (this._game.state === "playing") this.openPopup(PausePopup);
  }

  public restart() {
    if (this.leaving) return;
    this._game.reset();
    this.input.reset();
    this.deadFor = 0;
    // Quick dip from black so the new run reads as a fresh start.
    // Keyframes, not a target: motion caches the last value it animated to.
    void animate(
      this.fade,
      { alpha: [0.85, 0] },
      { duration: 0.4, ease: "easeOut" },
    );
    const nav = flow().navigation;
    if (nav.currentPopup) void nav.dismissPopup();
  }

  public quitToTitle() {
    if (this.leaving) return;
    this.leaving = true;
    this._game.paused = true;
    void (async () => {
      const nav = flow().navigation;
      await nav.dismissPopup();
      await nav.showScreen(TitleScreen);
    })();
  }

  private openPopup(ctor: typeof PausePopup | typeof GameOverPopup) {
    const nav = flow().navigation;
    if (nav.currentPopup || this.openingPopup || this.leaving) return;
    this.openingPopup = true;
    void nav.presentPopup(ctor).finally(() => {
      this.openingPopup = false;
    });
  }

  /** Clicking outside the page (or the embed's frame) pauses, like switching tabs. */
  private onWindowBlur = () => this.blur();

  private onKey = (e: KeyboardEvent) => {
    if (e.repeat || flow().navigation.currentPopup || this.openingPopup) return;
    if (this._game.state === "playing") {
      if (e.code === "Escape" || e.code === "KeyP") this.openPopup(PausePopup);
    } else if (e.code === "KeyR" || e.code === "Enter") {
      // Skip the game-over menu if you already know you want another go.
      this.restart();
    }
  };
}
