/* MapToolbar.js
 * Everything in MapUi that isn't MapCanvas.
 * Paint tools, selected tile, mouse tattle, ...
 */
 
import { Dom } from "../core/Dom.js";
import { MapPaintService } from "./MapPaintService.js";
import { DataService } from "../DataService.js";
import { PalettePicker } from "./PalettePicker.js";
import { ResizeModal } from "./ResizeModal.js";

const TILESIZE = 16;

export class MapToolbar {
  static getDependencies() {
    return [HTMLElement, Dom, MapPaintService, DataService];
  }
  constructor(element, dom, mapPaintService, dataService) {
    this.element = element;
    this.dom = dom;
    this.mapPaintService = mapPaintService;
    this.dataService = dataService;
    
    this.buildUi();
    
    this.paintListener = this.mapPaintService.listen(e => this.onPaintEvent(e));
  }
  
  onRemoveFromDom() {
    this.mapPaintService.unlisten(this.paintListener);
    this.paintListener = null;
  }
  
  buildUi() {
    this.element.innerHTML = "";
    const tools = this.dom.spawn(this.element, "DIV", ["tools"]);
    for (const tool of MapPaintService.TOOLS) {
      this.dom.spawn(tools, "IMG", ["tool"], {
        "data-name": tool.name,
        src: `/editor/img/tool-${tool.name}.png`,
        "on-mousedown": e => this.onClickTool(e, tool.name),
        "on-contextmenu": e => { e.preventDefault(); e.stopPropagation(); },
      });
    }
    this.dom.spawn(this.element, "DIV", ["tattle"], "       ");
    this.dom.spawn(this.element, "CANVAS", ["palette"], { "on-click": () => this.onPaletteClick() });
    this.dom.spawn(this.element, "INPUT", { type: "button", value: "Resize", "on-click": () => this.onResize() });
    this.updateToolHighlight();
    this.updateTattle();
    this.updatePalette();
  }
  
  updateToolHighlight() {
    for (const element of this.element.querySelectorAll(".tool.highlight")) {
      element.classList.remove("highlight");
      element.classList.remove("explicitLeft");
      element.classList.remove("effectiveLeft");
      element.classList.remove("explicitRight");
      element.classList.remove("effectiveRight");
    }
    let element;
    if (element = this.element.querySelector(`.tool[data-name='${this.mapPaintService.toolLeft}']`)) {
      element.classList.add("highlight");
      element.classList.add("explicitLeft");
    }
    if (element = this.element.querySelector(`.tool[data-name='${this.mapPaintService.toolRight}']`)) {
      element.classList.add("highlight");
      element.classList.add("explicitRight");
    }
    if (element = this.element.querySelector(`.tool[data-name='${this.mapPaintService.getToolForButton(0)}']`)) {
      element.classList.add("highlight");
      element.classList.add("effectiveLeft");
    }
    if (element = this.element.querySelector(`.tool[data-name='${this.mapPaintService.getToolForButton(2)}']`)) {
      element.classList.add("highlight");
      element.classList.add("effectiveRight");
    }
  }
  
  updateTattle() {
    const x = this.mapPaintService.mousex.toString().padStart(3);
    const y = this.mapPaintService.mousey.toString().padStart(3);
    this.element.querySelector(".tattle").innerText = x + ',' + y;
  }
  
  updatePalette() {
    const canvas = this.element.querySelector(".palette");
    canvas.width = TILESIZE + 2;
    canvas.height = TILESIZE + 2;
    const context = canvas.getContext("2d");
    
    context.fillStyle = "#6af";
    context.fillRect(0, 0, TILESIZE + 2, TILESIZE + 2);
    
    const graphics = this.dataService.getFileSync("/data/image/1-main.png")?.serial;
    if (graphics) {
      const srcx = (this.mapPaintService.paletteTile & 0x0f) * TILESIZE;
      const srcy = (this.mapPaintService.paletteTile >> 4) * TILESIZE;
      context.drawImage(graphics, srcx, srcy, TILESIZE, TILESIZE, 1, 1, TILESIZE, TILESIZE);
    }
  }
  
  onPaintEvent(event) {
    switch (event.id) {
      case "explicitToolLeft":
      case "effectiveToolLeft":
      case "explicitToolRight":
      case "effectiveToolRight": this.updateToolHighlight(); break;
      case "motion": this.updateTattle(); break;
      case "paletteTile": this.updatePalette(); break;
    }
  }
  
  onClickTool(event, name) {
    this.mapPaintService.onChooseTool(event.button, name);
    // Don't change any UI. Wait for MapPaintService to tell us about it.
  }
  
  onPaletteClick() {
    const modal = this.dom.spawnModal(PalettePicker);
  }
  
  onResize() {
    if (!this.mapPaintService.map) return;
    const modal = this.dom.spawnModal(ResizeModal);
    modal.setup(this.mapPaintService.map.w, this.mapPaintService.map.h);
    modal.onCommit = (w, h, anchor) => this.mapPaintService.onResize(w, h, anchor);
    this.dom.dismissModalByController(this);
  }
}
