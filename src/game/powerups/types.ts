import type { Graphics } from "pixi.js";

import type { Game } from "../Game";

/** One-shot effects fire once on pickup; timed ones run for `duration` seconds. */
export type PowerUpMode = "oneShot" | "timed";

export interface PowerUpDef {
  id: string;
  name: string;
  mode: PowerUpMode;
  /** Seconds a timed power-up lasts. Picking it up again refills it. Ignored for one-shots. */
  duration: number;
  /** Accent colour for HUD ring and banner. */
  color: number;
  /** Draws the icon centred on (0,0), `size` px across. */
  icon: (g?: Graphics, size?: number) => Graphics;
  /** Multiplies the weapon fire rate while active. */
  fireRateMultiplier?: number;
  /** One-shot: the whole effect. Timed: called when it starts (not on refresh). (x, y) = pickup spot. */
  start(game: Game, x: number, y: number): void;
  /** Timed only: picked up again while running. */
  refresh?(game: Game): void;
  /** Timed only: every simulation step while active. */
  update?(game: Game, dt: number, remaining: number): void;
  /** Timed only: ran out (or the run was reset). */
  end?(game: Game): void;
}
