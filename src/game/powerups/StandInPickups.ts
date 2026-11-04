import type { Graphics } from "pixi.js";
import { Container, Sprite } from "pixi.js";

import { INNER } from "../config";
import { clamp, rand } from "../core/math";
import type { Game } from "../Game";
import type { PowerUpId } from "./defs";
import { POWERUP_ORDER, POWERUPS } from "./defs";

/**
 * STAND-IN until the shared pickup layer lands: power-ups appear around the
 * arena every 15-20 s and you walk into them. Swap this file for
 * `registerPickup(...)` with the defs in pickupDefs.ts and delete it.
 */
export const STAND_IN = {
  /** Seconds between spawns. */
  minGap: 15,
  maxGap: 20,
  /** First one shows up quickly so you can try it. */
  firstGap: 6,
  /** How long one stays on the floor before it vanishes (blinks for the last 3 s). */
  life: 14,
  /** Never spawn closer than this to the player. */
  minPlayerDist: 220,
  collectRadius: 26,
} as const;

interface Item {
  id: PowerUpId;
  x: number;
  y: number;
  age: number;
  life: number;
  view: Container;
  icon: Graphics;
  glow: Sprite;
}

export class StandInPickups {
  public readonly view = new Container();
  private readonly items: Item[] = [];
  private timer: number = STAND_IN.firstGap;
  private time = 0;

  constructor(private readonly game: Game) {}

  public get count() {
    return this.items.length;
  }

  public reset() {
    for (const it of this.items) it.view.destroy({ children: true });
    this.items.length = 0;
    this.timer = STAND_IN.firstGap;
  }

  /** Place a power-up on the floor. Without a spot, picks a random one away from the player. */
  public spawn(id: PowerUpId, x?: number, y?: number) {
    const p = this.game.player;
    if (x === undefined || y === undefined) {
      for (let tries = 0; tries < 20; tries++) {
        x = rand(INNER.left + 70, INNER.right - 70);
        y = rand(INNER.top + 60, INNER.bottom - 60);
        if (Math.hypot(x - p.x, y - p.y) > STAND_IN.minPlayerDist) break;
      }
    }
    const px = clamp(x!, INNER.left + 24, INNER.right - 24);
    const py = clamp(y!, INNER.top + 24, INNER.bottom - 24);
    const def = POWERUPS[id];
    const view = new Container();
    const glow = new Sprite({
      texture: this.game.tex.glow,
      anchor: 0.5,
      tint: def.color,
      alpha: 0.5,
      scale: 0.7,
    });
    glow.blendMode = "add";
    const icon = def.icon(undefined, 30);
    view.addChild(glow, icon);
    view.position.set(px, py);
    this.view.addChild(view);
    this.items.push({
      id,
      x: px,
      y: py,
      age: 0,
      life: STAND_IN.life,
      view,
      icon,
      glow,
    });
  }

  /** Debug: drop one a short way in front of the player. */
  public spawnAhead(id: PowerUpId) {
    const p = this.game.player;
    this.spawn(id, p.x + Math.cos(p.aim) * 130, p.y + Math.sin(p.aim) * 130);
    const it = this.items[this.items.length - 1];
    it.life = 60;
  }

  public update(dt: number) {
    const g = this.game;
    if (g.state === "playing") {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = rand(STAND_IN.minGap, STAND_IN.maxGap);
        this.spawn(
          POWERUP_ORDER[Math.floor(Math.random() * POWERUP_ORDER.length)],
        );
      }
    }
    const p = g.player;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      const touched =
        p.alive &&
        Math.hypot(p.x - it.x, p.y - it.y) < p.radius + STAND_IN.collectRadius;
      if (touched || it.age >= it.life) {
        it.view.destroy({ children: true });
        this.items.splice(i, 1);
        if (touched) g.powerUps.activate(it.id, it.x, it.y);
      }
    }
  }

  /** Bob, pulse and blink before vanishing (render rate). */
  public render(elapsed: number) {
    this.time += elapsed;
    for (const it of this.items) {
      const t = this.time + it.x * 0.01;
      const pop = Math.min(1, it.age / 0.25);
      it.view.scale.set(pop * (1 + 0.06 * Math.sin(t * 6)));
      it.icon.y = -3 + 3 * Math.sin(t * 4);
      it.glow.alpha = 0.35 + 0.2 * Math.sin(t * 5);
      const left = it.life - it.age;
      it.view.alpha = left < 3 && Math.sin(t * 22) < 0 ? 0.3 : 1;
    }
  }
}
