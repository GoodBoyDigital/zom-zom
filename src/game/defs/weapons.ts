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
  /** Rounds per magazine. One round = one trigger pull (all pellets). */
  magazine: number;
  /** Seconds to swap in a fresh magazine. */
  reloadTime: number;
  /** Total rounds you get when you pick this gun up. Infinity = never runs dry (the pistol). */
  ammo: number;
  /** Pickup / HUD accent colour. */
  color: number;
  /** Relative chance of this gun being the one that drops. 0 = never drops. */
  dropWeight: number;
}

export const WEAPONS = {
  pistol: {
    id: "pistol",
    name: "Pistol",
    fireRate: 5,
    pellets: 1,
    spread: 0.06,
    damage: 1,
    pierce: 1,
    range: 1600,
    knockback: 220,
    recoil: 30,
    gunKick: 6,
    shake: 0.1,
    cameraKick: 3,
    tracerWidth: 4,
    tracerColor: 0xfff2b0,
    tracerLife: 0.08,
    magazine: 12,
    reloadTime: 0.9,
    ammo: Infinity,
    color: 0xd0d0d0,
    dropWeight: 0,
  },
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
    magazine: 30,
    reloadTime: 1.3,
    ammo: 150,
    color: 0xffd34a,
    dropWeight: 4,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    fireRate: 2.4,
    pellets: 10,
    spread: 0.5,
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
    magazine: 4,
    reloadTime: 1.8,
    ammo: 28,
    color: 0xff8a3a,
    dropWeight: 4,
  },
  minigun: {
    id: "minigun",
    name: "Minigun",
    fireRate: 30,
    pellets: 1,
    spread: 0.11,
    damage: 1,
    pierce: 1,
    range: 1800,
    knockback: 200,
    recoil: 22,
    gunKick: 4,
    shake: 0.07,
    cameraKick: 2,
    tracerWidth: 3.5,
    tracerColor: 0xffe27a,
    tracerLife: 0.06,
    magazine: 200,
    reloadTime: 2.6,
    ammo: 400,
    color: 0x5ad6ff,
    dropWeight: 3,
  },
  railgun: {
    id: "railgun",
    name: "Railgun",
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
    magazine: 5,
    reloadTime: 1.6,
    ammo: 20,
    color: 0xb07aff,
    dropWeight: 2,
  },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;

/** You always fall back to this gun when a pickup runs dry. */
export const DEFAULT_WEAPON: WeaponId = "pistol";

/** Order for the number-key debug hotkeys (each gives the gun with a full pickup of ammo). */
export const WEAPON_ORDER: WeaponId[] = [
  "pistol",
  "rifle",
  "shotgun",
  "minigun",
  "railgun",
];
