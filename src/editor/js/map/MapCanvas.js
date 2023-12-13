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
    this.dstAdjustX = 0;
    this.dstAdjustY = 0;
    
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
    const col = Math.floor(x / this.mapPaintService.renderTileSize);
    const row = Math.floor(y / this.mapPaintService.renderTileSize);
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
    const dstw = this.mapPaintService.renderTileSize * this.mapPaintService.map.w;
    const dsth = this.mapPaintService.renderTileSize * this.mapPaintService.map.h;
    this.dstx = (this.element.width >> 1) - (dstw >> 1) + this.dstAdjustX;
    this.dsty = (this.element.height >> 1) - (dsth >> 1) + this.dstAdjustY;
    
    this.context.fillStyle = "#8ac";
    this.context.fillRect(this.dstx, this.dsty, dstw, dsth);

    const graphics = this.dataService.getFileSync("/data/image/1-main.png")?.serial;
    if (graphics) {
      this.context.imageSmoothingEnabled = false;
      const v = this.mapPaintService.map.v;
      for (let p=0, row=0, y=this.dsty; row<this.mapPaintService.map.h; row++, y+=this.mapPaintService.renderTileSize) {
        for (let col=0, x=this.dstx; col<this.mapPaintService.map.w; col++, x+=this.mapPaintService.renderTileSize, p++) {
          if (!v[p]) continue; // Tile zero is always transparent. (game runtime does the same thing)
          const srcx = (v[p] & 15) * TILESIZE;
          const srcy = (v[p] >> 4) * TILESIZE;
          this.context.drawImage(graphics, srcx, srcy, TILESIZE, TILESIZE, x, y, this.mapPaintService.renderTileSize, this.mapPaintService.renderTileSize);
        }
      }
    }
    
    /* Draw something for each command with any geographical content.
     * Not overthinking this... read the map's command list from scratch each render.
     * Commands can only be edited as text. That's not very user friendly, but any alternative would get pretty involved.
     */
    for (const cmd of this.mapPaintService.map.meta) {
      switch (cmd[0]) {
      
        case "door": { // X Y W H DSTMAPID DSTX DSTY
            const x = +cmd[1] * this.mapPaintService.renderTileSize + this.dstx;
            const y = +cmd[2] * this.mapPaintService.renderTileSize + this.dsty;
            const w = +cmd[3] * this.mapPaintService.renderTileSize;
            const h = +cmd[4] * this.mapPaintService.renderTileSize;
            this.context.fillStyle = "#f80";
            this.context.globalAlpha = 0.5;
            this.context.fillRect(x, y, w, h);
            this.context.globalAlpha = 1;
          } break;
          
        case "edgedoor": { // EDGE P C DSTMAPID OFFSET
            let x=this.dstx, y=this.dsty, w=this.mapPaintService.renderTileSize>>1, h=this.mapPaintService.renderTileSize>>1;
            switch (cmd[1]) {
              case "w": {
                  y = +cmd[2] * this.mapPaintService.renderTileSize + this.dsty;
                  h = +cmd[3] * this.mapPaintService.renderTileSize;
                } break;
              case "e": {
                  x += this.mapPaintService.map.w * this.mapPaintService.renderTileSize - w;
                  y = +cmd[2] * this.mapPaintService.renderTileSize + this.dsty;
                  h = +cmd[3] * this.mapPaintService.renderTileSize;
                } break;
              case "n": {
                  x = +cmd[2] * this.mapPaintService.renderTileSize + this.dsty;
                  w = +cmd[3] * this.mapPaintService.renderTileSize;
                } break;
              case "s": {
                  y += this.mapPaintService.map.h * this.mapPaintService.renderTileSize - h;
                  x = +cmd[2] * this.mapPaintService.renderTileSize + this.dsty;
                  w = +cmd[3] * this.mapPaintService.renderTileSize;
                } break;
            }
            this.context.fillStyle = "#0f0";
            this.context.globalAlpha = 0.5;
            this.context.fillRect(x, y, w, h);
            this.context.globalAlpha = 1;
          } break;
          
        case "hero": {
            this.context.beginPath();
            this.context.arc(
              (+cmd[1] + 0.5) * this.mapPaintService.renderTileSize + this.dstx,
              (+cmd[2] + 0.5) * this.mapPaintService.renderTileSize + this.dsty,
              this.mapPaintService.renderTileSize / 2, 0, Math.PI * 2
            );
            this.context.fillStyle = "#406";
            this.context.fill();
          } break;
          
        case "sprite": {
            this.context.beginPath();
            this.context.arc(
              (+cmd[1] + 0.5) * this.mapPaintService.renderTileSize + this.dstx,
              (+cmd[2] + 0.5) * this.mapPaintService.renderTileSize + this.dsty,
              this.mapPaintService.renderTileSize / 2, 0, Math.PI * 2
            );
            this.context.fillStyle = "#ff0";
            this.context.fill();
          } break;
          
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
      case "renderTileSize": this.renderSoon(); break;
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
    const adjustSpeed = 40; // in screen pixels, regardless of zoom
    this.dstAdjustX -= dx * adjustSpeed;
    this.dstAdjustY -= dy * adjustSpeed;
    this.renderSoon();
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
