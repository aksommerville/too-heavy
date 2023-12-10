/* Camera.js
 * Manages what portion of the Scene is visible. Scrolling and such.
 * Tightly coupled to one Scene.
 */
 
import { HeroSprite } from "./sprites/HeroSprite.js";
 
const TILESIZE = 16;
 
export class Camera {
  constructor(scene) {
    this.scene = scene;
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
    return bounds;
  }
}
