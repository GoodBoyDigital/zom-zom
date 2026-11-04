import { animate } from "motion";
import { Container, Text } from "pixi.js";

import { runControls } from "../flow";
import { COLORS, formatTime, textStyle } from "../ui/theme";
import { loadBest, submitRun } from "../utils/best";

import { MenuPopup } from "./MenuPopup";

/** Shown a moment after the player dies: run stats, best score, play again or menu. */
export class GameOverPopup extends MenuPopup {
  private readonly killsText: Text;
  private readonly kills: number;
  private readonly badge?: Text;

  constructor() {
    const game = runControls()?.game;
    const kills = game?.kills ?? 0;
    const time = game?.spawner.time ?? 0;
    const shots = game?.shotsFired ?? 0;
    const hits = game?.hitsLanded ?? 0;
    const accuracy =
      shots > 0 ? Math.round((Math.min(hits, shots) / shots) * 100) : 0;
    const prevBest = loadBest();
    const isBest = submitRun({ kills, time });

    const body = new Container();
    const killsText = new Text({
      text: "0",
      style: textStyle(72, COLORS.slime, { stroke: { color: 0, width: 8 } }),
    });
    killsText.anchor.set(0.5, 0);
    const killsLabel = new Text({
      text: "ZOMBIES PUT DOWN",
      style: textStyle(14, COLORS.muted, { stroke: undefined }),
    });
    killsLabel.anchor.set(0.5, 0);
    killsLabel.y = 84;

    const row = (label: string, value: string, x: number) => {
      const v = new Text({
        text: value,
        style: textStyle(26, COLORS.text, { stroke: undefined }),
      });
      v.anchor.set(0.5, 0);
      v.position.set(x, 118);
      const l = new Text({
        text: label,
        style: textStyle(12, COLORS.muted, { stroke: undefined }),
      });
      l.anchor.set(0.5, 0);
      l.position.set(x, 152);
      body.addChild(v, l);
    };
    row("SURVIVED", formatTime(time), -120);
    row("ACCURACY", `${accuracy}%`, 0);
    row("BEST", `${Math.max(kills, prevBest.kills)}`, 120);
    body.addChild(killsText, killsLabel);

    let badge: Text | undefined;
    if (isBest && kills > 0) {
      badge = new Text({
        text: "NEW BEST!",
        style: textStyle(18, COLORS.gold, { stroke: { color: 0, width: 4 } }),
      });
      badge.anchor.set(0.5);
      badge.position.set(118, 18);
      badge.rotation = 0.22;
      body.addChild(badge);
    }

    super({
      title: "YOU GOT EATEN",
      titleColor: COLORS.blood,
      titleSize: 48,
      width: 500,
      body,
      bodyHeight: 170,
      buttons: [
        { text: "PLAY AGAIN", key: "R", primary: true, action: "restart" },
        { text: "MAIN MENU", key: "Q", action: "quit" },
      ],
      keys: { KeyR: "restart", KeyQ: "quit", Escape: "quit" },
    });
    this.label = "GameOverPopup";
    this.killsText = killsText;
    this.kills = kills;
    this.badge = badge;
  }

  public override async show() {
    void this.countUp();
    await super.show();
  }

  private async countUp() {
    const counter = { n: 0 };
    if (this.badge) this.badge.scale.set(0);
    await animate(
      counter,
      { n: this.kills },
      {
        duration: Math.min(1.2, 0.3 + this.kills / 150),
        ease: "easeOut",
        delay: 0.25,
        onUpdate: () => {
          if (!this.killsText.destroyed)
            this.killsText.text = `${Math.round(counter.n)}`;
        },
      },
    );
    if (this.killsText.destroyed) return;
    this.killsText.text = `${this.kills}`;
    if (this.badge) {
      await animate(
        this.badge.scale,
        { x: 1, y: 1 },
        { duration: 0.35, ease: "backOut" },
      );
    }
  }

  protected override onAction(action: string) {
    if (action === "restart") runControls()?.restart();
    else if (action === "quit") runControls()?.quitToTitle();
    else super.onAction(action);
  }
}
