import type { Graphics } from "pixi.js";

import type { Game } from "../Game";

/**
 * Anything that can lie on the floor and be collected by walking into it:
 * guns now, power-ups next. A def is pure data plus two hooks, so new kinds of pickup
 * only need `registerPickup(def)`; the PickupSystem does spawning, visuals and collection.
 */
export interface PickupDef {
  id: string;
  /** Broad family, used for grouping and debugging. */
  kind: "weapon" | "powerup" | (string & {});
  /** Default floating label shown when collected. */
  label: string;
  /** Accent colour: glow, rim and label. */
  color: number;
  /** Draw the icon centred on (0,0), about 40px across. Baked once into a texture. */
  drawIcon(g: Graphics): void;
  /** Drop table this pickup belongs to. Omit to only ever spawn it by hand. */
  table?: string;
  /** Relative chance within its table. A function lets odds react to game state. */
  weight?: number | ((game: Game) => number);
  /** Seconds it stays on the floor before vanishing (blinks for the last 3). Default 14. */
  lifetime?: number;
  /**
   * Called once when the player walks into it. Return a string to override the floating label,
   * or `false` to refuse the pickup and leave it on the floor.
   */
  onPickup(game: Game, at: { x: number; y: number }): string | false | void;
}

/**
 * A family of random drops. On every kill each table rolls its chance (at most one drop per kill);
 * on a hit, one pickup from that table is chosen by weight.
 */
export interface DropTable {
  id: string;
  /** Probability 0..1 that a kill drops something from this table. */
  chance(game: Game): number;
}

export const PICKUPS = new Map<string, PickupDef>();
export const DROP_TABLES = new Map<string, DropTable>();

/** Add or replace a pickup type. Safe to call more than once with the same id. */
export function registerPickup(def: PickupDef) {
  PICKUPS.set(def.id, def);
}

/** Add or replace a drop table. */
export function registerDropTable(table: DropTable) {
  DROP_TABLES.set(table.id, table);
}

export function pickupWeight(def: PickupDef, game: Game) {
  const w = def.weight ?? 1;
  return typeof w === "function" ? w(game) : w;
}
