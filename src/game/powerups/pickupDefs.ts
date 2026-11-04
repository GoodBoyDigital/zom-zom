import type { Graphics } from "pixi.js";

import type { Game } from "../Game";
import { dropTuning, registerDropTable, registerPickup } from "../pickups";
import type { PowerUpId } from "./defs";
import { POWERUP_ORDER, POWERUPS } from "./defs";

/** Drop table id for power-ups on the shared pickup layer. */
export const POWERUP_TABLE = "powerup";

/** Power-ups as pickups on the shared pickup layer (src/game/pickups). */
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

/** Registers the power-up pickups and their drop table. Idempotent. */
export function registerPowerUpPickups() {
  registerDropTable({
    id: POWERUP_TABLE,
    chance: () => dropTuning.powerUpChance,
  });
  POWERUP_PICKUPS.forEach(registerPickup);
}
