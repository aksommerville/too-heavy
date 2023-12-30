/* GoodySprite.js
 */
 
import { Sprite } from "../Sprite.js";

const TILESIZE = 16;
const IDLE_TIME = 2.000;
const SPEECH_TIME = 4.000;

const GOODY_STAGE_IDLE = 1;
const GOODY_STAGE_SPEECH = 2;

export class GoodySprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.x = col * TILESIZE;
    this.y = row * TILESIZE - 41;
    this.vw = 31;
    this.vh = 60;
    this.srcx = 419;
    this.srcy = 249;
    this.clock = IDLE_TIME;
    this.stage = GOODY_STAGE_IDLE;
    this.speech = "";
  }
  
  update(elapsed) {
    if ((this.clock -= elapsed) <= 0) {
      this.advance();
    }
  }
  
  advance() {
    switch (this.stage) {
      case GOODY_STAGE_IDLE: {
          this.stage = GOODY_STAGE_SPEECH;
          this.clock = SPEECH_TIME;
          this.speech = this.composeGoodAdvice();
        } break;
      default: {
          this.stage = GOODY_STAGE_IDLE;
          this.clock = IDLE_TIME;
          this.speech = "";
        }
    }
  }
  
  render(context, dstx, dsty) {
    context.drawDecal(dstx, dsty, this.srcx, this.srcy, this.vw, this.vh, false);
    if (this.speech) {
      if ((~~(this.clock * 2)) & 1) { // mouth open
        context.drawDecal(dstx + 5, dsty + 20, 436, 235, 10, 13);
      }
    }
  }
  
  postRender(context, dstx, dsty) {
    if (!this.speech) return;
    context.drawDialogue(this.x + (this.vw >> 1), this.y, this.speech);
  }
  
  composeGoodAdvice() {
    const itemCount = this.scene.game.inventory.reduce((a, v) => (v ? (a + 1) : a), 0);
  
    if (!itemCount) {
      if (!this.completedJumpingSchool() && this.completedItemSchool()) {
        return "Try the \"Magic is in You\" room before you go.";
      } else {
        return "You're ready to go! Check at the Post Office.";
      }
    }
    
    if (itemCount === 9) {
      if (!this.completedItemSchool()) {
        return "Visit the \"Playing with Toys\" room to learn about items.";
      }
      if (this.scene.game.permanentState.mailAttempted) {
        return "Find an empty treasure chest and fill it.";
      } else {
        return "Try the Post Office.";
      }
    }
    
    return `You need to give away ${itemCount} more things.`;
  }
  
  completedJumpingSchool() {
    return this.scene.game.permanentState.schoolJump;
  }
  
  completedItemSchool() {
    return (
      this.scene.game.permanentState.schoolStopwatch &&
      this.scene.game.permanentState.schoolBroom &&
      this.scene.game.permanentState.schoolCamera &&
      this.scene.game.permanentState.schoolVacuum &&
      this.scene.game.permanentState.schoolBell &&
      this.scene.game.permanentState.schoolUmbrella &&
      this.scene.game.permanentState.schoolBoots &&
      this.scene.game.permanentState.schoolGrapple &&
      this.scene.game.permanentState.schoolRaft
    );
  }
}
