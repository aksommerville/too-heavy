/* GrappleSprite.js
 * The end of the grappling hook.
 */
 
import { Sprite } from "../Sprite.js";
import { Physics } from "../Physics.js";

const FLY_SPEED = 300; // px/sec, must be fast
const FLY_LIMIT = 0.500; // sec, unceremonious end during fly if we go this long
const TENSION_COEFFICIENT = 0.150; // Multiplier against squared distance
const MAX_FORCE = 500;
const LINE_LENGTH_INITIAL = 70;
const LINE_LENGTH_MIN = 10;
const LINE_LENGTH_MAX = 150;
const LINE_TIGHTEN_RATE = 50;
const LINE_LOOSEN_RATE = 50;

export class GrappleSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.vw = 8;
    this.vh = 7;
    this.srcx = 327;
    this.srcy = 130;
    this.layer = 101;
    this.hero = null;
    this.dx = 0;
    this.dy = 0;
    this.stage = "init"; // "init" | "fly" | "hold"
    this.pvinput = 0;
    this.flyTime = 0;
    this.lineLength = LINE_LENGTH_INITIAL;
    this.renderAlways = true;
  }
  
  /* Caller should supply (-1,0,1) for both (dx) and (dy).
   * We normalize if necessary.
   */
  setup(hero, dx, dy) {
    if (!hero) return; // stay in "init" stage
    this.hero = hero;
    this.dx = dx;
    this.dy = dy;
    switch (Math.abs(dx) + Math.abs(dy)) {
      case 0: return; // stay in "init" stage
      case 1: break; // already normalized, great (probably a cardinal direction)
      default: {
          const mag = Math.sqrt(dx ** 2 + dy ** 2);
          this.dx /= mag;
          this.dy /= mag;
        }
    }
    this.stage = "fly";
  }
  
  update(elapsed, inputState) {
    if (this.stage === "fly") {
      if (this.collidesWithWall()) {
        this.stage = "hold";
        this.sound("grappleCatch");
      } else {
        if ((this.flyTime += elapsed) >= FLY_LIMIT) {
          // Give up if we've flown too long.
          this.scene.removeSprite(this);
          return;
        }
        this.x += this.dx * FLY_SPEED * elapsed;
        this.y += this.dy * FLY_SPEED * elapsed;
      }
    }
    if (this.stage === "hold") {
    
      switch (inputState & (InputBtn.UP | InputBtn.DOWN)) {
        case InputBtn.UP: {
            if ((this.lineLength -= LINE_TIGHTEN_RATE * elapsed) <= LINE_LENGTH_MIN) this.lineLength = LINE_LENGTH_MIN;
          } break;
        case InputBtn.DOWN: {
            if ((this.lineLength += LINE_LOOSEN_RATE * elapsed) >= LINE_LENGTH_MAX) this.lineLength = LINE_LENGTH_MAX;
          } break;
      }
    
      const herox = this.hero.ph.x + this.hero.ph.w / 2;
      const heroy = this.hero.ph.y + this.hero.ph.h / 2;
      const midx = this.x + this.vw / 2;
      const midy = this.y + this.vh / 2;
      const distance = Math.sqrt((herox - midx) ** 2 + (heroy - midy) ** 2);
      const tension = distance - this.lineLength;
      if (tension > 0) {
        let force = tension ** 2 * TENSION_COEFFICIENT;
        if (force > MAX_FORCE) force = MAX_FORCE;
        this.hero.x += ((midx - herox) / distance) * force * elapsed;
        this.hero.y += ((midy - heroy) / distance) * force * elapsed;
      }
    }
  }
  
  collidesWithWall() {
    const midx = this.x + this.vw / 2;
    const midy = this.y + this.vh / 2;
    for (const other of this.scene.sprites) {
      if (!other.ph) continue; // physics participants only
      if (other.ph.invmass) continue; // don't grapple moveable things (TODO Should we grab items too, a la Bionic Commando?)
      if (other.ph.role === "oneway") { // oneways count if we're moving down
        if (this.dy <= 0) continue;
      }
      if (other.ph.role === "hazard") continue; // nope
      if (midx < other.ph.x) continue;
      if (midy < other.ph.y) continue;
      if (midx >= other.ph.x + other.ph.w) continue;
      if (midy >= other.ph.y + other.ph.h) continue;
      return other;
    }
    return null;
  }
  
  render(context, dstx, dsty) {
    if (this.hero) {
      const ax = Math.round(dstx + this.vw * 0.5);
      const ay = Math.round(dsty + this.vh * 0.5);
      const bx = Math.round(this.hero.x - this.hero.vx + this.hero.vw * 0.5 + dstx - this.x);
      const by = Math.round(this.hero.y - this.hero.vy + this.hero.vh * 0.5 + dsty - this.y);
      const distance = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
      context.beginPath();
      if (distance >= this.lineLength) {
        // When the line is tense, easy, it's a straight line.
        context.moveTo(ax, ay);
        context.lineTo(bx, by);
      } else {
        // There is slack in the line.
        // The correct way would be a catenary curve between these endpoints, whose length is (this.lineLength).
        // But that's complicated, not sure I'm not up to the math of it...
        // So instead this cheesy approximation with two quadratic curves.
        // It produces a wildly-incorrect sigmoid when there's just a little slack. I'm not worried about it.
        const midx = (ax + bx) * 0.5;
        const midy = (ay + by) * 0.5 + (this.lineLength - distance);
        context.beginPath();
        context.moveTo(ax, ay);
        context.quadraticCurveTo(ax, midy, midx, midy);
        context.quadraticCurveTo(bx, midy, bx, by);
      }
      context.strokeStyle = "#684f16";
      context.stroke();
    }
    context.drawDecal(dstx, dsty, this.srcx, this.srcy, this.vw, this.vh, false);
  }
}
