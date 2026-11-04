import { Container, Graphics, Sprite, Text } from "pixi.js";

import type { GameTextures } from "../fx/Textures";

const FONT = "Arial Black, Arial, sans-serif";

/** Screen-space overlay: health, counters, crosshair and hurt flash. */
export class Hud {
  public readonly view = new Container();
  /** Text and bars, scaled with the screen so small embeds stay readable. */
  private readonly ui = new Container();
  private readonly vignette: Sprite;
  private readonly hurtOverlay: Sprite;
  private readonly hpBar = new Graphics();
  private readonly kills: Text;
  private readonly stats: Text;
  private readonly weapon: Text;
  private readonly hint: Text;
  private readonly crosshair = new Graphics();
  private hintTime = 0;

  constructor(tex: GameTextures) {
    this.vignette = new Sprite(tex.vignette);
    this.hurtOverlay = new Sprite(tex.vignette);
    this.hurtOverlay.tint = 0xff0000;
    this.hurtOverlay.alpha = 0;
    this.kills = new Text({
      text: "",
      style: {
        fontFamily: FONT,
        fontSize: 34,
        fill: 0xb6ff6a,
        stroke: { color: 0x000000, width: 5 },
      },
    });
    this.kills.anchor.set(1, 0);
    this.stats = new Text({
      text: "",
      style: {
        fontFamily: FONT,
        fontSize: 14,
        fill: 0xd0d0d0,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.stats.anchor.set(1, 0);
    this.weapon = new Text({
      text: "",
      style: {
        fontFamily: FONT,
        fontSize: 16,
        fill: 0xffe08a,
        stroke: { color: 0x000000, width: 4 },
      },
    });
    this.weapon.anchor.set(0, 1);
    this.hint = new Text({
      text: "ARROWS / WASD move   ·   MOUSE aim   ·   HOLD CLICK shoot   ·   1 2 3 swap gun (debug)",
      style: {
        fontFamily: FONT,
        fontSize: 14,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.hint.anchor.set(0.5, 1);

    this.crosshair
      .circle(0, 0, 9)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
      .moveTo(-16, 0)
      .lineTo(-6, 0)
      .moveTo(6, 0)
      .lineTo(16, 0)
      .moveTo(0, -16)
      .lineTo(0, -6)
      .moveTo(0, 6)
      .lineTo(0, 16)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
      .circle(0, 0, 1.5)
      .fill(0xff4040);

    this.ui.addChild(
      this.hpBar,
      this.kills,
      this.stats,
      this.weapon,
      this.hint,
    );
    this.view.addChild(
      this.vignette,
      this.hurtOverlay,
      this.ui,
      this.crosshair,
    );
  }

  public reset() {
    this.hintTime = 0;
    this.hint.alpha = 1;
  }

  public resize(w: number, h: number) {
    this.vignette.width = this.hurtOverlay.width = w;
    this.vignette.height = this.hurtOverlay.height = h;
    const k = Math.max(0.55, Math.min(1.25, Math.min(w / 1280, h / 800)));
    this.ui.scale.set(k);
    w /= k;
    h /= k;
    this.kills.position.set(w - 20, 14);
    this.stats.position.set(w - 20, 54);
    this.weapon.position.set(20, h - 16);
    this.hint.position.set(w / 2, h - 16);
  }

  public update(
    dt: number,
    s: {
      hp: number;
      maxHp: number;
      kills: number;
      alive: number;
      time: number;
      weapon: string;
      hurt: number;
      mouseX: number;
      mouseY: number;
      hasMouse: boolean;
    },
  ) {
    this.hintTime += dt;
    if (this.hintTime > 10) this.hint.alpha = Math.max(0, this.hint.alpha - dt);

    const w = 220;
    const k = Math.max(0, s.hp / s.maxHp);
    this.hpBar
      .clear()
      .roundRect(18, 18, w + 4, 22, 5)
      .fill({ color: 0x000000, alpha: 0.6 })
      .roundRect(20, 20, w * k, 18, 4)
      .fill(k > 0.5 ? 0x6fdc4a : k > 0.25 ? 0xe8b23a : 0xe0413a);

    this.kills.text = `${s.kills}`;
    const mins = Math.floor(s.time / 60);
    const secs = Math.floor(s.time % 60)
      .toString()
      .padStart(2, "0");
    this.stats.text = `KILLS   ·   ${s.alive} SHAMBLING   ·   ${mins}:${secs}`;
    this.weapon.text = s.weapon.toUpperCase();
    this.hurtOverlay.alpha = s.hurt * 0.9;
    this.hurtOverlay.visible = s.hurt > 0;

    this.crosshair.visible = s.hasMouse;
    this.crosshair.position.set(s.mouseX, s.mouseY);
  }
}
