import type { Renderer, Texture } from "pixi.js";
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { INNER } from "../config";
import { clamp, rand } from "../core/math";
import type { GameTextures } from "../fx/Textures";
import type { Game } from "../Game";
import type { PickupDef } from "./registry";
import { DROP_TABLES, PICKUPS, pickupWeight, registerPickup } from "./registry";

/** Pickups pulled towards the player inside this range, px. */
const MAGNET_RADIUS = 80;
/** Collected when this close to the player's centre, px. */
const COLLECT_RADIUS = 30;
/** Never keep more than this many on the floor; the oldest goes first. */
const MAX_LIVE = 16;
const DEFAULT_LIFETIME = 14;
const BLINK_TIME = 3;

interface Pickup {
  def: PickupDef;
  x: number;
  y: number;
  /** Height above the floor while it pops out of the corpse. */
  z: number;
  vz: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  root: Container;
  glow: Sprite;
  ring: Sprite;
  icon: Sprite;
  shadow: Sprite;
}

interface FloatLabel {
  text: Text;
  x: number;
  y: number;
  age: number;
}

/**
 * Spawns, animates and collects pickups. Generic over PickupDef: guns and power-ups
 * look and behave the same on the floor; only their onPickup differs.
 */
export class PickupSystem {
  /** World layer for the pickups themselves (above the floor and zombies, below the player). */
  public readonly view = new Container();
  /** World layer for the floating "+SHOTGUN" labels (above everything). */
  public readonly labels = new Container();
  /** Fired after any pickup is collected. */
  public onCollect?: (def: PickupDef, x: number, y: number) => void;

  private readonly items: Pickup[] = [];
  private readonly floats: FloatLabel[] = [];
  private readonly icons = new Map<string, Texture>();
  private ringTex: Texture | null = null;

  constructor(
    private readonly renderer: Renderer,
    private readonly tex: GameTextures,
  ) {}

  /** Same as the module-level registerPickup; handy from the debug console. */
  public register(def: PickupDef) {
    registerPickup(def);
  }

  public get count() {
    return this.items.length;
  }

  /** Ids of everything currently on the floor (QA / debug). */
  public get live() {
    return this.items.map((p) => ({
      id: p.def.id,
      x: Math.round(p.x),
      y: Math.round(p.y),
    }));
  }

  public reset() {
    for (const p of this.items) p.root.destroy({ children: true });
    for (const f of this.floats) f.text.destroy();
    this.items.length = 0;
    this.floats.length = 0;
  }

