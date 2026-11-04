import {
  Container,
  DisplacementFilter,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";

import type { Zombie } from "../entities/Zombie";
import type { Game } from "../Game";

export const SHIELD = {
  /** Bubble radius in world px (player radius is 14). */
  radius: 58,
  /** Bounce given to a zombie that walks into the bubble, px/s before mass. */
  bounce: 420,
  /** Shove for everything near the player when the shield goes up. */
  popImpulse: 650,
  /** Peak refraction at the rim, in screen px at fit scale 1. */
  distortion: 32,
} as const;

interface Ripple {
  angle: number;
  life: number;
}

const RIPPLE_LIFE = 0.35;
/** Map texture size and where the bubble edge sits in it (rest is neutral). */
const MAP = 256;
const MAP_R = 104;

/**
 * Shield bubble: zombies bounce off it (ZombieSystem.shieldRadius), each contact
 * sends a ripple round the rim, and a displacement filter bends the world behind
 * the glass like a lens.
 */
export class ShieldFx {
  public readonly view = new Container();
  private readonly glass: Sprite;
  private readonly hex = new Graphics();
  private readonly ripples = new Graphics();
  private readonly mapSprite: Sprite;
  private readonly filter: DisplacementFilter;
  private readonly hits: Ripple[] = [];
  private on = false;
  private age = 0;
  private remaining = 0;
  private pop = 0;
  private time = 0;

  constructor(private readonly game: Game) {
    this.glass = new Sprite({ texture: buildGlass(), anchor: 0.5 });
    this.glass.blendMode = "add";
    this.glass.scale.set((SHIELD.radius * 2) / 256);
    drawHexShell(this.hex, SHIELD.radius);
    this.hex.blendMode = "add";
    this.ripples.blendMode = "add";
    this.view.addChild(this.glass, this.hex, this.ripples);
    this.view.visible = false;

    this.mapSprite = new Sprite({
      texture: buildDisplacementMap(),
      anchor: 0.5,
    });
    this.mapSprite.scale.set((SHIELD.radius * 1.0) / MAP_R);
    this.filter = new DisplacementFilter({
      sprite: this.mapSprite,
      scale: SHIELD.distortion,
      resolution: "inherit",
      antialias: "inherit",
    });
    // The map sprite only drives the filter; it is never drawn.
    this.mapSprite.renderable = false;
    game.world.addChild(this.mapSprite);
  }

  public get active() {
    return this.on;
  }

  public start() {
    this.on = true;
    this.age = 0;
    this.pop = 0;
    this.view.visible = true;
    this.game.zombies.shieldRadius = SHIELD.radius;
    this.game.world.filters = [this.filter];
    // Blow back anything already hugging the player.
    const p = this.game.player;
    this.game.zombies.queryRadius(p.x, p.y, SHIELD.radius + 70, (z) => {
      let dx = z.x - p.x;
      let dy = z.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      z.kx += (dx * SHIELD.popImpulse) / z.def.mass;
      z.ky += (dy * SHIELD.popImpulse) / z.def.mass;
      z.stagger = 0.4;
    });
    this.game.fx.impactFlash(p.x, p.y, 0x6ff3ff, 2.4);
    this.game.fx.addShake(0.15);
  }

  public refresh() {
    this.age = Math.min(this.age, 0.12);
    this.pop = 1;
  }

  public stop() {
    if (!this.on) return;
    this.on = false;
    this.view.visible = false;
    this.hits.length = 0;
    this.game.zombies.shieldRadius = 0;
    this.game.world.filters = null;
    const p = this.game.player;
    this.game.fx.impactFlash(p.x, p.y, 0x9ff8ff, 2);
    this.game.sfx.shieldDown();
  }

  /** Silent teardown for a reset. */
  public reset() {
    this.on = false;
    this.view.visible = false;
    this.hits.length = 0;
    this.game.zombies.shieldRadius = 0;
    this.game.world.filters = null;
  }

  /** A zombie touched the glass. (nx, ny) points from the player to the zombie. */
  public hit(z: Zombie, nx: number, ny: number) {
    if (!this.on) return;
    z.kx += (nx * SHIELD.bounce) / z.def.mass;
    z.ky += (ny * SHIELD.bounce) / z.def.mass;
    z.stagger = Math.max(z.stagger, 0.2);
    if (this.hits.length < 28) {
      this.hits.push({ angle: Math.atan2(ny, nx), life: RIPPLE_LIFE });
      this.game.sfx.shieldHit();
      if (Math.random() < 0.35) {
        const p = this.game.player;
        this.game.fx.impactSparks(
          p.x + nx * SHIELD.radius,
          p.y + ny * SHIELD.radius,
          -nx,
          -ny,
          2,
          0x9ff8ff,
        );
      }
    }
  }

  public update(dt: number, remaining: number) {
    this.age += dt;
    this.remaining = remaining;
    this.pop = Math.max(0, this.pop - dt * 3);
    for (let i = this.hits.length - 1; i >= 0; i--) {
      this.hits[i].life -= dt;
      if (this.hits[i].life <= 0) {
        this.hits[i] = this.hits[this.hits.length - 1];
        this.hits.pop();
      }
    }
  }

  /** Follow the player and animate (render rate). */
  public render(elapsed: number, worldScale: number) {
    if (!this.on) return;
    this.time += elapsed;
    const p = this.game.player;
    // Grow in with a little overshoot.
    const t = Math.min(1, this.age / 0.28);
    const grow = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * 9) : 1;
    const wobble = 1 + 0.015 * Math.sin(this.time * 7) + this.pop * 0.08;
    const s = grow * wobble;
    this.view.position.set(p.x, p.y);
    this.view.scale.set(s);
    this.hex.rotation = this.time * 0.35;
    // Blink for the last two seconds.
    const warn =
      this.remaining < 2 ? (Math.sin(this.time * 26) > 0 ? 0.35 : 1) : 1;
    this.view.alpha = warn;

    this.mapSprite.position.set(p.x, p.y);
    this.mapSprite.rotation = this.time * 0.8;
    this.mapSprite.scale.set(((SHIELD.radius * s) / MAP_R) * 1.0);
    const strength =
      SHIELD.distortion * worldScale * (0.85 + 0.15 * Math.sin(this.time * 5));
    this.filter.scale.x = strength * warn;
    this.filter.scale.y = strength * warn;

    const g = this.ripples;
    g.clear();
    const r = SHIELD.radius;
    for (const h of this.hits) {
      const k = h.life / RIPPLE_LIFE;
      const spread = 0.35 + (1 - k) * 0.6;
      g.arc(0, 0, r, h.angle - spread, h.angle + spread).stroke({
        width: 6 * k + 1,
        color: 0xbffcff,
        alpha: 0.9 * k,
        cap: "round",
      });
      const cx = Math.cos(h.angle) * r;
      const cy = Math.sin(h.angle) * r;
      g.circle(cx, cy, 4 + (1 - k) * 18).stroke({
        width: 2,
        color: 0x6ff3ff,
        alpha: 0.7 * k,
      });
    }
  }
}

