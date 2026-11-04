import { animate } from "motion";
import type { ObjectTarget } from "motion/react";
import type { Ticker } from "pixi.js";
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { ZOMBIES } from "../../game/defs/zombies";
import { GameTextures } from "../../game/fx/Textures";
import { flow } from "../flow";
import { MenuList } from "../ui/MenuButton";
import { COLORS, formatTime, textStyle, uiScale } from "../ui/theme";
import { loadBest } from "../utils/best";

import { GameScreen } from "./GameScreen";

/** Title-screen art is generated once and reused by every TitleScreen instance. */
let textures: GameTextures | null = null;

interface Shambler {
  view: Container;
  body: Sprite;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  wobble: number;
  life: number;
  dying: number;
}

const HORDE = 42;

/**
 * Title: the logo over a dark yard while a horde shambles in from every side.
 * Play with the button, Enter, Space or a click anywhere.
 */
export class TitleScreen extends Container {
  private readonly ground = new Graphics();
  private readonly stains = new Container();
  private readonly horde = new Container();
  private readonly vignette = new Sprite();
  private readonly ui = new Container();
  private readonly logo = new Container();
  private readonly tagline: Text;
  private readonly menu: MenuList;
  private readonly controls: Text;
  private readonly best: Text;
  private readonly shamblers: Shambler[] = [];
  private w = 1280;
  private h = 800;
  private t = 0;
  private starting = false;
  /** True while the intro tween owns the logo scale. */
  private intro = true;

  constructor() {
    super();
    this.label = "TitleScreen";
    if (!textures) {
      textures = new GameTextures(flow().renderer);
      textures.build(Object.values(ZOMBIES));
    }
    const tex = textures;
    this.vignette.texture = tex.vignette;

    // Logo: a dark green slab under bright slime type, like the embed's HTML card.
    const logoShadow = new Text({
      text: "ZOM ZOMS",
      style: textStyle(132, COLORS.slimeDark, {
        stroke: { color: COLORS.slimeDark, width: 14 },
        letterSpacing: 4,
      }),
    });
    const logoText = new Text({
      text: "ZOM ZOMS",
      style: textStyle(132, COLORS.slime, {
        stroke: { color: 0x0a1405, width: 14 },
        letterSpacing: 4,
      }),
    });
    logoShadow.anchor.set(0.5);
    logoText.anchor.set(0.5);
    logoShadow.y = 10;
    this.logo.addChild(logoShadow, logoText);

    this.tagline = new Text({
      text: "THEY  JUST  KEEP  COMING",
      style: textStyle(20, COLORS.blood, {
        stroke: { color: 0, width: 4 },
        letterSpacing: 6,
      }),
    });
    this.tagline.anchor.set(0.5);

    this.menu = new MenuList([
      {
        text: "PLAY",
        key: "ENTER",
        primary: true,
        width: 320,
        height: 70,
        onPress: () => this.start(),
      },
    ]);

    this.controls = new Text({
      text: "ARROWS / WASD move   ·   MOUSE aim   ·   HOLD CLICK shoot   ·   ESC pause",
      style: textStyle(14, 0xd8d8d0, { stroke: { color: 0, width: 3 } }),
    });
    this.controls.anchor.set(0.5);

    this.best = new Text({
      text: "",
      style: textStyle(16, COLORS.gold, { stroke: { color: 0, width: 4 } }),
    });
    this.best.anchor.set(0.5);

    this.ui.addChild(
      this.logo,
      this.tagline,
      this.menu,
      this.best,
      this.controls,
    );
    this.addChild(this.ground, this.stains, this.horde, this.vignette, this.ui);

    for (let i = 0; i < HORDE; i++) {
      const view = new Container();
      const shadow = new Sprite({
        texture: tex.shadow,
        anchor: 0.5,
        scale: 0.55,
      });
      const def = ZOMBIES.walker;
      const bodies = tex.zombies.get(def.id)!.bodies;
      const body = new Sprite({
        texture: bodies[i % bodies.length],
        anchor: 0.5,
      });
      // Dimmed so they read as background, not as targets.
      body.tint = 0xb8b8b8;
      view.addChild(shadow, body);
      this.horde.addChild(view);
      this.shamblers.push({
        view,
        body,
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
        speed: 0,
        wobble: Math.random() * 6,
        life: 0,
        dying: 0,
      });
    }

    // Click anywhere to play.
    this.eventMode = "static";
    this.on("pointertap", () => this.start());
  }

  public prepare() {
    window.addEventListener("keydown", this.onKey);
    const best = loadBest();
    this.best.text =
      best.kills > 0
        ? `BEST   ${best.kills} KILLS   ·   ${formatTime(best.time)}`
        : "";
    this.menu.setFocus(0);
    this.starting = false;
    flow().canvas.style.cursor = "default";
  }

  public reset() {
    window.removeEventListener("keydown", this.onKey);
  }

