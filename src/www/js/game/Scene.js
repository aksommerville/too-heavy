/* Scene.js
 * Game model, stripped of all interface concerns.
 * Should roughly correspond to one region of the world.
 * You go offscreen to the next region, that's a new Scene.
 */
 
import { Injector } from "../core/Injector.js";
import { Game } from "./Game.js";
 
export class Scene {
  static getDependencies() {
    return [Game];
  }
  constructor(game) {
    this.game = game;
  }
  
  update(elapsed, inputState) {
  }
}

export class SceneFactory {
  static getDependencies() {
    return [Injector];
  }
  constructor(injector) {
    this.injector = injector;
  }
  
  begin(sceneId) {
    const scene = this.injector.get(Scene);
    return scene;
  }
}

SceneFactory.singleton = true;
