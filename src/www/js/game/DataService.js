/* DataService.js
 * Eventually we should have the data in a single archive, preferably inlined in index.html.
 * When that happens, DataService will be responsible for decoding it and storing the live objects.
 * Right now, we read everything piecemeal from the source directory (and Images are something else).
 * We're essentially the same thing as the editor's DataService. That shouldn't be the case before we get to prod.
 */
 
import { Grid } from "./Grid.js";
 
export const RESTYPES = ["image", "map"];
 
export class DataService {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.files = []; // {tid,rid,serial,name,path,object} ; object gets instantiated lazily
    this.loaded = false;
    this.loadPromise = null;
  }
  
  getResourceSync(tid, rid) {
    const file = this.files.find(f => f.tid === tid && f.rid === rid);
    if (!file) return null;
    if (!file.object) {
      file.object = this.instantiateResource(file.tid, file.serial, file);
    }
    return file.object;
  }
  
  instantiateResource(tid, serial, file) {
    switch (tid) {
      case "map": return new Grid(serial);
    }
    // Default, use the incoming ArrayBuffer verbatim.
    return serial;
  }
  
  load() {
    if (this.loaded) return Promise.resolve();
    for (const element of this.window.document.querySelectorAll("th-res")) {
      const tid = element.getAttribute("data-tid");
      if (!tid) continue;
      const rid = +element.getAttribute("data-rid");
      if (!rid) continue;
      this.files.push({
        tid, rid,
        serial: element.innerText,
      });
    }
    this.loaded = true;
    return Promise.resolve();
  }
}

DataService.singleton = true;