  public resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.layoutGround();
    this.vignette.width = w;
    this.vignette.height = h;
    const k = uiScale(w, h);
    this.ui.scale.set(k);
    const cw = w / k;
    const ch = h / k;
    this.logo.position.set(cw / 2, ch * 0.32);
    this.tagline.position.set(cw / 2, ch * 0.32 + 100);
    this.menu.position.set(cw / 2, ch * 0.62);
    this.best.position.set(cw / 2, ch * 0.62 + 66);
    this.controls.position.set(cw / 2, ch - 28);
    for (const s of this.shamblers) this.spawn(s, true);
  }

  public async show() {
    this.intro = true;
    this.alpha = 0;
    this.logo.scale.set(1.6);
    this.logo.alpha = 0;
    this.menu.alpha = 0;
    this.tagline.alpha = 0;
    void animate(this, { alpha: 1 } as ObjectTarget<this>, { duration: 0.4 });
    void animate(this.logo, { alpha: 1 }, { duration: 0.25, delay: 0.1 });
    void animate(this.tagline, { alpha: 1 }, { duration: 0.4, delay: 0.5 });
    await animate(
      this.logo.scale,
      { x: 1, y: 1 },
      { duration: 0.5, ease: "backOut", delay: 0.1 },
    );
    this.intro = false;
    await animate(this.menu, { alpha: 1 }, { duration: 0.25 });
  }

  public async hide() {
    void animate(this.logo.scale, { x: 1.15, y: 1.15 }, { duration: 0.35 });
    await animate(this, { alpha: 0 } as ObjectTarget<this>, {
      duration: 0.35,
      ease: "easeIn",
    });
  }

  public update(time: Ticker) {
    const dt = Math.min(0.05, time.deltaMS / 1000);
    this.t += dt;
    // Logo breathes and the play button pulses.
    const pulse = 1 + Math.sin(this.t * 2.2) * 0.015;
    this.logo.rotation = Math.sin(this.t * 0.9) * 0.012;
    if (!this.starting && !this.intro) this.logo.scale.set(pulse);

    const k = uiScale(this.w, this.h);
    for (const s of this.shamblers) {
      s.life += dt;
      s.wobble += dt * (4 + s.speed * 0.06);
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const d = Math.hypot(dx, dy) || 1;
      if (s.dying > 0) {
        s.dying -= dt;
        s.view.alpha = Math.max(0, s.dying / 0.8);
        if (s.dying <= 0) this.spawn(s, false);
        continue;
      }
      const gait = 0.6 + 0.4 * Math.abs(Math.sin(s.wobble * 0.5));
      s.x += (dx / d) * s.speed * gait * k * dt;
      s.y += (dy / d) * s.speed * gait * k * dt;
      s.view.alpha = Math.min(1, s.life / 1.2);
      // They give up (fade into the dark) once they get close to the middle.
      if (d < 70 * k) s.dying = 0.8;
      s.view.position.set(s.x, s.y);
      s.body.rotation = Math.atan2(dy, dx) + Math.sin(s.wobble) * 0.16;
      s.view.scale.set(k * 1.25);
    }
  }

  private spawn(s: Shambler, anywhere: boolean) {
    const w = this.w;
    const h = this.h;
    const m = 40;
    if (anywhere) {
      // First frame: scatter them so the screen is already busy.
      const a = Math.random() * Math.PI * 2;
      const r = 0.35 + Math.random() * 0.6;
      s.x = w / 2 + Math.cos(a) * r * w * 0.6;
      s.y = h / 2 + Math.sin(a) * r * h * 0.6;
    } else {
      const side = Math.floor(Math.random() * 4);
      s.x = side === 0 ? -m : side === 1 ? w + m : Math.random() * w;
      s.y = side === 2 ? -m : side === 3 ? h + m : Math.random() * h;
    }
    // Head roughly for the logo, but not all to the same spot.
    s.tx = w / 2 + (Math.random() - 0.5) * w * 0.35;
    s.ty = h / 2 + (Math.random() - 0.5) * h * 0.3;
    s.speed = 18 + Math.random() * 26;
    s.life = anywhere ? 2 : 0;
    s.dying = 0;
    s.view.alpha = anywhere ? 1 : 0;
    s.view.position.set(s.x, s.y);
  }

  private layoutGround() {
    const w = this.w;
    const h = this.h;
    const g = this.ground.clear().rect(0, 0, w, h).fill(0x1d1b19);
    // Worn concrete slabs, the same idea as the arena floor but darker.
    const slab = 96 * uiScale(w, h);
    for (let y = 0; y < h; y += slab) {
      for (let x = 0; x < w; x += slab) {
        const v = ((x * 7 + y * 13) / slab) % 5;
        g.rect(x + 1, y + 1, slab - 2, slab - 2).fill(
          v < 1 ? 0x24221f : v < 3 ? 0x211f1c : 0x1f1d1a,
        );
      }
    }
    // Old stains: green zombie blood and darker red.
    this.stains.removeChildren().forEach((c) => c.destroy());
    const tex = textures!;
    for (let i = 0; i < 26; i++) {
      const s = new Sprite({
        texture: tex.splats[i % tex.splats.length],
        anchor: 0.5,
      });
      s.position.set(Math.random() * w, Math.random() * h);
      s.rotation = Math.random() * 6.28;
      s.scale.set((0.8 + Math.random() * 1.6) * uiScale(w, h));
      s.tint = i % 3 === 0 ? 0x5a0d0d : 0x3f7a1a;
      s.alpha = 0.35 + Math.random() * 0.3;
      this.stains.addChild(s);
    }
  }

  private start() {
    if (this.starting) return;
    this.starting = true;
    void flow().navigation.showScreen(GameScreen);
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      this.start();
    }
  };
}
