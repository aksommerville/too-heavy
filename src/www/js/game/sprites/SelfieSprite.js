/* SelfieSprite.js
 * A picture Dot takes of herself, that she can teleport back to.
 */
 
import { Sprite } from "../Sprite.js";

export class SelfieSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.layer = 90;
    this.srcx = 290;
    this.srcy = 153;
    this.vw = 19;
    this.vh = 14;
    this.vx = 9;
    this.vy = 20;
    this.displacement = 0; // bump a pixel or two vertically over time to look alive.
    this.displacementClock = 0;
    this.displacementDirection = -1;
  }
  
  update(elapsed) {
    if ((this.displacementClock += elapsed) >= 0.300) {
      this.displacementClock -= 0.300;
      this.displacement += this.displacementDirection;
      if (
        ((this.displacement <= -1) && (this.displacementDirection < 0)) ||
        ((this.displacement >= 1) && (this.displacementDirection > 0))
      ) this.displacementDirection = -this.displacementDirection;
    }
  }
  
  render(context, dstx, dsty) {
    context.drawDecal(dstx, dsty + this.displacement, this.srcx, this.srcy, this.vw, this.vh, false);
  }
}
