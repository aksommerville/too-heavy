/* WordBubbler.js
 * Manages rendering of word bubbles.
 * Private to CanvasUi.
 */
 
const TILESIZE = 16;
const GLYPH_W = 8;
const GLYPH_H = 8;
const BUBBLE_MARGIN_BOTTOM = 7;
const TARGET_RATIO = 5.5; // Glyphs are square, but an ideal word bubble is about twice as wide as tall.
 
export class WordBubbler {
  constructor(canvas) {
    this.canvas = canvas;
    
    this.layouts = []; // {text,bubcolc,bubrowc,tcolc,trowc,grid}
  }
  
  draw(focusx, focusy, text) {
  
    // Pull layout from the cache, or generate and cache it.
    let layout = this.layouts.find(l => l.text === text);
    if (!layout) {
      layout = this.calculateLayout(text);
      this.layouts.push(layout);
    }
    
    const lw = layout.bubcolc * TILESIZE;
    const lh = layout.bubrowc * TILESIZE;
    const lx = Math.floor(focusx - lw / 2); // TODO incorrect! We want (focusx) to be exactly where the stem ends up
    const ly = Math.floor(focusy - lh);
    this.drawBackground(lx, ly, layout.bubcolc, layout.bubrowc);
    
    const gw = layout.tcolc * GLYPH_W;
    const gh = layout.trowc * GLYPH_H;
    const gx = lx + (lw >> 1) - (gw >> 1);
    const gy = ly + ((lh - BUBBLE_MARGIN_BOTTOM) >> 1) - (gh >> 1);
    this.drawGlyphs(gx, gy, layout.grid, layout.tcolc);
  }
  
  drawBackground(x0, y0, colc, rowc) {
    if ((colc < 2) || (rowc < 2)) return;
    const srcx = 48;
    const srcy = 336;
    
    // corners
    this.canvas.drawDecal(x0, y0, srcx, srcy, TILESIZE, TILESIZE);
    this.canvas.drawDecal(x0 + (colc - 1) * TILESIZE, y0, srcx + TILESIZE * 2, srcy, TILESIZE, TILESIZE);
    this.canvas.drawDecal(x0, y0 + (rowc - 1) * TILESIZE, srcx, srcy + TILESIZE * 2, TILESIZE, TILESIZE);
    this.canvas.drawDecal(x0 + (colc - 1) * TILESIZE, y0 + (rowc - 1) * TILESIZE, srcx + TILESIZE * 2, srcy + TILESIZE * 2, TILESIZE, TILESIZE);
    
    // middle, plus left and right edges
    const mw = colc - 2;
    const mh = rowc - 2;
    const mx0 = x0 + TILESIZE;
    for (let y=y0 + TILESIZE, yi=mh; yi-->0; y+=TILESIZE) {
      for (let x=mx0, xi=mw; xi-->0; x+=TILESIZE) {
        this.canvas.drawDecal(x, y, srcx + TILESIZE, srcy + TILESIZE, TILESIZE, TILESIZE);
      }
      this.canvas.drawDecal(x0, y, srcx, srcy + TILESIZE, TILESIZE, TILESIZE);
      this.canvas.drawDecal(x0 + (colc - 1) * TILESIZE, y, srcx + TILESIZE * 2, srcy + TILESIZE, TILESIZE, TILESIZE);
    }
    
    // top edge
    for (let x=x0+TILESIZE, xi=mw; xi-->0; x+=TILESIZE) {
      this.canvas.drawDecal(x, y0, srcx + TILESIZE, srcy, TILESIZE, TILESIZE);
    }
    
    // bottom edge
    for (let x=x0+TILESIZE, xi=mw; xi-->0; x+=TILESIZE) {
      const tsrcx = (xi === mw >> 1) ? (srcx + TILESIZE) : (srcx + TILESIZE * 3);
      this.canvas.drawDecal(x, y0 + (rowc - 1) * TILESIZE, tsrcx, srcy + TILESIZE * 2, TILESIZE, TILESIZE);
    }
  }
  
  drawGlyphs(x0, y, grid, colc) {
    const srcx = 0;
    const srcy = 272;
    for (let p=0; p<grid.length; y+=GLYPH_H) {
      for (let x=x0, xi=colc; xi-->0; p++, x+=GLYPH_W) {
        const glyph = grid[p];
        this.canvas.drawDecal(x, y, srcx + (glyph & 0x0f) * GLYPH_W, srcy + (glyph >> 4) * GLYPH_H, GLYPH_W, GLYPH_H);
      }
    }
  }
  
  calculateLayout(text) {
    const words = text.split(' ');
    if (words.length < 1) return { text, bubcolc: 2, bubrowc: 2, tcolc: 0, trowc: 0, grid: "" };
    const layout = { text };
    
    //XXX I'm not happy with this algorithm, surely we can do better
    
    /* Estimate grid dimensions assuming we can land right on TARGET_RATIO.
     * If that ends up narrower than the longest word, use the longest word length instead.
     */
    let rowc = Math.ceil(Math.sqrt(text.length / TARGET_RATIO));
    let colc = Math.ceil(text.length / rowc);
    const longestWordLength = words.reduce((a, v) => Math.max(a, v.length), 0);
    if (colc < longestWordLength) {
      colc = longestWordLength;
      rowc = Math.ceil(text.length / colc);
    }
    
    /* Pack one word at a time into the grid, adding rows whenever we need them.
     * Grid will be an array of tile IDs -- ASCII code points minus 0x20.
     */
    let realrowc = 1;
    let x = 0, gridp = 0;
    const grid = [];
    for (let i=colc; i-->0; ) grid.push(0);
    for (const word of words) {
      if (x + word.length > colc) {
        realrowc++;
        gridp = grid.length;
        for (let i=colc; i-->0; ) grid.push(0);
        x = 0;
      }
      for (let i=0; i<word.length; i++) {
        let tileid = word.charCodeAt(i) - 0x20;
        if ((tileid < 0) || (tileid >= 0x60)) tileid = 0x1f; // '?' for invalid bytes
        grid[gridp++] = tileid;
      }
      x += word.length;
      if (x < colc ) {
        grid[gridp++] = 0x00;
        x++;
      }
    }
    
    // Done breaking words, commit to layout.
    layout.tcolc = colc;
    layout.trowc = realrowc;
    layout.grid = grid;
    
    /* Calculate how many tiles we need for the surrounding bubble.
     */
    const gridw = layout.tcolc * GLYPH_W;
    const gridh = layout.trowc * GLYPH_H;
    layout.bubcolc = Math.ceil((gridw + 4) / TILESIZE);
    layout.bubrowc = Math.ceil((gridh + 4 + BUBBLE_MARGIN_BOTTOM) / TILESIZE);
    if (layout.bubcolc < 3) layout.bubcolc = 3;
    if (layout.bubrowc < 2) layout.bubrowc = 2;
    
    return layout;
  }
}