/** Soft glass: nearly clear in the middle, bright fresnel rim. */
function buildGlass(): Texture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(60,200,255,0.03)");
  g.addColorStop(0.6, "rgba(60,200,255,0.08)");
  g.addColorStop(0.86, "rgba(90,230,255,0.28)");
  g.addColorStop(0.95, "rgba(200,255,255,0.95)");
  g.addColorStop(0.985, "rgba(120,240,255,0.5)");
  g.addColorStop(1, "rgba(60,200,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Specular highlight up-left.
  const h = ctx.createRadialGradient(88, 80, 0, 88, 80, 46);
  h.addColorStop(0, "rgba(255,255,255,0.35)");
  h.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, size, size);
  return textureFromCanvas(c);
}

/**
 * Displacement map: neutral grey everywhere except inside the bubble, where
 * pixels are pulled towards the centre (a lens) with a rippled rim so the
 * rotating sprite makes the edge swirl.
 */
function buildDisplacementMap(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = MAP;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(MAP, MAP);
  const half = MAP / 2;
  for (let j = 0; j < MAP; j++) {
    for (let i = 0; i < MAP; i++) {
      const u = (i + 0.5 - half) / MAP_R;
      const v = (j + 0.5 - half) / MAP_R;
      const d = Math.hypot(u, v);
      let ox = 0;
      let oy = 0;
      if (d < 1.06 && d > 0.0001) {
        const theta = Math.atan2(v, u);
        // Strongest just inside the rim, fading in to the centre and out past it.
        const inner = Math.pow(Math.min(d, 1), 3);
        const fade = d > 1 ? 1 - (d - 1) / 0.06 : 1;
        const swirl = 1 + 0.35 * Math.sin(theta * 7 + d * 9);
        const k = 0.5 * inner * fade * swirl;
        ox = (u / d) * k;
        oy = (v / d) * k;
      }
      const o = (j * MAP + i) * 4;
      img.data[o] = Math.round(128 + ox * 254);
      img.data[o + 1] = Math.round(128 + oy * 254);
      img.data[o + 2] = 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return textureFromCanvas(c);
}

/** Faint hexagon lattice clipped to the bubble. */
function drawHexShell(g: Graphics, r: number) {
  const s = 9;
  const w = Math.sqrt(3) * s;
  for (let row = -8; row <= 8; row++) {
    for (let col = -8; col <= 8; col++) {
      const cx = col * w + (row & 1 ? w / 2 : 0);
      const cy = row * s * 1.5;
      const d = Math.hypot(cx, cy);
      if (d > r - 6) continue;
      // Lattice shows mostly near the rim, like a curved shell.
      const alpha = 0.04 + 0.22 * Math.pow(d / r, 3);
      const pts: number[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        pts.push(cx + Math.cos(a) * s * 0.92, cy + Math.sin(a) * s * 0.92);
      }
      g.poly(pts).stroke({ width: 1, color: 0x8ff6ff, alpha });
    }
  }
}

function textureFromCanvas(c: HTMLCanvasElement): Texture {
  return Texture.from(c);
}
