import type { Texture } from "pixi.js";
import { Container, Graphics, Sprite } from "pixi.js";

import { damp, rand } from "../core/math";
import type { Floor } from "./Floor";
import type { GameTextures } from "./Textures";

type ParticleKind = "spark" | "gib" | "casing" | "corpse";

interface Particle {
  sprite: Sprite;
  kind: ParticleKind;
  vx: number;
  vy: number;
  spin: number;
  life: number;
  maxLife: number;
  drag: number;
  /** Bake into the floor when it comes to rest. */
  stampOnEnd: boolean;
  baseScale: number;
  /** Runs right after the particle is stamped (e.g. gore that must land on top). */
  onLand?: () => void;
}

interface Tracer {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  life: number;
  maxLife: number;
  width: number;
  color: number;
}

interface Flash {
  sprite: Sprite;
  life: number;
  maxLife: number;
  baseScale: number;
}

/**
 * Short-lived visual effects. Nothing here affects gameplay.
 * Layers: `under` sits below the zombies (casings, gibs in flight), `over` is additive light on top.
 */
export class Effects {
  public readonly under = new Container();
  public readonly over = new Container();
  private readonly tracerGfx = new Graphics();
  private particles: Particle[] = [];
  private flashes: Flash[] = [];
  private tracers: Tracer[] = [];
  private spritePool: Sprite[] = [];

  /** Screen shake trauma, 0..1. Shake amount is trauma squared. */
  public trauma = 0;
  /** Directional camera nudge, decays back to zero. */
  public kickX = 0;
  public kickY = 0;

  constructor(
    private readonly tex: GameTextures,
    private readonly floor: Floor,
  ) {
    this.tracerGfx.blendMode = "add";
    this.over.addChild(this.tracerGfx);
  }

  public reset() {
    for (const p of this.particles) this.release(p.sprite);
    for (const f of this.flashes) this.release(f.sprite);
    this.particles.length = 0;
    this.flashes.length = 0;
    this.tracers.length = 0;
    this.tracerGfx.clear();
    this.trauma = 0;
    this.kickX = this.kickY = 0;
  }

  public get particleCount() {
    return this.particles.length;
  }

  public addShake(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  public addKick(dx: number, dy: number) {
    this.kickX += dx;
    this.kickY += dy;
  }

  public tracer(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    color: number,
    life: number,
  ) {
    this.tracers.push({ x0, y0, x1, y1, width, color, life, maxLife: life });
  }

  /** Muzzle flash plus a brief light pool around the shooter. */
  public muzzleFlash(x: number, y: number, angle: number, power: number) {
    const flash = this.get(this.tex.muzzle, this.over, "add");
    flash.position.set(x, y);
    flash.rotation = angle + rand(-0.4, 0.4);
    const base = 0.8 + power * 0.6;
    flash.scale.set(base * 1.6, base * rand(0.7, 1.1));
    this.flashes.push({
      sprite: flash,
      life: 0.05,
      maxLife: 0.05,
      baseScale: base,
    });

    const light = this.get(this.tex.glow, this.over, "add");
    light.position.set(x, y);
    light.tint = 0xffc070;
    light.alpha = 0.35;
    light.scale.set(1.6 + power);
    this.flashes.push({
      sprite: light,
      life: 0.06,
      maxLife: 0.06,
      baseScale: 1.6 + power,
    });
  }

  /** A quick additive bloom where a line connects. */
  public impactFlash(x: number, y: number, color: number, size: number) {
    const s = this.get(this.tex.glow, this.over, "add");
    s.position.set(x, y);
    s.tint = color;
    s.alpha = 0.8;
    s.scale.set(size);
    this.flashes.push({
      sprite: s,
      life: 0.06,
      maxLife: 0.06,
      baseScale: size,
    });
  }

  /** Bright sparks where a line hits something. */
  public impactSparks(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    count: number,
    color = 0xfff0a0,
  ) {
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(-dirY, -dirX) + rand(-1.1, 1.1);
      const sp = rand(200, 520);
      this.spawn(
        "spark",
        this.tex.spark,
        x,
        y,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        rand(0.08, 0.18),
        color,
        rand(0.6, 1.2),
        9,
        false,
      );
    }
  }

