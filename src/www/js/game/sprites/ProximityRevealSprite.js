/* ProximityRevealSprite.js
 * Covers a 4x4-tile space, and disappears when the player crosses it.
 */
 
import { Sprite } from "../Sprite.js";

const TILESIZE = 16;
 
export class ProximityRevealSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.scene = scene;
    this.collo = col;
    this.rowlo = row;
    this.colhi = col + 3;
    this.rowhi = row + 3;
    this.x = col * TILESIZE;
    this.y = row * TILESIZE;
    this.vw = 4 * TILESIZE;
    this.vh = 4 * TILESIZE;
    this.srcx = 262;
    this.srcy = 88;
    this.layer = 10;
  }
  
  update(elapsed) {
    if (this.scene.herox < this.collo) return;
    if (this.scene.herox > this.colhi) return;
    if (this.scene.heroy < this.rowlo) return;
    if (this.scene.heroy > this.rowhi) return;
    this.scene.removeSprite(this);
  }
}
