import { drawShieldIcon, drawTntCrate, drawTurboIcon } from "./icons";
import { TURBO } from "./TurboFx";
import type { PowerUpDef } from "./types";

/**
 * Power-ups are data plus a few hooks. Add a new one here and it works with
 * game.powerUps.activate(id), the HUD timers and the pickup defs.
 */
export const POWERUPS = {
  /** One-shot: walk into the crate and everything nearby is blown apart. */
  tnt: {
    id: "tnt",
    name: "TNT",
    mode: "oneShot",
    duration: 0,
    color: 0xff5a2a,
    icon: drawTntCrate,
    start: (game, x, y) => game.powerUps.explosions.detonate(x, y),
  },
  /** Timed: a bubble the horde can't break. */
  shield: {
    id: "shield",
    name: "Shield",
    mode: "timed",
    duration: 8,
    color: 0x6ff3ff,
    icon: drawShieldIcon,
    start: (game) => game.powerUps.shield.start(),
    refresh: (game) => game.powerUps.shield.refresh(),
    update: (game, dt, remaining) => game.powerUps.shield.update(dt, remaining),
    end: (game) => game.powerUps.shield.stop(),
  },
  /** Timed: double fire rate and a lot of crackle. */
  turbo: {
    id: "turbo",
    name: "Turbo",
    mode: "timed",
    duration: 8,
    color: 0xff5cf0,
    icon: drawTurboIcon,
    fireRateMultiplier: TURBO.fireRate,
    start: (game) => game.powerUps.turbo.start(),
    update: (game, dt, remaining) => game.powerUps.turbo.update(dt, remaining),
    end: (game) => game.powerUps.turbo.stop(),
  },
} satisfies Record<string, PowerUpDef>;

export type PowerUpId = keyof typeof POWERUPS;
export const POWERUP_ORDER: PowerUpId[] = ["tnt", "shield", "turbo"];
