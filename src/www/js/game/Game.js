/* Game.js
 * Top level of the game model.
 * Mostly responsible for loading and timing.
 */
 
import { Scene } from "./Scene.js";
import { InputManager, InputBtn } from "../core/InputManager.js";
import { DataService } from "./DataService.js";
import { PauseMenu } from "./menu/PauseMenu.js";
import { Injector } from "../core/Injector.js";
import { AudioManager } from "../core/AudioManager.js";
 
/* The ideal update timing is 16.666 ms.
 * High-frequency monitors may run considerably shorter, and we should skip frames to accomodate, instead of burning the CPU.
 * Don't let it run more than double that, and I'm thinking more like 25 ms, where we should run slow instead of jumping far in time.
 * Where the model world is concerned, time is continuous.
 */
const MINIMUM_UPDATE_TIME_MS = 12;
const MAXIMUM_UPDATE_TIME_MS = 25;
 
export class Game {
  static getDependencies() {
    return [Window, Scene, InputManager, DataService, Injector, AudioManager];
  }
  constructor(window, scene, inputManager, dataService, injector, audioManager) {
    this.window = window;
    this.scene = scene;
    this.inputManager = inputManager;
    this.dataService = dataService;
    this.injector = injector;
    this.audioManager = audioManager;
    
    this.render = () => {}; // RootUi should set.
    
    this.scene.game = this;
    this.loaded = false;
    this.loadFailure = null;
    this.paused = true;
    this.pendingAnimationFrame = null;
    this.lastFrameTime = 0;
    this.graphics = null; // Image; required if loaded.
    this.pvinput = 0;
    this.menu = null;
    this.selectedItem = 4; // 0..9. 4=bell
    this.inventory = [true, true, true, true, true, true, true, true, true]; // indexed by itemid
    this.timeFrozen = false;
    this.permanentState = {};
  }
  
  /* Returns a Promise that resolves when our content is all loaded and ready to go.
   * We will be paused at that time, and you can begin play with resume().
   */
  load() {
    if (this.loadFailure) return Promise.reject(this.loadFailure);
    if (this.loaded) return Promise.resolve();
    return this.dataService.load()
      .then(() => {
        this.graphics = this.dataService.getResourceSync("image", 1);
        this.loaded = true;
        this.paused = true;
        this.audioManager.playSong(this.dataService.getResourceSync("song", 2));
      }).catch(e => {
        this.loadFailure = e;
        throw e;
      });
  }
  
  pause() {
    if (!this.loaded) return;
    if (this.paused) return;
    this.audioManager.stop();
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
    this.audioManager.reset();
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
    
    const inputState = this.inputManager.update();
    if (inputState !== this.pvinput) {
      if ((inputState & InputBtn.PAUSE) && !(this.pvinput & InputBtn.PAUSE)) {
        this.toggleMenu();
      }
      this.pvinput = inputState;
    }
    
    if (this.menu) {
      this.menu.update(elapsed, inputState);
    } else {
      if (!this.scene.grid) {
        this.scene.load(1);
      }
      this.scene.update(elapsed, inputState);
      this.scene.sortSpritesForRender();
    }
  }
  
  toggleMenu() {
    if (this.menu) {
      this.menu.dismissing();
      this.menu = this.menu.onHold;
    } else {
      this.menu = this.injector.get(PauseMenu);
    }
  }
  
  dismissMenu(controller) {
    let parent = null;
    let menu = this.menu;
    while (menu) {
      if (menu === controller) break;
      parent = menu;
      menu = menu.onHold;
    }
    if (!menu) return;
    if (parent) {
      parent.onHold = controller.onHold;
    } else {
      this.menu = null;
    }
    controller.dismissing();
  }
  
  setPermanentState(k, v) {
    if (!k) return;
    if (this.permanentState[k] === v) return;
    this.permanentState[k] = v;
    for (const sprite of this.scene.sprites) {
      if (sprite.onPermanentState) sprite.onPermanentState(k, v);
    }
  }
}

Game.singleton = true;
