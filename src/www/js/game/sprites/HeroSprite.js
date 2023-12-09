/* HeroSprite.js
 */
 
import { Sprite } from "../Sprite.js";
import * as Input from "../../core/InputManager.js";

export class HeroSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.x = 100;
    this.y = 144;
    this.srcx = 283;
    this.srcy = 4;
    this.vw = 14;
    this.vh = 22;
    this.vx = this.vw >> 1; // (x,y) at bottom center of decal.
    this.vy = this.vh;
    this.pw = this.vw; // for now, physical bounds match render bounds exactly
    this.ph = this.vh;
    this.px = this.vx;
    this.py = this.vy;
    
    this.pvinput = 0;
    this.walkdx = 0; // -1,0,1
    this.walkDuration = 0; // sec, how long have we been walking. Stays zero when walkdx==0.
  }
  
  update(elapsed, inputState) {
    if (inputState !== this.pvinput) {
      switch (inputState & (Input.BTN_LEFT | Input.BTN_RIGHT)) {
        case Input.BTN_LEFT: this.walkBegin(-1); break;
        case Input.BTN_RIGHT: this.walkBegin(1); break;
        default: this.walkEnd(); break;
      }
      this.pvinput = inputState;
    }
    this.walkUpdate(elapsed);
  }
  
  walkBegin(dx) {
    if (dx<0) this.flop = false;
    else this.flop = true;
    if (dx === this.walkdx) return;
    this.walkdx = dx;
    this.walkDuration = 0;
  }
  
  walkEnd() {
    this.walkdx = 0;
    this.walkDuration = 0;
  }
  
  walkUpdate(elapsed) {
    if (!this.walkdx) return;
    const WALK_SPEED_NORMAL = 150;
    const WALK_SPEED_MIN = 20;
    const RAMP_UP_TIME = 0.150;
    let walkSpeed = WALK_SPEED_NORMAL;
    if (this.walkDuration < RAMP_UP_TIME) {
      const durnorm = this.walkDuration / RAMP_UP_TIME;
      walkSpeed = WALK_SPEED_NORMAL * durnorm + WALK_SPEED_MIN * (1 - durnorm);
    }
    this.x += elapsed * walkSpeed * this.walkdx;
    this.walkDuration += elapsed;
  }
}
