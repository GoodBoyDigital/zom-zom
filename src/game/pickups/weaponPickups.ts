import type { Graphics } from "pixi.js";

import type { WeaponId } from "../defs/weapons";
import { WEAPONS } from "../defs/weapons";
import { dropTuning } from "./dropTuning";
import { registerDropTable, registerPickup } from "./registry";

export const WEAPON_TABLE = "weapon";

/** Pickup id for a gun drop. */
export const gunPickupId = (id: WeaponId) => `gun:${id}`;

/** Registers one pickup per droppable gun, plus the gun drop table. Idempotent. */
export function registerWeaponPickups() {
  registerDropTable({
    id: WEAPON_TABLE,
    // Guns come much more often while you're stuck with the pistol.
    chance: (game) =>
      game.loadout.isDefault
        ? dropTuning.pistolGunChance
        : dropTuning.gunChance,
  });
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    const w = WEAPONS[id];
    if (w.dropWeight <= 0) continue;
    registerPickup({
      id: gunPickupId(id),
      kind: "weapon",
      label: w.name.toUpperCase(),
      color: w.color,
      table: WEAPON_TABLE,
      weight: w.dropWeight,
      drawIcon: (g) => drawGun(g, id, w.color),
      onPickup: (game) => {
        const topUp = game.loadout.weapon === w;
        game.loadout.pickUp(id);
        return topUp
          ? `+${w.ammo} ${w.name.toUpperCase()} AMMO`
          : w.name.toUpperCase();
      },
    });
  }
}

const DARK = 0x4a4e58;
const MID = 0x9aa0ac;
const LIGHT = 0xe4e7ee;
const WOOD = 0xa0683a;

/** One cartoon part: filled rounded rect with a dark outline. */
function part(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  r = 1.5,
) {
  g.roundRect(x, y, w, h, r)
    .fill(color)
    .stroke({ width: 1.6, color: 0x0b0b0c, alignment: 1 });
}

/** Chunky gun silhouettes, facing +x, centred on (0,0), about 44px long. */
function drawGun(g: Graphics, id: WeaponId, accent: number) {
  switch (id) {
    case "shotgun":
      part(g, -23, -4, 13, 9, WOOD, 2.5);
      part(g, -6, 4, 5, 8, DARK);
      part(g, 2, -5, 22, 4, DARK);
      part(g, 2, -1, 22, 4, DARK);
      part(g, -11, -5, 15, 10, MID, 2);
      part(g, 6, 2.5, 12, 6, accent, 2);
      break;
    case "minigun":
      part(g, -14, 7, 6, 7, DARK);
      part(g, 4, -7, 21, 4, DARK);
      part(g, 4, -2, 21, 4, DARK);
      part(g, 4, 3, 21, 4, DARK);
      part(g, 21, -8, 4, 16, LIGHT);
      part(g, -21, -9, 19, 18, MID, 5);
      part(g, -3, -8, 7, 16, accent);
      break;
    case "railgun":
      part(g, -23, -5, 12, 10, DARK);
      part(g, -4, 5, 5, 7, DARK);
      part(g, 6, -3, 20, 6, LIGHT);
      part(g, -13, -6, 21, 12, MID, 3);
      part(g, 9, -6, 3, 12, accent);
      part(g, 15, -6, 3, 12, accent);
      part(g, 21, -6, 3, 12, accent);
      break;
    case "rifle":
      part(g, -23, -4, 12, 8, DARK, 2);
      part(g, -1, 4, 6, 10, accent);
      part(g, -9, 4, 4, 7, DARK);
      part(g, 6, -2, 20, 4, DARK);
      part(g, -12, -5, 19, 10, MID, 2);
      part(g, -7, -8, 11, 3, LIGHT);
      break;
    default:
      part(g, -8, 3, 6, 10, DARK);
      part(g, 4, -2, 10, 4, DARK);
      part(g, -10, -4, 22, 8, MID, 2);
      part(g, -6, -6, 4, 2, accent);
  }
}
