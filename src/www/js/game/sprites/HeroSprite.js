/* HeroSprite.js
 */
 
import { Sprite } from "../Sprite.js";
import * as Input from "../../core/InputManager.js";
import { AnimateOnceSprite } from "./AnimateOnceSprite.js";

export class HeroSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.x = 100;
    this.y = 144;
    this.srcx = 305;
    this.srcy = 2;
    this.vw = 14;
    this.vh = 29;
    this.vx = this.vw >> 1; // (x,y) at bottom center of decal.
    this.vy = this.vh;
    this.pw = this.vw; // for now, physical bounds match render bounds exactly
    this.ph = this.vh;
    this.px = this.vx;
    this.py = this.vy;
    
    this.pvinput = 0;
    this.walkdx = 0; // -1,0,1
    this.walkDuration = 0; // sec, how long have we been walking this direction. Counts when not walking too.
    this.walkHistory = []; // [dx,duration] for the last few (walkdx) states. For triggering dash and such. Reverse chronological order.
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
    this.addWalkHistory();
    if (this.shouldDash(dx)) {
      this.dash(dx);
    } else {
      this.walkdx = dx;
      this.walkDuration = 0;
    }
  }
  
  walkEnd() {
    if (!this.walkdx) return;
    this.addWalkHistory();
    this.walkdx = 0;
    this.walkDuration = 0;
  }
  
  walkUpdate(elapsed) {
    if (!this.walkdx) {
      this.walkDuration += elapsed;
      return;
    }
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
  
  addWalkHistory() {
    this.walkHistory.splice(0, 0, [this.walkdx, this.walkDuration]);
    if (this.walkHistory.length > 5) this.walkHistory.splice(5, this.walkHistory.length - 5);
  }
  
  shouldDash(dx) {
    if (this.walkHistory.length < 2) return false;
    const prev = this.walkHistory[0];
    const prever = this.walkHistory[1];
    if (prev[0]) return false;
    if (prever[0] !== dx) return false;
    if (prev[1] > 0.120) return false;
    if (prever[1] > 0.120) return false;
    return true;
  }
  
  dash(dx) {
    const DASH_DISTANCE = 32;
    //TODO Confirm the new position is tenable, don't depend on generic reconciliation.
    this.x += DASH_DISTANCE * dx;
    this.walkdx = dx;
    this.walkDuration = 0;
    this.walkHistory = [];
    //TODO sound effect
    const fireworks = new AnimateOnceSprite(this.scene);
    this.scene.sprites.push(fireworks);
    if (this.flop) {
      fireworks.flop = this.flop;
      fireworks.x = ~~this.x - 40;
    } else {
      fireworks.x = ~~this.x + 7;
    }
    fireworks.y = ~~this.y - this.vh;
    fireworks.vw = 33;
    fireworks.vh = 29;
    fireworks.srcx = 346;
    fireworks.srcy = 24;
    fireworks.frameDuration = 0.040;
    fireworks.frameCount = 5;
  }
}
