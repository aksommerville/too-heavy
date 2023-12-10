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
    if (this.loadPromise) return loadPromise;
    if (this.loaded) return Promise.resolve();
    return this.loadPromise = this.loadDirectoryRecursively("/data")
      .then((files) => {
        this.files = files;
        this.loadPromise = null;
        this.loaded = true;
      }).catch(e => {
        this.loadPromise = null;
        throw e;
      });
  }
  
  loadDirectoryRecursively(path) {
    return this.window.fetch(path, {
      method: "GET",
      mode: "same-origin",
      redirect: "error",
    }).then(rsp => {
      if (!rsp.ok) throw rsp;
      // Our server flags directories with "X-Is-Directory: true" so we know it before finishing the response body.
      // We absolutely depend on this behavior. But obviously it's not something we can use in real life! TODO
      if (rsp.headers.get("X-Is-Directory") === "true") {
        return rsp.json().then(bases => {
          return Promise.all(bases.map(base => this.loadDirectoryRecursively(path + "/" + base)))
            .then(responses => this.flattenArray(responses));
        });
      }
      // Everything else is a file. Fetch raw content as ArrayBuffer and generate a resource record.
      return rsp.arrayBuffer().then(serial => this.wrapFile(serial, path, rsp.headers.get("Content-Type")));
    });
  }
  
  // Flattens out one level of child arrays.
  flattenArray(src) {
    if (!(src instanceof Array)) return src;
    const dst = [];
    for (const child of src) {
      if (child instanceof Array) {
        for (const grandkid of child) dst.push(grandkid);
      } else {
        dst.push(child);
      }
    }
    return dst;
  }
  
  wrapFile(serial, path, contentType) {
    const { tid, rid, name } = this.parsePath(path);
    return { path, serial, tid, rid, name };
  }
  
  parsePath(path) {
    let base = "";
    let tid = "";
    for (const unit of path.split("/")) {
      if (RESTYPES.indexOf(unit) >= 0) tid = unit;
      base = unit;
    }
    let [flag, rid, dummy1, name, dummy2, sfx] = base.match(/^(\d*)(-([0-9a-zA-Z_-]*))?(\.(.*))?$/) || [];
    rid = +rid || 0;
    if (!name) name = "";
    return { tid, rid, name };
  }
}

DataService.singleton = true;
