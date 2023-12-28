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
    this.flop = false; // True to flip horizontally.
    this.ph = null; // Extra data used by Physics. Null if the sprite is purely decorative.
    this.layer = 90; // Higher renders later, ie on top. Hero belongs at 100.
    this.renderAlways = false; // true if you want render() called even when offscreen, if you know something we don't.
    this.timeless = false; // true if you should continue updating while the stopwatch is held.
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
  
  /* Subclasses may implement if rendering is more complicated than a straight decal.
   * (dstx,dsty) are the position in (context) corresponding to your renderBounds (x,y).
   *
  render(context, dstx, dsty) {
  }
  /**/
  
  /* Same as render, but happens after all sprites have rendered normally.
   * eg for word bubbles.
   *
  postRender(context, dstx, dsty) {
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
  
  // convenience
  sound(sfxid) {
    this.scene.game.audioManager.soundEffect(sfxid);
  }
}
