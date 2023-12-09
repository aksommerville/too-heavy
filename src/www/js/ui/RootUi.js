/* RootUi.js
 * Top level of our application, aside from browser boilerplate.
 * We only glue together big pieces, shouldn't be anything interesting here.
 */
 
import { Dom } from "../core/Dom.js";
import { CanvasUi } from "./CanvasUi.js";
import { Game } from "../game/Game.js";

export class RootUi {
  static getDependencies() {
    return [HTMLElement, Dom, Window, Game];
  }
  constructor(element, dom, window, game) {
    this.element = element;
    this.dom = dom;
    this.window = window;
    this.game = game;
    
    this.canvasUi = null;
    
    this.buildUi();
    
    this.game.load().then(() => this.onLoaded()).catch(e => this.onError(e));
    
    this.element.addEventListener("click", () => this.togglePause());
  }
  
  onRemoveFromDom() {
    this.game.pause();
    this.game.render = () => {};
  }
  
  buildUi() {
    this.element.innerHTML = "";
    this.canvasUi = this.dom.spawnController(this.element, CanvasUi);
    this.dom.spawn(this.element, "DIV", ["error", "hidden"]);
  }
  
  onLoaded() {
    this.game.render = () => this.canvasUi.renderNow();
    this.canvasUi.renderNow();
    this.showError(null);
    
    // Uncomment to start the game immediately. I think it's more polite to stay paused, and force the user to click in.
    // (That might end up being a technical requirement too; WebAudio likes to see that the user has interacted with a page before starting).
    //this.game.resume();
  }
  
  onError(e) {
    this.window.console.error(e);
    this.showError(e || "An unspecified error occurred.");
  }
  
  showError(error) {
    const element = this.element.querySelector(".error");
    if (error) {
      element.innerText = this.reprError(error);
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
  }
  
  reprError(error) {
    if (error instanceof Error) return error.stack || error.toString();
    if (typeof(error) === "string") return error;
    return JSON.stringify(error, null, 2);
  }
  
  togglePause() {
    if (!this.game.loaded) return;
    if (this.game.paused) this.game.resume();
    else this.game.pause();
  }
}
