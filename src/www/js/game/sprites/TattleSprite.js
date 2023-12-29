/* TattleSprite.js
 * args: permanentStateKey
 * If multiple keys:
 *   - Any false => red
 *   - All true => green
 *   - else => gray
 */
 
import { Sprite } from "../Sprite.js";

const TILESIZE = 16;

export class TattleSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.x = col * TILESIZE;
    this.y = row * TILESIZE;
    this.vw = TILESIZE;
    this.vh = TILESIZE;
    this.layer = 20;
    this.srcx = 419; // +17=false
    this.srcy = 215; // +17=true
    this.multi = null;
    if (args.length > 1) {
      this.multi = args;
      this.onPermanentState("anything", "whatever");
    } else {
      this.permanentStateKey = args[0];
      this.onPermanentState(this.permanentStateKey, this.scene.game.permanentState[this.permanentStateKey]);
    }
  }
  
  onPermanentState(k, v) {
    if (this.multi) {
      this.srcx = 419; // +17=false
      this.srcy = 215; // +17=true
      let allTrue = true;
      for (const k of this.multi) {
        switch (this.scene.game.permanentState[k]) {
          case false: this.srcx += 17; return;
          case true: break;
          default: allTrue = false;
        }
      }
      if (allTrue) this.srcy += 17;
    } else {
      if (k !== this.permanentStateKey) return;
      this.srcx = 419; // +17=false
      this.srcy = 215; // +17=true
      switch (v) {
        case false: this.srcx += 17; break;
        case true: this.srcy += 17; break;
      }
    }
  }
}
