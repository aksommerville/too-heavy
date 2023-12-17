/* HeroSprite.js
 */
 
import { Sprite } from "../Sprite.js";
import { InputBtn } from "../../core/InputManager.js";
import { Physics } from "../Physics.js";
import { AnimateOnceSprite } from "./AnimateOnceSprite.js";
import { SelfieSprite } from "./SelfieSprite.js";
import { GrappleSprite } from "./GrappleSprite.js";
import { RaftSprite } from "./RaftSprite.js";

const JUMP_LIMIT_TIME = [0.300, 0.390, 0.450]; // s, indexed by jumpSequence
const JUMP_SPEED_MAX = [380, 410, 450]; // px/sec, ''
const CANNONBALL_SPEED = 100; // px/sec, but gravity does most of it.
const CANNONBALL_MINIMUM_DISTANCE = 33; // pixels
const DEATH_COUNTDOWN_TIME = 0.500;
const DEATH_BLACKOUT_TIME = 0.500;
const WALK_RESIDUAL_DECAY = 1000; // px/sec**2
const TRIPLE_JUMP_FOOT_TIME = 0.100;
const LONG_JUMP_VELOCITY_X = 250;
const LONG_JUMP_VELOCITY_Y = -100;
const LONG_JUMP_DECAY_X = 190;
const LONG_JUMP_DECAY_Y = 200;
const WALL_JUMP_VELOCITY_X = 400;
const WALL_JUMP_VELOCITY_Y = -150;
const WALL_JUMP_DECAY_X = 900;
const WALL_JUMP_DECAY_Y = 300;
const WALL_SLIDE_COVERAGE_MINIMUM = 0.750; // no wall slide if it's just your head or foot against the wall
const WALL_SLIDE_FORCE_GRAVITY = 50; // px/sec, keep it under this (mind that physics will accelerate it one frame each time)
const BROOM_ELEVATION_LIMIT = 16 * 6;
const BROOM_UP_VELOCITY = -100;
const BROOM_DOWN_VELOCITY = 200;
const UMBRELLA_GRAVITY = 40; // px/sec, no acceleration
const VACUUM_DISTANCE_LIMIT = 120; // pixels
const BOOTS_VELOCITY = 400;

