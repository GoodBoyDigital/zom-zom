import { Container, Graphics, Text } from "pixi.js";

import type { PowerUpDef } from "./types";

const FONT = "Arial Black, Arial, sans-serif";
const SLOT = 52;
const ICON = 34;

interface Slot {
  view: Container;
  ring: Graphics;
  label: Text;
  id: string;
}

/**
 * Screen-space power-up timers: an icon per active timed power-up with a
 * countdown ring, plus a short banner when one is picked up.
 */
export class PowerUpHud {
  public readonly view = new Container();
  private readonly ui = new Container();
  private readonly row = new Container();
  private readonly banner: Text;
  private readonly hint: Text;
  private hintTime = 0;
  private readonly slots: Slot[] = [];
  private bannerTime = 0;
  private w = 1;

  constructor() {
    this.banner = new Text({
      text: "",
      style: {
        fontFamily: FONT,
        fontSize: 40,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 7 },
        letterSpacing: 4,
      },
    });
    this.banner.anchor.set(0.5);
    this.banner.visible = false;
    this.hint = new Text({
      text: "POWER-UPS turn up around the arena: walk into them   ·   4 TNT   5 SHIELD   6 TURBO (debug)",
      style: {
        fontFamily: FONT,
        fontSize: 14,
        fill: 0x9ff8ff,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.hint.anchor.set(0.5, 1);
    this.ui.addChild(this.row, this.banner, this.hint);
    this.view.addChild(this.ui);
  }

  public reset() {
    for (const s of this.slots) s.view.destroy({ children: true });
    this.slots.length = 0;
    this.banner.visible = false;
    this.bannerTime = 0;
    this.hintTime = 0;
    this.hint.alpha = 1;
  }

  /** Same scaling rule as the main HUD so the timers sit under the health bar. */
  public resize(w: number, h: number) {
    const k = Math.max(0.55, Math.min(1.25, Math.min(w / 1280, h / 800)));
    this.ui.scale.set(k);
    this.w = w / k;
    this.row.position.set(18 + ICON / 2, 50 + ICON / 2 + 6);
    this.banner.position.set(this.w / 2, 120);
    this.hint.position.set(this.w / 2, h / k - 38);
  }

  public announce(def: PowerUpDef) {
    this.banner.text = `${def.name.toUpperCase()}!`;
    this.banner.style.fill = def.color;
    this.banner.visible = true;
    this.bannerTime = 0;
  }

  public update(
    dt: number,
    active: { def: PowerUpDef; remaining: number; duration: number }[],
  ) {
    // Hint fades out with the main control hint.
    this.hintTime += dt;
    if (this.hintTime > 10) this.hint.alpha = Math.max(0, this.hint.alpha - dt);

    // Banner: punch in, hold, fade.
    if (this.banner.visible) {
      this.bannerTime += dt;
      const t = this.bannerTime;
      const s =
        t < 0.12
          ? 0.6 + (t / 0.12) * 0.6
          : t < 0.25
            ? 1.2 - ((t - 0.12) / 0.13) * 0.2
            : 1;
      this.banner.scale.set(s);
      this.banner.alpha = t > 1.1 ? Math.max(0, 1 - (t - 1.1) / 0.4) : 1;
      if (t > 1.5) this.banner.visible = false;
    }

    // Keep one slot per active timed power-up, in activation order.
    for (let i = this.slots.length - 1; i >= 0; i--) {
      if (!active.some((a) => a.def.id === this.slots[i].id)) {
        this.slots[i].view.destroy({ children: true });
        this.slots.splice(i, 1);
      }
    }
    for (const a of active) {
      let slot = this.slots.find((s) => s.id === a.def.id);
      if (!slot) slot = this.addSlot(a.def);
      const k = Math.max(0, a.remaining / a.duration);
      const r = ICON / 2 + 4;
      slot.ring
        .clear()
        .circle(0, 0, r)
        .stroke({ width: 4, color: 0x000000, alpha: 0.55 })
        .arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k)
        .stroke({ width: 4, color: a.def.color, cap: "round" });
      slot.label.text = `${Math.ceil(a.remaining)}`;
      slot.view.alpha =
        a.remaining < 2 && Math.sin(a.remaining * 26) < 0 ? 0.45 : 1;
    }
    this.slots.forEach((s, i) => (s.view.x = i * SLOT));
  }

  private addSlot(def: PowerUpDef): Slot {
    const view = new Container();
    const ring = new Graphics();
    const icon = def.icon(new Graphics(), ICON);
    const label = new Text({
      text: "",
      style: {
        fontFamily: FONT,
        fontSize: 13,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    label.anchor.set(0.5, 0);
    label.y = ICON / 2 + 6;
    view.addChild(icon, ring, label);
    this.row.addChild(view);
    const slot = { view, ring, label, id: def.id };
    this.slots.push(slot);
    return slot;
  }
}
