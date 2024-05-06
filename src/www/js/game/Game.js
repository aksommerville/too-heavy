/* Game.js
 * Top level of the game model.
 * Mostly responsible for loading and timing.
 */
 
import { Scene } from "./Scene.js";
import { InputManager, InputBtn } from "../core/InputManager.js";
import { DataService } from "./DataService.js";
import { PauseMenu } from "./menu/PauseMenu.js";
import { VictoryMenu } from "./menu/VictoryMenu.js";
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
    return [/*Window,*/ Scene, InputManager, DataService, Injector, AudioManager];
  }
  constructor(/*window,*/ scene, inputManager, dataService, injector, audioManager) {
    //this.window = window;
    this.scene = scene;
    this.inputManager = inputManager;
    this.dataService = dataService;
    this.injector = injector;
    this.audioManager = audioManager;
    
    //this.render = () => {}; // RootUi should set.
    
    this.scene.game = this;
    this.loaded = false;
    this.loadFailure = null;
    this.paused = true;
    this.pendingAnimationFrame = null;
    this.lastFrameTime = 0;
    this.graphics = null; // Image; required if loaded.
    this.resetGame();
    //if (true) this.inventory = this.inventory.map(() => false);//XXX give away all items, to test ending
  }
  
  resetGame() {
    this.playTime = 0;
    this.deathCount = 0;
    this.scene.grid = null;
    this.pvinput = 0;
    this.menu = null;
    this.selectedItem = 4; // 0..9. 4=bell
    this.inventory = [true, true, true, true, true, true, true, true, true]; // indexed by itemid
    this.timeFrozen = false;
    this.permanentState = {};
    this.itemUseCount = 0;
  }
  
  load() {
    if (this.loaded) return;
    //this.graphics = this.dataService.getResourceSync("image", 1);
    this.graphicsTexid = egg.texture_new();
    this.tilesheetTexid = egg.texture_new();
    if (egg.texture_load_image(this.graphicsTexid, 0, 1) < 0) throw new Error(`Failed to load image:0:1`);
    if (egg.texture_load_image(this.tilesheetTexid, 0, 2) < 0) throw new Error(`Failed to load image:0:2`);
    this.loaded = true;
    this.paused = true;
    this.audioManager.playSong(1);
  }
  
  pause() {
    if (!this.loaded) return;
    if (this.paused) return;
    this.audioManager.stop();
    this.paused = true;
    /*XXX
    if (this.pendingAnimationFrame) {
      this.window.cancelAnimationFrame(this.pendingAnimationFrame);
      this.pendingAnimationFrame = null;
    }
    /**/
    this.render();
  }
  
  resume() {
    if (!this.loaded) return;
    this.paused = false;
    /*XXX
    if (!this.loaded) return;
    if (!this.paused) return;
    this.audioManager.reset();
    this.paused = false;
    this.lastFrameTime = this.window.Date.now();
    this.pendingAnimationFrame = this.window.requestAnimationFrame(() => this.update());
    /**/
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
      this.playTime += elapsed;
      this.scene.update(elapsed, inputState);
      this.scene.sortSpritesForRender();
    }
  }
  
  toggleMenu() {
    if (this.menu instanceof PauseMenu) {
      this.audioManager.soundEffect("resume");
      this.menu.dismissing();
      this.menu = this.menu.onHold;
    } else if (this.menu instanceof VictoryMenu) {
      this.menu.dismissing();
      this.menu = null;
      this.resetGame();
      this.audioManager.playSong(1);
    } else {
      this.audioManager.soundEffect("pause");
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
    this.audioManager.soundEffect("resume");
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
  
  win() {
    this.scene.grid = null; // Force reload of game if the menu gets dismissed.
    this.dataService.setBestTimeIfBetter(this.playTime);
    this.menu = this.injector.get(VictoryMenu);
    this.menu.reset();
    this.audioManager.playSong(2, false);
  }
}

Game.singleton = true;
