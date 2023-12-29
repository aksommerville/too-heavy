/* SwitchSprite.js
 * Treadle or stompbox.
 * args: mode("treadle","stompbox","once"), transientStateKey, permanentStateKey
 * "_" as either key, same as unset.
 * "once" mode, we set the flag true only if it is null or undefined.
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
    this.timeless = true;
    this.pressState = false; // is she standing on me right now?
    this.value = false; // same as pressState for treadles; the sticky value for stompboxes.
    this.mode = args[0] || "treadle";
    this.transientStateKey = args[1] || "";
    this.permanentStateKey = args[2] || "";
    if (this.transientStateKey === "_") this.transientStateKey = "";
    if (this.permanentStateKey === "_") this.permanentStateKey = "";
    if (this.permanentStateKey) {
      this.value = this.scene.game.permanentState[this.permanentStateKey];
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
    this.sound("switchOn");
    this.srcy = 160;
    switch (this.mode) {
      case "treadle": {
          this.changeValue(true);
        } break;
      case "stompbox": {
          this.changeValue(!this.value);
        } break;
      case "once": {
          this.pressOnce();
        } break;
    }
  }
  
  onRelease() {
    this.sound("switchOff");
    this.srcy = 153;
    switch (this.mode) {
      case "treadle": {
          this.changeValue(false);
        } break;
    }
  }
  
  pressOnce() {
    this.value = true;
    if (this.transientStateKey) {
      if (typeof(this.scene.transientState[this.transientStateKey]) !== "boolean") {
        this.scene.deliverTransientState(this.transientStateKey, true);
      }
    }
    if (this.permanentStateKey) {
      if (typeof(this.scene.game.permanentState[this.permanentStateKey]) !== "boolean") {
        this.scene.game.setPermanentState(this.permanentStateKey, true);
      }
    }
  }
  
  changeValue(nv) {
    if (this.value === nv) return;
    this.value = nv;
    if (this.transientStateKey) this.scene.deliverTransientState(this.transientStateKey, this.value);
    if (this.permanentStatekey) this.scene.game.setPermanentState(this.permanentStateKey, this.value);
  }
  
  // We're normally write-only to the shared state, but we do read from it on clears (when the hero dies).
  onTransientState(k, v) {
    if (k === this.transientStateKey) {
      if (v === this.value) return;
      this.value = v;
    }
  }
}
