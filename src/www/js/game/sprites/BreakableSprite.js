/* BreakableSprite.js
 * Basically static, but gets destroyed when you cannonball into it.
 */
 
import { Sprite } from "../Sprite.js";
import { Physics } from "../Physics.js";
import { AnimateOnceSprite } from "./AnimateOnceSprite.js";

const TILESIZE = 16;
const FRAGMENT_SPEED = 200;
const FRAGMENT_TIME = 0.700;

export class BreakableSprite extends Sprite {
  constructor(scene, col, row, args) {
    super(scene);
    this.scene = scene;
    this.x = col * TILESIZE;
    this.y = row * TILESIZE;
    this.vw = 2 * TILESIZE;
    this.vh = 2 * TILESIZE;
    this.srcx = 327; // wood create. TODO configure via args
    this.srcy = 88;
    this.layer = 10;
    Physics.prepareSprite(this);
    this.ph.w = 2 * TILESIZE;
    this.ph.h = 2 * TILESIZE;
    this.phinvmass = 0;
  }
  
  onCannonball(hero, distance) {
    this.scene.removeSprite(this);
    const midx = this.x + this.vw * 0.5;
    const midy = this.y + this.vh * 0.5;
    const fragmentCount = 12;
    const radius = 12;
    const dt = (Math.PI * 2) / fragmentCount;
    for (let i=fragmentCount, t=0; i-->0; t+=dt) {
      const fragment = new AnimateOnceSprite(this.scene);
      this.scene.sprites.push(fragment);
      fragment.dx = Math.cos(t);
      fragment.dy = -Math.sin(t);
      fragment.x = midx + radius * fragment.dx;
      fragment.y = midy - radius * fragment.dy;
      fragment.dx *= FRAGMENT_SPEED;
      fragment.dy *= FRAGMENT_SPEED;
      fragment.frameCount = 1;
      fragment.frameDuration = FRAGMENT_TIME;
      switch (Math.floor(Math.random() * 8)) {
        case 0: fragment.srcx = 360; fragment.srcy = 88; fragment.vw = 4; fragment.vh = 11; break;
        case 1: fragment.srcx = 365; fragment.srcy = 88; fragment.vw = 3; fragment.vh = 13; break;
        case 2: fragment.srcx = 369; fragment.srcy = 88; fragment.vw = 9; fragment.vh = 3; break;
        case 3: fragment.srcx = 369; fragment.srcy = 92; fragment.vw = 9; fragment.vh = 4; break;
        case 4: fragment.srcx = 369; fragment.srcy = 97; fragment.vw = 3; fragment.vh = 4; break;
        case 5: fragment.srcx = 373; fragment.srcy = 97; fragment.vw = 3; fragment.vh = 4; break;
        case 6: fragment.srcx = 377; fragment.srcy = 97; fragment.vw = 1; fragment.vh = 4; break;
        case 7: fragment.srcx = 360; fragment.srcy = 100; fragment.vw = 4; fragment.vh = 1; break;
      }
    }
  }
}
