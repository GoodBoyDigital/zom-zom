/**
 * Drop odds, tweakable live from the drop-odds panel (` key) and kept in localStorage
 * so a tuned value survives reloads.
 */
export interface DropTuning {
  /** Chance a kill drops a gun while you already hold a picked-up gun. */
  gunChance: number;
  /** Chance a kill drops a gun while you only have the pistol. */
  pistolGunChance: number;
}

export const DROP_DEFAULTS: DropTuning = {
  gunChance: 0.03,
  pistolGunChance: 0.1,
};

const KEY = "zom-zoms.drop-tuning";

export const dropTuning: DropTuning = { ...DROP_DEFAULTS, ...load() };

function load(): Partial<DropTuning> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Partial<DropTuning>;
    const out: Partial<DropTuning> = {};
    for (const k of Object.keys(DROP_DEFAULTS) as (keyof DropTuning)[]) {
      const v = data[k];
      if (typeof v === "number" && v >= 0 && v <= 1) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveDropTuning() {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(dropTuning));
  } catch {
    // Storage can be blocked (private mode, sandboxed embeds); tuning still works for this run.
  }
}

export function resetDropTuning() {
  Object.assign(dropTuning, DROP_DEFAULTS);
  saveDropTuning();
}
