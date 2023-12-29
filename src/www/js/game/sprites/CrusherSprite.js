/* CrusherSprite.js
 * argv: [width(cols),dy]
 * Platform on top, spikes on the bottom, assignable width.
 * Moves up and down fast.
 */
 
import { Sprite } from "../Sprite.js";
import { HeroSprite } from "./HeroSprite.js";

const TILESIZE = 16;
const ACCELERATION = 1000;
const VELOCITY_MAX = 500;
const STUCK_SAMPLE_WINDOW = 0.100; // Check effective velocity in chunks of this size, to determine whether to turn around.
const STUCK_THRESHOLD = 2; // pixels. Travel less than so far in STUCK_SAMPLE_WINDOW, and we turn around.

export class CrusherSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.colc = +args[0] || 1;
    this.x = col * TILESIZE;
    this.y = row * TILESIZE;
    this.vw = this.colc * TILESIZE;
    this.vh = 1.5 * TILESIZE;
    this.srcx = 327; // 8x8 top tile, 1 pixel gap, 16x16 bottom tile
    this.srcy = 121;
    this.layer = 110;
    Physics.prepareSprite(this);
    this.ph.gravity = false;
    this.ph.restrictHorzCorrection = true;
    this.ph.w = this.vw;
    this.ph.h = this.vh;
    this.ph.invmass = 0.010;
    this.ph.collisions = [];
    this.dy = +args[1] || 1;
    this.velocity = 0;
    this.yAtStuckStart = this.y;
    this.stuckTime = 0;
  }
  
  /* Update.
   **********************************************************************/
   
  update(elapsed) {
    
    if ((this.stuckTime += elapsed) >= STUCK_SAMPLE_WINDOW) {
      const distance = Math.abs(this.y - this.yAtStuckStart);
      if (distance <= STUCK_THRESHOLD) {
        this.dy = -this.dy;
        this.velocity = 0;
      }
      this.stuckTime = 0;
      this.yAtStuckStart = this.y;
    }
    
    if ((this.velocity += ACCELERATION * elapsed) >= VELOCITY_MAX) {
      this.velocity = VELOCITY_MAX;
    }
    this.y += this.velocity * elapsed * this.dy;
    
    if (this.ph.adjusted) {
      const hero = this.ph.collisions.find(s => s instanceof HeroSprite);
      if (hero) {
        if (hero.y >= this.y + TILESIZE) { // beware, her (y) is at her bottom and ours is at our top.
          if (hero.collideHazard) hero.collideHazard(this);
          else this.scene.removeSprite(hero);
        } else {
          if (this.heroReallyAtCeiling(hero)) {
            if (hero.collideHazard) hero.collideHazard(this);
            else this.scene.removeSprite(hero);
          }
        }
      }
    }
  }
  
  /* We'd like to just Physics.measureFreedom(), but it's entirely possible the hero is 
   * in an intermediate state of collision and would report zero freedom upward, when she's really just dragging on a wall.
   * Mitigate by faking her position a little bit in each horizontal direction, and confirm that there's no freedom even after the jiggle.
   */
  heroReallyAtCeiling(hero) {
    const fudge = 4;
    const x0 = hero.x;
    hero.x = x0 - fudge;
    if (this.scene.physics.measureFreedom(hero, 0, -1, 2) >= 2) {
      hero.x = x0;
      return false;
    }
    hero.x = x0 + fudge;
    if (this.scene.physics.measureFreedom(hero, 0, -1, 2) >= 2) {
      hero.x = x0;
      return false;
    }
    hero.x = x0;
    return true;
  }
  
  /* Render.
   *************************************************************************/
   
  render(context, dstx, dsty) {
    const halftilesize = TILESIZE >> 1;
    for (let i=this.colc<<1, x=dstx; i-->0; x+=halftilesize) {
      context.drawDecal(x, dsty, this.srcx, this.srcy, halftilesize, halftilesize, false);
    }
    const spikey = dsty + halftilesize;
    for (let i=this.colc, x=dstx; i-->0; x+=TILESIZE) {
      context.drawDecal(x, spikey, this.srcx + 9, this.srcy, TILESIZE, TILESIZE, false);
    }
  }
}
