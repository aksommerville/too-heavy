/* MapCanvas.js
 * Responsible for display the map's cells and delivering mouse events on them.
 * This is *not* the painting logic -- see MapPaintService.js.
 *
 * If scrolling were in play, that would be our responsibility.
 * But that's so comlicated, and I'm not expecting to make really big maps for Too Heavy.
 * Let's try without scrolling.
 */
 
import { Dom } from "../core/Dom.js";
import { MapPaintService } from "./MapPaintService.js";
import { DataService } from "../DataService.js";

const TILESIZE = 16;

export class MapCanvas {
  static getDependencies() {
    return [HTMLCanvasElement, Dom, MapPaintService, Window, DataService];
  }
  constructor(element, dom, mapPaintService, window, dataService) {
    this.element = element;
    this.dom = dom;
    this.mapPaintService = mapPaintService;
    this.window = window;
    this.dataService = dataService;
    
    // Position and scale for the final render, also needed for event processing.
    this.dstx = 0;
    this.dsty = 0;
    this.dsttilesize = TILESIZE;
    
    this.context = this.element.getContext("2d");
    this.paintListener = this.mapPaintService.listen(e => this.onPaintEvent(e));
    this.renderTimeout = null;
    this.element.addEventListener("mousemove", e => this.onMouseMove(e));
    this.element.addEventListener("mousedown", e => this.onMouseDown(e));
    this.element.addEventListener("mouseup", e => this.onMouseUp(e));
    this.element.addEventListener("contextmenu", e => this.onContextMenu(e));
    this.element.addEventListener("wheel", e => this.onWheel(e));
    
    // We also attach a passive keyup/keydown listener to window, to track modifier keys.
    this.keyListener = e => this.onKey(e);
    this.window.addEventListener("keydown", this.keyListener);
    this.window.addEventListener("keyup", this.keyListener);
  }
  
  onRemoveFromDom() {
    this.mapPaintService.unlisten(this.paintListener);
    this.paintListener = null;
    if (this.renderTimeout) {
      this.window.clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }
    if (this.keyListener) {
      this.window.removeEventListener("keydown", this.keyListener);
      this.window.removeEventListener("keyup", this.keyListener);
      this.keyListener = null;
    }
  }
  
  // Render on a short timeout, in case changes come in fast, we can aggregate very close ones.
  renderSoon() {
    if (this.renderTimeout) return;
    this.renderTimeout = this.window.setTimeout(() => {
      this.renderTimeout = null;
      this.renderNow();
    }, 50);
  }
  
  /* Transformation.
   *************************************************************************/
   
  mapPositionFromEvent(e) {
    const bounds = this.element.getBoundingClientRect();
    const x = e.clientX - bounds.x - this.dstx;
    const y = e.clientY - bounds.y - this.dsty;
    const col = Math.floor(x / this.dsttilesize);
    const row = Math.floor(y / this.dsttilesize);
    return [col, row];
  }
  
  /* Rendering.
   ************************************************************************************/
  
  renderNow() {
    this.element.width = this.element.offsetWidth;
    this.element.height = this.element.offsetHeight;
    this.context.fillStyle = "#888";
    this.context.fillRect(0, 0, this.element.width, this.element.height);
    if (!this.mapPaintService.map) return;
    
    /* Calculate the exact world dimensions in pixels, then select a tilesize by fitting that to our canvas size.
     */
    const worldw = this.mapPaintService.map.w * TILESIZE;
    const worldh = this.mapPaintService.map.h * TILESIZE;
    this.dsttilesize = Math.floor(Math.min(this.element.width / this.mapPaintService.map.w, this.element.height / this.mapPaintService.map.h));
    if (this.dsttilesize < 4) this.dsttilesize = 4; // oh no, maybe we do need scrolling?
    else if (this.dsttilesize >= 16) this.dsttilesize &= ~15; // constrain to multiples of the natural tile, if larger
    const dstw = this.dsttilesize * this.mapPaintService.map.w;
    const dsth = this.dsttilesize * this.mapPaintService.map.h;
    this.dstx = (this.element.width >> 1) - (dstw >> 1);
    this.dsty = (this.element.height >> 1) - (dsth >> 1);
    
    this.context.fillStyle = "#8ac";
    this.context.fillRect(this.dstx, this.dsty, dstw, dsth);
    
    this.context.imageSmoothingEnabled = false;
    const v = this.mapPaintService.map.v;
    for (let p=0, row=0, y=this.dsty; row<this.mapPaintService.map.h; row++, y+=this.dsttilesize) {
      for (let col=0, x=this.dstx; col<this.mapPaintService.map.w; col++, x+=this.dsttilesize, p++) {
        if (!v[p]) continue; // Tile zero is always transparent. (game runtime does the same thing)
        const srcx = (v[p] & 15) * TILESIZE;
        const srcy = (v[p] >> 4) * TILESIZE;
        this.context.drawImage(this.dataService.graphics, srcx, srcy, TILESIZE, TILESIZE, x, y, this.dsttilesize, this.dsttilesize);
      }
    }
  }
  
  /* Events.
   ******************************************************************************/
  
  onPaintEvent(event) {
    switch (event.id) {
      case "setup": this.renderSoon(); break;
      case "shutdown": this.renderSoon(); break;
      case "modify": this.renderSoon(); break;
      case "dirty": this.renderSoon(); break;
    }
  }
  
  onMouseMove(e) {
    const pos = this.mapPositionFromEvent(e);
    this.mapPaintService.onMotion(pos[0], pos[1]);
  }
  
  onMouseDown(e) {
    const pos = this.mapPositionFromEvent(e);
    this.mapPaintService.onMouseDown(e.button, pos[0], pos[1]);
  }
  
  onMouseUp(e) {
    const pos = this.mapPositionFromEvent(e);
    this.mapPaintService.onMouseUp(e.button, pos[0], pos[1]);
  }
  
  onWheel(e) {
    // My silly browser emits these in increments of 120, and doesn't swap X/Y with shift.
    // No idea where the 120 number comes from. We'll reduce it to just the sign, and swap axes manually.
    let dx=0, dy=0;
    if (e.deltaX < 0) dx = -1;
    else if (e.deltaX > 0) dx = 1;
    if (e.deltaY < 0) dy = -1;
    else if (e.deltaY > 0) dy = 1;
    if (e.shiftKey && dy && !dx) {
      dx = dy;
      dy = 0;
    }
    const pos = this.mapPositionFromEvent(e);
    this.mapPaintService.onWheel(dx, dy, pos[0], pos[1]);
  }
  
  onContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  onKey(e) {
    let mod = 0;
    if (e.shiftKey) mod |= MapPaintService.MOD_SHIFT;
    if (e.ctrlKey) mod |= MapPaintService.MOD_CONTROL;
    if (e.altKey) mod |= MapPaintService.MOD_ALT;
    if (e.metaKey) mod |= MapPaintService.MOD_SUPER; // Chrome Ubuntu, this I guess gets eaten by the window manager and not reported.
    this.mapPaintService.onModifiers(mod);
  }
}
