import { Container } from "pixi.js";

import type { Gate } from "../config";
import { GRID_CELL, INNER, MAX_ZOMBIES } from "../config";
import { clamp, damp, rand, rayCircle } from "../core/math";
import { SpatialHash } from "../core/SpatialHash";
import type { ZombieDef } from "../defs/zombies";
import type { Player } from "../entities/Player";
import { Zombie } from "../entities/Zombie";
import type { GameTextures } from "../fx/Textures";

export interface RayHit {
  zombie: Zombie;
  /** Distance along the ray. */
  t: number;
}

/** Extra radius for shots so near-misses on a crowd still connect. */
const HIT_SLOP = 3;

export class ZombieSystem {
  public readonly view = new Container();
  public readonly list: Zombie[] = [];
  private readonly pool: Zombie[] = [];
  private readonly grid = new SpatialHash<Zombie>(GRID_CELL);
  private readonly hits: RayHit[] = [];

  /** Called when a zombie bites the player. */
  public onBite?: (z: Zombie) => void;
  /** Shield bubble radius around the player; 0 = no shield. Zombies can't get inside or bite. */
  public shieldRadius = 0;
  /** A zombie touched the shield. (nx, ny) points from the player to the zombie. */
  public onShieldHit?: (z: Zombie, nx: number, ny: number) => void;

  constructor(private readonly tex: GameTextures) {}

  public get count() {
    return this.list.length;
  }

  public reset() {
    for (const z of this.list) this.release(z);
    this.list.length = 0;
  }

  public spawn(
    def: ZombieDef,
    gate: Gate,
    x: number,
    y: number,
  ): Zombie | null {
    if (this.list.length >= MAX_ZOMBIES) return null;
    const z = this.pool.pop() ?? new Zombie();
    const textures = this.tex.zombies.get(def.id)!;
    z.def = def;
    z.variant = Math.floor(Math.random() * textures.bodies.length);
    z.body.texture = textures.bodies[z.variant];
    z.flashSprite.texture = textures.flash;
    z.shadow.texture = this.tex.shadow;
    z.x = x;
    z.y = y;
    z.kx = z.ky = 0;
    z.radius = def.radius * rand(0.92, 1.1);
    const scale = z.radius / def.radius;
    z.view.scale.set(scale * def.bodyWidth, scale);
    z.speed = def.speed * (1 + rand(-def.speedVariance, def.speedVariance));
    z.hp = def.health;
    z.alive = true;
    z.inside = false;
    z.gate = gate;
    z.gateY = rand(gate.y0 + z.radius + 6, gate.y1 - z.radius - 6);
    z.facing = gate.side === "left" ? 0 : Math.PI;
    z.wobble = rand(0, Math.PI * 2);
    z.flash = 0;
    z.stagger = 0;
    z.biteTimer = rand(0, def.biteInterval);
    z.flashSprite.alpha = 0;
    this.view.addChild(z.view);
    this.list.push(z);
    return z;
  }

  public kill(z: Zombie) {
    z.alive = false;
    const i = this.list.indexOf(z);
    if (i >= 0) {
      this.list[i] = this.list[this.list.length - 1];
      this.list.pop();
    }
    this.release(z);
  }

