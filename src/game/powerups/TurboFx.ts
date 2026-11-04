import type { Sprite } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { rand } from "../core/math";
import type { Game } from "../Game";
import { SpritePool } from "./SpritePool";

export const TURBO = {
  /** Gun fires this many times faster. */
  fireRate: 2,
  /** Tracer look while turbo is on. */
  tracerColor: 0x7ff6ff,
  tracerWidth: 1.8,
  tracerLife: 1.7,
} as const;

interface Ghost {
  sprite: Sprite;
  life: number;
}

const GHOST_LIFE = 0.28;

/**
 * Turbo: an electric aura, crackling arcs and cyan afterimages on the player,
 * and hot cyan tracers with sparks at the muzzle (via Effects.tracerBoost).
 */
export class TurboFx {
  /** Under the player: aura and afterimages. */
  public readonly below = new Container();
  /** Over the player: arcs. */
  public readonly above = new Container();
  private readonly auraA: Sprite;
  private readonly auraB: Sprite;
  private readonly arcs = new Graphics();
  private readonly ghosts: Ghost[] = [];
  private readonly pool = new SpritePool();
  private on = false;
  private ghostTimer = 0;
  private arcTimer = 0;
  private time = 0;
  private remaining = 0;
  private lastShots = 0;

  constructor(private readonly game: Game) {
    this.auraA = this.pool.get(game.tex.glow, this.below, "add");
    this.auraB = this.pool.get(game.tex.glow, this.below, "add");
    this.arcs.blendMode = "add";
    this.above.addChild(this.arcs);
    this.below.visible = this.above.visible = false;
  }

  public get active() {
    return this.on;
  }

  public start() {
    this.on = true;
    this.below.visible = this.above.visible = true;
    this.game.fx.tracerBoost = {
      color: TURBO.tracerColor,
      width: TURBO.tracerWidth,
      life: TURBO.tracerLife,
    };
    const p = this.game.player;
    this.game.fx.impactFlash(p.x, p.y, 0xff5cf0, 2.2);
  }

  public stop() {
    this.reset();
  }

  public reset() {
    this.on = false;
    this.below.visible = this.above.visible = false;
    this.game.fx.tracerBoost = null;
    for (const g of this.ghosts) this.pool.release(g.sprite);
    this.ghosts.length = 0;
    this.arcs.clear();
  }

  public update(dt: number, remaining: number) {
    this.remaining = remaining;
    const p = this.game.player;
    this.ghostTimer -= dt;
    const moving = Math.hypot(p.vx, p.vy) > 40;
    const firing = this.game.shotsFired !== this.lastShots;
    this.lastShots = this.game.shotsFired;
    if (this.ghostTimer <= 0 && (moving || firing)) {
      this.ghostTimer = 0.035;
      const s = this.pool.get(this.game.tex.playerBody, this.below, "add");
      s.position.set(p.x, p.y);
      s.rotation = p.aim;
      s.tint = Math.random() < 0.5 ? 0x40e8ff : 0xff4ce8;
      s.alpha = 0.55;
      this.ghosts.push({ sprite: s, life: GHOST_LIFE });
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.life -= dt;
      if (g.life <= 0) {
        this.pool.release(g.sprite);
        this.ghosts[i] = this.ghosts[this.ghosts.length - 1];
        this.ghosts.pop();
        continue;
      }
      const k = g.life / GHOST_LIFE;
      g.sprite.alpha = 0.5 * k;
      g.sprite.scale.set(1 + (1 - k) * 0.25);
    }
  }

  public render(elapsed: number) {
    if (!this.on) return;
    this.time += elapsed;
    const p = this.game.player;
    const t = this.time;
    const warn = this.remaining < 2 && Math.sin(t * 26) < 0 ? 0.35 : 1;
    this.auraA.position.set(p.x, p.y);
    this.auraA.tint = 0x30d8ff;
    this.auraA.alpha = (0.45 + 0.15 * Math.sin(t * 13)) * warn;
    this.auraA.scale.set(0.75 + 0.06 * Math.sin(t * 9));
    this.auraB.position.set(p.x, p.y);
    this.auraB.tint = 0xff40e0;
    this.auraB.alpha = (0.3 + 0.15 * Math.sin(t * 17 + 1)) * warn;
    this.auraB.scale.set(0.55 + 0.08 * Math.sin(t * 11 + 2));

    // Crackling arcs, re-rolled a few times a second so they flicker.
    this.arcTimer -= elapsed;
    if (this.arcTimer > 0) return;
    this.arcTimer = 0.05;
    const g = this.arcs;
    g.clear();
    if (warn < 1) return;
    for (let n = 0; n < 3; n++) {
      const a0 = rand(0, Math.PI * 2);
      const span = rand(0.8, 1.8);
      const steps = 6;
      const color = n === 0 ? 0xff7cf0 : 0x9ffaff;
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (span * i) / steps;
        const r = rand(18, 30);
        const x = p.x + Math.cos(a) * r;
        const y = p.y + Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke({ width: 4, color, alpha: 0.25 });
      // A thinner, brighter core arc on top.
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (span * i) / steps;
        const r = rand(20, 28);
        const x = p.x + Math.cos(a) * r;
        const y = p.y + Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.9 });
    }
  }
}
