/* Grid.js
 * One Scene's worth of static geometry, expressed as a 2-dimensional grid.
 * I usually call these Maps but that's already a thing in Javascript.
 */
 
import { Sprite } from "./Sprite.js";
import { Physics } from "./Physics.js";

const TILESIZE = 16;
 
export class Grid {
  constructor() {
    this.w = 20; // in tiles
    this.h = 10; // in tiles
    this.v = new Uint8Array(this.w * this.h); // 0..255; length is w*h; laid out LRTB
    
    //TODO serialize and persist grids
    for (let x=0;x<this.w;x++) {
      this.v[(this.h-1)*this.w+x]=0x81;
      this.v[(this.h-2)*this.w+x]=0x01;
    }
    this.v[ 99] = 0xa3;
    this.v[160] = 0xa3;
    this.v[161] = 0xa3;
    this.v[140] = 0xa3;
    this.v[147] = 0xa3; // floating eye level
    this.v[173] = 0xa3;
    this.v[153] = 0xa3;
    this.v[133] = 0xa3;
    this.v[134] = 0xa3;
    this.v[135] = 0xa3;
    this.v[136] = 0xa3;
  }
  
  /* Return an array of Sprite for our solid regions.
   */
  generateStaticSprites(scene) {
    const sprites = [];
    
    // Copy the cells and convert to 0=vacant 1=solid
    const c = this.w * this.h;
    const v = new Uint8Array(this.v);
    for (let i=c; i-->0; ) v[i] = (v[i] >= 0x80) ? 1 : 0;
    
    // Read LRTB and at each solid cell, extend leftward then downward. Create a sprite and zero those cells.
    for (let y=0, row=0, p=0; row<this.h; row++, y+=TILESIZE) {
      for (let x=0, col=0; col<this.w; col++, x+=TILESIZE, p++) {
        if (!v[p]) continue;
        let w = 1;
        while ((col + w < this.w) && v[p + w]) w++;
        let h = 1;
        let subp = p + this.w;
        while (row + h < this.h) {
          let allsolid = true;
          for (let subxp=subp, i=w; i-->0; subxp++) {
            if (!v[subxp]) {
              allsolid = false;
              break;
            }
          }
          if (!allsolid) break;
          h++;
        }
        this.clearRect(v, this.w, col, row, w, h);
        const sprite = new Sprite(scene);
        sprite.x = x;
        sprite.y = y;
        Physics.prepareSprite(sprite);
        sprite.ph.w = TILESIZE * w;
        sprite.ph.h = TILESIZE * h;
        sprite.ph.pleft = 0;
        sprite.ph.ptop = 0;
        sprite.ph.invmass = 0;
        sprite.ph.gravity = false;
        sprites.push(sprite);
      }
    }
   
    return sprites;
  }
  
  clearRect(v, stride, x, y, w, h) {
    for (let rowp=y*stride+x; h-->0; rowp+=stride) {
      for (let colp=rowp, xi=w; xi-->0; colp++) {
        v[colp] = 0;
      }
    }
  }
}
