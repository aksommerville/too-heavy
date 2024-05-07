/* DataService.js
 * Manages the data files inlined in our index.html.
 * Also responsible for high score persistence.
 * (but not input config persistence; that's InputManager).
 */
 
import { Grid } from "./Grid.js";
 
export class DataService {
  static getDependencies() {
    return [];
  }
  constructor() {
    this.files = []; // {tid,rid,serial,name,path,object} ; object gets instantiated lazily
    this.loaded = false;
    this.loadPromise = null;
    this.bestTime = 0; // sec; don't touch directly
  }
  
  getBestTime() {
    if (this.bestTime) return this.bestTime;
    try {
      this.bestTime = JSON.parse(egg.store_get("bestTime"));
      if ((typeof(this.bestTime) !== "number") || isNaN(this.bestTime) || (this.bestTime < 0)) {
        this.bestTime = 0;
      }
    } catch (e) {
      this.bestTime = 0;
    }
    if (this.bestTime) return this.bestTime;
    return 999999; // overflow our printing and it will display as "99:99.999"
  }
  
  setBestTimeIfBetter(incoming) {
    const previous = this.getBestTime();
    if (incoming < previous) {
      this.bestTime = incoming;
      egg.store_set("bestTime", JSON.stringify(this.bestTime));
    }
  }
  
  getResourceSync(tid, rid) {
    let file = this.files.find(f => f.tid === tid && f.rid === rid);
    if (!file) {
      const eggTid = this.eggTidFromThTid(tid);
      if (!eggTid) return null;
      const serial = egg.res_get(eggTid, 0, rid);
      if (!serial) return null;
      file = { tid, rid, serial };
      this.files.push(file);
    }
    if (!file.object) {
      file.object = this.instantiateResource(file.tid, file.serial, file);
    }
    return file.object;
  }
  
  eggTidFromThTid(tid) {
    switch (tid) {
      case "map": return 8;
    }
    return 0;
  }
  
  instantiateResource(tid, serial, file) {
    switch (tid) {
      case "map": return new Grid(serial);
    }
    // Default, use the incoming ArrayBuffer verbatim.
    return serial;
  }
}

DataService.singleton = true;
