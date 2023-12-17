/* PlatformSprite.js
 * Moves back and forth, horizontal or vertical.
 * args: [dx,dy,decalName]
 */
 
import { Sprite } from "../Sprite.js";
import { Physics } from "../Physics.js";

const TILESIZE = 16;
const TURNAROUND_WINDOW = 0.500;

export class PlatformSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    Physics.prepareSprite(this);
    this.ph.gravity = false;
    this.ph.collisions = [];
    this.ph.invmass = 0.001;
    this.x = Math.round((col + 0.5) * TILESIZE);
    this.y = Math.round((row + 0.5) * TILESIZE);
    this.dx = +args[0] || 0;
    this.dy = +args[1] || 0;
    if (this.dx && !this.dy) this.ph.restrictVertCorrection = true;
    else if (!this.dx && this.dy) this.ph.restrictHorzCorrection = true;
    
    switch (args[2]) {
      case "pencil":
      default: {
          this.srcx = 420;
          this.srcy = 94;
          this.vw = 42;
          this.vh = 7;
        } break;
    }
    this.ph.w = this.vw;
    this.ph.h = this.vh;
    this.ph.pleft = -(this.vw >> 1);
    this.ph.ptop = -(this.vh >> 1);
    this.vx = this.vw >> 1;
    this.vy = this.vh >> 1;
    this.turnaroundX = this.x;
    this.turnaroundY = this.y;
    this.turnaroundClock = TURNAROUND_WINDOW;
  }
  
  update(elapsed) {
  
    if ((this.turnaroundClock -= elapsed) <= 0) {
      this.turnaroundClock += TURNAROUND_WINDOW;
      const diff = Math.abs(this.x - this.turnaroundX) + Math.abs(this.y - this.turnaroundY);
      this.turnaroundX = this.x;
      this.turnaroundY = this.y;
      if (diff <= 2) {
        this.dx = -this.dx;
        this.dy = -this.dy;
      }
    }
  
    this.x += this.dx * elapsed;
    this.y += this.dy * elapsed;
    if (!this.ph.adjusted) {
      for (const other of this.ph.collisions) {
        if (other.ph.y + other.ph.h > this.y) continue;
        if (!other.ph.invmass) continue;
        other.x += this.dx * elapsed;
        other.y += this.dy * elapsed;
      }
    }
  }
}
