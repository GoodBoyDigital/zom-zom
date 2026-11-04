import { animate } from "motion";
import { Container, Graphics, Text } from "pixi.js";

import { flow } from "../flow";
import { MenuList } from "../ui/MenuButton";
import { COLORS, textStyle, uiScale } from "../ui/theme";

export interface MenuPopupOptions {
  title: string;
  titleColor?: number;
  /** Extra content between the title and the buttons (stats etc.), centred on x = 0. */
  body?: Container;
  bodyHeight?: number;
  width?: number;
  buttons: MenuItem[];
  titleSize?: number;
  /** Shortcut keys (KeyboardEvent.code) mapped to button actions. */
  keys?: Record<string, string>;
}

export interface MenuItem {
  text: string;
  /** Action id passed to onAction(). */
  action: string;
  /** Key hint shown on the button. */
  key?: string;
  primary?: boolean;
}

/**
 * Base for the in-game menus: dims the game, drops a panel in from the top and
 * routes keys. Subclasses add shortcut keys with onKey(). Works with the template's
 * Navigation popups (prepare / resize / show / hide / reset).
 */
export class MenuPopup extends Container {
  protected readonly dim = new Graphics();
  protected readonly panel = new Container();
  protected readonly menu: MenuList;
  private closing = false;
  private readonly keys: Record<string, string>;

  constructor(opts: MenuPopupOptions) {
    super();
    const width = opts.width ?? 420;
    const bodyH = opts.body ? (opts.bodyHeight ?? opts.body.height) + 24 : 0;

    this.dim.eventMode = "static";
    this.addChild(this.dim, this.panel);

    const title = new Text({
      text: opts.title,
      style: textStyle(opts.titleSize ?? 54, opts.titleColor ?? COLORS.slime, {
        stroke: { color: 0x000000, width: 8 },
        dropShadow: {
          color: 0x000000,
          alpha: 0.6,
          distance: 5,
          blur: 0,
          angle: Math.PI / 2,
        },
      }),
    });
    title.anchor.set(0.5, 0);

    this.keys = opts.keys ?? {};
    this.menu = new MenuList(
      opts.buttons.map((b) => ({
        text: b.text,
        key: b.key,
        primary: b.primary,
        onPress: () => this.act(b.action),
      })),
      14,
    );
    const menuH = opts.buttons.length * 58 + 14 * (opts.buttons.length - 1);

    const pad = 34;
    const titleH = 70;
    const height = pad + titleH + 18 + bodyH + menuH + pad;
    const top = -height / 2;

    const box = new Graphics()
      .roundRect(-width / 2 + 8, top + 12, width, height, 18)
      .fill({ color: 0x000000, alpha: 0.55 })
      .roundRect(-width / 2, top, width, height, 18)
      .fill({ color: COLORS.panel, alpha: 0.96 })
      .stroke({ width: 3, color: opts.titleColor ?? COLORS.slime, alpha: 0.5 });
    this.panel.addChild(box, title);

    title.y = top + pad - 6;
    let y = top + pad + titleH + 18;
    if (opts.body) {
      opts.body.y = y;
      this.panel.addChild(opts.body);
      y += bodyH;
    }
    this.menu.y = y + menuH / 2;
    this.panel.addChild(this.menu);
    this.menu.setFocus(0);
  }

  public prepare() {
    window.addEventListener("keydown", this.handleKey);
  }

  /** Called by Navigation after the popup was hidden and removed. */
  public reset() {
    window.removeEventListener("keydown", this.handleKey);
    this.destroy({ children: true });
  }

  public resize(width: number, height: number) {
    this.dim.clear().rect(0, 0, width, height).fill(0x000000);
    this.panel.position.set(width / 2, height / 2);
    this.panel.scale.set(uiScale(width, height));
  }

  public async show() {
    this.dim.alpha = 0;
    this.panel.pivot.y = 500;
    this.panel.alpha = 0;
    void animate(this.dim, { alpha: 0.55 }, { duration: 0.2, ease: "linear" });
    void animate(this.panel, { alpha: 1 }, { duration: 0.15 });
    await animate(
      this.panel.pivot,
      { y: 0 },
      { duration: 0.35, ease: "backOut" },
    );
  }

  public async hide() {
    void animate(this.dim, { alpha: 0 }, { duration: 0.2, ease: "linear" });
    void animate(this.panel, { alpha: 0 }, { duration: 0.2, delay: 0.05 });
    await animate(
      this.panel.pivot,
      { y: -400 },
      { duration: 0.25, ease: "backIn" },
    );
  }

  /** Run one action (resume, restart, quit). Every action closes the menu, so later presses are ignored. */
  protected act(action: string) {
    if (this.closing) return;
    this.closing = true;
    this.onAction(action);
  }

  /** Subclasses map action ids to what they do. "close" just dismisses the popup. */
  protected onAction(action: string) {
    if (action === "close") void flow().navigation.dismissPopup();
  }

  private handleKey = (e: KeyboardEvent) => {
    if (this.closing || e.repeat) return;
    const action = this.keys[e.code];
    if (action) {
      e.preventDefault();
      this.act(action);
    } else if (this.menu.handleKey(e.code)) {
      e.preventDefault();
    }
  };
}
