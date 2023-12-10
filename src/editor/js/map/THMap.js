/* THMap.js
 * Models one mutable map file.
 * Our serial format is text. You may provide string or arrayBuffer. We produce string.
 */
 
export class THMap {
  constructor(...args) {
    this.init();
    if (args.length === 0) {
      // Blank zero-size map. That won't be legal to save but you can at least create one.
      return;
    } else if (args.length === 2) {
      // Two args, must be (w,h).
      if ((typeof(args[0]) === "number") && (typeof(args[1]) === "number")) {
        return this.resize(args[0], args[1]);
      }
    } else if (args.length === 1) {
      if (args[0] instanceof THMap) {
        return this.copy(args[0]);
      } else if (typeof(args[0]) === "string") {
        return this.decode(args[0]);
      } else if (args[0] instanceof ArrayBuffer) {
        return this.decode(new TextDecoder("utf-8").decode(args[0]));
      } else if (args[0] instanceof Uint8Array) {
        return this.decode(new TextDecoder("utf-8").decode(args[0]));
      }
    }
    throw new Error(`Unable to instantiate THMap with these arguments: ${JSON.stringify(args)}`);
  }
  
  /* Resize the map in place.
   * (anchor) is a neighbor bit. 0x80=NW, 0x40=N, 0x10=W, 0x01=SE. That corner is kept and the excess added opposite.
   */
  resize(w, h, anchor) {
    if ((w === this.w) && (h === this.h)) return;
    if ((w < 1) || (h < 1)) throw new Error(`Invalid map dimensions ${w}x${h}`);
    const nv = new Uint8Array(w * h);
    let dstx, dsty;
    switch (anchor) {
      case 0x80: dstx = 0; dsty = 0; break;
      case 0x40: dstx = (w >> 1) - (this.w >> 1); dsty = 0; break;
      case 0x20: dstx = w - this.w; dsty = 0; break;
      case 0x10: dstx = 0; dsty = (h >> 1) - (this.h >> 1); break;
      case 0x08: dstx = w - this.w; dsty = (h >> 1) - (this.h >> 1); break;
      case 0x04: dstx = 0; dsty = h - this.h; break;
      case 0x02: dstx = (w >> 1) - (this.w >> 1); dsty = h - this.h; break;
      case 0x01: dstx = w - this.w; dsty = h - this.h; break;
      default: dstx = (w >> 1) - (this.w >> 1); dsty = (h >> 1) - (this.h >> 1); break;
    }
    THMap.copyCells(nv, dstx, dsty, w, h, this.v, 0, 0, this.w, this.h);
    this.w = w;
    this.h = h;
    this.v = nv;
  }
  
  encode() {
    let dst = "";
    for (let y=0, p=0; y<this.h; y++) {
      for (let x=0; x<this.w; x++, p++) {
        const tileid = this.v[p];
        dst += tileid.toString(16).padStart(2, "0");
      }
      dst += "\n";
    }
    dst += "\n";
    for (const cmd of this.meta) {
      dst += cmd.join(" ") + "\n";
    }
    return dst;
  }
  
  /* Private.
   ****************************************************************************/
  
  init() {
    this.w = 0;
    this.h = 0;
    this.v = []; // Uint8Array, but when empty it can be a plain array too
    this.meta = []; // string[][]
  }
  
  copy(src) {
    this.w = src.w;
    this.h = src.h;
    if (this.w && this.h) {
      this.v = new Uint8Array(this.w * this.h);
      this.v.set(src.v);
    } else {
      this.v = [];
    }
    this.meta = src.meta.map(m => [...m]);
  }
  
  decode(src) {
  
    // Begins with a hex dump picture of the grid. This establishes the geometry in addition to the content.
    // That ends at the first blank line.
    let w=0, h=0, v=[], srcp=0, lineno=0;
    for (; srcp<src.length; ) {
      lineno++;
      let nlp = src.indexOf("\n", srcp);
      if (nlp < 0) nlp = src.length;
      const line = src.substring(srcp, nlp).trim();
      srcp = nlp + 1;
      if (!line) break;
      if ((line.length < 2) || (line.length & 1)) {
        throw new Error(`${lineno}: Line length must be a positive multiple of 2, found ${line.length}`);
      }
      if (!w) { // First line of picture establishes required width.
        w = line.length >> 1;
      } else if ((line.length >> 1) !== w) {
        throw new Error(`${lineno}: Expected ${w} columns, found ${line.length >> 1}`);
      }
      for (let linep=0; linep<line.length; linep+=2) {
        // Can't parseInt the digits together, because if the second digit is invalid, it will do just the first.
        // What the fuck, javascript? Why?
        const hi = parseInt(line[linep], 16);
        const lo = parseInt(line[linep+1], 16);
        if (isNaN(hi) || isNaN(lo)) {
          // ugh we also have to isNaN() them individually. (NaN<<4)|NaN === 0
          throw new Error(`${lineno}: Invalid characters in grid image: ${JSON.stringify(line.substring(linep, linep+2))}`);
        }
        const tileid = (hi << 4) | lo;
        v.push(tileid);
      }
      h++;
    }
    if ((w < 1) || (h < 1)) throw new Error(`Expected hex dump of grid`);
    
    this.w = w;
    this.h = h;
    this.v = new Uint8Array(w * h);
    for (let i=w*h; i-->0; ) this.v[i] = v[i];
    
    // Every line after the picture is a meta command. Array of strings, we don't care what they mean.
    this.meta = [];
    while (srcp < src.length) {
      lineno++;
      let nlp = src.indexOf("\n", srcp);
      if (nlp < 0) nlp = src.length;
      const line = src.substring(srcp, nlp).split("#")[0].trim();
      srcp = nlp + 1;
      if (!line) continue;
      this.meta.push(line.split(/\s+/));
    }
  }
  
  /* (w,h) are the full size of each buffer.
   * (x,y) are the position to copy to/from.
   * The actual dimensions copied are the maximum possible.
   */
  static copyCells(dst, dstx, dsty, dstw, dsth, src, srcx, srcy, srcw, srch) {
    let cpw = Math.min(dstw - dstx, srcw - srcx);
    let cph = Math.min(dsth - dsty, srch - srcy);
    if (dstx < 0) { srcx -= dstx; cpw += dstx; dstx = 0; }
    if (dsty < 0) { srcy -= dsty; cph += dsty; dsty = 0; }
    if (srcx < 0) { dstx -= srcx; cpw += srcx; srcx = 0; }
    if (srcy < 0) { dsty -= srcy; cph += srcy; srcy = 0; }
    if ((cpw < 1) || (cph < 1)) return;
    let dstrowp = dsty * dstw + dstx;
    let srcrowp = srcy * srcw + srcx;
    for (; cph-->0; dstrowp+=dstw, srcrowp+=srcw) {
      let dstp = dstrowp;
      let srcp = srcrowp;
      for (let xi=cpw; xi-->0; dstp++, srcp++) {
        dst[dstp] = src[srcp];
      }
    }
  }
}