const ITEM_STOPWATCH = 0;
const ITEM_BROOM = 1;
const ITEM_CAMERA = 2;
const ITEM_VACUUM = 3;
const ITEM_BELL = 4;
const ITEM_UMBRELLA = 5;
const ITEM_BOOTS = 6;
const ITEM_GRAPPLE = 7;
const ITEM_RAFT = 8;

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
    this.layer = 100;
    
    this.pvinput = 0;
    this.walkdx = 0; // -1,0,1
    this.walkresidualdx = 0; // -1,0,1
    this.walkresidual = 0; // px/sec
    this.walkDuration = 0; // sec, how long have we been walking this direction. Counts when not walking too.
    this.walkHistory = []; // [dx,duration] for the last few (walkdx) states. For triggering dash and such. Reverse chronological order.
    this.wallSlide = 0; // -1,0,1
    this.jumping = false;
    this.jumpDuration = 0; // For one dimensional jumps (regular and triple).
    this.jumpSequence = 0; // 0,1,2=first,second,third for triple-jump
    this.jumpSequencePoison = false; // if true, the next jump must be seq 0. (dx changed, or anything else that forces break in triple-jump)
    this.jump2dv = [0, 0];
    this.jump2decay = [0, 0];
    this.footState = false; // True if we're on the ground.
    this.footClock = 0; // How long since footState changed.
    this.animTime = 0; // Duration of next frame.
    this.animClock = 0; // Counts down to zero, then adds animTime and increments animFrame.
    this.animFrame = 0; // Incremented during update, used and reset during render.
    this.ducking = false;
    this.cannonball = false;
    this.cannonballStartY = 0;
    this.reviveX = this.x;
    this.reviveY = this.y;
    this.deathCountdown = 0;
    this.blackout = 0;
    this.itemInProgress = -1;
    this.vacuumDx = 0;
    this.vacuumDy = 0;
    this.dustBunnies = []; // Decoration while vacuuming. [srcx,x,y,dx,dy,ttl] (x,y) relative to sprite
  }
  
  collideHazard(hazard) {
    if (this.deathCountdown) return;
    //TODO Don't do a death face. Explode immediately.
    this.deathCountdown = DEATH_COUNTDOWN_TIME;
    this.duckEnd();
    this.jumpAbort();
    this.actionEnd();
    this.walkEnd();
    this.resetAnimation();
  }
  
  finishDeathCountdown() {
    this.blackout = DEATH_BLACKOUT_TIME;
    this.x = this.reviveX;
    this.y = this.reviveY;
    this.walkresidual = 0;
    this.resetAnimation();
    this.scene.physics.warp(this);
    //TODO sound effect
    //TODO fireworks
  }
  
  reportLocationToScene() {
    this.scene.herox = this.x;
    this.scene.heroy = this.y - 12; // not sure why i put her focus point at the feet...
    this.scene.herox = Math.floor(this.scene.herox / 16);
    this.scene.heroy = Math.floor(this.scene.heroy / 16);
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
        inputState = this.actionEnd();
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
    this.reportLocationToScene();
  }
  
  /* UP: If we're standing in front of a door, travel thru it and return true.
   * (caller should get out fast in the true case, carpets will have been pulled out from under us).
   **************************************************************/
   
  checkDoors() {
    if (this.itemInProgress === ITEM_BROOM) return false;
    const x = this.x;
    const y = this.y - 16;
    for (const door of this.scene.doors) {
      if (x < door.x) continue;
      if (y < door.y) continue;
      if (x >= door.x + door.w) continue;
      if (y >= door.y + door.h) continue;
      this.scene.load(door.dstmapid, this, door);
      this.adjustForNewMap();
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
      this.adjustForNewMap();
      return true;
    }
  }
  
  adjustForNewMap() {
    this.reviveX = this.x;
    this.reviveY = this.y;
  }
  
  /* Animation. Dumb counter, during updates.
   * Actual face selection happens at render.
   *****************************************************************/
   
  animationUpdate(elapsed) {
    if (this.animTime > 0) {
      this.animClock -= elapsed;
      if (this.animClock <= 0) {
        this.animClock += this.animTime;
        this.animFrame++;
      }
    }
  }
  
  resetAnimation() {
    this.animClock = 0;
    this.animTime = 0;
    this.animFrame = 999;
  }
  
  /* Duck.
   *******************************************************/
   
  duckBegin() {
    if (this.itemInProgress === ITEM_BROOM) return;
    if (this.itemInProgress === ITEM_BOOTS) return;
    if (this.itemInProgress === ITEM_GRAPPLE) return;
    this.jumpSequencePoison = true;
    if (this.walkdx) {
      this.walkEnd();
    }
    this.ducking = true;
    this.resetAnimation();
    if (this.scene.physics.measureFreedom(this, 0, 1, 1) >= 1) {
      this.cannonball = true;
      this.cannonballStartY = this.y;
    } else {
      this.cannonball = false;
    }
  }
  
  duckEnd() {
    this.jumpSequencePoison = true;
    this.ducking = false;
    this.cannonball = false;
    this.resetAnimation();
  }
  
  duckUpdate(elapsed) {
    if (this.ducking && this.cannonball) {
      this.y += elapsed * CANNONBALL_SPEED;
    }
  }
  
  executeCannonball() {
    const distance = this.y - this.cannonballStartY;
    this.cannonballStartY = this.y;
    if (distance < CANNONBALL_MINIMUM_DISTANCE) {
      // Not far enough. No negative feedback or anything. Could be an accidental press of down, ignore it.
      return;
    }
    //TODO sound effect
    //TODO visual feedback, can we shake the camera?
    for (const other of this.scene.physics.findFloorSprites(this)) {
      if (typeof(other.onCannonball) === "function") {
        other.onCannonball(this, distance);
      }
    }
  }
  
  /* Walk.
   ************************************************************************/
  
  walkBegin(dx) {
    if (this.itemInProgress === ITEM_VACUUM) return;
    if (this.itemInProgress === ITEM_BOOTS) return;
    if (dx<0) this.flop = false;
    else this.flop = true;
    if (this.ducking) return;
    if (dx === this.walkdx) return;
    this.jumpSequencePoison = true;
    this.resetAnimation();
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
    this.jumpSequencePoison = true;
    this.resetAnimation();
    this.addWalkHistory();
    this.walkdx = 0;
    this.walkDuration = 0;
  }
  
  walkUpdate(elapsed) {
  
    let pvwallSlide = this.wallSlide;
    this.wallSlide = 0; // until proven otherwise -- see end of function
  
    if (!this.walkdx && (this.walkresidual > 0)) {
      if ((this.walkresidual -= WALK_RESIDUAL_DECAY * elapsed) <= 0) {
        this.walkresidual = 0;
      }
      this.x += this.walkresidual * elapsed * this.walkresidualdx;
    }
  
    if (!this.walkdx) {
      this.walkDuration += elapsed;
      return;
    }
    const WALK_SPEED_NORMAL = 150;//XXX move constants to top
    const WALK_SPEED_MIN = 20;
    const RAMP_UP_TIME = 0.150;
    let walkSpeed = WALK_SPEED_NORMAL;
    if (this.walkDuration < RAMP_UP_TIME) {
      const durnorm = this.walkDuration / RAMP_UP_TIME;
      walkSpeed = WALK_SPEED_NORMAL * durnorm + WALK_SPEED_MIN * (1 - durnorm);
    }
    this.x += elapsed * walkSpeed * this.walkdx;
    this.walkDuration += elapsed;
    
    if (!this.walkresidual) {
      this.walkresidualdx = this.walkdx;
    }
    if ((this.walkdx == this.walkresidualdx) && (this.walkresidual < walkSpeed)) {
      this.walkresidual = walkSpeed;
    }
    if (this.walkdx !== this.walkresidualdx) {
      this.walkresidual = 0;
    }
    
    if (!this.footState) {
      if ((this.walkdx < 0) && (this.scene.physics.measureFreedom(this, -1, 0, 2) < 2)) {
        this.x -= this.ph.w;
        const coverage = this.scene.physics.testSpritePosition(this);
        this.x += this.ph.w;
        if (coverage >= WALL_SLIDE_COVERAGE_MINIMUM) {
          this.wallSlide = -1;
        }
      } else if ((this.walkdx > 0) && (this.scene.physics.measureFreedom(this, 1, 0, 2) < 2)) {
        this.x += this.ph.w;
        const coverage = this.scene.physics.testSpritePosition(this);
        this.x -= this.ph.w;
        if (coverage >= WALL_SLIDE_COVERAGE_MINIMUM) {
          this.wallSlide = 1;
        }
      }
      if (this.wallSlide !== pvwallSlide) {
        this.resetAnimation();
      }
      if (this.wallSlide) {
        if (this.ph.gravityRate > WALL_SLIDE_FORCE_GRAVITY) {
          this.ph.gravityRate = WALL_SLIDE_FORCE_GRAVITY;
        }
      }
    }
  }
  
  addWalkHistory() {
    this.walkHistory.splice(0, 0, [this.walkdx, this.walkDuration]);
    if (this.walkHistory.length > 5) this.walkHistory.splice(5, this.walkHistory.length - 5);
  }
  
  /* Dash.
   **************************************************************************/
  
  shouldDash(dx) {
    if (this.itemInProgress === ITEM_BROOM) return false;
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
  
    if (this.itemInProgress === ITEM_BROOM) return;
    if (this.itemInProgress === ITEM_VACUUM) return;
    if (this.itemInProgress === ITEM_BOOTS) return;
  
    if (this.wallSlide) {
      return this.beginWallJump(-this.wallSlide);
    }
  
    if (!this.footState) {
      if (this.footClock >= 0.050) {
        return;
      }
      // Coyote time. Let her run off a cliff and jump from midair, for just a tiny fraction of a second.
      // Otherwise one feels cheated on pressing the button a frame or two too late.
    }
    if (this.pvinput & InputBtn.DOWN) { // DOWN button, not (this.ducking) -- these should still work when we have a duck-resistant item in play, eg grapple
      if ((this.pvinput & (InputBtn.LEFT | InputBtn.RIGHT)) === InputBtn.LEFT) {
        this.beginLongJump(-1);
      } else if ((this.pvinput & (InputBtn.LEFT | InputBtn.RIGHT)) === InputBtn.RIGHT) {
        this.beginLongJump(1);
      } else if (this.scene.physics.bypassOneWays(this)) {
        // Duck jumped thru oneway.
      } else {
        // Other duck jump -- should we do something?
      }
      return;
    }
    
    if (this.jumpSequencePoison) {
      this.jumpSequence = 0;
      this.jumpSequencePoison = false;
    } else if (this.footClock <= TRIPLE_JUMP_FOOT_TIME) {
      this.jumpSequence++;
      if (this.jumpSequence >= 3) this.jumpSequence = 0;
    } else {
      this.jumpSequence = 0;
    }
    
    this.jumpDuration = 0;
    this.jumping = true;
    this.ph.gravity = false;
    this.jump2dv[0] = 0;
    this.jump2dv[1] = 0;
    this.resetAnimation();
    //TODO sound effect -- different per jumpSequence. Plus some visual feedback for jumpSequence 1 and 2.
  }
  
  beginWallJump(dx) {
    this.jump2dv[0] = dx * WALL_JUMP_VELOCITY_X;
    this.jump2dv[1] = WALL_JUMP_VELOCITY_Y;
    this.jump2decay[0] = WALL_JUMP_DECAY_X;
    this.jump2decay[1] = WALL_JUMP_DECAY_Y;
    this.jumping = true;
    this.ph.gravity = false;
    this.jumpDuration = 0;
    this.wallSlide = 0;
    this.ducking = false;
    this.walkdx = 0;
    this.jumpSequencePoison = false;
    this.jumpSequence = 0;
    this.resetAnimation();
    //TODO sound effect
  }
  
  beginLongJump(dx) {
    this.jump2dv[0] = dx * LONG_JUMP_VELOCITY_X;
    this.jump2dv[1] = LONG_JUMP_VELOCITY_Y;
    this.jump2decay[0] = LONG_JUMP_DECAY_X;
    this.jump2decay[1] = LONG_JUMP_DECAY_Y;
    this.jumping = true;
    this.ph.gravity = false;
    this.jumpDuration = 0;
    this.duckEnd();
    this.jumpSequencePoison = false; // duckEnd sets it true, but it should be false -- you can double-jump off a long-jump
    this.jumpSequence = 0;
    this.resetAnimation();
    //TODO sound effect
  }
  
  jumpAbort() {
    if (!this.jumping) return;
    this.jumping = false;
    this.ph.gravity = true;
    this.resetAnimation();
  }
  
  jumpUpdate(elapsed) {
    if (this.itemInProgress === ITEM_BROOM) return;
    if (this.scene.physics.measureFreedom(this, 0, 1, 2) <= 0) {
      if (!this.walkdx && !this.walkresidual && !this.scene.spawnAtEntranceOnly) { // standing still and grounded -- mark a revive point
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
      if (!this.jumping) { // footState goes false but not jumping -- walked off a cliff
        this.jumpSequencePoison = true;
      }
    } else {
      this.footClock += elapsed;
    }
    
    if (!this.jumping) return;
    
    // Abort the jump if we hit the ground.
    if ((this.jumpDuration > 0.100) && (this.ph.y > this.ph.pvy) && (this.scene.physics.measureFreedom(this, 0, 1, 2) < 2)) {
      this.jumping = false;
      this.ph.gravity = true;
      this.resetAnimation();
      return;
    }
    
    // Two-dimensional jumps.
    if (this.jump2dv[0] || this.jump2dv[1]) {
      if (this.jump2dv[0] < 0) {
        if ((this.jump2dv[0] += this.jump2decay[0] * elapsed) >= 0) {
          this.jump2dv[0] = 0;
        }
      } else if (this.jump2dv[0] > 0) {
        if ((this.jump2dv[0] -= this.jump2decay[0] * elapsed) <= 0) {
          this.jump2dv[0] = 0;
        }
      }
      if ((this.jump2dv[1] += this.jump2decay[1] * elapsed) >= 0) {
        this.jumping = false;
        this.ph.gravity = true;
        if (this.jump2dv[0] < 0) {
          this.walkresidualdx = -1;
          this.walkresidual = -this.jump2dv[0];
        } else if (this.jump2dv[0] > 0) {
          this.walkresidualdx = 1;
          this.walkresidual = this.jump2dv[0];
        }
        return;
      }
      this.x += this.jump2dv[0] * elapsed;
      this.y += this.jump2dv[1] * elapsed;
      return;
    }
    
    // One-dimensional jumps.
    const limitTime = JUMP_LIMIT_TIME[this.jumpSequence];
    const speedMax = JUMP_SPEED_MAX[this.jumpSequence];
    this.jumpDuration += elapsed;
    if (this.jumpDuration >= limitTime) {
      this.jumping = false;
      this.ph.gravity = true;
      this.resetAnimation();
    } else {
      const speed = ((limitTime - this.jumpDuration) * speedMax) / limitTime;
      this.y -= elapsed * speed;
    }
  }
  
  /* Actions.
   ********************************************************************************/
  
  actionBegin() {
    if (!this.scene.game.inventory[this.scene.game.selectedItem]) {
      return;
    }
    switch (this.scene.game.selectedItem) {
      case ITEM_STOPWATCH: this.stopwatchBegin(); break;
      case ITEM_BROOM: this.broomBegin(); break;
      case ITEM_CAMERA: this.cameraBegin(); break;
      case ITEM_VACUUM: this.vacuumBegin(); break;
      case ITEM_BELL: this.bellBegin(); break;
      case ITEM_UMBRELLA: this.umbrellaBegin(); break;
      case ITEM_BOOTS: this.bootsBegin(); break;
      case ITEM_GRAPPLE: this.grappleBegin(); break;
      case ITEM_RAFT: this.raftBegin(); break;
    }
  }
  
  // Returns mangled inputState. A silly hack so item terminators can make us pretend the dpad was off, and re-notice it next update.
  actionEnd(inputState) {
    switch (this.itemInProgress) {
      case ITEM_STOPWATCH: this.stopwatchEnd(); break;
      case ITEM_BROOM: this.broomEnd(); break;
      case ITEM_VACUUM: return this.vacuumEnd(inputState);
      case ITEM_UMBRELLA: this.umbrellaEnd(); break;
      case ITEM_BOOTS: this.bootsEnd(); break;
      case ITEM_GRAPPLE: return this.grappleEnd(inputState);
    }
    return inputState;
  }
  
  actionUpdate(elapsed) {
    switch (this.itemInProgress) {
      case ITEM_BROOM: this.broomUpdate(elapsed); break;
      case ITEM_VACUUM: this.vacuumUpdate(elapsed); break;
      case ITEM_UMBRELLA: this.umbrellaUpdate(elapsed); break;
      case ITEM_BOOTS: this.bootsUpdate(elapsed); break;
      case ITEM_GRAPPLE: this.grappleUpdate(elapsed); break;
    }
  }
  
  /* Stopwatch. Freeze time while held.
   **************************************************************************/
   
  stopwatchBegin() {
    this.scene.game.timeFrozen = true;
    this.itemInProgress = 0;
    //TODO sound effect
  }
  
  stopwatchEnd() {
    this.scene.game.timeFrozen = false;
    this.itemInProgress = -1;
    //TODO sound effect
  }
  
  /* Broom.
   *************************************************************************/
   
  broomBegin() {
    this.itemInProgress = ITEM_BROOM;
    this.ducking = false;
    this.jumping = false;
  }
  
  broomEnd() {
    this.itemInProgress = -1;
    this.ph.gravity = true;
    this.ph.gravityRate = 0;
  }
  
  broomUpdate(elapsed) {
    const footRoom = this.scene.physics.measureFreedom(this, 0, 1, BROOM_ELEVATION_LIMIT);
    if (footRoom >= BROOM_ELEVATION_LIMIT) {
      if (!this.ph.gravity) {
        this.ph.gravity = true;
        this.ph.gravityRate = 0;
      }
    } else {
      if (this.ph.gravity) {
        this.ph.gravity = false;
      }
    }
    
    switch (this.pvinput & (InputBtn.UP | InputBtn.DOWN)) {
      case InputBtn.UP: this.y += BROOM_UP_VELOCITY * elapsed; break;
      case InputBtn.DOWN: this.y += BROOM_DOWN_VELOCITY * elapsed; break;
    }
  }
  
  /* Camera.
   **********************************************************************/
   
  cameraBegin() {
    let selfie = this.scene.sprites.find(s => s instanceof SelfieSprite);
    if (selfie) {
      this.x = selfie.x;
      this.y = selfie.y;
      this.scene.physics.warp(this);
      this.scene.removeSprite(selfie);
      //TODO sound effect "vwwwwwwooop!"
      return;
    }
    selfie = new SelfieSprite(this.scene);
    this.scene.sprites.push(selfie);
    selfie.x = this.x;
    selfie.y = this.y;
    //TODO sound effect "click!"
  }
  
  /* Vacuum.
   ***********************************************************************/
  
  vacuumBegin() {
    this.itemInProgress = ITEM_VACUUM;
    this.jumpAbort();
    this.ducking = false;
    this.walkdx = 0;
    this.vacuumDy = 0;
    if (this.flop) this.vacuumDx = 1;
    else this.vacuumDx = -1;
    this.vacuumUpdate(0); // force a more refined choice of (dx,dy), avoids flicker
    this.resetDustBunnies();
    this.resetAnimation();
  }
  
  vacuumEnd(inputState) {
    this.itemInProgress = -1;
    this.ph.gravity = true;
    this.resetAnimation();
    return inputState & ~(InputBtn.LEFT | InputBtn.RIGHT); // if LEFT or RIGHT is held, pretend it's new next update
  }
  
  vacuumUpdate(elapsed) {
  
    // Poll input.
    let ndx = this.vacuumDx, ndy = this.vacuumDy;
    if (this.pvinput & InputBtn.UP) { ndx = 0; ndy = -1; }
    else if (this.pvinput & InputBtn.DOWN) { ndx = 0; ndy = 1; }
    else if (this.pvinput & InputBtn.LEFT) { ndx = -1; ndy = 0; }
    else if (this.pvinput & InputBtn.RIGHT) { ndx = 1; ndy = 0; }
    if ((ndx !== this.vacuumDx) || (ndy !== this.vacuumDy)) {
      if (ndx < 0) this.flop = false;
      else if (ndx > 0) this.flop = true;
      this.vacuumDx = ndx;
      this.vacuumDy = ndy;
      this.resetDustBunnies();
    }
    
    // Advance dust bunnies.
    for (const db of this.dustBunnies) {
      if ((db[5] -= elapsed) <= 0) {
        this.resetDustBunny(db, true);
      } else {
        db[1] += db[3] * elapsed;
        db[2] += db[4] * elapsed;
      }
    }
    
    // Attract toward walls.
    this.ph.gravity = true;
    const VACUUM_VELOCITY = 500; // Gravity peaks at 300 px/sec; Vacuum must be stronger than that.
    const freedom = this.scene.physics.measureFreedom(this, this.vacuumDx, this.vacuumDy, VACUUM_DISTANCE_LIMIT);
    if (freedom < 2) {
      // Stuck to a wall. If we're oriented horizontally, cancel gravity.
      this.ph.gravity = false;
      this.ph.gravityRate = 0;
      this.x += this.vacuumDx * freedom;
      this.y += this.vacuumDy * freedom;
    } else if (freedom < VACUUM_DISTANCE_LIMIT) {
      // Wall in range. Force drops off with distance squared.
      const normForce = (1 - (freedom / VACUUM_DISTANCE_LIMIT)) ** 2;
      const force = VACUUM_VELOCITY * normForce;
      this.x += this.vacuumDx * force * elapsed;
      this.y += this.vacuumDy * force * elapsed;
    }
  }
  
  resetDustBunnies() {
    const dbCount = 4;
    this.dustBunnies = [];
    for (let i=dbCount; i-->0; ) {
      const db = [0, 0, 0, 0, 0, 0];
      this.resetDustBunny(db, false);
      this.dustBunnies.push(db);
    }
  }
  
  resetDustBunny(db, fullDistance) {
    const maxTtl = 0.400;
    const minTtl = 0.100;
    const maxDistance = 20;
    const speed = maxDistance / maxTtl;
    db[0] = 400 + 5 * Math.floor(Math.random() * 4); // srcx
    db[1] = db[2] = db[3] = db[4] = 0; // x,y,dx,dy
    db[5] = fullDistance ? maxTtl : (minTtl + Math.random() * (maxTtl - minTtl)); // ttl
    let t = Math.random() * (Math.PI / 2) - Math.PI / 4; // random angle within 45 degrees of the business direction
    if (this.vacuumDx > 0) ;
    else if (this.vacuumDy < 0) t += Math.PI / 2;
    else if (this.vacuumDx < 0) t += Math.PI;
    else t -= Math.PI / 2;
    const distance = (db[5] * maxDistance) / maxTtl;
    db[3] = Math.cos(t + Math.PI) * speed;
    db[4] = -Math.sin(t + Math.PI) * speed;
    db[1] = 0;
    db[2] = 0;
    if (this.vacuumDx < 0) {
      db[2] += this.vh / 2;
    } else if (this.vacuumDx > 0) {
      db[1] += this.vw;
      db[2] += this.vh / 2;
    } else if (this.vacuumDy < 0) {
      db[1] += this.vw / 2;
    } else {
      db[1] += this.vw / 2;
      db[2] += this.vh;
    }
    db[1] += Math.cos(t) * distance;
    db[2] += -Math.sin(t) * distance;
  }
  
  /* Bell: No effect.
   ***********************************************************************/
  
  bellBegin() {
    //TODO sound effect
    //TODO animation
  }
  
  /* Umbrella: Disable normal gravity and reimplement more gently.
   *************************************************************************/
  
  umbrellaBegin() {
    this.itemInProgress = ITEM_UMBRELLA;
    this.ducking = false;
    this.jumping = false;
    this.ph.gravity = false;
    this.resetAnimation();
  }
  
  umbrellaEnd() {
    this.itemInProgress = -1;
    this.ph.gravity = true;
    this.ph.gravityRate = 0;
    this.resetAnimation();
  }
  
  umbrellaUpdate(elapsed) {
    this.y += UMBRELLA_GRAVITY * elapsed;
    this.ph.gravity = false; // jumping can interfere... just keep falsing it
  }
  
  /* Rocket Boots.
   **********************************************************************/
  
  bootsBegin() {
    this.itemInProgress = ITEM_BOOTS;
    this.jumpAbort();
    this.duckEnd();
    this.walkHistory = []; // Prevent triggering a dash by toggling boots (without changing dpad)
    this.walkEnd();
    this.ph.gravity = false;
    this.resetAnimation();
  }
  
  bootsEnd() {
    this.itemInProgress = -1;
    this.ph.gravity = true;
    this.ph.gravityRate = 0;
    this.walkHistory = [];
    this.resetAnimation();
  }
  
  bootsUpdate(elapsed) {
    if (this.y < -30) return; // Maps with open ceiling, stop at some point for sanity's sake.
    this.y -= BOOTS_VELOCITY * elapsed;
    
    // We've suppressed walking. Take over setting flop from dpad (it's cosmetic only).
    switch (this.pvinput & (InputBtn.LEFT | InputBtn.RIGHT)) {
      case InputBtn.LEFT: this.flop = false; break;
      case InputBtn.RIGHT: this.flop = true; break;
    }
  }
  
  /* Grappling hook.
   *******************************************************************/

  grappleBegin() {
    this.duckEnd();
    // We should not be able to reach this point with the grapple deployed, but if one does exist, kill it.
    this.scene.removeSprite(this.scene.sprites.find(s => s instanceof GrappleSprite));
    // Create the grapple and apply initial position and direction.
    const grapple = new GrappleSprite(this.scene);
    this.scene.sprites.push(grapple);
    grapple.x = this.x - this.vx;
    grapple.y = this.y - this.vy;
    const [dx, dy] = this.grappleChooseDirection();
    switch (dx) {
      case 0: grapple.x += (this.vw >> 1) - (grapple.vw >> 1); break;
      case 1: grapple.x += this.vw; break;
    }
    switch (dy) {
      case 0: grapple.y += (this.vh >> 1) - (grapple.vh >> 1); break;
      case 1: grapple.y += this.vh; break;
    }
    grapple.setup(this, dx, dy);
    this.itemInProgress = ITEM_GRAPPLE;
  }
  
  grappleEnd(inputState) {
    this.itemInProgress = -1;
    this.scene.removeSprite(this.scene.sprites.find(s => s instanceof GrappleSprite));
    this.ph.gravityRate = 0; // questionable...
    return inputState;
  }
  
  grappleUpdate(elapsed) {
    // The GrappleSprite can destroy itself, be sure to react to that accordingly.
    // GrappleSprite in fact takes care of most of the logic here.
    const grapple = this.scene.sprites.find(s => s instanceof GrappleSprite);
    if (!grapple) return this.grappleEnd(this.pvinput);
  }
  
  /* Returns [dx,dy], which direction the grapple should go.
   * Default is diagonally up in the direction we're facing.
   * Diagonals can't be produced by the dpad, they can only happen by default (and diagonal down is not possible).
   */
  grappleChooseDirection() {
    switch (this.pvinput & (InputBtn.UP | InputBtn.DOWN)) {
      case InputBtn.UP: return [0, -1];
      case InputBtn.DOWN: return [0, 1];
    }
    switch (this.pvinput & (InputBtn.LEFT | InputBtn.RIGHT)) {
      case InputBtn.LEFT: return [-1, 0];
      case InputBtn.RIGHT: return [1, 0];
    }
    if (this.flop) return [1, -1];
    return [-1, -1];
  }
  
  /* Raft.
   *********************************************************************/

  raftBegin() {
    // If one already exists, it unceremoniously disappears.
    this.scene.removeSprite(this.scene.sprites.find(s => s instanceof RaftSprite));
    // And create a new one.
    const raft = new RaftSprite(this.scene);
    if (this.flop) {
      raft.x = this.x - this.vx + this.vw;
    } else {
      raft.x = this.x - this.vw - raft.vw;
    }
    raft.y = this.y - raft.vh;
    this.scene.sprites.push(raft);
  }
  
  /* Render.
   *************************************************************************/
   
  render(context, dstx, dsty) {
  
    /* Riding the broom is its own thing entirely.
     */
    if (this.itemInProgress === ITEM_BROOM) {
      context.drawDecal(dstx - 5, dsty, 262, 153, 27, 29, this.flop);
      return;
    }
    
    /* Ditto vacuum.
     */
    if (this.itemInProgress === ITEM_VACUUM) {
      let srcx = 400;
      let srcy = 61;
      if (!this.flop) dstx -= 4;
      if (this.vacuumDy < 0) srcx = 421;
      else if (this.vacuumDy > 0) srcx = 442;
      if (this.ph.gravity) { // Gravity turns off when we attach to a surface. Don't draw dust bunnies during that time.
        for (const [dbsrcx, dbx, dby] of this.dustBunnies) {
          context.drawDecal(Math.round(dstx + dbx), Math.round(dsty + dby), dbsrcx, 94, 4, 4, false);
        }
      }
      context.drawDecal(dstx, dsty - 2, srcx, srcy, 20, 32, this.flop);
      return;
    }
    
    /* Ditto umbrella.
     */
    if (this.itemInProgress === ITEM_UMBRELLA) {
      context.drawDecal(dstx - 2, dsty - 7, 379, 61, 20, 37, this.flop);
      return;
    }
    
    /* Ditto boots.
     */
    if (this.itemInProgress === ITEM_BOOTS) {
      if (!this.animTime) this.animTime = this.animClock = 0.125;
      if (this.animFrame >= 2) this.animFrame = 0;
      context.drawDecal(dstx, dsty, this.animFrame ? 262 : 279, 183, 16, 33, this.flop);
      return;
    }
    
    /* Most times carrying an item possessed but not currently in use, it's a second decal behind the first.
     * These are arranged in a uniform row, all the same size.
     * Don't draw it if ducking or wall-sliding, just don't show the item.
     * Grapple: Use defaults, just don't draw our arm when in use. (GrappleSprite does the fun parts)
     */
    if (!this.ducking && !this.wallSlide) {
      if (this.itemInProgress !== ITEM_GRAPPLE) {
        if (this.scene.game.inventory[this.scene.game.selectedItem]) {
          let idstx = dstx, idsty = dsty + 1;
          if (this.flop) idstx += 11;
          else idstx -= 7;
          context.drawDecal(idstx, idsty, 262 + this.scene.game.selectedItem * 13, 61, 12, 26, this.flop);
        }
      }
    }
    
    /* Draw a frame for Dot.
     * Only relevant for the frames of uniform size, top of the decal sheet, just right of the tiles.
     * TODO Different faces while jumping.
     */
    const drawDot = (frameId) => context.drawDecal(dstx, dsty, 262 + frameId * 17, 1, 16, 29, this.flop);
    if (this.deathCountdown) {
      drawDot(7);
    } else if (this.wallSlide) {
      drawDot(8);
    } else if (this.ducking) {
      drawDot(6);
      
    } else if (this.walkdx) { // walking. 4 uniform frames
      if (!this.animTime) this.animTime = this.animClock = 0.250;
      if (this.animFrame >= 4) this.animFrame = 0;
      drawDot(2 + this.animFrame);

    } else { // idle. random blinking
      if (this.animFrame >= 2) {
        this.animFrame = 0;
        if (!this.animTime) {
          this.animClock = this.animTime = 0.500 + Math.random() * 1.500;
        } else {
          this.animTime = 0.500 + Math.random() * 1.500;
        }
      } else if ((this.animFrame === 1) && (this.animClock > 0.200)) {
        this.animClock = 0.200;
      }
      drawDot(this.animFrame);
    }
  }
}
