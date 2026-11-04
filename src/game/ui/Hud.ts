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
  private readonly ammo: Text;
  private readonly ammoBar = new Graphics();
  private readonly reloadRing = new Graphics();
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
    this.ammo = new Text({
      text: "",
      style: {
        fontFamily: FONT,
        fontSize: 30,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 5 },
      },
    });
    this.ammo.anchor.set(0, 1);
    this.hint = new Text({
      text: "ARROWS / WASD move   ·   MOUSE aim   ·   HOLD CLICK shoot   ·   R reload   ·   ` drop odds",
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
      this.ammoBar,
      this.weapon,
      this.ammo,
      this.hint,
    );
    this.view.addChild(
      this.vignette,
      this.hurtOverlay,
      this.ui,
      this.reloadRing,
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
    this.ammo.position.set(20, h - 26);
    this.ammoBar.position.set(20, h - 18);
    this.weapon.position.set(20, h - 62);
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
      weaponColor: number;
      /** Rounds in the magazine / magazine size / rounds in reserve (Infinity = pistol). */
      mag: number;
      magazine: number;
      reserve: number;
      /** Reload progress 0..1, or -1 when not reloading. */
      reload: number;
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
    this.weapon.style.fill = s.weaponColor;
    this.drawAmmo(s);
    this.hurtOverlay.alpha = s.hurt * 0.9;
    this.hurtOverlay.visible = s.hurt > 0;

    this.crosshair.visible = s.hasMouse;
    this.crosshair.position.set(s.mouseX, s.mouseY);

    // Reload arc around the crosshair, where your eyes already are.
    this.reloadRing.clear();
    this.reloadRing.visible = s.reload >= 0 && s.hasMouse;
    if (this.reloadRing.visible) {
      const a0 = -Math.PI / 2;
      this.reloadRing
        .circle(0, 0, 22)
        .stroke({ width: 4, color: 0x000000, alpha: 0.5 })
        .arc(0, 0, 22, a0, a0 + Math.PI * 2 * s.reload)
        .stroke({ width: 4, color: s.weaponColor, cap: "round" });
      this.reloadRing.position.set(s.mouseX, s.mouseY);
    }
  }

  private drawAmmo(s: {
    mag: number;
    magazine: number;
    reserve: number;
    reload: number;
    weaponColor: number;
  }) {
    const reserve = s.reserve === Infinity ? "∞" : `${s.reserve}`;
    this.ammo.text = s.reload >= 0 ? `RELOADING` : `${s.mag} / ${reserve}`;
    const low = s.reserve !== Infinity && s.mag + s.reserve <= s.magazine * 0.5;
    this.ammo.style.fill = s.reload >= 0 ? 0xbbbbbb : low ? 0xff6a5a : 0xffffff;

    // Magazine strip: one pip per round for small mags, a fill bar for big ones.
    const g = this.ammoBar.clear();
    const W = 200;
    g.roundRect(-2, -2, W + 4, 10, 3).fill({ color: 0x000000, alpha: 0.6 });
    if (s.reload >= 0) {
      g.roundRect(0, 0, W * s.reload, 6, 2).fill(0xbbbbbb);
    } else if (s.magazine <= 30) {
      const gap = 2;
      const pw = (W - gap * (s.magazine - 1)) / s.magazine;
      for (let i = 0; i < s.magazine; i++) {
        g.rect(i * (pw + gap), 0, pw, 6).fill(
          i < s.mag ? s.weaponColor : { color: 0xffffff, alpha: 0.12 },
        );
      }
    } else {
      g.roundRect(0, 0, (W * s.mag) / s.magazine, 6, 2).fill(s.weaponColor);
    }
  }
}
