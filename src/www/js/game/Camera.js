/* Camera.js
 * Manages what portion of the Scene is visible. Scrolling and such.
 * Tightly coupled to one Scene.
 */
 
export class Camera {
  constructor(scene) {
    this.scene = scene;
  }
  
  getWorldBounds() {
    return { x: 0, y: 0, w: 320, h: 160 };//TODO
  }
}
