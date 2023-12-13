/* HeroSprite.js
 */
 
import { Sprite } from "../Sprite.js";
import { InputBtn } from "../../core/InputManager.js";
import { AnimateOnceSprite } from "./AnimateOnceSprite.js";
import { Physics } from "../Physics.js";

const JUMP_LIMIT_TIME = 0.600;
const JUMP_SPEED_MAX = 380; // px/sec
const CANNONBALL_SPEED = 100; // px/sec, but gravity does most of it.
const DEATH_COUNTDOWN_TIME = 0.500;
const DEATH_BLACKOUT_TIME = 0.500;

export class HeroSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.x = 400;
    this.y = 200;
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
    this.ph.edges = false;
    this.ph.role = "fragile";
    
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
    this.ducking = false;
    this.cannonball = false;
    this.reviveX = this.x;
    this.reviveY = this.y;
    this.deathCountdown = 0;
    this.blackout = 0;
  }
  
  collideHazard(hazard) {
    if (this.deathCountdown) return;
    this.deathCountdown = DEATH_COUNTDOWN_TIME;
    this.duckEnd();
    this.jumpAbort();
    this.actionEnd();
    this.walkEnd();
    this.srcx = 381;
    this.srcy = 1;
  }
  
  finishDeathCountdown() {
    this.blackout = DEATH_BLACKOUT_TIME;
    this.x = this.reviveX;
    this.y = this.reviveY;
    this.scene.physics.warp(this);
    //TODO sound effect
    //TODO fireworks
  }
  
  update(elapsed, inputState) {
    if (this.deathCountdown > 0) {
      if ((this.deathCountdown -= elapsed) <= 0) {
        this.deathCountdown = 0;
        this.finishDeathCountdown();
      }
      return;
    }
    if (this.blackout > 0) {
      if ((this.blackout -= elapsed) <= 0) {
        this.blackout = 0;
      } else {
        inputState = 0;
      }
    }
    if (inputState !== this.pvinput) {
      if ((inputState & InputBtn.DOWN) && !(this.pvinput & InputBtn.DOWN)) {
        this.duckBegin();
      } else if (!(inputState & InputBtn.DOWN) && (this.pvinput & InputBtn.DOWN)) {
        this.duckEnd();
      }
      switch (inputState & (InputBtn.LEFT | InputBtn.RIGHT)) {
        case InputBtn.LEFT: this.walkBegin(-1); break;
        case InputBtn.RIGHT: this.walkBegin(1); break;
        default: this.walkEnd(); break;
      }
      if ((inputState & InputBtn.JUMP) && !(this.pvinput & InputBtn.JUMP)) {
        this.jumpBegin();
      } else if (!(inputState & InputBtn.JUMP) && (this.pvinput & InputBtn.JUMP)) {
        this.jumpAbort();
      }
      if ((inputState & InputBtn.ACTION) && !(this.pvinput & InputBtn.ACTION)) {
        this.actionBegin();
      } else if (!(inputState & InputBtn.ACTION) && (this.pvinput & InputBtn.ACTION)) {
        this.actionEnd();
      }
      if ((inputState & InputBtn.UP) && !(this.pvinput & InputBtn.UP)) {
        if (this.checkDoors()) {
          this.pvinput = inputState;
          return;
        }
      }
      this.pvinput = inputState;
    }
    this.jumpUpdate(elapsed);
    this.duckUpdate(elapsed);
    this.walkUpdate(elapsed);
    this.actionUpdate(elapsed);
    this.animationUpdate(elapsed);
    this.checkEdgeDoors();
  }
  
  /* UP: If we're standing in front of a door, travel thru it and return true.
   * (caller should get out fast in the true case, carpets will have been pulled out from under us).
   **************************************************************/
   
  checkDoors() {
    const x = this.x;
    const y = this.y - 16;
    for (const door of this.scene.doors) {
      if (x < door.x) continue;
      if (y < door.y) continue;
      if (x >= door.x + door.w) continue;
      if (y >= door.y + door.h) continue;
      this.scene.load(door.dstmapid, this, door);
      return true;
    }
  }
  
  checkEdgeDoors() {
    const x = this.x;
    const y = this.y - 16;
    if (
      (x >= 0) && (x < this.scene.worldw) &&
      (y >= 0) && (y < this.scene.worldh)
    ) return;
    for (const door of this.scene.edgeDoors) {
      if (x < door.x) continue;
      if (y < door.y) continue;
      if (x >= door.x + door.w) continue;
      if (y >= door.y + door.h) continue;
      this.scene.load(door.dstmapid, this, door);
      return true;
    }
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
    if (this.scene.physics.measureFreedom(this, 0, 1, 1) >= 1) {
      this.cannonball = true;
    } else {
      this.cannonball = false;
    }
  }
  
  duckEnd() {
    this.ducking = false;
    this.cannonball = false;
    this.animClock = 0;
  }
  
  duckUpdate(elapsed) {
    if (this.ducking && this.cannonball) {
      this.y += elapsed * CANNONBALL_SPEED;
    }
  }
  
  executeCannonball() {
    console.log("CANNONBALL!!");
    //TODO check what's under us, break it, etc
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
      if (this.scene.physics.bypassOneWays(this)) {
        // Duck jumped thru oneway.
      } else {
        // Other duck jump -- should we do something?
      }
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
      if (!this.walkdx) { // standing still and grounded -- mark a revive point
        this.reviveX = this.x;
        this.reviveY = this.y;
      }
      if (!this.footState) {
        this.footState = true;
        this.footClock = 0;
        if (this.cannonball) {
          this.cannonball = false;
          this.executeCannonball();
        }
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
    //console.log(`actionBegin`);
  }
  
  actionEnd() {
    //console.log(`actionEnd`);
  }
  
  actionUpdate(elapsed) {
  }
  
  /* Render.
   *************************************************************************/
   
  render(context, dstx, dsty) {
  
    //TODO Boots need to be a whole new set of images when equipped, i think.
    //TODO Broom while in use will surely be a whole different thing.
    //TODO And all the rest.
    
    /* Most times carrying an item possessed but not currently in use, it's a second decal behind the first.
     * These are arranged in a uniform row, all the same size.
     * Don't draw it if ducking, just don't show the item.
     */
    if (!this.ducking) {
      if (this.scene.game.inventory[this.scene.game.selectedItem]) {
        let idstx = dstx, idsty = dsty + 1;
        if (this.flop) idstx += 11;
        else idstx -= 7;
        context.drawDecal(idstx, idsty, 262 + this.scene.game.selectedItem * 13, 61, 12, 26, this.flop);
      }
    }
    
    context.drawDecal(dstx, dsty, this.srcx, this.srcy, this.vw, this.vh, this.flop);
  }
}
