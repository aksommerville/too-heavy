/* MapUi.js
 * Public interface to map editor, for a single map.
 * This gets instantiated by RootUi.
 */
 
import { Dom } from "../core/Dom.js";
import { DataService } from "../DataService.js";
import { THMap } from "./THMap.js";
import { MapCanvas } from "./MapCanvas.js";
import { MapPaintService } from "./MapPaintService.js";
import { MapToolbar } from "./MapToolbar.js";

export class MapUi {
  static getDependencies() {
    return [HTMLElement, Dom, DataService, MapPaintService];
  }
  constructor(element, dom, dataService, mapPaintService) {
    this.element = element;
    this.dom = dom;
    this.dataService = dataService;
    this.mapPaintService = mapPaintService;
    
    this.map = null;
    this.file = null;
    this.mapCanvas = null;
    
    this.buildUi();
    
    this.paintListener = this.mapPaintService.listen(e => this.onPaintEvent(e));
  }
  
  onRemoveFromDom() {
    // Beware that by the time we get this event, MapPaintService could be on to its next thing.
    this.mapPaintService.unsetup(this.map, this.file);
    this.mapPaintService.unlisten(this.paintListener);
    this.paintListener = null;
  }
  
  setup(file) {
    if (file) {
      this.file = {...file};
      this.map = new THMap(file.serial);
    } else {
      this.file = null;
      this.map = new THMap(20, 10);
    }
    this.mapPaintService.setup(this.map, this.file);
  }
  
  unsetup() {
    this.mapPaintService.unsetup(this.map, this.file);
    this.mapPaintService.unlisten(this.paintListener);
    this.paintListener = null;
  }
  
  buildUi() {
    this.element.innerHTML = "";
    this.dom.spawnController(this.element, MapToolbar);
    this.mapCanvas = this.dom.spawnController(this.element, MapCanvas);
  }
  
  onPaintEvent(event) {
    switch (event.id) {
      case "modify": this.onModify(); break;
    }
  }
  
  onModify() {
    if (!this.map || !this.file) return;
    const serial = new TextEncoder("utf-8").encode(this.map.encode()).buffer;
    this.dataService.updateFile(this.file.path, serial)
      .catch(error => console.error(`Failed to save map ${this.file.path}`, error));
  }
}
