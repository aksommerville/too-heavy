/* Camera.js
 * Manages what portion of the Scene is visible. Scrolling and such.
 * Tightly coupled to one Scene.
 */
 
import { HeroSprite } from "./sprites/HeroSprite.js";
 
const TILESIZE = 16;
const UPDATE_LIMIT = 15; // Maximum Manhattan distance change frame to frame before we force lag.
const LAG_SPEED = 8;
 
export class Camera {
  constructor(scene) {
    this.scene = scene;
    this.pvx = 0;
    this.pvy = 0;
    this.cutNext = true;
    this.lagging = false;
  }
  
  getWorldBounds() {
    const bounds = { x: 0, y: 0, w: 320, h: 160 };
    const hero = this.scene.sprites.find(s => s instanceof HeroSprite);
    if (hero) {
      bounds.x = hero.x - (bounds.w / 2);
      bounds.y = hero.y - (bounds.h / 2);
      bounds.y -= 16; // cheat up a bit; Hero's focus point is at her feet.
    }
    if (this.scene.grid) {
      const worldw = this.scene.grid.w * TILESIZE;
      const worldh = this.scene.grid.h * TILESIZE;
      if (bounds.x < 0) bounds.x = 0;
      else if (bounds.x + bounds.w > worldw) bounds.x = worldw - bounds.w;
      if (bounds.y < 0) bounds.y = 0;
      else if (bounds.y + bounds.h > worldh) bounds.y = worldh - bounds.h;
    }
    bounds.x = ~~bounds.x;
    bounds.y = ~~bounds.y;
    
    if (this.cutNext) {
      this.cutNext = false;
      this.lagging = false;
    } else if (this.lagging) {
      const dx = bounds.x - this.pvx;
      const dy = bounds.y - this.pvy;
      const dist = Math.sqrt(dx * dx + dy *dy);
      if (dist <= LAG_SPEED) {
        this.lagging = false;
      } else {
        bounds.x = Math.round(this.pvx + (dx * LAG_SPEED) / dist);
        bounds.y = Math.round(this.pvy + (dy * LAG_SPEED) / dist);
      }
    } else {
      const dx = bounds.x - this.pvx;
      const dy = bounds.y - this.pvy;
      const md = Math.abs(dx) + Math.abs(dy);
      if (md > UPDATE_LIMIT) {
        this.lagging = true;
        bounds.x = this.pvx;
        bounds.y = this.pvy;
      }
    }
    
    this.pvx = bounds.x;
    this.pvy = bounds.y;
    return bounds;
  }
}
