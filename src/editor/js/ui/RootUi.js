/* RootUi.js (editor)
 */
 
import { Dom } from "../core/Dom.js";
import { ScrollList } from "./ScrollList.js";
import { DataService } from "../DataService.js";
import { MapUi } from "../map/MapUi.js";

export class RootUi {
  static getDependencies() {
    return [HTMLElement, Dom, Window, DataService];
  }
  constructor(element, dom, window, dataService) {
    this.element = element;
    this.dom = dom;
    this.window = window;
    this.dataService = dataService;
    
    this.scrollList = null; // ScrollList, always present after buildUi
    this.editController = null; // Various types, can stay null.
    
    this.buildUi();
    
    this.dataService.getAllFiles().then(files => {
      this.onDataFilesLoaded(files);
    }).catch(error => {
      this.onError(error);
    });
  }
  
  buildUi() {
    this.element.innerHTML = "";
    this.scrollList = this.dom.spawnController(this.element, ScrollList);
    this.scrollList.cbClick = k => this.onScrollListClick(k);
    this.dom.spawn(this.element, "DIV", ["editSpace"]);
    this.editController = null;
  }
  
  onScrollListClick(path) {
    this.scrollList.highlightItem(path);
    const file = this.dataService.getFileSync(path);
    const editSpace = this.element.querySelector(".editSpace");
    const outgoingController = editSpace.childNodes?.[0]?.__controller;
    outgoingController?.unsetup?.();
    editSpace.innerHTML = "";
    this.editController = null;
    switch (file.tid) {
      case "map": this.editController = this.dom.spawnController(editSpace, MapUi); break;
    }
    if (this.editController) {
      this.editController.setup(file);
    }
  }
  
  onDataFilesLoaded(files) {
    this.scrollList.clear();
    for (const file of files) {
      const label = this.dataService.reprFile(file);
      this.scrollList.addItem(file.path, label);
    }
  }
  
  onError(error) {
    // Being an editor, it's reasonable to insist that user keep his console open for error reporting.
    this.window.console.error(`Error reported to RootUi`, error);
  }
}
