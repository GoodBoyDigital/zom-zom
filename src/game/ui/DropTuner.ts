import {
  DROP_DEFAULTS,
  dropTuning,
  resetDropTuning,
  saveDropTuning,
} from "../pickups/dropTuning";
import type { DropTuning } from "../pickups/dropTuning";

const SLIDERS: { key: keyof DropTuning; label: string }[] = [
  { key: "pistolGunChance", label: "Gun drop · pistol only" },
  { key: "gunChance", label: "Gun drop · holding a gun" },
  { key: "powerUpChance", label: "Power-up drop" },
];

/**
 * Small DOM panel with sliders for the drop odds. Toggle with the ` key (or the corner tab).
 * Plain HTML so it works the same in the app and in the single-file embed build.
 */
export class DropTuner {
  private readonly root = document.createElement("div");
  private readonly panel = document.createElement("div");
  private readonly tab = document.createElement("button");
  private readonly rows = new Map<
    keyof DropTuning,
    { input: HTMLInputElement; value: HTMLSpanElement }
  >();

  /** `host` is the element the game canvas lives in; the panel sits in its bottom-right corner. */
  constructor(host: HTMLElement = document.body) {
    const r = this.root;
    const pos = host === document.body ? "fixed" : "absolute";
    r.style.cssText = `position:${pos};right:10px;bottom:10px;font:12px/1.3 system-ui,sans-serif;color:#e8e8e8;user-select:none;display:flex;flex-direction:column;align-items:flex-end;gap:6px;`;
    this.tab.textContent = "Drop odds ` ";
    this.tab.title = "Tune gun drop odds (` key)";
    this.tab.style.cssText =
      "background:rgba(0,0,0,.55);color:#b6ff6a;border:1px solid rgba(182,255,106,.35);border-radius:6px;padding:3px 8px;font:inherit;cursor:pointer;opacity:.6;";
    this.tab.addEventListener("click", () => this.toggle());
    this.tab.addEventListener("pointerdown", (e) => e.stopPropagation());

    const p = this.panel;
    p.style.cssText =
      "display:none;background:rgba(10,12,10,.88);border:1px solid rgba(182,255,106,.35);border-radius:8px;padding:10px 12px;min-width:240px;box-shadow:0 6px 24px rgba(0,0,0,.5);";
    const title = document.createElement("div");
    title.textContent = "DROP ODDS (per kill)";
    title.style.cssText =
      "font-weight:800;letter-spacing:.06em;color:#b6ff6a;margin-bottom:8px;";
    p.appendChild(title);

    for (const s of SLIDERS) {
      const row = document.createElement("label");
      row.style.cssText = "display:block;margin:6px 0;cursor:pointer;";
      const head = document.createElement("div");
      head.style.cssText =
        "display:flex;justify-content:space-between;gap:12px;";
      const name = document.createElement("span");
      name.textContent = s.label;
      const value = document.createElement("span");
      value.style.cssText = "font-variant-numeric:tabular-nums;color:#ffe08a;";
      head.append(name, value);
      const input = document.createElement("input");
      input.type = "range";
      input.min = "0";
      input.max = "0.5";
      input.step = "0.005";
      input.style.cssText = "width:100%;accent-color:#8ee05a;";
      input.dataset.key = s.key;
      input.addEventListener("input", () => {
        dropTuning[s.key] = Number(input.value);
        saveDropTuning();
        this.refresh();
      });
      // Arrow keys on a focused slider shouldn't also walk the player around.
      input.addEventListener("keydown", (e) => e.stopPropagation());
      row.append(head, input);
      p.appendChild(row);
      this.rows.set(s.key, { input, value });
    }

    const reset = document.createElement("button");
    reset.textContent = "Reset to defaults";
    reset.style.cssText =
      "margin-top:6px;background:none;border:1px solid #555;color:#ccc;border-radius:5px;padding:2px 8px;font:inherit;cursor:pointer;";
    reset.addEventListener("click", () => {
      resetDropTuning();
      this.refresh();
    });
    p.appendChild(reset);

    r.append(p, this.tab);
    r.addEventListener("pointerdown", (e) => e.stopPropagation());
    host.appendChild(r);
    window.addEventListener("keydown", this.onKey);
    this.refresh();
  }

  public get open() {
    return this.panel.style.display !== "none";
  }

  public toggle(force?: boolean) {
    const show = force ?? !this.open;
    this.panel.style.display = show ? "block" : "none";
    this.tab.style.opacity = show ? "1" : ".6";
  }

  public destroy() {
    window.removeEventListener("keydown", this.onKey);
    this.root.remove();
  }

  private refresh() {
    for (const [key, row] of this.rows) {
      const v = dropTuning[key];
      row.input.value = String(v);
      const pct = (v * 100).toFixed(1).replace(/\.0$/, "");
      const def = (DROP_DEFAULTS[key] * 100).toFixed(1).replace(/\.0$/, "");
      row.value.textContent = `${pct}%  (1 in ${v > 0 ? Math.round(1 / v) : "∞"})`;
      row.value.title = `default ${def}%`;
    }
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.code === "Backquote") this.toggle();
  };
}
