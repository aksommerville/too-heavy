/* BoxSprite.js
 * The box that Dot jumps into.
 * This class manages game termination and the termination-test cutscene.
 */
 
import { Sprite } from "../Sprite.js";
import { HeroSprite } from "./HeroSprite.js";

const TILESIZE = 16;

const STAGE_IDLE = 0;
const STAGE_MAIL_ME = 1;
const STAGE_WEIGHING = 2;
const STAGE_TOO_HEAVY = 3;
const STAGE_OK = 4;

export class BoxSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.srcx = 329; // with Dot: (362,164,32,28) same width, new height extending top
    this.srcy = 164; // 164=open 178=closed, same size
    this.vw = 32;
    this.vh = 13;
    this.x = col * TILESIZE + 4;
    this.y = (row + 1) * TILESIZE - this.vh;
    this.layer = 90;
    this.stage = STAGE_IDLE;
    this.stageClock = 0; // Not relevant in STAGE_IDLE
    this.pressed = false;
  }
  
  update(elapsed) {
    switch (this.stage) {
      case STAGE_IDLE: return this.updateIdle(elapsed);
      default: {
          if ((this.stageClock -= elapsed) <= 0) {
            this.advance();
          }
        }
    }
  }
  
  updateIdle(elapsed) {
    if (
      (this.scene.herox >= this.x) &&
      (this.scene.heroy >= this.y) &&
      (this.scene.herox < this.x + this.vw) &&
      (this.scene.heroy < this.y + this.vh)
    ) {
      if (!this.pressed) {
        this.pressed = true;
        this.beginCutscene();
      }
    } else {
      this.pressed = false;
    }
  }
  
  beginCutscene() {
    this.scene.game.setPermanentState("mailAttempted", true);
    this.stage = STAGE_MAIL_ME;
    this.stageClock = 2.0;
    this.y -= 28 - this.vh;
    this.srcx = 362;
    this.srcy = 164;
    this.vw = 32;
    this.vh = 28;
    const hero = this.scene.sprites.find(s => s instanceof HeroSprite);
    if (hero) {
      hero.update = () => {};
      hero.render = () => {};
      hero.dropMotion();
    }
  }
  
  advance() {
    switch (this.stage) {
      case STAGE_MAIL_ME: {
          this.stage = STAGE_WEIGHING;
          this.stageClock = 1.0;
        } break;
      case STAGE_WEIGHING: {
          if (this.scene.game.inventory.find(v => v)) {
            this.stage = STAGE_TOO_HEAVY;
            this.stageClock = 2.0;
          } else {
            this.stage = STAGE_OK;
            this.stageClock = 3.0;
            this.y += this.vh - 13;
            this.srcx = 329;
            this.srcy = 178;
            this.vh = 13;
          }
        } break;
      case STAGE_OK: {
          this.stageClock = 999; // we'll be destroyed anyway, but do poison the timer
          this.scene.game.win();
        } break;
      default: {
          this.stage = STAGE_IDLE;
          this.y += this.vh - 13;
          this.srcx = 329;
          this.srcy = 164;
          this.vw = 32;
          this.vh = 13;
          const hero = this.scene.sprites.find(s => s instanceof HeroSprite);
          if (hero) {
            delete hero.update;
            delete hero.render;
          }
        } break;
    }
  }
  
  postRender(context, dstx, dsty) {
    switch (this.stage) {
      case STAGE_MAIL_ME: context.drawDialogue(dstx + this.vw - 8, dsty, "Mail me to England"); break;
      case STAGE_TOO_HEAVY: context.drawDialogue(dstx + this.vw + 8, dsty, "Too heavy"); break;
      case STAGE_OK: context.drawDialogue(dstx + this.vw + 8, dsty, "OK"); break;
    }
  }
}
