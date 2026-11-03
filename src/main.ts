import { setEngine } from "./app/getEngine";
import { GameScreen } from "./app/screens/GameScreen";
import { LoadScreen } from "./app/screens/LoadScreen";
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

  await engine.navigation.showScreen(LoadScreen);
  await engine.navigation.showScreen(GameScreen);
})();
