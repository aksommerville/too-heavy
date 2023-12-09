/* Sprite.js
 * Any active element within a Scene.
 */
 
export class Sprite {
  constructor(scene) {
    this.scene = scene;
    this.x = 0; // Physical position in pixels, floating point.
    this.y = 0;
    this.srcx = 0; // Top-left corner of image in graphics sheet, if you don't implement render().
    this.srcy = 0;
    this.vw = 0; // Source image dimensions.
    this.vh = 0;
    this.vx = 0; // Position of (x,y) within render bounds.
    this.vy = 0;
    this.pw = 0; // Physical dimensions.
    this.ph = 0;
    this.px = 0; // Position of (x,y) within physical bounds.
    this.py = 0;
    this.flop = false; // True to flip horizontally.
    this.pb = null; // Physical bounds, for Physics's use.
    this.pvx = 0; // Last known valid position, for Physics's use.
    this.pvy = 0;
  }
  
  /* Total output coverage {x,y,w,h} in world pixels.
   * (w,h) are the exact size of the decal from our graphics sheet.
   * Must be integers.
   */
  getRenderBounds() {
    const x = Math.floor(this.x - this.vx);
    const y = Math.floor(this.y - this.vy);
    return { x, y, w: this.vw, h: this.vh };
  }
  
  /* Bounds for physics purposes, usually a little smaller than renderBounds.
   * Floating-point OK.
   */
  getPhysicalBounds() {
    const x = this.x - this.px;
    const y = this.y - this.py;
    return { x, y, w: this.pw, h: this.ph };
  }
  
  /* Subclasses may implement if rendering is more complicated than a straight decal.
   * (dstx,dsty) are the position in (context) corresponding to your renderBounds (x,y).
   *
  render(context, dstx, dsty) {
  }
  /**/
  
  /* Called each frame.
   * Sprite controller should update its (x,y).
   * No need to validate it, there will be a generic rectifaction pass after all sprites position themselves.
   * Elapsed time in seconds.
   * Only the hero should care about (inputState) but who knows.
   *
  update(elapsed, inputState) {
  }
  /**/
}
