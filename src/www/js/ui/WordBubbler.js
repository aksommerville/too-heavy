/* WordBubbler.js
 * Manages rendering of word bubbles.
 * Private to CanvasUi.
 */
 
const TILESIZE = 16;
const GLYPH_W = 8;
const GLYPH_H = 8;
const BUBBLE_MARGIN = 3;
const BUBBLE_MARGIN_BOTTOM = 7;
 
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
    const ly = Math.floor(focusy - lh);
    let stemcol = layout.bubcolc >> 1;
    let lx = Math.floor(focusx - (stemcol + 0.5) * TILESIZE);
    while ((lx < 0) && (stemcol > 1)) {
      lx += TILESIZE;
      stemcol--;
    }
    while ((lx + lw > this.canvas.width) && (stemcol < layout.bubcolc - 2)) {
      lx -= TILESIZE;
      stemcol++;
    }
    
    const gw = layout.tcolc * GLYPH_W;
    const gh = layout.trowc * GLYPH_H;
    const gx = lx + (lw >> 1) - (gw >> 1);
    const gy = ly + ((lh - BUBBLE_MARGIN_BOTTOM) >> 1) - (gh >> 1);
    
    this.drawBackground(lx, ly, layout.bubcolc, layout.bubrowc, stemcol);
    this.drawGlyphs(gx, gy, layout.grid, layout.tcolc);
  }
  
  drawBackground(x0, y0, colc, rowc, stemcol) {
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
    for (let x=x0+TILESIZE, xi=mw, col=1; xi-->0; x+=TILESIZE, col++) {
      const tsrcx = (col === stemcol) ? (srcx + TILESIZE) : (srcx + TILESIZE * 3);
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
    text = (text || "").trim();
    
    /* The dumb way: Set an arbitrary width limit, break lines against that, then eliminate unnecessary width.
     * I guess that's not the dumbest thing we could do, actually.
     */
    const fbw = 320;
    const wlimit = Math.ceil((fbw / 3) / GLYPH_W);
    
    const lineStarts = [];
    for (let textp=0; textp<text.length; ) {
      let spacep = text.indexOf(" ", textp);
      if (spacep < 0) spacep = text.length;
      if (spacep <= textp) {
        textp++;
        continue;
      }
      if (lineStarts.length < 1) {
        lineStarts.push(textp);
        textp = spacep + 1;
        continue;
      }
      const linep = lineStarts[lineStarts.length - 1];
      const lineLenWith = spacep - linep;
      if (lineLenWith <= wlimit) {
        // keep it
      } else {
        // new line
        lineStarts.push(textp);
      }
      textp = spacep + 1;
    }
    
    // Rephrase as [p,c] for each line and record the widest. We now know the geometry of the text area.
    let tcolc = 0;
    const lines = lineStarts.map((p, i) => {
      let c = (lineStarts[i + 1] || text.length) - p;
      while ((c > 0) && (text[p + c - 1] === " ")) c--;
      if (c > tcolc) tcolc = c;
      return [p, c];
    });
    const trowc = lines.length;
    
    // Pad each line with spaces and subtract 0x20 from each byte, write out into the grid.
    const grid = [];
    for (const [p, c] of lines) {
      const extra = tcolc - c;
      const leftPad = extra >> 1;
      const rightPad = extra - leftPad;
      for (let i=leftPad; i-->0; ) grid.push(0);
      for (let i=0; i<c; i++) {
        let tileid = text.charCodeAt(p + i) - 0x20;
        if ((tileid < 0) || (tileid >= 0x60)) tileid = 0x1f;
        grid.push(tileid);
      }
      for (let i=rightPad; i-->0; ) grid.push(0);
    }
    
    // Geometry of the bubble can easily be calculated from the text area.
    let bubcolc = Math.ceil((tcolc * GLYPH_W + BUBBLE_MARGIN * 2) / TILESIZE);
    if (bubcolc < 3) bubcolc = 3;
    let bubrowc = Math.ceil((trowc * GLYPH_H + BUBBLE_MARGIN * 2 + BUBBLE_MARGIN_BOTTOM) / TILESIZE);
    if (bubrowc < 2) bubrowc = 2;
    
    return { text, bubcolc, bubrowc, tcolc, trowc, grid };
  }
}
