/* ChestSprite.js
 * The Treasure Anti-Chest, there are 9 in the game.
 * args: permanentStateKey
 */
 
import { Sprite } from "../Sprite.js";
import { HeroSprite } from "../HeroSprite.js";

const TILESIZE = 16;

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
    
    if (this.permanentStateKey) {
      if (this.scene.game.permanentState[this.permanentStateKey]) {
        this.sated = true;
        this.srcy = 217;
      }
    }
  }
  
  update(elapsed) {
    // Turn to face the hero, as chests do.
    if (this.scene.herox < this.x) {
      if (this.flop) {
        this.flop = false;
      }
    } else if (this.scene.herox > this.x + this.vw) {
      if (!this.flop) {
        this.flop = true;
      }
    }
    
    // If we're not sated yet, and the hero is in our bounds and has an item equipped, eat it.
    if (!this.sated && this.scene.game.inventory[this.scene.game.selectedItem] && this.touchesHero()) {
      this.sated = true;
      this.srcy = 217;
      this.scene.game.inventory[this.scene.game.selectedItem] = false;
      const hero = this.scene.sprites.find(s => s instanceof HeroSprite);
      if (hero && hero.actionEnd) hero.actionEnd();
      //TODO sound effect
      //TODO other feedback? this event is pretty much the biggest deal we do.
      if (this.permanentStateKey) {
        this.scene.game.setPermanentState(this.permanentStateKey, true);
      }
    }
    
    //TODO I'd really get a kick out of making the lid go up and down and a word bubble appear like "FEED ME!"
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
}
