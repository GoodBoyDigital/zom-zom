import { setFlowHost } from "./app/flow";
import { setEngine } from "./app/getEngine";
import { LoadScreen } from "./app/screens/LoadScreen";
import { TitleScreen } from "./app/screens/TitleScreen";
import { userSettings } from "./app/utils/userSettings";
import { CreationEngine } from "./engine/engine";

/**
 * Importing these modules will automatically register there plugins with the engine.
 */
import "@pixi/sound";

const engine = new CreationEngine();
setEngine(engine);

(async () => {
  await engine.init({
    background: "#0b0b0c",
    resizeOptions: { minWidth: 960, minHeight: 600, letterbox: false },
  });

  userSettings.init();
  setFlowHost({
    navigation: engine.navigation,
    renderer: engine.renderer,
    canvas: engine.canvas,
  });

  // Title -> Game, with pause and game-over menus as popups over the game.
  await engine.navigation.showScreen(LoadScreen);
  await engine.navigation.showScreen(TitleScreen);
})();
