/* Grid.js
 * One Scene's worth of static geometry, expressed as a 2-dimensional grid.
 * I usually call these Maps but that's already a thing in Javascript.
 */
 
import { Sprite } from "./Sprite.js";
import { Physics } from "./Physics.js";

const TILESIZE = 16;
 
export class Grid {
  constructor(serial) {
    const src = serial.trim();
    let srcp = 0;
    this.v = [];
    this.w = 0;
    this.h = 0;
    this.meta = [];
    while (srcp < src.length) {
      let nlp = src.indexOf("\n", srcp);
      if (nlp < 0) nlp = src.length;
      const line = src.substring(srcp, nlp).trim();
      srcp = nlp + 1;
      if (!line) break;
      if (!this.w) {
        if ((line.length < 2) || (line.length & 1)) throw new Error(`invalid map line: ${line}`);
        this.w = line.length >> 1;
      } else if (line.length !== this.w << 1) {
        throw new Error(`invalid map line: ${line}`);
      }
      for (let linep=0; linep<line.length; linep+=2) this.v.push(parseInt(line.substring(linep, linep+2), 16));
      this.h++;
    }
    if ((this.w < 1) || (this.h < 1)) throw new Error(`Serial map has no cells`);
    this.v = new Uint8Array(this.v);
    while (srcp < src.length) {
      let nlp = src.indexOf("\n", srcp);
      if (nlp < 0) nlp = src.length;
      const line = src.substring(srcp, nlp).split("#")[0].trim();
      srcp = nlp + 1;
      if (!line) continue;
      const tokens = line.split(/\s+/);
      this.meta.push(tokens);
    }
  }
  
  /* Return an array of Sprite for our solid regions.
   */
  generateStaticSprites(scene) {
    const sprites = [];
    
    // Copy the cells and convert to physics (see bottom of file).
    const c = this.w * this.h;
    const v = new Uint8Array(this.v);
    for (let i=c; i-->0; ) v[i] = Grid.CELLPHYSICS[v[i]];
    
    // Read LRTB and at each solid cell, extend leftward then downward. Create a sprite and zero those cells.
    for (let y=0, row=0, p=0; row<this.h; row++, y+=TILESIZE) {
      for (let x=0, col=0; col<this.w; col++, x+=TILESIZE, p++) {
      
        // Vacant, skip it.
        if (!v[p]) continue;
        
        let w = 1;
        while ((col + w < this.w) && (v[p + w] === v[p])) w++;
        let h = 1;
        if (v[p] !== 2) { // oneway does not extend vertically. (solid,hazard) do.
          let subp = p + this.w;
          while (row + h < this.h) {
            let allsolid = true;
            for (let subxp=subp, i=w; i-->0; subxp++) {
              if (v[subxp] !== v[p]) {
                allsolid = false;
                break;
              }
            }
            if (!allsolid) break;
            h++;
            subp += this.w;
          }
        }
        const phtype = v[p];
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
        switch (phtype) {
          case 1: sprite.ph.role = "solid"; break;
          case 2: sprite.ph.role = "oneway"; break;
          case 3: sprite.ph.role = "hazard"; break;
        }
        sprites.push(sprite);
        
        /* If we touch an edge of the grid, extend say 1000 pixels offscreen.
         * That's incorrect behavior for oneways at the top, so we carve out an exception for that.
         */
        const extend = 1000;
        if (!sprite.x) {
          sprite.x -= extend;
          sprite.ph.w += extend;
        }
        if (!sprite.y && (sprite.ph.role !== "oneway")) {
          sprite.y -= extend;
          sprite.ph.h += extend;
        }
        if (sprite.x + sprite.ph.w >= TILESIZE * this.w) {
          sprite.ph.w += extend;
        }
        if (sprite.y + sprite.ph.h >= TILESIZE * this.h ) {
          sprite.ph.h += extend;
        }
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

// (0,1,2,3) = (vacant,solid,oneway,hazard)
Grid.CELLPHYSICS = [
  0,0,0,0,0,3,3,0, 0,0,0,0,0,1,3,0,
  0,0,0,0,0,0,0,0, 0,0,0,0,0,1,3,0,
  0,0,0,0,0,0,0,0, 0,0,0,0,0,1,0,0,
  0,0,0,0,0,2,2,2, 3,0,0,0,0,0,0,0,
  2,2,2,2,2,2,2,2, 3,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,
  
  1,1,1,1,1,0,0,0, 0,0,0,0,0,0,0,0,
  1,1,1,1,1,0,0,0, 0,0,0,0,0,0,0,0,
  1,1,1,1,1,0,0,0, 0,0,0,0,0,0,0,0,
  1,1,1,1,1,0,0,0, 0,0,0,0,0,0,0,0,
  1,1,1,1,1,0,0,0, 0,0,0,0,0,0,0,0,
  1,1,1,1,1,0,0,0, 0,0,0,0,0,0,0,0,
  1,1,1,1,1,1,1,0, 0,0,0,0,0,0,0,0,
  0,0,0,1,1,1,1,0, 0,0,0,0,0,0,0,0,
];
