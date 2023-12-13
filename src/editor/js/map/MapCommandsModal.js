/* MapCommandsModal.js
 * A big text dump of the map's command list.
 * Could add UI with command-specific knowledge... probly not worth it.
 */
 
import { Dom } from "../core/Dom.js";
import { MapPaintService } from "./MapPaintService.js";

export class MapCommandsModal {
  static getDependencies() {
    return [HTMLElement, Dom, MapPaintService, Window];
  }
  constructor(element, dom, mapPaintService, window) {
    this.element = element;
    this.dom = dom;
    this.mapPaintService = mapPaintService;
    this.window = window;
    
    this.dirtyTimeout = null;
    
    this.buildUi();
    this.paintListener = this.mapPaintService.listen(e => this.onPaintEvent(e));
    this.populateUi();
  }
  
  onRemoveFromDom() {
    this.mapPaintService.unlisten(this.paintListener);
    if (this.dirtyTimeout) {
      this.window.clearTimeout(this.dirtyTimeout);
      // We have to discard the last changes. By the time this gets called, (this.element) has been blanked.
      // Don't close the modal while it's dirty.
    }
  }
  
  buildUi() {
    this.element.innerHTML = "";
    this.dom.spawn(this.element, "TEXTAREA", { "on-input": () => this.dirty() });
  }
  
  /* Debounce notifications upstream. 
   * MapUi encodes and saves the map every time it gets a "modify", so it would be hamfisted to force that on every keystroke.
   */
  dirty() {
    if (this.dirtyTimeout) {
      this.window.clearTimeout(this.dirtyTimeout);
    } else {
      this.element.classList.add("dirty");
    }
    this.dirtyTimeout = this.window.setTimeout(() => {
      this.dirtyTimeout = null;
      this.sendChangesNow();
    }, 500);
  }
  
  sendChangesNow() {
    if (!this.mapPaintService.map) return;
    const text = this.element.querySelector("textarea").value;
    this.mapPaintService.map.meta = text.split("\n").map(line => line.split(/\s+/));
    this.element.classList.remove("dirty");
    this.mapPaintService.broadcast({ id: "modify" });
  }
  
  populateUi() {
    const textarea = this.element.querySelector("textarea");
    if (!this.mapPaintService.map) {
      textarea.value = "";
    } else {
      textarea.value = this.mapPaintService.map.meta.map(cmd => cmd.join(' ')).join('\n');
    }
  }
  
  onPaintEvent(e) {
    switch (e.id) {
      // We should listen for changes to map, but cmon we're a modal. Nobody else is changing it while we're open.
    }
  }
}
