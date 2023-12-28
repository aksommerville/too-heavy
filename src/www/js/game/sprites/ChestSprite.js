/* ChestSprite.js
 * The Treasure Anti-Chest, there are 9 in the game.
 * args: permanentStateKey
 */
 
import { Sprite } from "../Sprite.js";
import { HeroSprite } from "../HeroSprite.js";

const TILESIZE = 16;
const BLINK_TIME_CLOSED = 0.200;
const BLINK_TIME_MIN = 2.000;
const BLINK_TIME_MAX = 4.000;
const SPEECH_JAWS_TIME = 0.500;
const SPEECH_TOTAL_TIME = 3.000;
const SILENT_TIME = 6.000;

const ITEM_NAMES = [
  "stopwatch",
  "broom",
  "camera",
  "vacuum cleaner",
  "bell",
  "umbrella",
  "boots",
  "grappling hook",
  "raft",
];

export class ChestSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.x = col * TILESIZE - 3;
    this.y = (row + 1) * TILESIZE - 69;
    this.srcx = 262;
    this.srcy = 287; // 287=OPEN 217=CLOSED
    this.vw = 102;
    this.vh = 69;
    this.permanentStateKey = args[0] || "";
    this.sated = false;
    this.blinkClock = BLINK_TIME_MAX;
    this.renderAlways = false; // true if we have a word bubble
    this.speech = "";
    this.speechClock = SILENT_TIME;
    this.jawsClock = 0;
    
    if (this.permanentStateKey) {
      if (this.scene.game.permanentState[this.permanentStateKey]) {
        this.sated = true;
        this.srcy = 217;
      }
    }
  }
  
  update(elapsed) {

    if ((this.blinkClock -= elapsed) < 0) {
      this.blinkClock = BLINK_TIME_MIN + Math.random() * (BLINK_TIME_MAX - BLINK_TIME_MIN);
    }
    
    // If we're not sated yet, and the hero is in our bounds and has an item equipped, eat it.
    if (!this.sated && this.scene.game.inventory[this.scene.game.selectedItem] && this.touchesHero()) {
      this.sated = true;
      this.srcy = 217;
      this.scene.game.inventory[this.scene.game.selectedItem] = false;
      const hero = this.scene.sprites.find(s => s instanceof HeroSprite);
      if (hero && hero.actionEnd) hero.actionEnd();
      this.sound("deliverItem");
      //TODO other feedback? this event is pretty much the biggest deal we do.
      if (this.permanentStateKey) {
        this.scene.game.setPermanentState(this.permanentStateKey, 1 + this.scene.game.selectedItem);
      }
    }
    
    if ((this.speechClock -= elapsed) <= 0) {
      if (this.speech) { // become silent
        this.speech = "";
        this.renderAlways = false;
        this.speechClock += SILENT_TIME;
        //this.srcy = this.sated ? 217 : 287;
      } else { // say something
        if (this.sated) {
          if (this.permanentStateKey) {
            this.speech = `Thanks for the ${ITEM_NAMES[this.scene.game.permanentState[this.permanentStateKey] - 1]}!`;
          } else {
            this.speech = `Thanks!`;
          }
        } else {
          this.speech = "Feed me!";
        }
        this.renderAlways = true;
        this.speechClock += SPEECH_TOTAL_TIME;
        this.jawsClock = 0.001;
      }
    }
    if (this.jawsClock > 0) {
      if ((this.jawsClock -= elapsed) <= 0) {
        if (this.speech) {
          this.jawsClock += SPEECH_JAWS_TIME;
          if (this.srcy === 217) this.srcy = 287;
          else this.srcy = 217;
        } else {
          this.jawsClock = 0;
          this.srcy = this.sated ? 217 : 287;
        }
      }
    }
  }
  
  touchesHero() {
    if (this.scene.herox < this.x) return false;
    if (this.scene.heroy < this.y) return false;
    if (this.scene.herox >= this.x + this.vw) return false;
    if (this.scene.heroy >= this.y + this.vh) return false;
    return true;
  }
  
  onPermanentState(k, v) {
    if (k === this.permanentStateKey) {
      if (v) {
        if (this.sated) return;
        this.sated = true;
        this.srcy = 217;
      } else {
        if (!this.sated) return;
        this.sated = false;
        this.srcy = 287;
      }
    }
  }

  checkFlop() {
    // Turn to face the hero, as chests do.
    // Do this at render instead of update, to ensure the first frame comes out right.
    if (this.scene.herox < this.x) {
      if (this.flop) {
        this.flop = false;
      }
    } else if (this.scene.herox > this.x + this.vw) {
      if (!this.flop) {
        this.flop = true;
      }
    }
  }

  render(context, dstx, dsty) {
    this.checkFlop();
    context.drawDecal(dstx, dsty, this.srcx, this.srcy, this.vw, this.vh, this.flop);
    if (this.srcy === 217) { // closed; draw eyeballs
      let srcy = 138;
      if (this.blinkClock <= BLINK_TIME_CLOSED) srcy = 151;
      if (this.flop) {
        context.drawDecal(dstx + this.vw - 29 - 21, dsty + 7, 327, srcy, 21, 12, true);
      } else {
        context.drawDecal(dstx + 29, dsty + 7, 327, srcy, 21, 12, false);
      }
    }
  }
  
  postRender(context, dstx, dsty) {
    if (this.speech) {
      context.drawDialogue(dstx + (this.vw >> 1), dsty - 1, this.speech);
    }
  }
}
