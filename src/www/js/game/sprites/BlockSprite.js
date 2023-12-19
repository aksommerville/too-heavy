/* BlockSprite.js
 * Static solid that can switch physics on or off, by connecting to a SwitchSprite.
 * args: transientStateKey
 */
 
import { Sprite } from "../Sprite.js";
import { Physics } from "../Physics.js";

const TILESIZE = 16;

export class BlockSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.x = col * TILESIZE;
    this.y = row * TILESIZE;
    this.srcx = 296;
    this.srcy = 168;
    this.vw = TILESIZE * 2;
    this.vh = TILESIZE * 2;
    Physics.prepareSprite(this);
    this.ph.w = this.vw;
    this.ph.h = this.vh;
    this.ph.invmass = 0;
    this.ph.gravity = false;
    this.transientStateKey = args[0] || "";
  }
  
  onTransientState(k, v) {
    if (k === this.transientStateKey) {
      if (v) {
        this.phbak = this.ph;
        this.ph = null;
        this.vwbak = this.vw;
        this.vw = 0;
      } else if (this.phbak) {
        this.ph = this.phbak;
        this.vw = this.vwbak;
      }
    }
  }
}
