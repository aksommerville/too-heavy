/* CanvasUi.js
 * Owns the <canvas> element, and top level of responsbility for rendering.
 */
 
import { Game } from "../game/Game.js";

export class CanvasUi {
  static getDependencies() {
    return [HTMLCanvasElement, Game];
  }
  constructor(element, game) {
    this.element = element;
    this.game = game;
    
    this.element.width = 640;
    this.element.height = 360;
    this.context = this.element.getContext("2d");
  }
  
  renderNow() {
    this.context.fillStyle = "#036";
    this.context.fillRect(0, 0, this.element.width, this.element.height);
    this.context.beginPath();
    this.context.moveTo(0, 0);
    this.context.lineTo(640,360);
    this.context.moveTo(640,0);
    this.context.lineTo(0,360);
    this.context.strokeStyle = "#fff";
    this.context.stroke();
    
    if (this.game.paused) {
      this.context.fillStyle = "#000";
      this.context.globalAlpha = 0.75;
      this.context.fillRect(0, 0, this.element.width, this.element.height);
      this.context.globalAlpha = 1;
      this.context.fillStyle = "#fff";
      this.context.font = "24px sans-serif";
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.fillText("Click to resume", this.element.width >> 1, this.element.height >> 1);
    }
  }
}
