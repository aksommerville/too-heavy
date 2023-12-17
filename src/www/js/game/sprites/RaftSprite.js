/* RaftSprite.js
 * Expands horizontally until it collides with something.
 */
 
import { Sprite } from "../Sprite.js";
import { Physics } from "../Physics.js";

const WIDTH_LIMIT = 128;

export class RaftSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.srcx = 360; // 3 tiles 4x13 each, spaced by x+5
    this.srcy = 102;
    this.vw = 12; // minimum width is one of each tile, we can grow arbitrarily from there
    this.vh = 13;
    Physics.prepareSprite(this);
    this.ph.w = this.vw;
    this.ph.h = this.vh;
    this.ph.collisions = [];
    this.growing = true;
  }
  
  update(elapsed) {
    if (!this.growing) return;
    if (this.ph.w >= WIDTH_LIMIT) {
      this.growing = false;
    } else {
      // If we have a collision on both left and right, stop growing.
      let left = false, right = false;
      for (const other of this.ph.collisions) {
        if (other.ph.y + 2 >= this.ph.y + this.ph.h) continue;
        if (other.ph.y + other.ph.h <= this.ph.y + 2) continue;
        if (other.ph.x <= this.ph.x + 2) left = true;
        else if (other.ph.x + 2 >= this.ph.x + this.ph.w) right = true;
      }
      if (left && right) {
        this.growing = false;
      }
    }
    if (this.growing) {
      this.x -= 1;
      this.ph.w += 2;
      this.vw = this.ph.w;
    }
  }
  
  render(context, dstx, dsty) {
    // Edges, and one middle tile at the right edge to cover round-down.
    context.drawDecal(dstx, dsty, this.srcx, this.srcy, 4, 13);
    context.drawDecal(dstx + this.vw - 4, dsty, this.srcx + 10, this.srcy, 4, 13);
    context.drawDecal(dstx + this.vw - 8, dsty, this.srcx + 5, this.srcy, 4, 13);
    // Then draw as many middle tiles as we need to reach the fixed one.
    // Middle tile is actually four identical columns, they can overlap arbitrarily.
    dstx += 4;
    for (let i=Math.floor((this.vw - 8) / 4); i-->0; dstx+=4) {
      context.drawDecal(dstx, dsty, this.srcx + 5, this.srcy, 4, 13);
    }
  }
}
