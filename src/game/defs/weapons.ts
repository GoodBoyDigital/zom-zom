/**
 * Weapons are data. Every shot is an instant line test (hitscan); no bullet objects exist.
 * pierce decides how many zombies along the line take the hit, closest first.
 */
export interface WeaponDef {
  id: string;
  name: string;
  /** Shots per second while the trigger is held. */
  fireRate: number;
  /** Lines per shot (shotgun > 1). */
  pellets: number;
  /** Random spread per line, radians (full cone width). */
  spread: number;
  damage: number;
  /** How many zombies one line can hit. 1 = closest only. Infinity = through all. */
  pierce: number;
  /** Max line length in px. */
  range: number;
  /** Impulse given to a hit zombie, px/s (divided by zombie mass). */
  knockback: number;
  /** Impulse pushing the player backwards per shot, px/s. */
  recoil: number;
  /** How far the gun sprite kicks back, px. */
  gunKick: number;
  /** Screen shake added per shot, 0..1 trauma. */
  shake: number;
  /** Camera nudge opposite the aim, px. */
  cameraKick: number;
  tracerWidth: number;
  tracerColor: number;
  /** Tracer fade time, seconds. */
  tracerLife: number;
}

export const WEAPONS = {
  rifle: {
    id: "rifle",
    name: "Rifle",
    fireRate: 11,
    pellets: 1,
    spread: 0.05,
    damage: 1,
    pierce: 1,
    range: 2000,
    knockback: 260,
    recoil: 40,
    gunKick: 7,
    shake: 0.13,
    cameraKick: 4,
    tracerWidth: 5,
    tracerColor: 0xfff2b0,
    tracerLife: 0.09,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    fireRate: 1.6,
    pellets: 9,
    spread: 0.42,
    damage: 1,
    pierce: 1,
    range: 520,
    knockback: 330,
    recoil: 260,
    gunKick: 16,
    shake: 0.45,
    cameraKick: 12,
    tracerWidth: 2.5,
    tracerColor: 0xffd27a,
    tracerLife: 0.09,
  },
  railgun: {
    id: "railgun",
    name: "Railgun (pierces all)",
    fireRate: 1.2,
    pellets: 1,
    spread: 0,
    damage: 6,
    pierce: Infinity,
    range: 2400,
    knockback: 520,
    recoil: 320,
    gunKick: 18,
    shake: 0.6,
    cameraKick: 14,
    tracerWidth: 7,
    tracerColor: 0x8ae6ff,
    tracerLife: 0.22,
  },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;

/** Order for the 1/2/3 debug hotkeys. The prototype starts with the rifle. */
export const WEAPON_ORDER: WeaponId[] = ["rifle", "shotgun", "railgun"];
