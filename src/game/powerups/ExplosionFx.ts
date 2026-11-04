import type { Sprite } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { rand } from "../core/math";
import type { Zombie } from "../entities/Zombie";
import type { Game } from "../Game";
import { SpritePool } from "./SpritePool";

/** Blast tuning. Kill radius is generous: the TNT crate should clear the area. */
export const TNT = {
  /** Everything inside this dies. */
  killRadius: 300,
  /** Zombies out to this radius get thrown back but survive. */
  pushRadius: 470,
  /** Shockwave expansion speed, px/s. Kills happen as the ring passes. */
  speed: 1500,
  /** Corpse throw for blast kills (px/s before zombie mass). */
  knockback: 900,
  /** Shove for survivors. */
  pushImpulse: 700,
} as const;

interface Blast {
  x: number;
  y: number;
  r: number;
  age: number;
  touched: Set<Zombie>;
}

interface Puff {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  grow: number;
  startScale: number;
  startAlpha: number;
  drag: number;
  /** Fireball colour cools from yellow to deep red as it fades. */
  fire: boolean;
}

/**
 * The TNT blast: a shockwave ring that kills as it expands, fireballs, smoke,
 * debris, a white flash and a scorch mark baked into the floor.
 */
export class ExplosionFx {
  /** Smoke (normal blend), drawn above zombies. */
  public readonly smokeLayer = new Container();
  /** Fireballs, flash and the ring (additive). */
  public readonly fireLayer = new Container();
  private readonly ring = new Graphics();
  private readonly blasts: Blast[] = [];
  private readonly puffs: Puff[] = [];
  private readonly pool = new SpritePool();
  private readonly victims: Zombie[] = [];

  constructor(private readonly game: Game) {
    this.ring.blendMode = "add";
    this.fireLayer.addChild(this.ring);
  }

  public get active() {
    return this.blasts.length > 0 || this.puffs.length > 0;
  }

  public reset() {
    for (const p of this.puffs) this.pool.release(p.sprite);
    this.puffs.length = 0;
    this.blasts.length = 0;
    this.ring.clear();
  }

  public detonate(x: number, y: number) {
    const g = this.game;
    const tex = g.tex;
    this.blasts.push({ x, y, r: 0, age: 0, touched: new Set() });

    // Scorch first so bodies and gore from the blast land on top of it.
    g.floor.stamp(
      tex.glow,
      x,
      y,
      0,
      (TNT.killRadius * 1.5) / 128,
      0x000000,
      0.55,
    );
    g.floor.stamp(
      tex.glow,
      x,
      y,
      0,
      (TNT.killRadius * 0.8) / 128,
      0x120800,
      0.7,
    );
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(20, TNT.killRadius * 0.7);
      g.floor.stamp(
        tex.splats[i % tex.splats.length],
        x + Math.cos(a) * d,
        y + Math.sin(a) * d,
        a,
        rand(0.5, 1.2),
        0x0d0a08,
        0.55,
      );
    }

    // White-hot core flash + big light pool.
    this.puff(tex.glow, x, y, 0, 0, 0.12, 1.6, 5, 0xffffff, 0.9, false, 0);
    this.puff(tex.glow, x, y, 0, 0, 0.4, 4, 8, 0xff9a30, 0.55, false, 0);
    // Fireballs rolling outwards.
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 620);
      this.puff(
        tex.glow,
        x + Math.cos(a) * rand(0, 30),
        y + Math.sin(a) * rand(0, 30),
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        rand(0.35, 0.75),
        rand(0.6, 1.1),
        rand(1.4, 2.4),
        0xffc060,
        0.6,
        true,
        3.2,
      );
    }
    // Smoke that lingers.
    for (let i = 0; i < 18; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 260);
      const s = this.puff(
        tex.glow,
        x + Math.cos(a) * rand(0, 60),
        y + Math.sin(a) * rand(0, 60),
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        rand(1.2, 2.2),
        rand(0.8, 1.4),
        rand(1.6, 2.6),
        0x2a2622,
        0.55,
        false,
        2.2,
      );
      this.smokeLayer.addChild(s.sprite);
      s.sprite.blendMode = "normal";
    }
    // Debris and sparks flying everywhere.
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2);
      g.fx.impactSparks(x, y, -Math.cos(a), -Math.sin(a), 6, 0xffd070);
    }

    g.fx.addShake(0.95);
    g.sfx.explosion();
  }

  public update(dt: number) {
    const g = this.game;
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i];
      b.age += dt;
      b.r += TNT.speed * dt;
      const victims = this.victims;
      victims.length = 0;
      g.zombies.queryRadius(b.x, b.y, Math.min(b.r, TNT.pushRadius), (z) => {
        if (z.alive && !b.touched.has(z)) victims.push(z);
      });
      for (const z of victims) {
        b.touched.add(z);
        let dx = z.x - b.x;
        let dy = z.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        if (d <= TNT.killRadius + z.radius) {
          g.killZombie(z, dx, dy, { knockback: TNT.knockback });
        } else {
          const k = TNT.pushImpulse / z.def.mass;
          z.kx += dx * k;
          z.ky += dy * k;
          z.stagger = 0.6;
          z.flash = 1;
        }
      }
      if (b.r >= TNT.pushRadius) this.blasts.splice(i, 1);
      // Rattle the camera hard while the ring is close.
      if (b.age < 0.1) g.fx.addKick(rand(-6, 6), rand(-6, 6));
    }

    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.release(p.sprite);
        this.puffs[i] = this.puffs[this.puffs.length - 1];
        this.puffs.pop();
        continue;
      }
      const k = p.life / p.maxLife;
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.scale.set(p.startScale + (p.grow - p.startScale) * (1 - k * k));
      p.sprite.alpha = p.startAlpha * (p.fire ? k * k : k);
      if (p.fire) p.sprite.tint = fireColor(0.2 + 0.8 * (1 - k));
    }
  }

  /** Draw the shockwave rings (render rate). */
  public render() {
    const ring = this.ring;
    ring.clear();
    for (const b of this.blasts) {
      const k = 1 - b.r / TNT.pushRadius;
      ring
        .circle(b.x, b.y, b.r)
        .stroke({ width: 40 * k + 4, color: 0xffa040, alpha: 0.25 * k });
      ring
        .circle(b.x, b.y, b.r)
        .stroke({ width: 10 * k + 2, color: 0xfff0c0, alpha: 0.9 * k });
    }
  }

  private puff(
    texture: Sprite["texture"],
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    startScale: number,
    grow: number,
    tint: number,
    alpha: number,
    fire: boolean,
    drag: number,
  ): Puff {
    const sprite = this.pool.get(texture, this.fireLayer, "add");
    sprite.position.set(x, y);
    sprite.tint = tint;
    sprite.alpha = alpha;
    sprite.scale.set(startScale);
    const p: Puff = {
      sprite,
      vx,
      vy,
      life,
      maxLife: life,
      grow,
      startScale,
      startAlpha: alpha,
      drag,
      fire,
    };
    this.puffs.push(p);
    return p;
  }
}

/** 0 = white-yellow, 1 = dark red. */
function fireColor(t: number) {
  const r = 255;
  const g = Math.round(235 * (1 - t) * (1 - t) + 40 * t);
  const b = Math.round(140 * Math.max(0, 1 - t * 3));
  return ((r * (1 - t * 0.5)) << 16) | (g << 8) | b;
}
