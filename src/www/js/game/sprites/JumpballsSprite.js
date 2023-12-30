/* JumpballsSprite.js
 */
 
import { Sprite } from "../Sprite.js";

export class JumpballsSprite extends Sprite {
  constructor(scene) {
    super(scene);
    this.ttl = 0;
    this.elapsed = 0;
    this.mode = "";
    this.layer = 200;
    this.renderAlways = true;
    this.timeless = true;
  }
  
  setupMinor() {
    this.mode = "minor";
    this.ttl = 1.000;
  }
  
  setupMajor() {
    this.mode = "major";
    this.ttl = 1.500;
  }
  
  setupLong(d) {
    this.mode = "long";
    this.ttl = 1.000;
    this.d = d;
  }
  
  update(elapsed) {
    if ((this.ttl -= elapsed) <= 0) {
      this.scene.removeSprite(this);
      return;
    }
    this.elapsed += elapsed;
  }
  
  render(context, dstx, dsty) {
    switch (this.mode) {
      case "minor": {
          const distance = Math.sqrt(this.elapsed) * 20;
          const yextra = this.elapsed * 15;
          context.drawDecal(Math.round(dstx + distance), Math.round(dsty - distance + yextra), 452, 49, 10, 4, false);
          context.drawDecal(Math.round(dstx + distance), Math.round(dsty + distance + yextra), 452, 49, 10, 4, false);
          context.drawDecal(Math.round(dstx - distance) - 10, Math.round(dsty - distance + yextra), 452, 49, 10, 4, true);
          context.drawDecal(Math.round(dstx - distance) - 10, Math.round(dsty + distance + yextra), 452, 49, 10, 4, true);
        } break;
        
      case "major": {
          let srcy;
          switch (~~(this.elapsed * 8) % 3) {
            case 0: srcy = 40; break;
            case 1: srcy = 47; break;
            case 2: srcy = 54; break;
          }
          const y = Math.round(dsty - this.elapsed * 30 + 6);
          context.drawDecal(Math.round(dstx - this.elapsed * 40), y, 445, srcy, 6, 6);
          context.drawDecal(Math.round(dstx - this.elapsed * 3), y, 445, srcy, 6, 6);
          context.drawDecal(Math.round(dstx + this.elapsed * 52), y, 445, srcy, 6, 6);
        } break;
        
      case "long": {
          let srcy;
          switch (~~(this.elapsed * 8) % 3) {
            case 0: srcy = 40; break;
            case 1: srcy = 47; break;
            case 2: srcy = 54; break;
          }
          context.drawDecal(Math.round(dstx + this.elapsed * -20 * this.d), Math.round(dsty + this.elapsed * -10), 445, srcy, 6, 6);
          context.drawDecal(Math.round(dstx + this.elapsed * -30 * this.d), Math.round(dsty + this.elapsed * -8), 445, srcy, 6, 6);
          context.drawDecal(Math.round(dstx + this.elapsed * -50 * this.d), Math.round(dsty + this.elapsed * -2), 445, srcy, 6, 6);
          context.beginPath();
          context.moveTo(dstx + this.d * 20, dsty);
          context.lineTo(dstx + this.d * this.elapsed * 20, dsty - this.elapsed * 3 + 4);
          context.strokeStyle = "#fff";
          context.stroke();
        } break;
    }
  }
}