  public update(dt: number, player: Player) {
    const grid = this.grid;
    grid.clear();
    for (const z of this.list) grid.insert(z);

    for (const z of this.list) {
      // 1. Where does it want to go?
      let tx: number;
      let ty: number;
      if (!z.inside) {
        tx =
          z.gate.side === "left"
            ? INNER.left + z.radius + 30
            : INNER.right - z.radius - 30;
        ty = z.gateY;
      } else {
        tx = player.x;
        ty = player.y;
      }
      let dx = tx - z.x;
      let dy = ty - z.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;

      // 2. Shamble: speed lurches with the gait, and being shot staggers it.
      z.wobble += dt * (4 + z.speed * 0.03);
      const gait = 0.7 + 0.3 * Math.sin(z.wobble);
      z.stagger = Math.max(0, z.stagger - dt);
      const walk = z.speed * gait * (z.stagger > 0 ? 0.15 : 1);
      z.x += (dx * walk + z.kx) * dt;
      z.y += (dy * walk + z.ky) * dt;
      z.kx = damp(z.kx, 7, dt);
      z.ky = damp(z.ky, 7, dt);

      // 3. Turn smoothly towards travel direction.
      const want = Math.atan2(dy, dx);
      let diff = want - z.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      z.facing += diff * Math.min(1, dt * 6);
    }

    // 4. Crowd separation (soft) and player collision (hard).
    for (const z of this.list) {
      grid.query(z.x, z.y, z.radius * 2, (n) => {
        if (n === z) return;
        let ox = z.x - n.x;
        let oy = z.y - n.y;
        const minD = z.radius + n.radius;
        const dSq = ox * ox + oy * oy;
        if (dSq >= minD * minD) return;
        let d = Math.sqrt(dSq);
        if (d < 0.0001) {
          ox = rand(-1, 1);
          oy = rand(-1, 1);
          d = Math.hypot(ox, oy);
        }
        const push = (minD - d) * 0.5;
        z.x += (ox / d) * push;
        z.y += (oy / d) * push;
      });

      if (player.alive && this.shieldRadius > 0) {
        const px = z.x - player.x;
        const py = z.y - player.y;
        const minD = z.radius + this.shieldRadius;
        const dSq = px * px + py * py;
        if (dSq < minD * minD) {
          const d = Math.sqrt(dSq) || 1;
          // Hard wall: the bubble does not give, and nothing bites through it.
          z.x += (px / d) * (minD - d);
          z.y += (py / d) * (minD - d);
          this.onShieldHit?.(z, px / d, py / d);
        }
      } else if (player.alive) {
        const px = z.x - player.x;
        const py = z.y - player.y;
        const minD = z.radius + player.radius;
        const dSq = px * px + py * py;
        if (dSq < minD * minD) {
          const d = Math.sqrt(dSq) || 1;
          const overlap = minD - d;
          z.x += (px / d) * overlap * 0.85;
          z.y += (py / d) * overlap * 0.85;
          // The crowd shoves the player a little.
          player.x -= (px / d) * overlap * 0.15;
          player.y -= (py / d) * overlap * 0.15;
          z.biteTimer -= dt;
          if (z.biteTimer <= 0) {
            z.biteTimer = z.def.biteInterval;
            this.onBite?.(z);
          }
        }
      }

      // 5. Stay in bounds.
      if (z.inside) {
        z.x = clamp(z.x, INNER.left + z.radius, INNER.right - z.radius);
        z.y = clamp(z.y, INNER.top + z.radius, INNER.bottom - z.radius);
      } else {
        z.y = clamp(z.y, z.gate.y0 + z.radius, z.gate.y1 - z.radius);
        if (
          z.gate.side === "left"
            ? z.x > INNER.left + z.radius
            : z.x < INNER.right - z.radius
        ) {
          z.inside = true;
        }
      }
    }

    // 6. Visuals.
    for (const z of this.list) {
      z.flash = Math.max(0, z.flash - dt * 12);
      z.view.position.set(z.x, z.y);
      z.body.rotation = z.facing + Math.sin(z.wobble) * 0.14;
      z.flashSprite.rotation = z.body.rotation;
      z.flashSprite.alpha = z.flash;
      z.flashSprite.visible = z.flash > 0;
    }
  }

  /**
   * All zombies crossed by the ray within maxDist, closest first, up to `limit`.
   * Brute force over the live list: a few hundred circle tests per shot is cheap,
   * and it is exact for any ray length. Swap to a grid walk if counts grow a lot.
   */
  public raycast(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    maxDist: number,
    limit: number,
  ): RayHit[] {
    const hits = this.hits;
    hits.length = 0;
    for (const z of this.list) {
      const t = rayCircle(ox, oy, dx, dy, z.x, z.y, z.radius + HIT_SLOP);
      if (t >= 0 && t <= maxDist) hits.push({ zombie: z, t });
    }
    hits.sort((a, b) => a.t - b.t);
    if (hits.length > limit) hits.length = limit;
    return hits;
  }

  /** Zombies near a point (for future splash damage, melee, etc.). */
  public queryRadius(x: number, y: number, r: number, fn: (z: Zombie) => void) {
    this.grid.query(x, y, r, (z) => {
      if (Math.hypot(z.x - x, z.y - y) <= r + z.radius) fn(z);
    });
  }

  private release(z: Zombie) {
    z.view.removeFromParent();
    this.pool.push(z);
  }
}
