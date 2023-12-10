/* HeroSprite.js
 */
 
import { Sprite } from "../Sprite.js";
import * as Input from "../../core/InputManager.js";
import { AnimateOnceSprite } from "./AnimateOnceSprite.js";
import { Physics } from "../Physics.js";

const JUMP_LIMIT_TIME = 0.600;
const JUMP_SPEED_MAX = 380; // px/sec

export class HeroSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.x = 100;
    this.y = 144;
    this.srcx = 262;
    this.srcy = 1;
    this.vw = 16;
    this.vh = 29;
    this.vx = this.vw >> 1; // (x,y) at bottom center of decal.
    this.vy = this.vh;
    Physics.prepareSprite(this);
    this.ph.w = this.vw;
    this.ph.h = this.vh;
    this.ph.pleft = -this.vx;
    this.ph.ptop = -this.vy;
    this.ph.invmass = 0.5;
    this.ph.edges = true;//XXX TEMP
    
    this.pvinput = 0;
    this.walkdx = 0; // -1,0,1
    this.walkDuration = 0; // sec, how long have we been walking this direction. Counts when not walking too.
    this.walkHistory = []; // [dx,duration] for the last few (walkdx) states. For triggering dash and such. Reverse chronological order.
    this.jumping = false;
    this.jumpDuration = 0;
    this.footState = false; // True if we're on the ground.
    this.footClock = 0; // How long since footState changed.
    this.animClock = 0;
    this.animFrame = 0;
  }
  
  update(elapsed, inputState) {
    if (inputState !== this.pvinput) {
      if ((inputState & Input.BTN_DOWN) && !(this.pvinput & Input.BTN_DOWN)) {
        this.duckBegin();
      } else if (!(inputState & Input.BTN_DOWN) && (this.pvinput & Input.BTN_DOWN)) {
        this.duckEnd();
      }
      switch (inputState & (Input.BTN_LEFT | Input.BTN_RIGHT)) {
        case Input.BTN_LEFT: this.walkBegin(-1); break;
        case Input.BTN_RIGHT: this.walkBegin(1); break;
        default: this.walkEnd(); break;
      }
      if ((inputState & Input.BTN_JUMP) && !(this.pvinput & Input.BTN_JUMP)) {
        this.jumpBegin();
      } else if (!(inputState & Input.BTN_JUMP) && (this.pvinput & Input.BTN_JUMP)) {
        this.jumpAbort();
      }
      if ((inputState & Input.BTN_ACTION) && !(this.pvinput & Input.BTN_ACTION)) {
        this.actionBegin();
      } else if (!(inputState & Input.BTN_ACTION) && (this.pvinput & Input.BTN_ACTION)) {
        this.actionEnd();
      }
      this.pvinput = inputState;
    }
    this.jumpUpdate(elapsed);
    this.walkUpdate(elapsed);
    this.actionUpdate(elapsed);
    this.animationUpdate(elapsed);
  }
  
  /* Animation.
   *****************************************************************/
   
  animationUpdate(elapsed) {
    if ((this.animClock -= elapsed) > 0) return;
    
    if (this.ducking) {
      this.animClock += 0.500;
      this.srcx = 364;
    
    } else if (this.walkdx) {
      this.animClock += 0.160;
      if (++(this.animFrame) >= 4) this.animFrame = 0;
      switch (this.animFrame) {
        case 0: this.srcx = 296; break;
        case 1: this.srcx = 313; break;
        case 2: this.srcx = 330; break;
        case 3: this.srcx = 313; break;
      }
    
    } else {
      if (this.srcx === 262) {
        this.animClock = 0.200;
        this.srcx = 279;
      } else {
        this.animClock = 0.500 + Math.random() * 1.500;
        this.srcx = 262;
      }
    }
  }
  
  /* Duck.
   *******************************************************/
   
  duckBegin() {
    if (this.walkdx) {
      this.walkEnd();
    }
    this.ducking = true;
    this.animClock = 0;
  }
  
  duckEnd() {
    this.ducking = false;
    this.animClock = 0;
  }
  
  /* Walk.
   ************************************************************************/
  
  walkBegin(dx) {
    if (dx<0) this.flop = false;
    else this.flop = true;
    if (this.ducking) return;
    if (dx === this.walkdx) return;
    this.animClock = 0;
    this.animFrame = 0;
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
    this.animClock = 0;
    this.animFrame = 0;
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
  
  /* Dash.
   **************************************************************************/
  
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
    this.x += DASH_DISTANCE * dx;
    const overlaptitude = this.scene.physics.testSpritePosition(this);
    this.walkdx = dx;
    // Set walkDuration somewhat positive. Two effects: 
    //  (1) dash twice requires two strokes per dash, can't chain them.
    //  (2) no ramp-up time for walk speed after dashing.
    this.walkDuration = 0.150;
    this.walkHistory = [];
    if (overlaptitude >= 0.250) {
      this.x -= DASH_DISTANCE * dx;
      const freedom = this.scene.physics.measureFreedom(this, dx, 0, DASH_DISTANCE);
      if (freedom <= 0) {
        //TODO sound effect for dash rejection
        return;
      }
      this.x += dx * freedom;
    }
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
    fireworks.srcx = 262;
    fireworks.srcy = 31;
    fireworks.frameDuration = 0.040;
    fireworks.frameCount = 5;
  }
  
  /* Jump.
   **************************************************************************/
  
  jumpBegin() {
    if (!this.footState) {
      if (this.footClock >= 0.050) {
        return;
      }
      // Coyote time. Let her run off a cliff and jump from midair, for just a tiny fraction of a second.
      // Otherwise one feels cheated on pressing the button a frame or two too late.
    }
    if (this.ducking) {
      console.log(`Jump while ducking -- this should do something else`);
      //TODO Down one-way platforms.
      return;
    }
    this.jumpDuration = 0;
    this.jumping = true;
    //TODO sound effect
  }
  
  jumpAbort() {
    if (!this.jumping) return;
    this.jumping = false;
  }
  
  jumpUpdate(elapsed) {
    if (this.scene.physics.measureFreedom(this, 0, 1, 2) <= 0) {
      if (!this.footState) {
        this.footState = true;
        this.footClock = 0;
      } else {
        this.footClock += elapsed;
      }
    } else if (this.footState) {
      this.footState = false;
      this.footClock = 0;
    } else {
      this.footClock += elapsed;
    }
    
    if (!this.jumping) return;
    
    // Abort the jump if we hit the ground.
    if ((this.jumpDuration > 0.100) && (this.ph.y > this.ph.pvy) && (this.scene.physics.measureFreedom(this, 0, 1, 2) < 2)) {
      this.jumping = false;
      return;
    }
    
    this.jumpDuration += elapsed;
    if (this.jumpDuration >= JUMP_LIMIT_TIME) {
      this.jumping = false;
    } else {
      const speed = ((JUMP_LIMIT_TIME - this.jumpDuration) * JUMP_SPEED_MAX) / JUMP_LIMIT_TIME;
      this.y -= elapsed * speed;
    }
  }
  
  /* Actions.
   ********************************************************************************/
  
  actionBegin() {
    console.log(`actionBegin`);
  }
  
  actionEnd() {
    console.log(`actionEnd`);
  }
  
  actionUpdate(elapsed) {
  }
}
