import { animate } from "motion";
import { Container, Graphics, Text } from "pixi.js";

import { COLORS, textStyle } from "./theme";

export interface MenuButtonOptions {
  text: string;
  /** Small key hint shown at the right edge, e.g. "ESC". */
  key?: string;
  width?: number;
  height?: number;
  primary?: boolean;
  onPress: () => void;
}

/**
 * Chunky menu button drawn with Graphics (no texture assets, so it also works in the
 * single-file embed). Hover with the mouse or focus with the keyboard to highlight it.
 */
export class MenuButton extends Container {
  public readonly onPress: () => void;
  private readonly bg = new Graphics();
  private readonly caption: Text;
  private readonly keyHint?: Text;
  private readonly w: number;
  private readonly h: number;
  private readonly primary: boolean;
  private focused = false;
  private hovered = false;
  private pressed = false;

  /** Called when the pointer starts hovering, so a list can move keyboard focus here. */
  public onHover?: () => void;

  constructor(opts: MenuButtonOptions) {
    super();
    this.w = opts.width ?? 300;
    this.h = opts.height ?? 58;
    this.primary = opts.primary ?? false;
    this.onPress = opts.onPress;

    this.caption = new Text({
      text: opts.text,
      style: textStyle(24, COLORS.text, { stroke: undefined }),
    });
    this.caption.anchor.set(0.5);
    this.addChild(this.bg, this.caption);

    if (opts.key) {
      this.keyHint = new Text({
        text: opts.key,
        style: textStyle(12, COLORS.muted, {
          stroke: undefined,
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
        }),
      });
      this.keyHint.anchor.set(1, 0.5);
      this.keyHint.x = this.w / 2 - 14;
      this.addChild(this.keyHint);
    }

    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerover", () => {
      this.hovered = true;
      this.onHover?.();
      this.redraw();
    });
    this.on("pointerout", () => {
      this.hovered = false;
      this.pressed = false;
      this.redraw();
    });
    this.on("pointerdown", (e) => {
      e.stopPropagation();
      this.pressed = true;
      this.redraw();
    });
    this.on("pointerup", () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.redraw();
      this.trigger();
    });
    this.on("pointerupoutside", () => {
      this.pressed = false;
      this.redraw();
    });
    this.redraw();
  }

  public setFocused(on: boolean) {
    if (this.focused === on) return;
    this.focused = on;
    this.redraw();
  }

  /** Activate as if clicked, with a little press bounce. */
  public trigger() {
    this.scale.set(0.94);
    void animate(
      this.scale,
      { x: [0.94, 1], y: [0.94, 1] },
      { duration: 0.25, ease: "backOut" },
    );
    this.onPress();
  }

  private redraw() {
    const lit = this.focused || this.hovered;
    const w = this.w;
    const h = this.h;
    const accent = this.primary ? COLORS.slime : 0xd8d8cf;
    const fill = lit
      ? this.primary
        ? COLORS.slime
        : 0xe8e8df
      : this.primary
        ? COLORS.slimeDark
        : 0x1b1c1a;
    this.bg
      .clear()
      // Drop shadow, then the slab.
      .roundRect(-w / 2, -h / 2 + 6, w, h, 10)
      .fill({ color: 0x000000, alpha: 0.5 })
      .roundRect(-w / 2, -h / 2, w, h, 10)
      .fill(fill)
      .stroke({ width: 3, color: accent, alpha: lit ? 1 : 0.7 });
    this.caption.style.fill = lit
      ? 0x101010
      : this.primary
        ? COLORS.slime
        : COLORS.text;
    if (this.keyHint) this.keyHint.style.fill = lit ? 0x303030 : COLORS.muted;
    this.bg.y = this.caption.y = this.pressed ? 3 : 0;
    if (this.keyHint) this.keyHint.y = this.bg.y;
    const s = lit && !this.pressed ? 1.04 : 1;
    if (!this.pressed) this.scale.set(s);
  }
}

/**
 * Vertical stack of buttons with keyboard focus: Up/Down (or W/S) move, Enter/Space press.
 * The owner forwards key events with handleKey().
 */
export class MenuList extends Container {
  public readonly buttons: MenuButton[] = [];
  private focus = -1;

  constructor(
    items: MenuButtonOptions[],
    private readonly gap = 16,
  ) {
    super();
    let y = 0;
    items.forEach((opts, i) => {
      const b = new MenuButton(opts);
      const bh = opts.height ?? 58;
      b.y = y + bh / 2;
      y += bh + this.gap;
      b.onHover = () => this.setFocus(i);
      this.buttons.push(b);
      this.addChild(b);
    });
    this.pivot.y = (y - this.gap) / 2;
  }

  public setFocus(i: number) {
    this.focus = (i + this.buttons.length) % this.buttons.length;
    this.buttons.forEach((b, j) => b.setFocused(j === this.focus));
  }

  /** Returns true if the key was used. */
  public handleKey(code: string): boolean {
    if (code === "ArrowDown" || code === "KeyS" || code === "Tab") {
      this.setFocus(this.focus < 0 ? 0 : this.focus + 1);
      return true;
    }
    if (code === "ArrowUp" || code === "KeyW") {
      this.setFocus(this.focus < 0 ? this.buttons.length - 1 : this.focus - 1);
      return true;
    }
    if ((code === "Enter" || code === "Space") && this.focus >= 0) {
      this.buttons[this.focus].trigger();
      return true;
    }
    return false;
  }
}
