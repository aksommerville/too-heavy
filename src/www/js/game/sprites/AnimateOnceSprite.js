/* AnimateOnceSprite.js
 * Set us up with (srcx,srcy,vw,vh,x,y,frameDuration,frameCount).
 * Frames must be oriented horizontally with a 1-pixel margin between.
 * After the last frame has displayed, we destroy ourselves.
 */
 
import { Sprite } from "../Sprite.js";
 
export class AnimateOnceSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.frameDuration = 0.250;
    this.frameCount = 4;
    this.clock = 0;
  }
  
  update(elapsed) {
    this.clock += elapsed;
    if (this.clock >= this.frameDuration) {
      if (this.frameCount <= 1) {
        this.scene.removeSprite(this);
        return;
      }
      this.frameCount--;
      this.srcx += this.vw + 1;
      this.clock -= this.frameDuration;
    }
  }
}
