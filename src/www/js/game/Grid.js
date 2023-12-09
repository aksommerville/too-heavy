/* Grid.js
 * One Scene's worth of static geometry, expressed as a 2-dimensional grid.
 * I usually call these Maps but that's already a thing in Javascript.
 */
 
export class Grid {
  constructor() {
    this.w = 20; // in tiles
    this.h = 10; // in tiles
    this.v = []; // 0..255; length is w*h; laid out LRTB
    for (let i=this.w*this.h; i-->0; ) this.v.push(0);
    
    for (let x=0;x<this.w;x++) {
      this.v[(this.h-1)*this.w+x]=0x81;
      this.v[(this.h-2)*this.w+x]=0x01;
    }
  }
}
