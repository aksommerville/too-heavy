/* SwitchSprite.js
 * Treadle or stompbox.
 * args: mode("treadle","stompbox"), transientStateKey, permanentStateKey
 */
 
import { Sprite } from "../Sprite.js";

const TILESIZE = 16;

export class SwitchSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.x = col * TILESIZE;
    this.y = (row + 1) * TILESIZE - 6;
    this.srcx = 310;
    this.srcy = 153; // 153=OFF 160=ON
    this.vw = 16;
    this.vh = 6;
    this.layer = 50;
    this.pressState = false; // is she standing on me right now?
    this.value = false; // same as pressState for treadles; the sticky value for stompboxes.
    this.mode = args[0] || "treadle";
    this.transientStateKey = args[1] || "";
    this.permanentStateKey = args[2] || "";
    if (this.permanentStateKey) {
      // TODO read value from persistent store... Game or Scene?
    }
  }
  
  update(elapsed) {
    const newState = this.touchingPlayer();
    if (newState !== this.pressState) {
      if (this.pressState = newState) {
        this.onPress();
      } else {
        this.onRelease();
      }
    }
  }
  
  touchingPlayer() {
    for (const sprite of this.scene.sprites) {
      if (!sprite.ph) continue;
      if (sprite === this) continue;
      if (!sprite.ph.invmass) continue; // touch a floor or something, ignore it.
      if (sprite.ph.role === "oneway") continue;
      if (sprite.ph.role === "hazard") continue;
      if (sprite.ph.x >= this.x + this.vw) continue;
      if (sprite.ph.y >= this.y + this.vh) continue;
      if (sprite.ph.x + sprite.ph.w <= this.x) continue;
      if (sprite.ph.y + sprite.ph.h <= this.y) continue;
      return true;
    }
    return false;
  }
  
  onPress() {
    this.srcy = 160;
    switch (this.mode) {
      case "treadle": {
          this.changeValue(true);
        } break;
      case "stompbox": {
          this.changeValue(!this.value);
        } break;
    }
  }
  
  onRelease() {
    this.srcy = 153;
    switch (this.mode) {
      case "treadle": {
          this.changeValue(false);
        } break;
      case "stompbox": {
        } break;
    }
  }
  
  changeValue(nv) {
    if (this.value === nv) return;
    this.value = nv;
    if (this.transientStateKey) this.scene.deliverTransientState(this.transientStateKey, this.value);
    if (this.permanentStatekey) this.deliverPermanentState(this.permanentStateKey, this.value);
  }
  
  deliverPermanentState(k, v) {
    //TODO Toggle something in Scene or Game that persists the state.
  }
  
  // We're normally write-only to the shared state, but we do read from it on clears (when the hero dies).
  onTransientState(k, v) {
    if (k === this.transientStateKey) {
      if (v === this.value) return;
      this.value = v;
    }
  }
}
