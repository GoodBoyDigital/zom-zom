/**
 * Zombie kinds are data. Add a new kind by adding an entry here
 * (and, if it needs new behaviour, a behaviour id handled in ZombieSystem).
 */
export interface ZombieDef {
  id: string;
  /** Max walk speed, px/s. Each zombie gets a small random spread on top. */
  speed: number;
  /** Random +/- fraction applied to speed per zombie. */
  speedVariance: number;
  health: number;
  /** Body radius for collisions and hit tests. */
  radius: number;
  /** Higher mass = less knockback. 1 is the baseline. */
  mass: number;
  /** Damage per bite on the player. */
  biteDamage: number;
  /** Seconds between bites while touching the player. */
  biteInterval: number;
  /** Skin colour used to generate the placeholder art. */
  skin: number;
  /** Clothes colours, one picked at random per zombie. */
  clothes: number[];
  /** Blood colour for splats. */
  blood: number;
  /** Steering behaviour id. Only "shamble" exists for now. */
  behaviour: "shamble";
}

export const ZOMBIES = {
  walker: {
    id: "walker",
    speed: 70,
    speedVariance: 0.35,
    health: 3,
    radius: 14,
    mass: 1,
    biteDamage: 7,
    biteInterval: 0.7,
    skin: 0x8fae6a,
    clothes: [0x4b5a6e, 0x6e4b4b, 0x5c5a3e, 0x3e5c4f, 0x5a4a6a],
    blood: 0x7dff2a,
    behaviour: "shamble",
  },
} satisfies Record<string, ZombieDef>;

export type ZombieId = keyof typeof ZOMBIES;
