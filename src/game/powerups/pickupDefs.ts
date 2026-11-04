import type { Graphics } from "pixi.js";

import type { Game } from "../Game";
import type { PowerUpId } from "./defs";
import { POWERUP_ORDER, POWERUPS } from "./defs";

/** Drop table id for power-ups on the shared pickup layer. */
export const POWERUP_TABLE = "powerup";

/**
 * Pickup-ready power-ups, shaped like the shared pickup layer's PickupDef
 * (feat/weapons-pickups: src/game/pickups/registry.ts). Once both branches are
 * in: `POWERUP_PICKUPS.forEach(registerPickup)`, register a POWERUP_TABLE drop
 * table, and delete StandInPickups.
 */
export interface PowerUpPickupDef {
  id: string;
  kind: "powerup";
  label: string;
  color: number;
  /** Draws the icon centred on (0,0), about 40px across. */
  drawIcon(g: Graphics): void;
  table: string;
  weight: number;
  lifetime: number;
  onPickup(game: Game, at: { x: number; y: number }): void;
}

const WEIGHTS: Record<PowerUpId, number> = { tnt: 1, shield: 1, turbo: 1 };

export const powerUpPickupId = (id: PowerUpId) => `powerup:${id}`;

export const POWERUP_PICKUPS: PowerUpPickupDef[] = POWERUP_ORDER.map((id) => {
  const def = POWERUPS[id];
  return {
    id: powerUpPickupId(id),
    kind: "powerup",
    label: def.name.toUpperCase(),
    color: def.color,
    drawIcon: (g: Graphics) => {
      def.icon(g, 36);
    },
    table: POWERUP_TABLE,
    weight: WEIGHTS[id],
    lifetime: 14,
    onPickup: (game, at) => game.powerUps.activate(id, at.x, at.y),
  };
});
