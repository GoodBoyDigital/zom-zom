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
  /** Horizontal art stretch; lets a large zombie read as broad rather than tall. */
  bodyWidth: number;
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
    bodyWidth: 1,
    mass: 1,
    biteDamage: 7,
    biteInterval: 0.7,
    skin: 0x8fae6a,
    clothes: [0x4b5a6e, 0x6e4b4b, 0x5c5a3e, 0x3e5c4f, 0x5a4a6a],
    blood: 0x7dff2a,
    behaviour: "shamble",
  },
  /** A broad, slow damage sponge that starts joining the horde after the opening. */
  brute: {
    id: "brute",
    speed: 42,
    speedVariance: 0.16,
    health: 7,
    radius: 25,
    bodyWidth: 1.35,
    mass: 4,
    biteDamage: 13,
    biteInterval: 1.05,
    skin: 0x9aac67,
    clothes: [0x5d4737, 0x53405e, 0x4f5435],
    blood: 0x93d93e,
    behaviour: "shamble",
  },
} satisfies Record<string, ZombieDef>;

export type ZombieId = keyof typeof ZOMBIES;
