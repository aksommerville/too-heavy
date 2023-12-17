/* SoulballsSprite.js
 * Decoration when the hero dies.
 */
 
import { Sprite } from "../Sprite.js";

const TTL = 2.000;
const OUTWARD_SPEED = 200;
const BALL_COUNT = 7; // Important for story-continuity purposes: A witch's soul has seven circles.
const FRAME_TIME = 0.125;
const ROTATION_RATE = 0.500; // radians/sec

export class SoulballsSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.srcx = 375;
    this.srcy = 102;
    this.renderAlways = true;
    this.clock = 0;
    this.frame = 0;
    this.frameClock = 0;
    this.t0 = 0;
  }
  
  update(elapsed) {
    if ((this.clock += elapsed) >= TTL) {
      this.scene.removeSprite(this);
    }
    if ((this.frameClock -= elapsed) <= 0) {
      this.frameClock += FRAME_TIME;
      if ((this.frame += 1) >= 10) this.frame = 0;
    }
    this.t0 += ROTATION_RATE * elapsed;
  }
  
  render(context, dstx, dsty) {
    const radius = this.clock * OUTWARD_SPEED;
    const dt = (Math.PI * 2) / BALL_COUNT;
    for (let i=BALL_COUNT, t=this.t0, frame=this.frame; i-->0; t+=dt) {
      const srcframe = (frame >= 6) ? (10 - frame) : frame;
      context.drawDecal(
        Math.floor(dstx + Math.cos(t) * radius) - 7,
        Math.floor(dsty - Math.sin(t) * radius) - 7,
        this.srcx + srcframe * 14, this.srcy,
        13, 13
      );
      if (++frame >= 10) frame = 0;
    }
  }
}
