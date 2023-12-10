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
import { Physics } from "./Physics.js";
import { DataService } from "./DataService.js";

const TILESIZE = 16;
 
export class Scene {
  static getDependencies() {
    return [Game, Physics, DataService];
  }
  constructor(game, physics, dataService) {
    this.game = game;
    this.physics = physics;
    this.dataService = dataService;
    
    this.physics.scene = this;
    
    this.backgroundColor = "#66bbff";
    this.grid = null; // Grid
    this.sprites = []; // Sprite
    this.camera = new Camera(this);
  }
  
  update(elapsed, inputState) {
    for (const sprite of this.sprites) sprite.update?.(elapsed, inputState);
    this.physics.update(elapsed);
  }
  
  removeSprite(sprite) {
    const p = this.sprites.indexOf(sprite);
    if (p < 0) return;
    this.sprites.splice(p, 1);
  }
}

export class SceneFactory {
  static getDependencies() {
    return [Injector, DataService];
  }
  constructor(injector, dataService) {
    this.injector = injector;
    this.dataService = dataService;
  }
  
  begin(sceneId) {
    const scene = this.injector.get(Scene);
    if (!(scene.grid = this.dataService.getResourceSync("map", 1))) throw new Error(`Failed to load map:1`);
    scene.sprites.push(new HeroSprite(scene));
    for (const sprite of scene.grid.generateStaticSprites(scene)) {
      scene.sprites.push(sprite);
    }
    scene.worldw = scene.grid.w * TILESIZE;
    scene.worldh = scene.grid.h * TILESIZE;
    return scene;
  }
}

SceneFactory.singleton = true;
