import { Injector } from "./core/Injector.js";
import { Game } from "./game/Game.js";
import { CanvasUi } from "./ui/CanvasUi.js";

let injector;
let game;
let canvasUi;

function egg_client_init() {
  injector = new Injector();
  game = injector.get(Game);
  canvasUi = injector.get(CanvasUi);
  game.load();
  game.resume();
  return 0;
}

function egg_client_update(elapsed) {
  game.updateModel(elapsed);
}

function egg_client_render() {
  canvasUi.renderNow();
  game.inputManager.render();
}

exportModule({
  egg_client_init,
  egg_client_update,
  egg_client_render,
});
