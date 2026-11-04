import { Container } from "pixi.js";

import type { Game } from "../Game";
import type { PowerUpId } from "./defs";
import { POWERUPS } from "./defs";
import { ExplosionFx } from "./ExplosionFx";
import { PowerUpHud } from "./PowerUpHud";
import { powerUpPickupId } from "./pickupDefs";
import { ShieldFx } from "./ShieldFx";
import { TurboFx } from "./TurboFx";
import type { PowerUpDef } from "./types";

interface Active {
  def: PowerUpDef;
  remaining: number;
  duration: number;
}

/**
 * Runs power-ups: one-shots fire straight away, timed ones tick down and end.
 * Picking up a running timed power-up refills its timer.
 *
 * Layers (added by Game): `belowPlayer` sits in the world between the zombies
 * and the player, `abovePlayer` over the player. `overlay` sits above the world
 * with the camera transform copied in, so it stays sharp when the shield bends
 * the world with a filter. `hud` is screen space.
 */
export class PowerUpSystem {
  public readonly belowPlayer = new Container();
  public readonly abovePlayer = new Container();
  public readonly overlay = new Container();
  public readonly hud = new PowerUpHud();
  public readonly explosions: ExplosionFx;
  public readonly shield: ShieldFx;
  public readonly turbo: TurboFx;
  private readonly active: Active[] = [];

  constructor(private readonly game: Game) {
    this.explosions = new ExplosionFx(game);
    this.shield = new ShieldFx(game);
    this.turbo = new TurboFx(game);
    this.belowPlayer.addChild(this.turbo.below);
    this.abovePlayer.addChild(this.explosions.smokeLayer);
    this.overlay.addChild(
      this.shield.view,
      this.turbo.above,
      this.explosions.fireLayer,
    );
  }

  /** Product of every running power-up's fire-rate multiplier. */
  public get fireRateMultiplier() {
    let m = 1;
    for (const a of this.active) m *= a.def.fireRateMultiplier ?? 1;
    return m;
  }

  public isActive(id: PowerUpId) {
    return this.active.some((a) => a.def.id === id);
  }

  /** Seconds left on a timed power-up, 0 if it is not running. */
  public remaining(id: PowerUpId) {
    return this.active.find((a) => a.def.id === id)?.remaining ?? 0;
  }

  /**
   * Trigger a power-up. (x, y) is where it was picked up (TNT explodes there);
   * defaults to the player.
   */
  public activate(id: PowerUpId, x?: number, y?: number) {
    const def: PowerUpDef = POWERUPS[id];
    const g = this.game;
    const px = x ?? g.player.x;
    const py = y ?? g.player.y;
    g.sfx.powerUp();
    if (def.mode === "oneShot") {
      def.start(g, px, py);
      return;
    }
    this.hud.announce(def);
    const running = this.active.find((a) => a.def.id === id);
    if (running) {
      running.remaining = running.duration = def.duration;
      def.refresh?.(g);
      return;
    }
    this.active.push({ def, remaining: def.duration, duration: def.duration });
    def.start(g, px, py);
  }

  /** End a timed power-up early. */
  public deactivate(id: PowerUpId) {
    const i = this.active.findIndex((a) => a.def.id === id);
    if (i < 0) return;
    const a = this.active[i];
    this.active.splice(i, 1);
    a.def.end?.(this.game);
  }

  public reset() {
    this.active.length = 0;
    this.explosions.reset();
    this.shield.reset();
    this.turbo.reset();
    this.hud.reset();
  }

  public resize(w: number, h: number) {
    this.hud.resize(w, h);
  }

  /** Fixed-step update. */
  public update(dt: number) {
    const g = this.game;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.remaining -= dt;
      if (a.remaining <= 0) {
        this.active.splice(i, 1);
        a.def.end?.(g);
        continue;
      }
      a.def.update?.(g, dt, a.remaining);
    }
    this.explosions.update(dt);
  }

  /** Render-rate visuals. Call after the camera has moved the world. */
  public render(elapsed: number, worldScale: number) {
    const world = this.game.world;
    this.overlay.position.copyFrom(world.position);
    this.overlay.scale.copyFrom(world.scale);
    this.explosions.render();
    this.shield.render(elapsed, worldScale);
    this.turbo.render(elapsed);
    this.hud.update(elapsed, this.active);
  }

  /** Debug: drop a TNT crate a short way in front of the player. */
  public dropDebugCrate() {
    const p = this.game.player;
    this.game.pickups.spawn(
      powerUpPickupId("tnt"),
      p.x + Math.cos(p.aim) * 130,
      p.y + Math.sin(p.aim) * 130,
    );
  }
}
