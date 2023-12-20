/* FlagSprite.js
 * Shows state of a transient or permanent flag.
 * args: permanentStateKey, transientStateKey
 */
 
import { Sprite } from "../Sprite.js";

const TILESIZE = 16;

export class FlagSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.srcx = 296;
    this.srcy = 201;
    this.vw = 7;
    this.vh = 15;
    this.x = Math.floor((col + 0.5) * TILESIZE - this.vw * 0.5);
    this.y = (row + 1) * TILESIZE - this.vh;
    this.permanentStateKey = args[0] || "";
    this.transientStateKey = args[1] || "";
    this.state = false;
    this.layer = 20;
    
    if (this.permanentStateKey && this.scene.game.permanentState[this.permanentStateKey]) {
      this.setState(true);
    }
  }
  
  setState(v) {
    if (this.state === v) return;
    if (this.state = v) {
      this.srcx = 304;
      this.vw = 13;
    } else {
      this.srcx = 296;
      this.vw = 7;
    }
  }
  
  onPermanentState(k, v) {
    if (k === this.permanentStateKey) this.setState(v);
  }
  
  onTransientState(k, v) {
    if (k === this.transientStateKey) this.setState(v);
  }
}
