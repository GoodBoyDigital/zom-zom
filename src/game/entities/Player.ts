import { Container, Sprite } from "pixi.js";

import { INNER } from "../config";
import { clamp, damp } from "../core/math";
import type { GameTextures } from "../fx/Textures";

export class Player {
  public readonly view = new Container();
  private readonly body: Sprite;
  private readonly gun: Sprite;
  private readonly shadow: Sprite;
  private readonly light: Sprite;

  public x = 0;
  public y = 0;
  public vx = 0;
  public vy = 0;
  public readonly radius = 14;
  public readonly speed = 250;
  /** How quickly velocity reaches the input target. Lower = heavier. */
  public readonly accel = 14;
  public maxHp = 100;
  public hp = 100;
  public alive = true;
  /** Aim angle, radians. */
  public aim = 0;
  /** Current visual gun kick, px. */
  public gunKick = 0;
  /** 0..1 red flash after being bitten. */
  public hurt = 0;

  /** Where the gun sits relative to the body centre, in the aim frame. */
  public static readonly GUN_X = 6;
  public static readonly GUN_Y = 5;
  public static readonly GUN_LENGTH = 30;

  constructor(tex: GameTextures) {
    this.shadow = new Sprite({ texture: tex.shadow, anchor: 0.5, scale: 0.7 });
    this.body = new Sprite({ texture: tex.playerBody, anchor: 0.5 });
    // The gun texture's origin is the grip (4px into its bounds).
    this.gun = new Sprite({ texture: tex.gun, anchor: { x: 4 / 34, y: 0.5 } });
    // Soft light pool so the player always reads against the horde.
    this.light = new Sprite({
      texture: tex.glow,
      anchor: 0.5,
      scale: 1.6,
      alpha: 0.14,
      tint: 0xbfdcff,
    });
    this.light.blendMode = "add";
    this.view.addChild(this.light, this.shadow, this.gun, this.body);
  }

  public reset(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = this.vy = 0;
    this.hp = this.maxHp;
    this.alive = true;
    this.gunKick = 0;
    this.hurt = 0;
    this.view.alpha = 1;
  }

  public update(dt: number, moveX: number, moveY: number) {
    if (this.alive) {
      const k = Math.min(1, this.accel * dt);
      this.vx += (moveX * this.speed - this.vx) * k;
      this.vy += (moveY * this.speed - this.vy) * k;
    } else {
      this.vx = damp(this.vx, 6, dt);
      this.vy = damp(this.vy, 6, dt);
    }
    this.x = clamp(
      this.x + this.vx * dt,
      INNER.left + this.radius,
      INNER.right - this.radius,
    );
    this.y = clamp(
      this.y + this.vy * dt,
      INNER.top + this.radius,
      INNER.bottom - this.radius,
    );
    this.gunKick = damp(this.gunKick, 22, dt);
    this.hurt = Math.max(0, this.hurt - dt * 4);
  }

  /** World position of the muzzle. */
  public muzzle(out: { x: number; y: number }) {
    const c = Math.cos(this.aim);
    const s = Math.sin(this.aim);
    const lx = Player.GUN_X + Player.GUN_LENGTH - this.gunKick;
    const ly = Player.GUN_Y;
    out.x = this.x + c * lx - s * ly;
    out.y = this.y + s * lx + c * ly;
    return out;
  }

  public sync() {
    this.view.position.set(this.x, this.y);
    this.body.rotation = this.aim;
    this.gun.rotation = this.aim;
    const c = Math.cos(this.aim);
    const s = Math.sin(this.aim);
    const lx = Player.GUN_X - this.gunKick;
    this.gun.position.set(c * lx - s * Player.GUN_Y, s * lx + c * Player.GUN_Y);
    this.body.tint =
      this.hurt > 0 ? lerpColor(0xffffff, 0xff4040, this.hurt) : 0xffffff;
    this.view.alpha = this.alive ? 1 : 0.5;
  }
}

function lerpColor(a: number, b: number, t: number) {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}
