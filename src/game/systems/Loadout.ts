import type { WeaponDef, WeaponId } from "../defs/weapons";
import { DEFAULT_WEAPON, WEAPONS } from "../defs/weapons";

/**
 * The gun in your hands and its ammo. A picked-up gun brings a finite amount of rounds;
 * when the magazine and the reserve are both empty you drop back to the pistol,
 * which never runs dry (it still reloads).
 */
export class Loadout {
  public weapon: WeaponDef = WEAPONS[DEFAULT_WEAPON];
  /** Rounds in the magazine. */
  public mag = 0;
  /** Rounds left outside the magazine. Infinity for the pistol. */
  public reserve = 0;
  /** Seconds of reload left; 0 when not reloading. */
  public reloadLeft = 0;
  /** Fired when a gun runs completely dry and the pistol comes back out. */
  public onEmpty?: (spent: WeaponDef) => void;
  /** Fired when a reload starts. */
  public onReload?: (w: WeaponDef) => void;

  public reset() {
    this.equip(DEFAULT_WEAPON);
  }

  /** Put a gun in your hands with `rounds` of ammo (defaults to a full pickup). */
  public equip(id: WeaponId, rounds = WEAPONS[id].ammo) {
    this.weapon = WEAPONS[id];
    this.mag = Math.min(this.weapon.magazine, rounds);
    this.reserve = rounds - this.mag;
    this.reloadLeft = 0;
  }

  /** A gun pickup: the same gun tops up its reserve, a different one swaps in. */
  public pickUp(id: WeaponId) {
    const def = WEAPONS[id];
    if (def === this.weapon && def.ammo !== Infinity) {
      this.reserve += def.ammo;
      if (this.mag === 0) this.startReload();
    } else {
      this.equip(id);
    }
  }

  public get reloading() {
    return this.reloadLeft > 0;
  }

  /** 0..1 progress through the current reload. */
  public get reloadProgress() {
    return this.reloading ? 1 - this.reloadLeft / this.weapon.reloadTime : 1;
  }

  /** Total rounds left, magazine included. */
  public get rounds() {
    return this.mag + this.reserve;
  }

  public get isDefault() {
    return this.weapon.id === DEFAULT_WEAPON;
  }

  public canFire() {
    return this.mag > 0 && !this.reloading;
  }

  /** Spend one round after a trigger pull. Reloads or falls back automatically. */
  public consume() {
    this.mag--;
    if (this.mag <= 0) {
      this.mag = 0;
      if (this.reserve > 0) this.startReload();
      else this.dropToDefault();
    }
  }

  /** Manual reload (R). Ignored with a full magazine or nothing to load. */
  public startReload() {
    if (this.reloading || this.mag >= this.weapon.magazine) return;
    if (this.reserve <= 0) return;
    this.reloadLeft = this.weapon.reloadTime;
    this.onReload?.(this.weapon);
  }

  public update(dt: number) {
    if (!this.reloading) return;
    this.reloadLeft -= dt;
    if (this.reloadLeft <= 0) {
      this.reloadLeft = 0;
      const take = Math.min(this.weapon.magazine - this.mag, this.reserve);
      this.mag += take;
      this.reserve -= take;
    }
  }

  private dropToDefault() {
    const spent = this.weapon;
    this.equip(DEFAULT_WEAPON);
    this.onEmpty?.(spent);
  }
}