  /** Drop a pickup at (x, y). It pops up and lands nearby. */
  public spawn(defId: string, x: number, y: number) {
    const def = PICKUPS.get(defId);
    if (!def) throw new Error(`Unknown pickup "${defId}"`);
    if (this.items.length >= MAX_LIVE) this.remove(this.items[0]);

    const root = new Container();
    const shadow = new Sprite({
      texture: this.tex.shadow,
      anchor: 0.5,
      scale: 0.75,
    });
    const glow = new Sprite({
      texture: this.tex.glow,
      anchor: 0.5,
      tint: def.color,
      alpha: 0.5,
      scale: 1,
    });
    glow.blendMode = "add";
    const ring = new Sprite({ texture: this.ring(), anchor: 0.5 });
    ring.tint = def.color;
    const icon = new Sprite({ texture: this.icon(def), anchor: 0.5 });
    const name = new Text({
      text: def.label,
      style: {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: 11,
        fill: def.color,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    name.anchor.set(0.5, 0);
    name.y = 30;
    root.addChild(shadow, glow, ring, icon, name);
    this.view.addChild(root);

    const a = rand(0, Math.PI * 2);
    const p: Pickup = {
      def,
      x,
      y,
      z: 0,
      vz: 260,
      vx: Math.cos(a) * rand(20, 60),
      vy: Math.sin(a) * rand(20, 60),
      age: 0,
      life: def.lifetime ?? DEFAULT_LIFETIME,
      root,
      glow,
      ring,
      icon,
      shadow,
    };
    this.items.push(p);
    this.place(p);
    return p;
  }

  /**
   * Roll every drop table for a kill at (x, y). At most one drop per kill.
   * Returns the spawned pickup id, or null.
   */
  public rollDrops(game: Game, x: number, y: number): string | null {
    for (const table of DROP_TABLES.values()) {
      if (Math.random() >= table.chance(game)) continue;
      const def = this.pickFrom(table.id, game);
      if (!def) continue;
      this.spawn(def.id, x, y);
      return def.id;
    }
    return null;
  }

  private pickFrom(tableId: string, game: Game): PickupDef | null {
    let total = 0;
    const options: [PickupDef, number][] = [];
    for (const def of PICKUPS.values()) {
      if (def.table !== tableId) continue;
      const w = pickupWeight(def, game);
      if (w <= 0) continue;
      total += w;
      options.push([def, w]);
    }
    let r = Math.random() * total;
    for (const [def, w] of options) {
      r -= w;
      if (r <= 0) return def;
    }
    return options.length ? options[options.length - 1][0] : null;
  }

  public update(dt: number, game: Game) {
    const pl = game.player;
    const canCollect = game.state === "playing" && pl.alive;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.remove(p);
        continue;
      }
      // Pop out of the corpse, bounce once, then sit.
      if (p.z > 0 || p.vz !== 0) {
        p.vz -= 900 * dt;
        p.z += p.vz * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.z <= 0) {
          p.z = 0;
          p.vz = Math.abs(p.vz) > 120 ? -p.vz * 0.35 : 0;
          p.vx *= 0.4;
          p.vy *= 0.4;
          if (p.vz === 0) p.vx = p.vy = 0;
        }
      }
      p.x = clamp(p.x, INNER.left + 18, INNER.right - 18);
      p.y = clamp(p.y, INNER.top + 18, INNER.bottom - 18);

      if (canCollect && p.age > 0.25) {
        const dx = pl.x - p.x;
        const dy = pl.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < COLLECT_RADIUS) {
          if (this.collect(p, game)) continue;
        } else if (d < MAGNET_RADIUS) {
          const pull = (1 - d / MAGNET_RADIUS) * 520 * dt;
          p.x += (dx / d) * pull;
          p.y += (dy / d) * pull;
        }
      }
      this.place(p);
    }

    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.age += dt;
      const t = f.age / 1.2;
      if (t >= 1) {
        f.text.destroy();
        this.floats.splice(i, 1);
        continue;
      }
      f.text.position.set(f.x, f.y - 30 - 46 * (1 - (1 - t) * (1 - t)));
      f.text.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      const pop = t < 0.12 ? 0.6 + (t / 0.12) * 0.55 : 1.15 - Math.min(0.15, t);
      f.text.scale.set(pop);
    }
  }

  /** Floating label above a point (also used for "OUT OF AMMO" and the like). */
  public floatText(x: number, y: number, label: string, color: number) {
    const text = new Text({
      text: label,
      style: {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: 20,
        fill: color,
        stroke: { color: 0x000000, width: 5 },
      },
    });
    text.anchor.set(0.5, 1);
    text.position.set(x, y - 30);
    this.labels.addChild(text);
    this.floats.push({ text, x, y, age: 0 });
  }

  private collect(p: Pickup, game: Game) {
    const result = p.def.onPickup(game, p);
    if (result === false) return false;
    this.floatText(p.x, p.y, result || p.def.label, p.def.color);
    game.fx.impactFlash(p.x, p.y, p.def.color, 1.4);
    this.onCollect?.(p.def, p.x, p.y);
    this.remove(p);
    return true;
  }

  private remove(p: Pickup) {
    const i = this.items.indexOf(p);
    if (i >= 0) this.items.splice(i, 1);
    p.root.destroy({ children: true });
  }

  private place(p: Pickup) {
    const t = p.age;
    const bob = p.z > 0 ? 0 : Math.sin(t * 4) * 3;
    const lift = 4 + p.z + bob;
    p.root.position.set(p.x, p.y);
    p.shadow.scale.set(0.75 - Math.min(0.3, lift / 200));
    p.shadow.position.set(3, 5);
    p.icon.y = p.ring.y = p.glow.y = -lift;
    p.ring.rotation = t * 1.6;
    // Pop in.
    const s = t < 0.25 ? 0.4 + (t / 0.25) * 0.6 : 1;
    p.icon.scale.set(s);
    p.ring.scale.set(s * (1 + Math.sin(t * 6) * 0.04));
    p.glow.alpha = 0.5 + Math.sin(t * 5) * 0.15;
    // Blink faster and faster while running out.
    const left = p.life - t;
    if (left < BLINK_TIME) {
      const rate = 4 + (1 - left / BLINK_TIME) * 10;
      p.root.alpha = Math.sin(t * rate * Math.PI) > -0.2 ? 1 : 0.25;
    } else {
      p.root.alpha = 1;
    }
  }

  private icon(def: PickupDef) {
    let t = this.icons.get(def.id);
    if (!t) {
      const g = new Graphics();
      // Dark puck with a tinted face so any icon reads against green gore.
      g.circle(0, 0, 25)
        .fill({ color: 0x050505, alpha: 0.8 })
        .circle(0, 0, 25)
        .fill({ color: def.color, alpha: 0.18 })
        .stroke({ width: 2, color: def.color, alpha: 0.9 });
      const art = new Graphics();
      def.drawIcon(art);
      art.scale.set(0.95);
      g.addChild(art);
      t = this.bake(g);
      this.icons.set(def.id, t);
    }
    return t;
  }

  /** A dashed white ring, tinted per pickup. */
  private ring() {
    if (!this.ringTex) {
      const g = new Graphics();
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2) / n / 1.8;
        g.moveTo(Math.cos(a0) * 31, Math.sin(a0) * 31).arc(0, 0, 31, a0, a1);
      }
      g.stroke({ width: 3, color: 0xffffff, cap: "round" });
      this.ringTex = this.bake(g);
    }
    return this.ringTex;
  }

  private bake(g: Graphics): Texture {
    // Pad symmetrically so (0,0) stays the texture centre.
    g.rect(-34, -34, 68, 68).fill({ color: 0, alpha: 0.001 });
    const tex = this.renderer.generateTexture({
      target: g,
      antialias: true,
      resolution: 2,
    });
    g.destroy({ children: true });
    return tex;
  }
}
