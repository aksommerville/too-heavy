/* Game.js
 * Top level of the game model.
 * Mostly responsible for loading and timing.
 */
 
import { Scene, SceneFactory } from "./Scene.js";
import { InputManager } from "../core/InputManager.js";
import { ImageService } from "../core/ImageService.js";
import { DataService } from "./DataService.js";
 
/* The ideal update timing is 16.666 ms.
 * High-frequency monitors may run considerably shorter, and we should skip frames to accomodate, instead of burning the CPU.
 * Don't let it run more than double that, and I'm thinking more like 25 ms, where we should run slow instead of jumping far in time.
 * Where the model world is concerned, time is continuous.
 */
const MINIMUM_UPDATE_TIME_MS = 12;
const MAXIMUM_UPDATE_TIME_MS = 25;
 
export class Game {
  static getDependencies() {
    return [Window, SceneFactory, InputManager, ImageService, DataService];
  }
  constructor(window, sceneFactory, inputManager, imageService, dataService) {
    this.window = window;
    this.sceneFactory = sceneFactory;
    this.inputManager = inputManager;
    this.imageService = imageService;
    this.dataService = dataService;
    
    this.render = () => {}; // RootUi should set.
    
    this.loaded = false;
    this.loadFailure = null;
    this.paused = true;
    this.pendingAnimationFrame = null;
    this.lastFrameTime = 0;
    this.scene = null;
    this.graphics = null; // Image; required if loaded.
  }
  
  /* Returns a Promise that resolves when our content is all loaded and ready to go.
   * We will be paused at that time, and you can begin play with resume().
   */
  load() {
    if (this.loadFailure) return Promise.reject(this.loadFailure);
    if (this.loaded) return Promise.resolve();
    return this.imageService.load("/data/image/1-main.png")
      .then((graphics) => this.graphics = graphics)
      .then(() => this.dataService.load())
      .then(() => {
        this.loaded = true;
        this.paused = true;
      }).catch(e => {
        this.loadFailure = e;
        throw e;
      });
  }
  
  pause() {
    if (!this.loaded) return;
    if (this.paused) return;
    this.paused = true;
    if (this.pendingAnimationFrame) {
      this.window.cancelAnimationFrame(this.pendingAnimationFrame);
      this.pendingAnimationFrame = null;
    }
    this.render();
  }
  
  resume() {
    if (!this.loaded) return;
    if (!this.paused) return;
    this.paused = false;
    this.lastFrameTime = this.window.Date.now();
    this.pendingAnimationFrame = this.window.requestAnimationFrame(() => this.update());
  }
  
  update() {
    this.pendingAnimationFrame = null;
    if (this.paused) return;
    const now = this.window.Date.now();
    let elapsedMs = now - this.lastFrameTime;
    if (elapsedMs < MINIMUM_UPDATE_TIME_MS) {
      // Updating too fast. High-frequency monitor maybe? Skip this frame.
    } else {
      if (elapsedMs > MAXIMUM_UPDATE_TIME_MS) {
        // Updating too slow. Clamp to the limit and let the game go slow-motion.
        // TODO Watch for persistent slowdown and pause the game when it happens.
        elapsedMs = MAXIMUM_UPDATE_TIME_MS;
      }
      const elapsedS = elapsedMs / 1000;
      this.updateModel(elapsedS);
      this.render();
      this.lastFrameTime = now;
    }
    this.pendingAnimationFrame = this.window.requestAnimationFrame(() => this.update());
  }
  
  updateModel(elapsed) {
    if (!this.scene) {
      this.scene = this.sceneFactory.begin(1);
    }
    const inputState = this.inputManager.update();
    this.scene.update(elapsed, inputState);
  }
}

Game.singleton = true;
