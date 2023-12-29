/* BellRevelatorSprite.js
 */
 
import { Sprite } from "../Sprite.js";

const TILESIZE = 16;

export class BellRevelatorSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.x = col * TILESIZE;
    this.y = row * TILESIZE;
    this.vw = 3 * TILESIZE;
    this.vh = 3 * TILESIZE;
    this.srcx = 365;
    this.srcy = 278;
  }
}
