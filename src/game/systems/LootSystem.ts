import { Container, Sprite } from "pixi.js";

import { damp, rand } from "../core/math";
import type { Player } from "../entities/Player";
import type { GameTextures } from "../fx/Textures";

export type LootKind = "dollar" | "coin" | "gem";

const LOOT = {
  dollar: { value: 10, texture: "dollar", scale: 0.9 },
  coin: { value: 25, texture: "coin", scale: 0.95 },
  gem: { value: 100, texture: "gem", scale: 0.85 },
} as const;

const LIFE = 7;
const FLICKER_AT = 5.25;
const PICKUP_RADIUS = 42;

interface Loot {
  kind: LootKind;
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  phase: number;
}

/** Short-lived loot with a visible last-chance flicker before it disappears. */
export class LootSystem {
  public readonly view = new Container();
  public score = 0;
  public onPickup?: (kind: LootKind, value: number) => void;

  private readonly list: Loot[] = [];
  private readonly pool: Loot[] = [];

  constructor(private readonly tex: GameTextures) {}

  public reset() {
    for (const loot of this.list) this.release(loot);
    this.list.length = 0;
    this.score = 0;
  }

  /** Each kill throws out a small, varied bundle for the player to chase. */
  public drop(x: number, y: number) {
    const count = 2 + (Math.random() < 0.65 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      const kind: LootKind =
        roll < 0.57 ? "dollar" : roll < 0.9 ? "coin" : "gem";
      const a = rand(0, Math.PI * 2);
      const speed = rand(85, 185);
      const loot = this.acquire(kind);
      loot.x = x + Math.cos(a) * rand(3, 12);
      loot.y = y + Math.sin(a) * rand(3, 12);
      loot.vx = Math.cos(a) * speed;
      loot.vy = Math.sin(a) * speed;
      loot.life = LIFE;
      loot.phase = rand(0, Math.PI * 2);
      loot.sprite.position.set(loot.x, loot.y);
      loot.sprite.alpha = 1;
      loot.sprite.visible = true;
      this.list.push(loot);
    }
  }

  public update(dt: number, player: Player, canCollect: boolean) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const loot = this.list[i];
      loot.life -= dt;
      loot.vx = damp(loot.vx, 7, dt);
      loot.vy = damp(loot.vy, 7, dt);
      loot.x += loot.vx * dt;
      loot.y += loot.vy * dt;

      const remaining = Math.max(0, loot.life);
      const flashing = remaining < LIFE - FLICKER_AT;
      loot.sprite.visible =
        !flashing || Math.sin(remaining * 27 + loot.phase) > -0.15;
      loot.sprite.position.set(
        loot.x,
        loot.y + Math.sin(remaining * 5 + loot.phase) * 2,
      );
      loot.sprite.rotation += dt * 2.8;

      if (canCollect) {
        const dx = player.x - loot.x;
        const dy = player.y - loot.y;
        if (dx * dx + dy * dy <= PICKUP_RADIUS * PICKUP_RADIUS) {
          const def = LOOT[loot.kind];
          this.score += def.value;
          this.onPickup?.(loot.kind, def.value);
          this.remove(i);
          continue;
        }
      }
      if (loot.life <= 0) this.remove(i);
    }
  }

  private acquire(kind: LootKind): Loot {
    const old = this.pool.pop();
    if (old) {
      old.kind = kind;
      old.sprite.texture = this.tex[LOOT[kind].texture];
      old.sprite.scale.set(LOOT[kind].scale);
      this.view.addChild(old.sprite);
      return old;
    }
    const sprite = new Sprite({
      texture: this.tex[LOOT[kind].texture],
      anchor: 0.5,
      scale: LOOT[kind].scale,
    });
    this.view.addChild(sprite);
    return { kind, sprite, x: 0, y: 0, vx: 0, vy: 0, life: 0, phase: 0 };
  }

  private remove(index: number) {
    const loot = this.list[index];
    this.list[index] = this.list[this.list.length - 1];
    this.list.pop();
    this.release(loot);
  }

  private release(loot: Loot) {
    loot.sprite.removeFromParent();
    loot.sprite.visible = false;
    this.pool.push(loot);
  }
}
