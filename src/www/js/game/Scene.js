/* Scene.js
 * Game model, stripped of all interface concerns.
 * Should roughly correspond to one region of the world.
 * You go offscreen to the next region, that's a new Scene.
 */
 
import { Injector } from "../core/Injector.js";
import { Game } from "./Game.js";
import { Camera } from "./Camera.js";
import { Grid } from "./Grid.js";
import { Sprite } from "./Sprite.js";
import { HeroSprite } from "./sprites/HeroSprite.js";
 
export class Scene {
  static getDependencies() {
    return [Game];
  }
  constructor(game) {
    this.game = game;
    
    this.backgroundColor = "#66bbff";
    this.grid = null; // Grid
    this.sprites = []; // Sprite
    this.camera = new Camera(this);
  }
  
  update(elapsed, inputState) {
    for (const sprite of this.sprites) sprite.update?.(elapsed, inputState);
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
    scene.grid = new Grid();
    scene.sprites.push(new HeroSprite(scene));
    return scene;
  }
}

SceneFactory.singleton = true;
