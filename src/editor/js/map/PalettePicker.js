/* PalettePicker.js
 * Modal controller that shows the whole tilesheet and lets you pick one.
 * No setup or callbacks; all communication runs through MapPaintService.
 */
 
import { Dom } from "../core/Dom.js";
import { DataService } from "../DataService.js";
import { MapPaintService } from "./MapPaintService.js";

const TILESIZE = 16;

export class PalettePicker {
  static getDependencies() {
    return [HTMLCanvasElement, Dom, DataService, MapPaintService];
  }
  constructor(element, dom, dataService, mapPaintService) {
    this.element = element;
    this.dom = dom;
    this.dataService = dataService;
    this.mapPaintService = mapPaintService;
    
    this.paintListener = this.mapPaintService.listen(e => this.onPaintEvent(e));
    this.element.addEventListener("click", e => this.onClick(e));
    
    this.render();
  }
  
  onRemoveFromDom() {
    this.mapPaintService.unlisten(this.paintListener);
  }
  
  render() {
    this.element.width = TILESIZE * 16;
    this.element.height = TILESIZE * 16;
    const context = this.element.getContext("2d");
    
    /* Draw a checkboard or something behind the tilesheet to guide the eye.
     * If the tilesheet is fully opaque, we won't get to see it, whatever.
     */
    context.fillStyle = "#fff";
    context.fillRect(0, 0, this.element.width, this.element.height);
    context.fillStyle = "#eee";
    context.globalAlpha = 0.5;
    for (let col=0; col<16; col+=2) {
      context.fillRect(col * TILESIZE, 0, TILESIZE, this.element.height);
    }
    for (let row=0; row<16; row+=2) {
      context.fillRect(0, row * TILESIZE, this.element.width, TILESIZE);
    }
    context.globalAlpha = 1;
    
    if (this.dataService.graphics) {
      context.drawImage(this.dataService.graphics, 0, 0, this.element.width, this.element.height, 0, 0, this.element.width, this.element.height);
    }
    
    context.beginPath();
    context.rect(
      (this.mapPaintService.paletteTile & 0x0f) * TILESIZE + 0.5,
      (this.mapPaintService.paletteTile >> 4) * TILESIZE + 0.5,
      TILESIZE - 1, TILESIZE - 1
    );
    context.strokeStyle = "#f80";
    context.stroke();
  }
  
  onPaintEvent(event) {
    switch (event.id) {
      case "paletteTile": this.render(); break;
    }
  }
  
  onClick(event) {
    const bounds = this.element.getBoundingClientRect();
    const colw = bounds.width / 16;
    const rowh = bounds.height / 16;
    const x = event.x - bounds.x;
    const y = event.y - bounds.y;
    const col = Math.floor(x / colw);
    const row = Math.floor(y / rowh);
    if ((col < 0) || (row < 0) || (col >= 16) || (row >= 16)) return;
    const tileid = (row << 4) | col;
    this.mapPaintService.onChooseTile(tileid);
    this.dom.dismissModalByController(this);
  }
}
