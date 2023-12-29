/* ProximityRevealSprite.js
 * Covers a 4x4-tile space, and disappears when the player crosses it.
 * args: permanentStateKey
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
    this.timeless = true;
    this.permanentStateKey = args[0];
    this.removeMeSoon = false; // so we don't have to self-remove during onPermanentState; that causes others to miss events
    if (this.permanentStateKey && (this.scene.game.permanentState[this.permanentStateKey] === true)) {
      this.removeMeSoon = true;
      this.render = () => {}; // we might not remove in time for the first render
    }
  }
  
  update(elapsed) {
    if (this.removeMeSoon) {
      this.scene.removeSprite(this);
      return;
    }
    if (this.permanentStateKey && (this.scene.game.permanentState[this.permanentStateKey] === false)) {
      return;
    }
    if (this.scene.herocol < this.collo) return;
    if (this.scene.herocol > this.colhi) return;
    if (this.scene.herorow < this.rowlo) return;
    if (this.scene.herorow > this.rowhi) return;
    if (this.permanentStateKey) {
      this.scene.game.setPermanentState(this.permanentStateKey, true);
    }
    this.scene.removeSprite(this);
  }
  
  onPermanentState(k, v) {
    if (k !== this.permanentStateKey) return;
    if (v === true) {
      this.removeMeSoon = true;
    }
  }
}
