/**
 * Global tuning for the arena and the simulation.
 * Gameplay content (zombie kinds, weapons) lives in defs/, not here.
 */

/** The playable arena, in world pixels. The floor render texture matches this size. */
export const ARENA = {
  width: 1360,
  height: 820,
  /** Wall thickness. The walkable area is the arena minus this on every side. */
  wall: 40,
  /** Extra world space shown around the arena so you can see the horde arriving. */
  viewMargin: 70,
} as const;

/** Inner walkable bounds. */
export const INNER = {
  left: ARENA.wall,
  top: ARENA.wall,
  right: ARENA.width - ARENA.wall,
  bottom: ARENA.height - ARENA.wall,
} as const;

export type GateSide = "left" | "right";

/** An opening in a side wall that zombies pour in through. */
export interface Gate {
  side: GateSide;
  /** Top of the opening, world y. */
  y0: number;
  /** Bottom of the opening, world y. */
  y1: number;
}

export const GATES: Gate[] = [
  { side: "left", y0: 140, y1: 280 },
  { side: "left", y0: 540, y1: 680 },
  { side: "right", y0: 140, y1: 280 },
  { side: "right", y0: 540, y1: 680 },
];

/** Simulation runs at a fixed step so feel does not change with frame rate. */
export const FIXED_DT = 1 / 60;
/** Never simulate more than this many steps per frame (avoids a spiral after a hitch). */
export const MAX_STEPS_PER_FRAME = 5;

/** Hard cap on live zombies. Corpses are baked into the floor, so they do not count. */
export const MAX_ZOMBIES = 450;

/** Spatial hash cell size. Roughly two zombie diameters. */
export const GRID_CELL = 48;
