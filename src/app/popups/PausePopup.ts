import { runControls } from "../flow";

import { MenuPopup } from "./MenuPopup";

/** Pause menu: resume, restart or go back to the title. Esc / P toggles it. */
export class PausePopup extends MenuPopup {
  constructor() {
    super({
      title: "PAUSED",
      buttons: [
        { text: "RESUME", key: "ESC", primary: true, action: "close" },
        { text: "RESTART", key: "R", action: "restart" },
        { text: "MAIN MENU", key: "Q", action: "quit" },
      ],
      keys: {
        Escape: "close",
        KeyP: "close",
        KeyR: "restart",
        KeyQ: "quit",
      },
    });
    this.label = "PausePopup";
  }

  protected override onAction(action: string) {
    if (action === "restart") runControls()?.restart();
    else if (action === "quit") runControls()?.quitToTitle();
    else super.onAction(action);
  }
}