  /** Green gore flying in the shot direction. Each droplet stains the floor when it lands. */
  public gore(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    count: number,
    color: number,
  ) {
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(dirY, dirX) + rand(-0.7, 0.7);
      const sp = rand(80, 380);
      this.spawn(
        "gib",
        this.tex.drop,
        x,
        y,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        rand(0.15, 0.4),
        color,
        rand(0.4, 1.1),
        7,
        true,
      );
    }
  }

  /** A spent case ejected to the right of the gun. It stays on the floor. */
  public casing(x: number, y: number, aim: number) {
    const a = aim + Math.PI / 2 + rand(-0.4, 0.4);
    const sp = rand(110, 190);
    const p = this.spawn(
      "casing",
      this.tex.casing,
      x,
      y,
      Math.cos(a) * sp,
      Math.sin(a) * sp,
      rand(0.35, 0.6),
      0xffffff,
      1,
      6,
      true,
    );
    p.spin = rand(-30, 30);
  }

  /**
   * A dead zombie topples in the shot direction, then its splayed body is stamped
   * into the floor. onLand runs straight after, so its gore goes on top of the body.
   */
  public corpseFall(
    texture: Texture,
    x: number,
    y: number,
    rotation: number,
    scale: number,
    vx: number,
    vy: number,
    onLand?: () => void,
  ) {
    const p = this.spawn(
      "corpse",
      texture,
      x,
      y,
      vx,
      vy,
      0.28,
      0xffffff,
      scale,
      9,
      true,
    );
    p.sprite.rotation = rotation;
    p.spin = rand(-4, 4);
    p.onLand = onLand;
  }

  public update(dt: number) {
    // Particles.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vx = damp(p.vx, p.drag, dt);
      p.vy = damp(p.vy, p.drag, dt);
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      const k = Math.max(0, p.life / p.maxLife);
      if (p.kind === "spark") {
        p.sprite.rotation = Math.atan2(p.vy, p.vx);
        p.sprite.alpha = k;
        p.sprite.scale.set(p.baseScale * (0.5 + k), p.baseScale);
      } else if (p.kind === "corpse") {
        // Pops up slightly as it falls, settles to its real size when it lands.
        p.sprite.rotation += p.spin * dt;
        p.sprite.scale.set(
          p.baseScale * (1 + 0.18 * Math.sin(Math.PI * (1 - k))),
        );
      } else {
        p.sprite.rotation += p.spin * dt;
        p.spin = damp(p.spin, 6, dt);
      }
      if (p.life <= 0) {
        if (p.stampOnEnd) {
          const s = p.sprite;
          this.floor.stamp(
            s.texture,
            s.x,
            s.y,
            s.rotation,
            p.kind === "corpse" ? p.baseScale : s.scale.x,
            s.tint,
            p.kind === "gib" ? 0.85 : 1,
          );
          p.onLand?.();
        }
        this.release(p.sprite);
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
    // Flashes.
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      const fk = Math.max(0, f.life / f.maxLife);
      f.sprite.scale.set(
        f.sprite.scale.x * (0.85 + 0.15 * fk),
        f.sprite.scale.y * (0.85 + 0.15 * fk),
      );
      if (f.life <= 0) {
        this.release(f.sprite);
        this.flashes[i] = this.flashes[this.flashes.length - 1];
        this.flashes.pop();
      }
    }
    // Tracers.
    const g = this.tracerGfx;
    g.clear();
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.tracers[i] = this.tracers[this.tracers.length - 1];
        this.tracers.pop();
        continue;
      }
      const k = t.life / t.maxLife;
      g.moveTo(t.x0, t.y0)
        .lineTo(t.x1, t.y1)
        .stroke({
          width: t.width * 4 * k + 2,
          color: t.color,
          alpha: 0.18 * k,
          cap: "round",
        });
      g.moveTo(t.x0, t.y0)
        .lineTo(t.x1, t.y1)
        .stroke({
          width: t.width * 1.8 * k + 1,
          color: t.color,
          alpha: 0.6 * k,
          cap: "round",
        });
      g.moveTo(t.x0, t.y0)
        .lineTo(t.x1, t.y1)
        .stroke({
          width: Math.max(1, t.width * 0.6 * k),
          color: 0xffffff,
          alpha: k,
          cap: "round",
        });
    }
    // Camera.
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.kickX = damp(this.kickX, 14, dt);
    this.kickY = damp(this.kickY, 14, dt);
  }

  /** Current camera offset from shake and kick, px. */
  public cameraOffset(out: { x: number; y: number }) {
    const s = this.trauma * this.trauma * 18;
    out.x = this.kickX + rand(-s, s);
    out.y = this.kickY + rand(-s, s);
    return out;
  }

  private spawn(
    kind: ParticleKind,
    texture: Texture,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    tint: number,
    scale: number,
    drag: number,
    stampOnEnd: boolean,
  ): Particle {
    const sprite = this.get(
      texture,
      kind === "spark" ? this.over : this.under,
      kind === "spark" ? "add" : "normal",
    );
    sprite.position.set(x, y);
    sprite.tint = tint;
    sprite.scale.set(scale);
    sprite.rotation = rand(0, Math.PI * 2);
    const p: Particle = {
      sprite,
      kind,
      vx,
      vy,
      spin: 0,
      life,
      maxLife: life,
      drag,
      stampOnEnd,
      baseScale: scale,
    };
    this.particles.push(p);
    return p;
  }

  private get(
    texture: Texture,
    layer: Container,
    blend: "add" | "normal",
  ): Sprite {
    const s = this.spritePool.pop() ?? new Sprite({ anchor: 0.5 });
    s.texture = texture;
    s.blendMode = blend;
    s.alpha = 1;
    s.tint = 0xffffff;
    s.rotation = 0;
    s.scale.set(1);
    s.visible = true;
    layer.addChild(s);
    return s;
  }

  private release(s: Sprite) {
    s.removeFromParent();
    this.spritePool.push(s);
  }
}
